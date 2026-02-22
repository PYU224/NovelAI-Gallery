<template>
  <ion-page id="main-content">
    <!-- ヘッダー -->
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-menu-button />
        </ion-buttons>
        <ion-title>NovelAI Gallery</ion-title>
        <ion-buttons slot="end">
          <!-- フィルタボタン（アクティブ時はバッジ表示） -->
          <ion-button @click="isFilterPanelOpen = true" :color="hasActiveAdvancedFilters ? 'primary' : 'default'">
            <ion-icon :icon="funnelOutline" />
            <ion-badge v-if="hasActiveAdvancedFilters" color="danger" class="filter-badge">
              {{ activeAdvancedFilterCount }}
            </ion-badge>
          </ion-button>
          <ion-button @click="toggleViewMode">
            <ion-icon :icon="viewMode === 'grid' ? listOutline : gridOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>

      <!-- 検索バー -->
      <ion-toolbar>
        <ion-searchbar
          v-model="searchQuery"
          :placeholder="t('home.searchPlaceholder')"
          @ionInput="onSearchInput"
        />
      </ion-toolbar>

      <!-- アクティブフィルタチップ（タグ + AND/ORバッジ） -->
      <ion-toolbar v-if="activeFilters.tags.length > 0 || hasActiveAdvancedFilters">
        <div class="filter-chips">
          <!-- タグチップの前にAND/ORバッジ -->
          <ion-chip
            v-if="activeFilters.tags.length > 1"
            :color="activeFilters.tagMode === 'and' ? 'warning' : 'primary'"
            @click="toggleTagMode"
            class="tag-mode-chip"
          >
            <ion-label>{{ activeFilters.tagMode === 'and' ? 'AND' : 'OR' }}</ion-label>
          </ion-chip>
          <ion-chip
            v-for="tag in activeFilters.tags"
            :key="tag"
            @click="removeTagFilter(tag)"
          >
            <ion-label>{{ tag }}</ion-label>
            <ion-icon :icon="closeCircle" />
          </ion-chip>
          <!-- サンプラーフィルタチップ -->
          <ion-chip v-if="activeFilters.sampler" color="secondary" @click="activeFilters.sampler = undefined">
            <ion-label>{{ activeFilters.sampler }}</ion-label>
            <ion-icon :icon="closeCircle" />
          </ion-chip>
          <!-- ステップ数チップ -->
          <ion-chip v-if="activeFilters.stepsRange?.min !== undefined || activeFilters.stepsRange?.max !== undefined" color="tertiary" @click="activeFilters.stepsRange = undefined">
            <ion-label>Steps: {{ activeFilters.stepsRange?.min ?? '?' }}–{{ activeFilters.stepsRange?.max ?? '?' }}</ion-label>
            <ion-icon :icon="closeCircle" />
          </ion-chip>
          <!-- CFGチップ -->
          <ion-chip v-if="activeFilters.cfgRange?.min !== undefined || activeFilters.cfgRange?.max !== undefined" color="tertiary" @click="activeFilters.cfgRange = undefined">
            <ion-label>CFG: {{ activeFilters.cfgRange?.min ?? '?' }}–{{ activeFilters.cfgRange?.max ?? '?' }}</ion-label>
            <ion-icon :icon="closeCircle" />
          </ion-chip>
        </div>
      </ion-toolbar>
    </ion-header>

    <!-- フィルタパネル (モーダル) -->
    <ion-modal :is-open="isFilterPanelOpen" @didDismiss="isFilterPanelOpen = false" :initial-breakpoint="0.75" :breakpoints="[0, 0.5, 0.75, 1]">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('filter.title') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="resetAdvancedFilters" fill="clear" color="medium">{{ t('filter.reset') }}</ion-button>
            <ion-button @click="isFilterPanelOpen = false" fill="clear">{{ t('filter.apply') }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="filter-panel-content">
        <!-- タグ一致モード -->
        <ion-list>
          <ion-item>
            <ion-label>{{ t('filter.tagMode') }}</ion-label>
            <ion-segment v-model="activeFilters.tagMode" slot="end" style="min-width:160px">
              <ion-segment-button value="or">
                <ion-label>OR</ion-label>
              </ion-segment-button>
              <ion-segment-button value="and">
                <ion-label>AND</ion-label>
              </ion-segment-button>
            </ion-segment>
          </ion-item>
        </ion-list>

        <!-- サンプラーフィルタ -->
        <ion-list>
          <ion-list-header><ion-label>{{ t('filter.sampler') }}</ion-label></ion-list-header>
          <ion-item>
            <ion-select v-model="activeFilters.sampler" :placeholder="t('filter.samplerAll')" interface="popover" :clear-input="true">
              <ion-select-option :value="undefined">{{ t('filter.samplerAll') }}</ion-select-option>
              <ion-select-option v-for="s in availableSamplers" :key="s" :value="s">{{ s }}</ion-select-option>
            </ion-select>
          </ion-item>
        </ion-list>

        <!-- ステップ数レンジ -->
        <ion-list>
          <ion-list-header><ion-label>{{ t('filter.steps') }}</ion-label></ion-list-header>
          <ion-item>
            <ion-label>{{ t('filter.stepsMin') }}</ion-label>
            <ion-input
              type="number"
              :value="activeFilters.stepsRange?.min ?? ''"
              @ionInput="(e: any) => setStepsMin(e.detail.value)"
              :placeholder="String(stepsStats.min)"
              slot="end"
              style="max-width:80px;text-align:right"
            />
          </ion-item>
          <ion-item>
            <ion-label>{{ t('filter.stepsMax') }}</ion-label>
            <ion-input
              type="number"
              :value="activeFilters.stepsRange?.max ?? ''"
              @ionInput="(e: any) => setStepsMax(e.detail.value)"
              :placeholder="String(stepsStats.max)"
              slot="end"
              style="max-width:80px;text-align:right"
            />
          </ion-item>
        </ion-list>

        <!-- CFGスケールレンジ -->
        <ion-list>
          <ion-list-header><ion-label>{{ t('filter.cfg') }}</ion-label></ion-list-header>
          <ion-item>
            <ion-label>{{ t('filter.cfgMin') }}</ion-label>
            <ion-input
              type="number"
              :value="activeFilters.cfgRange?.min ?? ''"
              @ionInput="(e: any) => setCfgMin(e.detail.value)"
              :placeholder="String(cfgStats.min)"
              slot="end"
              style="max-width:80px;text-align:right"
            />
          </ion-item>
          <ion-item>
            <ion-label>{{ t('filter.cfgMax') }}</ion-label>
            <ion-input
              type="number"
              :value="activeFilters.cfgRange?.max ?? ''"
              @ionInput="(e: any) => setCfgMax(e.detail.value)"
              :placeholder="String(cfgStats.max)"
              slot="end"
              style="max-width:80px;text-align:right"
            />
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <ion-content>
      <!-- ローディング -->
      <ion-loading
        :is-open="isImporting"
        message="画像を処理中..."
      />

      <!-- コントロール（選択モード時は非表示） -->
      <div v-if="!selectMode" class="gallery-controls">
        <ion-select
          v-model="sortBy"
          interface="popover"
          :placeholder="t('home.sortPlaceholder')"
        >
          <ion-select-option value="date-desc">{{ t('home.sortBy.dateDesc') }}</ion-select-option>
          <ion-select-option value="date-asc">{{ t('home.sortBy.dateAsc') }}</ion-select-option>
          <ion-select-option value="seed">{{ t('home.sortBy.seed') }}</ion-select-option>
          <ion-select-option value="steps">{{ t('home.sortBy.steps') }}</ion-select-option>
        </ion-select>
        <span class="count">{{ t('home.count', { n: filteredImages.length }) }}</span>
      </div>

      <!-- 画像グリッド -->
      <GalleryGrid
        :images="filteredImages"
        :view-mode="viewMode"
        :select-mode="selectMode"
        :selected-ids="selectedIds"
        @image-click="openImageViewer"
        @import-click="handleImport"
        @image-long-press="handleImageLongPress"
        @image-select="toggleSelectImage"
      />

      <!-- FAB（選択モード時は非表示） -->
      <ion-fab v-if="!selectMode" vertical="bottom" horizontal="end" slot="fixed">
        <ion-fab-button>
          <ion-icon :icon="add" />
        </ion-fab-button>
        <ion-fab-list side="top">
          <ion-fab-button @click="handleImport">
            <ion-icon :icon="folderOpen" />
          </ion-fab-button>
          <ion-fab-button @click="handleShare">
            <ion-icon :icon="downloadOutline" />
          </ion-fab-button>
        </ion-fab-list>
      </ion-fab>
    </ion-content>

    <!-- ━━━ 一括操作ツールバー（選択モード時に画面下部に固定表示）━━━ -->
    <div v-if="selectMode" class="batch-toolbar">
      <div class="batch-toolbar-inner">
        <!-- 左: 件数 + 全選択 -->
        <div class="batch-left">
          <span class="batch-count">{{ t('home.select.selected', { count: selectedIds.size }) }}</span>
          <ion-button fill="clear" size="small" @click="toggleSelectAll">
            {{ selectedIds.size === filteredImages.length ? t('home.select.deselectAll') : t('home.select.selectAll') }}
          </ion-button>
        </div>
        <!-- 右: 操作ボタン -->
        <div class="batch-actions">
          <ion-button fill="clear" :disabled="selectedIds.size === 0" @click="batchExport">
            <ion-icon :icon="downloadOutline" slot="icon-only" />
          </ion-button>
          <ion-button fill="clear" :disabled="selectedIds.size === 0" @click="showBatchMoveToFolder">
            <ion-icon :icon="folderOutline" slot="icon-only" />
          </ion-button>
          <ion-button fill="clear" color="danger" :disabled="selectedIds.size === 0" @click="confirmBatchDelete">
            <ion-icon :icon="trashOutline" slot="icon-only" />
          </ion-button>
          <ion-button fill="solid" color="medium" size="small" @click="exitSelectMode">
            {{ t('home.select.cancel') }}
          </ion-button>
        </div>
      </div>
    </div>

    <!-- ━━━ バッチ移動先フォルダ選択モーダル ━━━ -->
    <ion-modal
      :is-open="isBatchFolderModalOpen"
      @didDismiss="isBatchFolderModalOpen = false"
      :initial-breakpoint="0.6"
      :breakpoints="[0, 0.6, 1]"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('home.select.chooseFolder') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="isBatchFolderModalOpen = false" fill="clear">{{ t('home.select.cancel') }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content>
        <ion-list>
          <!-- 未分類 -->
          <ion-item button @click="executeBatchMove(undefined)">
            <ion-icon :icon="folderOutline" slot="start" color="medium" />
            <ion-label>{{ t('home.select.uncategorized') }}</ion-label>
            <ion-note slot="end">{{ rootImageCount }}</ion-note>
          </ion-item>
          <!-- 既存フォルダ -->
          <ion-item
            v-for="folder in sortedFolders"
            :key="folder.id"
            button
            @click="executeBatchMove(folder.id)"
          >
            <ion-icon :icon="folderOutline" slot="start" :style="folder.color ? `color: ${folder.color}` : ''" />
            <ion-label>{{ folder.name }}</ion-label>
            <ion-note slot="end">{{ folderImageCounts[folder.id] ?? 0 }}</ion-note>
          </ion-item>
          <!-- 新規フォルダ作成 -->
          <ion-item button @click="createFolderAndBatchMove">
            <ion-icon :icon="addOutline" slot="start" color="primary" />
            <ion-label color="primary">{{ t('home.select.newFolder') }}</ion-label>
          </ion-item>
        </ion-list>
      </ion-content>
    </ion-modal>

    <!-- 画像ビューア -->
    <ImageViewer
      :is-open="isViewerOpen"
      :image="selectedImage"
      @close="closeImageViewer"
      @toggle-favorite="handleToggleFavorite"
      @tag-click="handleTagClick"
      @delete-image="handleDeleteImage"
      @edit-image="handleEditImage"
      @previous="showPreviousImage"
      @next="showNextImage"
    />

    <!-- メタデータ編集モーダル -->
    <ImageEditModal
      :is-open="isEditModalOpen"
      :image="selectedImage"
      :folders="sortedFolders"
      @close="isEditModalOpen = false"
      @save="handleSaveEdit"
    />

    <!-- エクスポート中のローディング -->
    <ion-loading
      :is-open="isExporting"
      :message="`エクスポート中... ${Math.round(exportProgress)}%`"
    />

  </ion-page>
</template>


<script setup lang="ts">
import { ref, onMounted, computed, inject, watch } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonIcon,
  IonSearchbar,
  IonChip,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonFab,
  IonFabButton,
  IonFabList,
  IonMenu,
  IonList,
  IonListHeader,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonBadge,
  IonMenuButton,
  IonLoading,
  IonModal,
  IonSegment,
  IonSegmentButton,
  IonInput,
  IonNote,
  toastController,
  actionSheetController,
  alertController,
  menuController,
} from '@ionic/vue';
import {
  gridOutline,
  listOutline,
  add,
  folderOpen,
  shareOutline,
  closeCircle,
  imagesOutline,
  heart,
  downloadOutline,
  addOutline,
  folderOutline,
  ellipsisVertical,
  trashOutline,
  createOutline,
  settingsOutline,
  funnelOutline,
  checkboxOutline,
} from 'ionicons/icons';
import GalleryGrid from '@/components/GalleryGrid.vue';
import ImageViewer from '@/components/ImageViewer.vue';
import ImageEditModal from '@/components/ImageEditModal.vue';
import { useImageGallery } from '@/composables/useImageGallery';
import { useImageMetadata } from '@/composables/useImageMetadata';
import { useFileSystem } from '@/composables/useFileSystem';
import { useExport } from '@/composables/useExport';
import { useFolders } from '@/composables/useFolders';
import type { ImageData as AppImageData } from '@/types/image';
import { useRouter } from 'vue-router';
import { useI18n } from 'vue-i18n';

// ギャラリー状態管理
const {
  images,
  searchQuery,
  activeFilters,
  sortBy,
  selectedImage,
  filteredImages,
  popularTags,
  addImages,
  toggleFavorite,
  addTagFilter,
  removeTagFilter,
  clearFilters,
  removeImage,
  updateImage,
  moveToFolder,
  rebuildIndex,
} = useImageGallery();

// ─── App.vueとの連携 ───
// App.vueから提供される関数を取得
const updateGalleryData = inject<(data: { 
  totalImages: number; 
  popularTags: Array<{ name: string; count: number }>;
  folders: Array<{ id: string; name: string; color?: string }>;
  folderImageCounts: Record<string, number>;
  rootImageCount: number;
}) => void>('updateGalleryData');

const updateFilterCallbacks = inject<(callbacks: {
  clearAllFilters: () => void;
  filterFavorites: () => void;
  addTagFilter: (tag: string) => void;
  filterByFolder: (folderId: string | null) => void;
  showCreateFolderPrompt: () => void;
  showFolderActions: (folder: any) => void;
}) => void>('updateFilterCallbacks');

// App.vueにフィルタコールバックを提供
if (updateFilterCallbacks) {
  updateFilterCallbacks({
    clearAllFilters,
    filterFavorites,
    addTagFilter,
    filterByFolder,
    showCreateFolderPrompt,
    showFolderActions,
  });
}

// フォルダ管理
const {
  folders,
  sortedFolders,
  loadFolders,
  createFolder,
  renameFolder,
  deleteFolder,
} = useFolders();

// フォルダ内画像数 — images が変わるたびに自動再計算
const folderImageCounts = computed<Record<string, number>>(() => {
  const counts: Record<string, number> = {};
  for (const img of images.value) {
    if (img.folderId) {
      counts[img.folderId] = (counts[img.folderId] ?? 0) + 1;
    }
  }
  return counts;
});

const rootImageCount = computed<number>(() =>
  images.value.filter(img => !img.folderId).length
);

// 画像データ・フォルダデータが変更されたらApp.vueに通知
watch(
  [images, popularTags, folders, folderImageCounts, rootImageCount],
  () => {
    if (updateGalleryData) {
      updateGalleryData({
        totalImages: images.value.length,
        popularTags: popularTags.value,
        folders: folders.value,
        folderImageCounts: folderImageCounts.value,
        rootImageCount: rootImageCount.value,
      });
    }
  },
  { immediate: true, deep: true }
);

// メタデータ読み取り
const { extractMultipleMetadata, generateThumbnail } = useImageMetadata();

// ファイルシステム
const {
  pickFiles,
  saveImageToStorage,
  loadAllFromIndexedDB,
} = useFileSystem();

// エクスポート
const {
  isExporting,
  progress: exportProgress,
  exportImages: exportImagesAsZip,
  exportMetadataAsCSV,
  exportMetadataAsJSON,
} = useExport();

// ルーター
const router = useRouter();

// 多言語対応
const { t } = useI18n();

// ── フィルタパネル ─────────────────────────────────────────
const isFilterPanelOpen = ref(false);

// 詳細フィルタ（サンプラー・ステップ・CFG）がアクティブか
const hasActiveAdvancedFilters = computed(() => {
  return !!(
    activeFilters.value.sampler ||
    activeFilters.value.stepsRange?.min !== undefined ||
    activeFilters.value.stepsRange?.max !== undefined ||
    activeFilters.value.cfgRange?.min !== undefined ||
    activeFilters.value.cfgRange?.max !== undefined
  );
});

const activeAdvancedFilterCount = computed(() => {
  let count = 0;
  if (activeFilters.value.sampler) count++;
  if (activeFilters.value.stepsRange?.min !== undefined || activeFilters.value.stepsRange?.max !== undefined) count++;
  if (activeFilters.value.cfgRange?.min !== undefined || activeFilters.value.cfgRange?.max !== undefined) count++;
  return count;
});

// 画像群から使用済みサンプラー一覧を生成
const availableSamplers = computed(() => {
  const set = new Set<string>();
  images.value.forEach(img => { if (img.sampler) set.add(img.sampler); });
  return Array.from(set).sort();
});

// ステップ数の最小・最大（placeholderに使う）
const stepsStats = computed(() => {
  if (images.value.length === 0) return { min: 1, max: 50 };
  const vals = images.value.map(i => i.steps).filter(Boolean);
  return { min: Math.min(...vals), max: Math.max(...vals) };
});

// CFGスケールの最小・最大
const cfgStats = computed(() => {
  if (images.value.length === 0) return { min: 1, max: 10 };
  const vals = images.value.map(i => i.cfgScale).filter(Boolean);
  return { min: Math.min(...vals), max: Math.max(...vals) };
});

function toggleTagMode() {
  activeFilters.value.tagMode = activeFilters.value.tagMode === 'or' ? 'and' : 'or';
}

function resetAdvancedFilters() {
  activeFilters.value.sampler = undefined;
  activeFilters.value.stepsRange = undefined;
  activeFilters.value.cfgRange = undefined;
}

function setStepsMin(val: string) {
  const n = val === '' ? undefined : Number(val);
  activeFilters.value.stepsRange = { ...activeFilters.value.stepsRange, min: n };
}
function setStepsMax(val: string) {
  const n = val === '' ? undefined : Number(val);
  activeFilters.value.stepsRange = { ...activeFilters.value.stepsRange, max: n };
}
function setCfgMin(val: string) {
  const n = val === '' ? undefined : Number(val);
  activeFilters.value.cfgRange = { ...activeFilters.value.cfgRange, min: n };
}
function setCfgMax(val: string) {
  const n = val === '' ? undefined : Number(val);
  activeFilters.value.cfgRange = { ...activeFilters.value.cfgRange, max: n };
}

// ビューモード
const viewMode = ref<'grid' | 'list'>('grid');
const isViewerOpen = ref(false);
const isImporting = ref(false);
const isEditModalOpen = ref(false);

// ━━━ 一括選択モード ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
const selectMode = ref(false);
const selectedIds = ref<Set<string>>(new Set());
const isBatchFolderModalOpen = ref(false);

/** 選択モードを開始（長押しから） */
function enterSelectMode(image: AppImageData) {
  selectMode.value = true;
  selectedIds.value = new Set([image.id]);
}

/** 選択モードを終了 */
function exitSelectMode() {
  selectMode.value = false;
  selectedIds.value = new Set();
}

/** 画像の選択トグル */
function toggleSelectImage(image: AppImageData) {
  const next = new Set(selectedIds.value);
  if (next.has(image.id)) {
    next.delete(image.id);
  } else {
    next.add(image.id);
  }
  selectedIds.value = next;
}

/** 全選択 / 全解除 */
function toggleSelectAll() {
  if (selectedIds.value.size === filteredImages.value.length) {
    selectedIds.value = new Set();
  } else {
    selectedIds.value = new Set(filteredImages.value.map(img => img.id));
  }
}

/** 一括削除の確認ダイアログ */
async function confirmBatchDelete() {
  const count = selectedIds.value.size;
  const alert = await alertController.create({
    header: t('home.select.confirmDelete', { count }),
    message: t('home.select.confirmDeleteMsg'),
    buttons: [
      { text: t('home.select.cancel'), role: 'cancel' },
      {
        text: t('home.select.delete'),
        role: 'destructive',
        handler: async () => {
          const ids = Array.from(selectedIds.value);
          for (const id of ids) {
            await removeImage(id);
          }
          showToast(t('home.select.deleted', { count }), 'success');
          exitSelectMode();
        },
      },
    ],
  });
  await alert.present();
}

/** 一括移動先フォルダモーダルを開く */
function showBatchMoveToFolder() {
  isBatchFolderModalOpen.value = true;
}

/** 一括移動を実行 */
async function executeBatchMove(folderId: string | undefined) {
  const count = selectedIds.value.size;
  const ids = Array.from(selectedIds.value);
  for (const id of ids) {
    moveToFolder(id, folderId);
  }
  const folderName = folderId
    ? (sortedFolders.value.find(f => f.id === folderId)?.name ?? folderId)
    : t('home.select.uncategorized');
  isBatchFolderModalOpen.value = false;
  showToast(t('home.select.moved', { count, folder: folderName }), 'success');
  exitSelectMode();
}

/** 新規フォルダを作成して一括移動 */
async function createFolderAndBatchMove() {
  isBatchFolderModalOpen.value = false;
  const alert = await alertController.create({
    header: t('home.dialogs.createFolder.title'),
    message: t('home.dialogs.createFolder.message'),
    buttons: [
      { text: t('home.dialogs.createFolder.cancel'), role: 'cancel' },
      {
        text: t('home.dialogs.createFolder.confirm'),
        handler: async (data) => {
          const name = data.folderName?.trim();
          if (name) {
            const folder = await createFolder(name);
            await executeBatchMove(folder.id);
          }
        },
      },
    ],
    inputs: [{ name: 'folderName', type: 'text', placeholder: t('home.folderNamePlaceholder') }],
  });
  await alert.present();
}

/** 一括エクスポート */
async function batchExport() {
  const count = selectedIds.value.size;
  const targets = images.value.filter(img => selectedIds.value.has(img.id));
  try {
    await exportImagesAsZip(targets);
    showToast(t('home.select.exported', { count }), 'success');
    exitSelectMode();
  } catch (e) {
    showToast(t('export.failed'), 'danger');
  }
}

// ビューモードの初期化（LocalStorageから読み込み）
onMounted(async () => {
  // ビューモード復元
  const savedViewMode = localStorage.getItem('gallery-view-mode');
  if (savedViewMode === 'grid' || savedViewMode === 'list') {
    viewMode.value = savedViewMode;
  }

  // フォルダデータ読み込み
  await loadFolders();

  // 画像データ読み込み
  try {
    const storedImages = await loadAllFromIndexedDB();
    if (storedImages.length > 0) {
      images.value = storedImages;
      rebuildIndex();
      showToast(t('home.messages.loaded', { n: storedImages.length }), 'success');
    }
  } catch (e) {
    console.error('Failed to load images from IndexedDB:', e);
    // LocalStorageからのフォールバック
    // （useImageGalleryが自動的に実行）
  }
});

// 検索入力
function onSearchInput(event: CustomEvent) {
  searchQuery.value = event.detail.value || '';
}

// ビューモード切替
function toggleViewMode() {
  viewMode.value = viewMode.value === 'grid' ? 'list' : 'grid';
  localStorage.setItem('gallery-view-mode', viewMode.value);
  showToast(
    viewMode.value === 'grid' ? t('home.viewMode.switchedToGrid') : t('home.viewMode.switchedToList'),
    'primary'
  );
}

// 画像ビューアを開く
function openImageViewer(image: any) {
  selectedImage.value = image;
  isViewerOpen.value = true;
}

// 画像ビューアを閉じる
function closeImageViewer() {
  isViewerOpen.value = false;
  selectedImage.value = null;
}

// 前の画像を表示
function showPreviousImage() {
  if (!selectedImage.value) return;
  
  const currentIndex = filteredImages.value.findIndex(
    img => img.id === selectedImage.value?.id
  );
  
  if (currentIndex > 0) {
    selectedImage.value = filteredImages.value[currentIndex - 1];
  }
}

// 次の画像を表示
function showNextImage() {
  if (!selectedImage.value) return;
  
  const currentIndex = filteredImages.value.findIndex(
    img => img.id === selectedImage.value?.id
  );
  
  if (currentIndex < filteredImages.value.length - 1) {
    selectedImage.value = filteredImages.value[currentIndex + 1];
  }
}

// お気に入りトグル
function handleToggleFavorite() {
  if (selectedImage.value) {
    toggleFavorite(selectedImage.value.id);
    // toggleFavorite が images.value 内のオブジェクトを更新するため
    // selectedImage を再取得して ImageViewer のプロップを強制更新する
    const updated = images.value.find(img => img.id === selectedImage.value?.id);
    if (updated) selectedImage.value = updated;
  }
}

// タグクリック
function handleTagClick(tag: string) {
  addTagFilter(tag);
  closeImageViewer();
}

// 画像削除
async function handleDeleteImage() {
  if (!selectedImage.value) return;

  try {
    await removeImage(selectedImage.value.id);
    showToast(t('home.messages.imageDeleted'), 'success');
    closeImageViewer();
  } catch (e) {
    console.error('Failed to delete image:', e);
    showToast(t('home.messages.imageDeleted') + ' (Error)', 'danger');
  }
}

// 画像編集
function handleEditImage() {
  closeImageViewer();
  isEditModalOpen.value = true;
}

// 編集を保存
function handleSaveEdit(editedImage: any) {
  if (!selectedImage.value) return;
  try {
    updateImage(selectedImage.value.id, editedImage);
    // 更新後のオブジェクトを images から再取得して selectedImage を同期
    const updated = images.value.find(img => img.id === editedImage.id);
    if (updated) selectedImage.value = updated;
    isEditModalOpen.value = false;
    showToast(t('home.messages.metadataUpdated'), 'success');
  } catch (error) {
    console.error('Error in handleSaveEdit:', error);
    showToast(t('home.messages.saveFailed'), 'danger');
  }
}

// フィルタクリア
function clearAllFilters() {
  clearFilters();
  delete activeFilters.value.folderId;
}

// お気に入りフィルタ
function filterFavorites() {
  activeFilters.value.favoritesOnly = !activeFilters.value.favoritesOnly;
}

// フォルダによるフィルタ
function filterByFolder(folderId: string | null) {
  if (folderId === null) {
    // 未分類（どのフォルダにも属さない画像のみ）
    activeFilters.value.folderId = '__root__';
  } else {
    activeFilters.value.folderId = folderId;
  }
  activeFilters.value.favoritesOnly = false;
}

// フォルダ作成
async function showCreateFolderPrompt() {
  const alert = await alertController.create({
    header: t('home.dialogs.createFolder.title'),
    message: t('home.dialogs.createFolder.message'),
    buttons: [
      {
        text: t('home.dialogs.createFolder.cancel'),
        role: 'cancel',
      },
      {
        text: t('home.dialogs.createFolder.confirm'),
        handler: async (data) => {
          const folderName = data.folderName;
          if (folderName && folderName.trim().length > 0) {
            try {
              await createFolder(folderName.trim());
              showToast(t('home.messages.folderCreated'), 'success');
            } catch (e) {
              console.error('Failed to create folder:', e);
              showToast(t('home.messages.folderCreated') + ' (Error)', 'danger');
            }
          }
        },
      },
    ],
    inputs: [
      {
        name: 'folderName',
        type: 'text',
        placeholder: t('home.folderNamePlaceholder'),
      },
    ],
  });
  await alert.present();
}

// フォルダアクション（名前変更・削除）
async function showFolderActions(folder: any) {
  const actionSheet = await actionSheetController.create({
    header: folder.name,
    buttons: [
      {
        text: t('home.actionSheet.renameFolder'),
        handler: async () => {
          const alert = await alertController.create({
            header: t('home.dialogs.renameFolder.title'),
            buttons: [
              {
                text: t('home.dialogs.createFolder.cancel'),
                role: 'cancel',
              },
              {
                text: t('home.dialogs.renameFolder.confirm'),
                handler: async (data) => {
                  const newName = data.folderName;
                  if (newName && newName.trim().length > 0) {
                    try {
                      await renameFolder(folder.id, newName.trim());
                      showToast(t('home.messages.folderRenamed'), 'success');
                    } catch (e) {
                      showToast(t('home.actionSheet.folderRenameFailed'), 'danger');
                    }
                  }
                },
              },
            ],
            inputs: [
              {
                name: 'folderName',
                type: 'text',
                value: folder.name,
              },
            ],
          });
          await alert.present();
        },
      },
      {
        text: t('home.dialogs.deleteImage.confirm'),
        role: 'destructive',
        handler: async () => {
          const confirmAlert = await alertController.create({
            header: t('home.dialogs.deleteFolder.title'),
            message: t('home.dialogs.deleteFolder.message'),
            buttons: [
              {
                text: t('home.dialogs.createFolder.cancel'),
                role: 'cancel',
              },
              {
                text: t('home.actionSheet.delete'),
                role: 'destructive',
                handler: async () => {
                  try {
                    // フォルダ内の画像を未分類に移動
                    const imagesInFolder = images.value.filter(
                      img => img.folderId === folder.id
                    );
                    for (const img of imagesInFolder) {
                      moveToFolder(img.id, undefined);
                    }
                    
                    await deleteFolder(folder.id);
                    showToast(t('home.messages.folderDeleted'), 'success');
                  } catch (e) {
                    showToast(t('home.messages.folderDeleted') + ' (Error)', 'danger');
                  }
                },
              },
            ],
          });
          await confirmAlert.present();
        },
      },
      {
        text: t('home.dialogs.createFolder.cancel'),
        role: 'cancel',
      },
    ],
  });
  await actionSheet.present();
}

// 画像の長押し/右クリックメニュー
// 画像の長押し/右クリックメニュー
async function handleImageLongPress(image: AppImageData) {
  // 選択モード中は選択トグルとして動作
  if (selectMode.value) {
    toggleSelectImage(image);
    return;
  }

  // 選択モード外：選択モード開始 or 従来のアクションシート
  const buttons = [
    {
      text: t('home.actionSheet.multiSelect'),
      icon: checkboxOutline,
      handler: () => {
        enterSelectMode(image);
      },
    },
    {
      text: t('home.actionSheet.moveToFolder'),
      icon: folderOutline,
      handler: () => {
        showMoveToFolderSheet(image);
      },
    },
    {
      text: image.isFavorite ? t('home.actionSheet.removeFavorite') : t('home.actionSheet.addFavorite'),
      icon: heart,
      handler: () => {
        toggleFavorite(image.id);
        showToast(
          image.isFavorite ? t('home.actionSheet.favoriteRemoved') : t('home.actionSheet.favoriteAdded'),
          'success'
        );
      },
    },
    {
      text: t('home.actionSheet.edit'),
      icon: createOutline,
      handler: () => {
        selectedImage.value = image;
        isEditModalOpen.value = true;
      },
    },
    {
      text: t('home.actionSheet.delete'),
      icon: trashOutline,
      role: 'destructive',
      handler: () => {
        confirmDeleteImage(image);
      },
    },
    {
      text: t('home.actionSheet.cancel'),
      role: 'cancel',
    },
  ];

  const actionSheet = await actionSheetController.create({
    header: image.fileName,
    buttons,
  });

  await actionSheet.present();
}

// フォルダ移動シートを表示
async function showMoveToFolderSheet(image: AppImageData) {
  const buttons = [
    {
      text: '📁 未分類',
      handler: () => {
        moveToFolder(image.id, undefined);
        showToast('未分類に移動しました', 'success');
      },
    },
    ...sortedFolders.value.map(folder => ({
      text: `📁 ${folder.name}`,
      handler: () => {
        moveToFolder(image.id, folder.id);
        showToast(`${folder.name}に移動しました`, 'success');
      },
    })),
    {
      text: '+ 新しいフォルダを作成',
      handler: async () => {
        // フォルダ作成後、画像を移動
        await showCreateFolderAndMove(image);
      },
    },
    {
      text: 'キャンセル',
      role: 'cancel',
    },
  ];

  const actionSheet = await actionSheetController.create({
    header: 'フォルダを選択',
    buttons,
  });

  await actionSheet.present();
}

// フォルダ作成して画像を移動
async function showCreateFolderAndMove(image: AppImageData) {
  const alert = await alertController.create({
    header: t('home.dialogs.createFolder.title'),
    message: t('home.dialogs.createFolder.message'),
    buttons: [
      {
        text: t('home.dialogs.createFolder.cancel'),
        role: 'cancel',
      },
      {
        text: '作成して移動',
        handler: async (data) => {
          const folderName = data.folderName;
          if (folderName && folderName.trim().length > 0) {
            try {
              const newFolder = await createFolder(folderName.trim());
              moveToFolder(image.id, newFolder.id);
              showToast(`${folderName}を作成して移動しました`, 'success');
            } catch (e) {
              console.error('Failed to create folder:', e);
              showToast(t('home.messages.folderCreated') + ' (Error)', 'danger');
            }
          }
        },
      },
    ],
    inputs: [
      {
        name: 'folderName',
        type: 'text',
        placeholder: t('home.folderNamePlaceholder'),
      },
    ],
  });
  await alert.present();
}

// 画像削除の確認
async function confirmDeleteImage(image: AppImageData) {
  const alert = await alertController.create({
    header: t('home.dialogs.deleteImage.title'),
    message: t('home.dialogs.deleteImage.message') + ` (${image.fileName})`,
    buttons: [
      {
        text: t('home.dialogs.createFolder.cancel'),
        role: 'cancel',
      },
      {
        text: t('home.dialogs.deleteImage.confirm'),
        role: 'destructive',
        handler: async () => {
          try {
            await removeImage(image.id);
            showToast(t('home.messages.imageDeleted'), 'success');
          } catch (e) {
            console.error('Failed to delete image:', e);
            showToast(t('home.messages.imageDeleted') + ' (Error)', 'danger');
          }
        },
      },
    ],
  });
  await alert.present();
}

// インポート処理
async function handleImport() {
  try {
    // ファイルピッカーを開く（まだローディングは表示しない）
    const files = await pickFiles();

    if (files.length === 0) {
      return; // キャンセルされた場合はローディングを表示せず終了
    }

    // ファイル選択完了後にローディングを開始
    isImporting.value = true;
    showToast(t('home.messages.importing_n', { n: files.length }), 'primary');

    // メタデータ抽出
    const imageDataList = await extractMultipleMetadata(files);

    // 各画像を処理
    const processedImages = [];
    for (let i = 0; i < imageDataList.length; i++) {
      const imageData = imageDataList[i];
      const file = files[i];

      try {
        // サムネイル生成
        const thumbnail = await generateThumbnail(file, 300);

        // ストレージに保存
        const savedImage = await saveImageToStorage(imageData, file, thumbnail);
        processedImages.push(savedImage);
      } catch (e) {
        console.error(`Failed to process ${file.name}:`, e);
      }
    }

    // ギャラリーに追加
    addImages(processedImages);

    showToast(
      t('home.messages.imported', { n: processedImages.length }),
      'success'
    );
  } catch (e) {
    console.error('Import failed:', e);
    showToast('画像のインポートに失敗しました', 'danger');
  } finally {
    isImporting.value = false;
  }
}

// 共有処理
async function handleShare() {
  const sheet = await actionSheetController.create({
    header: t('export.title'),
    buttons: [
      {
        text: t('export.allZip'),
        icon: downloadOutline,
        handler: () => exportAllImages(),
      },
      {
        text: t('export.filteredZip'),
        icon: downloadOutline,
        handler: () => exportFilteredImages(),
      },
      {
        text: t('export.csv'),
        icon: downloadOutline,
        handler: () => exportAsCSV(),
      },
      {
        text: t('export.json'),
        icon: downloadOutline,
        handler: () => exportAsJSON(),
      },
      {
        text: t('home.dialogs.createFolder.cancel'),
        role: 'cancel',
      },
    ],
  });

  await sheet.present();
}

// 全画像をエクスポート
async function exportAllImages() {
  try {
    await exportImagesAsZip(images.value);
    showToast(t('home.messages.exported', { n: images.value.length }), 'success');
  } catch (e) {
    console.error('Export failed:', e);
    showToast(t('export.failed'), 'danger');
  }
}

// フィルタ済み画像をエクスポート
async function exportFilteredImages() {
  try {
    await exportImagesAsZip(filteredImages.value);
    showToast(t('home.messages.exported', { n: filteredImages.value.length }), 'success');
  } catch (e) {
    console.error('Export failed:', e);
    showToast(t('export.failed'), 'danger');
  }
}

// CSVエクスポート
async function exportAsCSV() {
  try {
    await exportMetadataAsCSV(filteredImages.value);
    showToast(t('export.successCsv'), 'success');
  } catch (e) {
    console.error('CSV export failed:', e);
    showToast(t('export.failedCsv'), 'danger');
  }
}

// JSONエクスポート
async function exportAsJSON() {
  try {
    await exportMetadataAsJSON(filteredImages.value);
    showToast(t('export.successJson'), 'success');
  } catch (e) {
    console.error('JSON export failed:', e);
    showToast(t('export.failedJson'), 'danger');
  }
}

// トースト表示
async function showToast(message: string, color: string = 'primary') {
  const toast = await toastController.create({
    message,
    duration: 2000,
    color,
    position: 'bottom',
  });
  await toast.present();
}

// 設定ページに遷移
</script>

<style scoped>
/* ━━━ 一括操作ツールバー ━━━ */
.batch-toolbar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 200;
  background: var(--ion-background-color, #fff);
  border-top: 1px solid var(--ion-color-light-shade);
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.12);
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.batch-toolbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  gap: 8px;
}

.batch-left {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.batch-count {
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-primary);
  white-space: nowrap;
}

.batch-actions {
  display: flex;
  align-items: center;
  gap: 2px;
}

.gallery-controls {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: var(--ion-color-light);
  border-bottom: 1px solid var(--ion-color-light-shade);
}

.gallery-controls ion-select {
  max-width: 150px;
}

.count {
  font-size: 14px;
  color: var(--ion-color-medium);
}

.filter-chips {
  display: flex;
  gap: 8px;
  padding: 8px 16px;
  overflow-x: auto;
}

.filter-chips::-webkit-scrollbar {
  display: none;
}

.filter-chips ion-chip {
  margin: 0;
}

.tag-mode-chip {
  font-weight: 700;
  flex-shrink: 0;
}

/* フィルタボタンのバッジ位置 */
.filter-badge {
  position: absolute;
  top: 4px;
  right: 4px;
  font-size: 10px;
  min-width: 16px;
  height: 16px;
}

/* フィルタパネル内余白 */
.filter-panel-content ion-list {
  margin-bottom: 8px;
}

/* サイドメニューの底部 Safe Area 対応（Android ナビバー） */
.menu-content {
  --padding-bottom: env(safe-area-inset-bottom, 34px);
}

/* FAB ボタンの Safe Area 対応 */
ion-fab {
  margin-bottom: env(safe-area-inset-bottom, 16px);
  margin-right: env(safe-area-inset-right, 16px);
}

/* レスポンシブメニュー（IonSplitPane の代替） */
@media (min-width: 768px) {
  ion-menu {
    --width: 280px;
  }
}

</style>