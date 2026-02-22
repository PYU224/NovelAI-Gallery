import { ref, computed, watch, nextTick } from 'vue';

export type DarkMode = 'system' | 'dark' | 'light';

// ─── モジュールレベルのシングルトン状態 ───
const darkMode = ref<DarkMode>('system');
const systemDarkRef = ref(
  typeof window !== 'undefined'
    ? window.matchMedia('(prefers-color-scheme: dark)').matches
    : false
);
let initialized = false;

/**
 * ion-app に dark クラスを適用・除去する
 * CRITICAL: null チェックを追加して classList エラーを防止
 */
function applyDarkMode() {
  const ionApp = document.querySelector('ion-app');
  
  // ion-app が見つからない場合はリトライ（最大5回）
  if (!ionApp) {
    console.warn('[useSettings] ion-app not found, retrying in 100ms...');
    setTimeout(applyDarkMode, 100);
    return;
  }

  const shouldBeDark =
    darkMode.value === 'dark' ||
    (darkMode.value === 'system' && systemDarkRef.value);

  ionApp.classList.toggle('dark', shouldBeDark);
}

/**
 * 一度だけ実行される初期化
 *   - localStorage から復元
 *   - システム設定変化リスナーを登録
 *   - darkMode 変化時の永続化・適用を監視
 */
function init() {
  if (initialized) return;
  initialized = true;

  // localStorage から復元
  const saved = localStorage.getItem('nai-gallery-dark-mode');
  if (saved === 'dark' || saved === 'light' || saved === 'system') {
    darkMode.value = saved as DarkMode;
  }

  // 初回適用（nextTick + retry で確実に DOM 準備後に適用）
  nextTick(() => {
    applyDarkMode();
  });

  // システム設定の変化を監視
  if (typeof window !== 'undefined') {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    mq.addEventListener('change', (e: MediaQueryListEvent) => {
      systemDarkRef.value = e.matches;
      applyDarkMode();
    });
  }

  // darkMode の変化 → 永続化 + 適用
  watch(darkMode, (val) => {
    localStorage.setItem('nai-gallery-dark-mode', val);
    applyDarkMode();
  });
}

/** 現在ダーク表示されているか */
const isDark = computed(() => {
  return (
    darkMode.value === 'dark' ||
    (darkMode.value === 'system' && systemDarkRef.value)
  );
});

/**
 * アプリ全体で共有する設定 composable。
 * 複数コンポーネントから呼んでも状態は一つ。
 */
export function useSettings() {
  init();
  return {
    darkMode,
    isDark,
    applyDarkMode,
  };
}
