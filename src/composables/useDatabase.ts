/**
 * useDatabase.ts
 * IndexedDB 接続のシングルトン管理。
 * スキーマ定義・マイグレーションはここだけに置く。
 *
 * 使い方:
 *   import { getDB, toPlainImage } from '@/composables/useDatabase';
 *   const db = await getDB();
 *   const tx = db.transaction(['images'], 'readwrite');
 */

import type { ImageData } from '@/types/image';

// ─── 定数 ────────────────────────────────────────────────
export const DB_NAME = 'NovelAIGallery';
export const DB_VERSION = 2;

export const STORE_IMAGES = 'images';
export const STORE_FOLDERS = 'folders';

// ─── シングルトン ─────────────────────────────────────────
let _db: IDBDatabase | null = null;
/** 接続が進行中の Promise（同時 open を防ぐ） */
let _opening: Promise<IDBDatabase> | null = null;

/**
 * DB 接続を返す。
 * 初回呼び出しで open し、以降はキャッシュを返す。
 */
export function getDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  if (_opening) return _opening;

  _opening = new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => {
      _opening = null;
      reject(new Error('IndexedDB を開けませんでした'));
    };

    request.onsuccess = (event) => {
      _db = (event.target as IDBOpenDBRequest).result;

      // 外部で close() された場合にキャッシュを破棄
      _db.onclose = () => {
        _db = null;
        _opening = null;
      };

      _opening = null;
      resolve(_db);
    };

    // ── スキーマ定義（ここだけに書く）──────────────────────
    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      const tx = (event.target as IDBOpenDBRequest).transaction!;

      // ── images ストア ──────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_IMAGES)) {
        const imageStore = db.createObjectStore(STORE_IMAGES, { keyPath: 'id' });
        imageStore.createIndex('dateAdded', 'dateAdded', { unique: false });
        imageStore.createIndex('seed',      'seed',      { unique: false });
        imageStore.createIndex('folderId',  'folderId',  { unique: false });
      } else {
        // v1 → v2 マイグレーション: folderId インデックスを追加
        const imageStore = tx.objectStore(STORE_IMAGES);
        if (!imageStore.indexNames.contains('folderId')) {
          imageStore.createIndex('folderId', 'folderId', { unique: false });
        }
      }

      // ── folders ストア ─────────────────────────────────
      if (!db.objectStoreNames.contains(STORE_FOLDERS)) {
        const folderStore = db.createObjectStore(STORE_FOLDERS, { keyPath: 'id' });
        folderStore.createIndex('createdAt', 'createdAt', { unique: false });
      }
    };
  });

  return _opening;
}

/**
 * テスト等でシングルトンを強制リセットする。
 * 通常のアプリコードからは呼ばない。
 */
export function _resetDB(): void {
  _db?.close();
  _db = null;
  _opening = null;
}

// ─── ユーティリティ ───────────────────────────────────────

/**
 * Vue の Proxy オブジェクトを IndexedDB に保存できる
 * プレーンな ImageData に変換する。
 * 各ファイルに同じコードが散らばっていたのをここに集約。
 */
export function toPlainImage(image: ImageData): ImageData {
  return {
    id:               image.id,
    fileName:         image.fileName,
    filePath:         image.filePath,
    thumbnailPath:    image.thumbnailPath,
    folderId:         image.folderId,
    prompt:           image.prompt,
    negativePrompt:   image.negativePrompt,
    seed:             image.seed,
    steps:            image.steps,
    cfgScale:         image.cfgScale,
    sampler:          image.sampler,
    characterPrompts: image.characterPrompts ? [...image.characterPrompts] : undefined,
    characterUCs:     image.characterUCs     ? [...image.characterUCs]     : undefined,
    dateAdded:        image.dateAdded,
    isFavorite:       image.isFavorite,
    tags:             [...image.tags],
  };
}

// ─── 汎用ヘルパー（IDBRequest → Promise）────────────────

export function idbRequest<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror   = () => reject(req.error);
  });
}
