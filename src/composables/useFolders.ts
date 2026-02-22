import { ref, computed } from 'vue';
import type { Folder } from '@/types/image';
import { getDB, idbRequest, STORE_FOLDERS, STORE_IMAGES } from '@/composables/useDatabase';

export function useFolders() {
  const folders = ref<Folder[]>([]);
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * 全フォルダを読み込み
   */
  async function loadFolders(): Promise<void> {
    try {
      isLoading.value = true;
      error.value = null;

      const db = await getDB();
      const tx = db.transaction([STORE_FOLDERS], 'readonly');
      folders.value = await idbRequest<Folder[]>(tx.objectStore(STORE_FOLDERS).getAll());
    } catch (e) {
      error.value = (e as Error).message;
      console.error('Failed to load folders:', e);
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * フォルダを作成
   */
  async function createFolder(name: string, color?: string): Promise<Folder> {
    try {
      const folder: Folder = {
        id: `folder_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name,
        createdAt: Date.now(),
        color,
      };

      const db = await getDB();
      const tx = db.transaction([STORE_FOLDERS], 'readwrite');
      await idbRequest(tx.objectStore(STORE_FOLDERS).add(folder));

      folders.value.push(folder);
      return folder;
    } catch (e) {
      error.value = (e as Error).message;
      console.error('Failed to create folder:', e);
      throw e;
    }
  }

  /**
   * フォルダ名を変更
   */
  async function renameFolder(folderId: string, newName: string): Promise<void> {
    try {
      const folder = folders.value.find(f => f.id === folderId);
      if (!folder) throw new Error('フォルダが見つかりません');

      folder.name = newName;

      const db = await getDB();
      const tx = db.transaction([STORE_FOLDERS], 'readwrite');
      await idbRequest(tx.objectStore(STORE_FOLDERS).put({ ...folder }));
    } catch (e) {
      error.value = (e as Error).message;
      console.error('Failed to rename folder:', e);
      throw e;
    }
  }

  /**
   * フォルダを削除
   */
  async function deleteFolder(folderId: string): Promise<void> {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_FOLDERS], 'readwrite');
      await idbRequest(tx.objectStore(STORE_FOLDERS).delete(folderId));

      folders.value = folders.value.filter(f => f.id !== folderId);
    } catch (e) {
      error.value = (e as Error).message;
      console.error('Failed to delete folder:', e);
      throw e;
    }
  }

  /**
   * フォルダIDからフォルダを取得
   */
  function getFolderById(folderId: string): Folder | undefined {
    return folders.value.find(f => f.id === folderId);
  }

  /**
   * フォルダ内の画像数を取得
   */
  async function getImageCountInFolder(folderId: string): Promise<number> {
    try {
      const db = await getDB();
      const tx = db.transaction([STORE_IMAGES], 'readonly');
      const index = tx.objectStore(STORE_IMAGES).index('folderId');
      return await idbRequest<number>(index.count(folderId));
    } catch (e) {
      console.error('Failed to get image count:', e);
      return 0;
    }
  }

  // フォルダを名前順にソート
  const sortedFolders = computed(() => {
    return [...folders.value].sort((a, b) => a.name.localeCompare(b.name));
  });

  return {
    folders,
    sortedFolders,
    isLoading,
    error,
    loadFolders,
    createFolder,
    renameFolder,
    deleteFolder,
    getFolderById,
    getImageCountInFolder,
  };
}
