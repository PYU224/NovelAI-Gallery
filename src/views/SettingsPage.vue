<template>
  <ion-page>
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-back-button default-href="/home" />
        </ion-buttons>
        <ion-title>{{ $t('settings.title') }}</ion-title>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <!-- ─── 表示設定 ─── -->
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t('settings.display.title') }}</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-icon :icon="contrastOutline" slot="start" color="primary" />
          <ion-label>{{ $t('settings.display.darkMode') }}</ion-label>
          <ion-select v-model="darkMode" interface="popover" slot="end">
            <ion-select-option value="system">{{ $t('settings.display.darkModeOptions.system') }}</ion-select-option>
            <ion-select-option value="dark">{{ $t('settings.display.darkModeOptions.dark') }}</ion-select-option>
            <ion-select-option value="light">{{ $t('settings.display.darkModeOptions.light') }}</ion-select-option>
          </ion-select>
        </ion-item>

        <ion-item>
          <ion-icon :icon="languageOutline" slot="start" color="primary" />
          <ion-label>{{ $t('settings.display.language') }}</ion-label>
          <ion-select v-model="locale" interface="popover" slot="end" @ionChange="handleLocaleChange">
            <ion-select-option value="system">{{ $t('settings.display.languageOptions.system') }}</ion-select-option>
            <ion-select-option value="ja">{{ $t('settings.display.languageOptions.ja') }}</ion-select-option>
            <ion-select-option value="en">{{ $t('settings.display.languageOptions.en') }}</ion-select-option>
          </ion-select>
        </ion-item>
      </ion-list>

      <!-- ─── データ管理 ─── -->
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t('settings.dataManagement.title') }}</ion-label>
        </ion-list-header>

        <ion-item button @click="clearAllData" lines="inset">
          <ion-icon :icon="trashOutline" slot="start" color="danger" />
          <ion-label color="danger">
            <h3>{{ $t('settings.dataManagement.clearAll') }}</h3>
            <p>{{ $t('settings.dataManagement.clearAllDesc') }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- ─── アプリ情報 ─── -->
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t('settings.appInfo.title') }}</ion-label>
        </ion-list-header>

        <!-- アイコン＋名称＋バージョン -->
        <div class="app-header">
          <div class="app-icon-wrap">
            <img src="/assets/icon.png" alt="App Icon" class="app-icon" />
          </div>
          <h1 class="app-name">NovelAI Gallery</h1>
          <p class="app-meta">{{ $t('settings.appInfo.version') }} {{ appVersion }}</p>
          <p class="app-meta">{{ $t('settings.appInfo.buildDate') }}: {{ buildDate }}</p>
        </div>

        <!-- 概要 -->
        <ion-item lines="none">
          <ion-label>
            <p class="description">
              {{ $t('settings.description') }}
            </p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- ─── 主な機能 ─── -->
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t('settings.features.title') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="imageOutline" slot="start" color="primary" />
          <ion-label>
            <h3>{{ $t('settings.features.imageImport.title') }}</h3>
            <p>{{ $t('settings.features.imageImport.description') }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="folderOutline" slot="start" color="primary" />
          <ion-label>
            <h3>{{ $t('settings.features.folderManagement.title') }}</h3>
            <p>{{ $t('settings.features.folderManagement.description') }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="heart" slot="start" color="primary" />
          <ion-label>
            <h3>{{ $t('settings.features.favorites.title') }}</h3>
            <p>{{ $t('settings.features.favorites.description') }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="searchOutline" slot="start" color="primary" />
          <ion-label>
            <h3>{{ $t('settings.features.search.title') }}</h3>
            <p>{{ $t('settings.features.search.description') }}</p>
          </ion-label>
        </ion-item>

        <ion-item lines="inset">
          <ion-icon :icon="swapHorizontalOutline" slot="start" color="primary" />
          <ion-label>
            <h3>{{ $t('settings.features.swipe.title') }}</h3>
            <p>{{ $t('settings.features.swipe.description') }}</p>
          </ion-label>
        </ion-item>
      </ion-list>

      <!-- ─── 開発者 ─── -->
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t('settings.developer.title') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="personOutline" slot="start" color="primary" />
          <ion-label>PYU</ion-label>
          <ion-note slot="end">{{ $t('settings.developer.role') }}</ion-note>
        </ion-item>

        <ion-item button lines="inset" @click="openGitHub">
          <ion-icon :icon="logoGithub" slot="start" color="primary" />
          <ion-label>GitHub</ion-label>
          <ion-note slot="end">PYU224</ion-note>
          <ion-icon :icon="openOutline" slot="end" class="open-icon" />
        </ion-item>
      </ion-list>

      <!-- ─── その他 ─── -->
      <ion-list>
        <ion-list-header>
          <ion-label>{{ $t('settings.other.title') }}</ion-label>
        </ion-list-header>

        <ion-item lines="inset">
          <ion-icon :icon="documentTextOutline" slot="start" color="primary" />
          <ion-label>{{ $t('settings.other.license') }}</ion-label>
          <ion-note slot="end">MIT License</ion-note>
        </ion-item>

        <!-- 技術スタック -->
        <ion-item lines="none">
          <ion-label>
            <div class="tech-chips">
              <ion-chip color="primary" outline>
                <ion-label>Vue 3</ion-label>
              </ion-chip>
              <ion-chip color="primary" outline>
                <ion-label>TypeScript</ion-label>
              </ion-chip>
              <ion-chip color="primary" outline>
                <ion-label>Ionic</ion-label>
              </ion-chip>
              <ion-chip color="primary" outline>
                <ion-label>Capacitor</ion-label>
              </ion-chip>
              <ion-chip color="primary" outline>
                <ion-label>IndexedDB</ion-label>
              </ion-chip>
            </div>
          </ion-label>
        </ion-item>

        <ion-item lines="none">
          <ion-label>
            <p class="copyright">{{ $t('settings.copyright', { year: currentYear }) }}</p>
          </ion-label>
        </ion-item>
      </ion-list>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue';
import {
  IonPage,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonBackButton,
  IonTitle,
  IonContent,
  IonList,
  IonListHeader,
  IonItem,
  IonLabel,
  IonIcon,
  IonSelect,
  IonSelectOption,
  IonNote,
  IonChip,
  menuController,
  alertController,
  useIonRouter,
} from '@ionic/vue';
import {
  contrastOutline,
  languageOutline,
  imageOutline,
  folderOutline,
  heart,
  searchOutline,
  swapHorizontalOutline,
  personOutline,
  documentTextOutline,
  logoGithub,
  openOutline,
  trashOutline,
} from 'ionicons/icons';
import { useSettings } from '@/composables/useSettings';
import { getCurrentLocaleSetting, setLocale, type Locale } from '@/i18n';
import { useI18n } from 'vue-i18n';

// ─── Router ───
const ionRouter = useIonRouter();

// ─── 多言語対応 ───
const { t } = useI18n();

// ─── 設定状態 ───
const { darkMode } = useSettings();
const locale = ref<Locale>(getCurrentLocaleSetting());

// ─── アプリ情報 ───
const appVersion = '1.0.0';
const buildDate = new Date().toLocaleDateString(locale.value === 'ja' ? 'ja-JP' : 'en-US');
const currentYear = new Date().getFullYear();

// ─── 初期化処理 ───
onMounted(async () => {
  console.log('[SettingsPage] Mounted');
  
  // Capacitorエラーの抑制を再度設定（念のため）
  const handleCapacitorError = (event: PromiseRejectionEvent) => {
    if (
      event.reason instanceof Error &&
      event.reason.message.includes('message channel closed')
    ) {
      console.warn('[SettingsPage] Suppressed Capacitor error:', event.reason.message);
      event.preventDefault();
    }
  };
  
  window.addEventListener('unhandledrejection', handleCapacitorError);
  
  // 設定ページを開いた時にメニューを閉じる
  try {
    await menuController.close();
    console.log('[SettingsPage] Menu closed');
  } catch (e) {
    console.warn('[SettingsPage] Failed to close menu:', e);
  }
});

onBeforeUnmount(() => {
  console.log('[SettingsPage] Before unmount - navigating away from settings');
});

// ─── 言語変更ハンドラ ───
function handleLocaleChange() {
  console.log('[SettingsPage] Locale changed to:', locale.value);
  setLocale(locale.value);
}

// ─── GitHub リンク ───
function openGitHub() {
  window.open('https://github.com/PYU224/NovelAI-Gallery.git', '_blank', 'noopener,noreferrer');
}

// ─── データクリア ───
async function clearAllData() {
  const alert = await alertController.create({
    header: t('settings.dataManagement.confirmTitle'),
    message: t('settings.dataManagement.confirmMessage'),
    buttons: [
      {
        text: t('settings.dataManagement.cancelButton'),
        role: 'cancel',
      },
      {
        text: t('settings.dataManagement.confirmButton'),
        role: 'destructive',
        handler: async () => {
          try {
            console.log('[SettingsPage] Clearing all data...');
            
            // IndexedDBをクリア
            const databases = await window.indexedDB.databases();
            for (const db of databases) {
              if (db.name) {
                console.log('[SettingsPage] Deleting database:', db.name);
                window.indexedDB.deleteDatabase(db.name);
              }
            }
            
            // LocalStorageをクリア
            localStorage.clear();
            
            // SessionStorageをクリア
            sessionStorage.clear();
            
            console.log('[SettingsPage] All data cleared');
            
            const successAlert = await alertController.create({
              header: t('settings.dataManagement.successTitle'),
              message: t('settings.dataManagement.successMessage'),
              buttons: [{
                text: t('settings.dataManagement.okButton'),
                handler: () => { window.location.reload(); }
              }]
            });
            await successAlert.present();
          } catch (error) {
            console.error('[SettingsPage] Failed to clear data:', error);
            const errorAlert = await alertController.create({
              header: t('settings.dataManagement.errorTitle'),
              message: t('settings.dataManagement.errorMessage'),
              buttons: [t('settings.dataManagement.okButton')]
            });
            await errorAlert.present();
          }
        }
      }
    ]
  });
  
  await alert.present();
}
</script>

<style scoped>
/* ─── アプリヘッダー ─── */
.app-header {
  text-align: center;
  padding: 28px 16px 20px;
}

.app-icon-wrap {
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.app-icon {
  width: 88px;
  height: 88px;
  border-radius: 20px;
  box-shadow: 0 3px 10px rgba(0, 0, 0, 0.18);
  object-fit: cover;
}

.app-name {
  font-size: 22px;
  font-weight: 700;
  margin: 0 0 6px;
  color: var(--ion-color-primary);
}

.app-meta {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 2px 0;
}

/* ─── 概要テキスト ─── */
.description {
  font-size: 14px;
  line-height: 1.6;
  color: var(--ion-color-medium);
  margin: 10px 0;
}

/* ─── 機能リスト ─── */
ion-item h3 {
  font-size: 15px;
  font-weight: 600;
  margin: 0 0 2px;
}

ion-item p {
  font-size: 13px;
  color: var(--ion-color-medium);
  margin: 0;
}

/* ─── GitHub の外部リンクアイコン ─── */
.open-icon {
  opacity: 0.45;
  font-size: 16px;
  margin-left: 4px;
}

/* ─── 技術スタック チップ ─── */
.tech-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 10px 0;
}

.tech-chips ion-chip {
  margin: 0;
  --background: transparent;
}

/* ─── コピーライト ─── */
.copyright {
  font-size: 13px;
  color: var(--ion-color-medium);
  text-align: center;
  margin: 4px 0 12px;
}
</style>