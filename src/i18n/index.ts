import { createI18n } from 'vue-i18n';
import ja from './locales/ja.json';
import en from './locales/en.json';

export type Locale = 'ja' | 'en' | 'system';

/**
 * ブラウザのシステム言語から適切なロケールを取得
 */
function getSystemLocale(): 'ja' | 'en' {
  const browserLang = navigator.language.toLowerCase();
  // 日本語なら ja、それ以外は en
  return browserLang.startsWith('ja') ? 'ja' : 'en';
}

/**
 * localStorage から保存された言語設定を取得
 * system の場合はシステム言語を返す
 */
function getSavedLocale(): 'ja' | 'en' {
  const saved = localStorage.getItem('nai-gallery-locale') as Locale | null;
  
  if (!saved || saved === 'system') {
    return getSystemLocale();
  }
  
  return saved;
}

const i18n = createI18n({
  legacy: false, // Composition API モード
  locale: getSavedLocale(),
  fallbackLocale: 'en',
  messages: {
    ja,
    en,
  },
});

export default i18n;

/**
 * ロケールを変更して localStorage に保存
 */
export function setLocale(locale: Locale) {
  localStorage.setItem('nai-gallery-locale', locale);
  
  const actualLocale = locale === 'system' ? getSystemLocale() : locale;
  i18n.global.locale.value = actualLocale;
}

/**
 * 現在保存されている言語設定を取得（'system' を含む）
 */
export function getCurrentLocaleSetting(): Locale {
  const saved = localStorage.getItem('nai-gallery-locale') as Locale | null;
  return saved || 'system';
}
