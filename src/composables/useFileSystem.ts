import { ref } from 'vue';
import type { ImageData } from '@/types/image';
import { Capacitor } from '@capacitor/core';
import { FilePicker } from '@capawesome/capacitor-file-picker';
import { getDB, toPlainImage, idbRequest, STORE_IMAGES } from '@/composables/useDatabase';

export function useFileSystem() {
  const isProcessing = ref(false);
  const progress = ref(0);
  const error = ref<string | null>(null);

  /**
   * ファイルピッカーを開いて画像を選択
   * Capacitor File Picker を使用して、すべてのファイルプロバイダー（Dropbox、OneDrive等）をサポート
   */
  async function pickFiles(): Promise<File[]> {
    if (Capacitor.isNativePlatform()) {
      // ネイティブ環境: Capacitor File Picker を使用（SAF 対応）
      try {
        // pickFiles() を使用（PhotoPicker のバグを回避）
        const result = await FilePicker.pickFiles({
          types: ['image/*'],  // 画像のみ
        });

        if (!result.files || result.files.length === 0) {
          return [];
        }

        // ファイルデータから File オブジェクトに変換
        const files: File[] = [];
        for (const fileData of result.files) {
          try {
            // MIME タイプを取得
            const mimeType = fileData.mimeType || 'image/png';
            const fileName = fileData.name || `image_${Date.now()}.${mimeType.split('/')[1]}`;

            let file: File;

            // Web 環境の場合は blob を使用
            if (fileData.blob) {
              file = new File([fileData.blob], fileName, { type: mimeType });
              console.log(`✓ Loaded from blob: ${fileName}`);
            }
            // ネイティブ環境の場合は path から読み込み
            else if (fileData.path) {
              // path から Blob を作成
              const response = await fetch(Capacitor.convertFileSrc(fileData.path));
              const blob = await response.blob();
              file = new File([blob], fileName, { type: mimeType });
              console.log(`✓ Loaded from path: ${fileName}`);
            }
            // フォールバック: data が存在する場合（Base64）
            else if (fileData.data) {
              const cleanBase64 = fileData.data.includes(',') 
                ? fileData.data.split(',')[1] 
                : fileData.data;
              const blob = base64ToBlob(cleanBase64, mimeType);
              file = new File([blob], fileName, { type: mimeType });
              console.log(`✓ Loaded from base64: ${fileName}`);
            }
            else {
              console.error('File has no data, blob, or path:', fileData);
              continue;
            }

            files.push(file);
          } catch (err) {
            console.error('Failed to process file from picker:', err);
          }
        }

        return filterValidFiles(files);
      } catch (err) {
        // ネイティブでの Cancel やエラーは空配列で返す。
        // pickFilesWeb へのフォールバックは Android WebView で動作しないため行わない。
        console.log('File picker cancelled or failed on native:', err);
        return [];
      }
    } else {
      // Web環境: 標準の input 要素を使用
      return pickFilesWeb();
    }
  }

  /**
   * Web 環境用のファイルピッカー（フォールバック）
   */
  async function pickFilesWeb(): Promise<File[]> {
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      input.multiple = true;

      input.onchange = async (event) => {
        const files = Array.from((event.target as HTMLInputElement).files || []);
        resolve(filterValidFiles(files));
      };

      input.oncancel = () => resolve([]);
      input.onerror = (err) => {
        console.error('File input error:', err);
        resolve([]);
      };

      input.click();
    });
  }


  /**
   * ファイルが有効な画像タイプかチェック
   */
  function isValidImageType(file: File): boolean {
    const isPng = file.type === 'image/png' || file.name.toLowerCase().endsWith('.png');
    const isWebp = file.type === 'image/webp' || file.name.toLowerCase().endsWith('.webp');
    return isPng || isWebp;
  }

  /**
   * 有効なファイルのみをフィルタ（Web環境用）
   */
  function filterValidFiles(files: File[]): File[] {
    const validFiles = files.filter(isValidImageType);

    if (validFiles.length < files.length) {
      const skipped = files.length - validFiles.length;
      console.warn(`${skipped}件の画像がスキップされました（PNG/WebP のみ対応）`);
    }

    return validFiles;
  }

  /**
   * File を Base64 に変換
   */
  async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // data:image/png;base64, の部分を削除
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsDataURL(file);
    });
  }

  /**
   * Base64 を Blob に変換
   */
  function base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Fileオブジェクトをdata URLに変換
   */
  async function fileToDataURL(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        resolve(reader.result as string);
      };
      reader.onerror = () => {
        reject(new Error('ファイルの読み込みに失敗しました'));
      };
      reader.readAsDataURL(file);
    });
  }

  /**
   * 画像をIndexedDBに保存
   */
  async function saveImageToStorage(
    imageData: ImageData,
    file: File,
    thumbnail: string
  ): Promise<ImageData> {
    try {
      // ファイルをData URLに変換
      const dataURL = await fileToDataURL(file);

      // ImageDataを更新
      const updatedImageData = {
        ...imageData,
        filePath: dataURL,
        thumbnailPath: thumbnail,
      };

      // IndexedDBに保存（オプション）
      await saveToIndexedDB(updatedImageData);

      return updatedImageData;
    } catch (e) {
      console.error('Failed to save image:', e);
      throw e;
    }
  }

  /**
   * IndexedDBに画像データを保存
   */
  async function saveToIndexedDB(imageData: ImageData): Promise<void> {
    const db = await getDB();
    const tx = db.transaction([STORE_IMAGES], 'readwrite');
    await idbRequest(tx.objectStore(STORE_IMAGES).put(toPlainImage(imageData)));
  }

  /**
   * IndexedDBから全画像を読み込み
   */
  async function loadAllFromIndexedDB(): Promise<ImageData[]> {
    const db = await getDB();
    if (!db.objectStoreNames.contains(STORE_IMAGES)) return [];
    const tx = db.transaction([STORE_IMAGES], 'readonly');
    return idbRequest<ImageData[]>(tx.objectStore(STORE_IMAGES).getAll());
  }

  /**
   * IndexedDBから画像を削除
   */
  async function deleteFromIndexedDB(id: string): Promise<void> {
    const db = await getDB();
    const tx = db.transaction([STORE_IMAGES], 'readwrite');
    await idbRequest(tx.objectStore(STORE_IMAGES).delete(id));
  }

  /**
   * 複数画像を一括処理
   */
  async function processMultipleFiles(
    files: File[],
    onProgress?: (current: number, total: number) => void
  ): Promise<{ file: File; dataURL: string; thumbnail: string }[]> {
    isProcessing.value = true;
    error.value = null;
    progress.value = 0;

    const results = [];

    for (let i = 0; i < files.length; i++) {
      try {
        const file = files[i];
        const dataURL = await fileToDataURL(file);
        
        // サムネイル生成は別関数で行う想定
        const thumbnail = dataURL; // 仮: 実際はuseImageMetadata.generateThumbnailを使用

        results.push({ file, dataURL, thumbnail });

        progress.value = ((i + 1) / files.length) * 100;
        if (onProgress) {
          onProgress(i + 1, files.length);
        }
      } catch (e) {
        console.error(`Failed to process file ${files[i].name}:`, e);
      }
    }

    isProcessing.value = false;
    return results;
  }

  return {
    isProcessing,
    progress,
    error,
    pickFiles,
    fileToDataURL,
    saveImageToStorage,
    saveToIndexedDB,
    loadAllFromIndexedDB,
    deleteFromIndexedDB,
    processMultipleFiles,
  };
}