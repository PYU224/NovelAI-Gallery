import { ref, computed } from 'vue';
import type { ImageData, SearchFilter, SortBy } from '@/types/image';
import { getDB, toPlainImage, idbRequest, STORE_IMAGES } from '@/composables/useDatabase';
// @ts-ignore
import { Document as FlexDocument } from 'flexsearch';

// LocalStorage キーを一箇所で管理
const LS_KEY = 'novelai-gallery-meta';

// ── モジュールレベルのシングルトン状態 ──────────────────────────────
// useImageGallery() を複数箇所から呼んでも同じ状態を共有する
const images = ref<ImageData[]>([]);
const searchQuery = ref('');
const activeFilters = ref<SearchFilter>({
  query: '',
  tags: [],
  tagMode: 'or',
  favoritesOnly: false,
});
const sortBy = ref<SortBy>('date-desc');
const selectedImage = ref<ImageData | null>(null);

// ── FlexSearch インデックス（モジュールレベル） ──────────────────────
const searchIndex = new FlexDocument({
  document: {
    id: 'id',
    index: [
      { field: 'prompt',         tokenize: 'forward' },
      { field: 'negativePrompt', tokenize: 'forward' },
      { field: 'fileName',       tokenize: 'forward' },
      { field: 'tags',           tokenize: 'forward' },
      { field: 'charText',       tokenize: 'forward' },
    ],
  },
});

function indexAdd(img: ImageData) {
  searchIndex.remove(img.id);
  searchIndex.add({
    id:             img.id,
    prompt:         img.prompt,
    negativePrompt: img.negativePrompt,
    fileName:       img.fileName,
    tags:           img.tags.join(' '),
    charText:       [
      ...(img.characterPrompts ?? []),
      ...(img.characterUCs     ?? []),
    ].join(' '),
  });
}

function indexRemove(id: string) {
  searchIndex.remove(id);
}

function rebuildIndex() {
  images.value.forEach(img => searchIndex.remove(img.id));
  images.value.forEach(img => indexAdd(img));
}

// ── ストレージ ──────────────────────────────────────────────────────

function saveToStorage() {
  try {
    const lightData = images.value.map(img => ({
      ...img,
      filePath: '',
      thumbnailPath: '',
    }));
    localStorage.setItem(LS_KEY, JSON.stringify(lightData));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

function loadFromLocalStorage() {
  try {
    const data = localStorage.getItem(LS_KEY);
    if (data) {
      const loaded: ImageData[] = JSON.parse(data);
      images.value = loaded;
      rebuildIndex();
    }
  } catch (e) {
    console.error('Failed to load from localStorage:', e);
  }
}

async function updateInIndexedDB(image: ImageData): Promise<void> {
  const db = await getDB();
  const tx = db.transaction([STORE_IMAGES], 'readwrite');
  await idbRequest(tx.objectStore(STORE_IMAGES).put(toPlainImage(image)));
}

// ── 初期化（モジュール読み込み時に1回だけ実行） ─────────────────────
let initialized = false;
function ensureInitialized() {
  if (initialized) return;
  initialized = true;
  loadFromLocalStorage();
}

// ── フィルタ済み画像（computed） ────────────────────────────────────
const filteredImages = computed(() => {
  let result = [...images.value];

  if (searchQuery.value.trim()) {
    const rawResults: Array<{ field?: string; result: (string | number)[] }> =
      searchIndex.search(searchQuery.value.trim(), { enrich: false }) as any;
    const matchedIds = new Set<string>();
    rawResults.forEach(r => r.result.forEach(id => matchedIds.add(id as string)));
    result = result.filter(img => matchedIds.has(img.id));
  }

  if (activeFilters.value.tags.length > 0) {
    if (activeFilters.value.tagMode === 'and') {
      result = result.filter(img =>
        activeFilters.value.tags.every(tag => img.tags.includes(tag))
      );
    } else {
      result = result.filter(img =>
        activeFilters.value.tags.some(tag => img.tags.includes(tag))
      );
    }
  }

  if (activeFilters.value.sampler) {
    result = result.filter(img => img.sampler === activeFilters.value.sampler);
  }

  if (activeFilters.value.stepsRange) {
    const { min, max } = activeFilters.value.stepsRange;
    if (min !== undefined) result = result.filter(img => img.steps >= min);
    if (max !== undefined) result = result.filter(img => img.steps <= max);
  }

  if (activeFilters.value.cfgRange) {
    const { min, max } = activeFilters.value.cfgRange;
    if (min !== undefined) result = result.filter(img => img.cfgScale >= min);
    if (max !== undefined) result = result.filter(img => img.cfgScale <= max);
  }

  if (activeFilters.value.favoritesOnly) {
    result = result.filter(img => img.isFavorite);
  }

  if (activeFilters.value.folderId === '__root__') {
    result = result.filter(img => !img.folderId);
  } else if (activeFilters.value.folderId) {
    result = result.filter(img => img.folderId === activeFilters.value.folderId);
  }

  result.sort((a, b) => {
    switch (sortBy.value) {
      case 'date-desc': return b.dateAdded - a.dateAdded;
      case 'date-asc':  return a.dateAdded - b.dateAdded;
      case 'seed':      return a.seed - b.seed;
      case 'steps':     return b.steps - a.steps;
      default:          return 0;
    }
  });

  return result;
});

const popularTags = computed(() => {
  const tagCounts = new Map<string, number>();
  images.value.forEach(img => {
    img.tags.forEach(tag => {
      tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
    });
  });
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([name, count]) => ({ name, count }));
});

// ── 公開メソッド ────────────────────────────────────────────────────

function addImages(newImages: ImageData[]) {
  images.value.push(...newImages);
  newImages.forEach(img => indexAdd(img));
  saveToStorage();
}

async function removeImage(id: string) {
  const index = images.value.findIndex(img => img.id === id);
  if (index !== -1) {
    images.value.splice(index, 1);
    indexRemove(id);
    await saveToStorage();
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_IMAGES], 'readwrite');
      await idbRequest(tx.objectStore(STORE_IMAGES).delete(id));
    } catch (e) {
      console.error('Failed to delete from IndexedDB:', e);
    }
  }
}

function toggleFavorite(id: string) {
  const image = images.value.find(img => img.id === id);
  if (image) {
    image.isFavorite = !image.isFavorite;
    saveToStorage();
    updateInIndexedDB(image);
  }
}

function updateImage(id: string, updatedData: Partial<ImageData>) {
  const index = images.value.findIndex(img => img.id === id);
  if (index !== -1) {
    // splice で配列要素を差し替えて Vue の変更検知を確実にトリガー
    const updated = { ...images.value[index], ...updatedData };
    images.value.splice(index, 1, updated);
    indexAdd(updated);
    saveToStorage();
    updateInIndexedDB(updated);
  }
}

function moveToFolder(imageId: string, folderId: string | undefined) {
  const image = images.value.find(img => img.id === imageId);
  if (image) {
    image.folderId = folderId;
    saveToStorage();
    updateInIndexedDB(image);
  }
}

function addTagFilter(tag: string) {
  if (!activeFilters.value.tags.includes(tag)) {
    activeFilters.value.tags.push(tag);
  }
}

function removeTagFilter(tag: string) {
  const index = activeFilters.value.tags.indexOf(tag);
  if (index !== -1) {
    activeFilters.value.tags.splice(index, 1);
  }
}

function clearFilters() {
  searchQuery.value = '';
  activeFilters.value = {
    query: '',
    tags: [],
    tagMode: 'or',
    favoritesOnly: false,
  };
}

// ── エクスポート ────────────────────────────────────────────────────
export function useImageGallery() {
  ensureInitialized();
  return {
    images,
    searchQuery,
    activeFilters,
    sortBy,
    selectedImage,
    filteredImages,
    popularTags,
    addImages,
    removeImage,
    updateImage,
    moveToFolder,
    toggleFavorite,
    addTagFilter,
    removeTagFilter,
    clearFilters,
    saveToStorage,
    loadFromLocalStorage,
    rebuildIndex,
  };
}
