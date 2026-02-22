<template>
  <ion-app>
    <!-- サイドメニュー -->
    <ion-menu content-id="main-content" type="overlay">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ $t('home.filter') }}</ion-title>
        </ion-toolbar>
      </ion-header>

      <ion-content class="menu-content">
        <ion-list>
          <!-- すべて -->
          <ion-item button @click="clearAllFilters">
            <ion-icon :icon="imagesOutline" slot="start" />
            <ion-label>{{ $t('home.all') }}</ion-label>
            <ion-badge v-if="galleryData">{{ galleryData.totalImages }}</ion-badge>
          </ion-item>

          <!-- お気に入り -->
          <ion-item button @click="filterFavorites">
            <ion-icon :icon="heart" slot="start" />
            <ion-label>{{ $t('home.favorites') }}</ion-label>
          </ion-item>

          <!-- フォルダ -->
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ $t('home.folders', { count: galleryData?.folders?.length ?? 0 }) }}</ion-label>
              <!-- 新規フォルダ作成ボタン -->
              <ion-button
                slot="end"
                fill="clear"
                size="small"
                @click.stop="showCreateFolderPrompt"
              >
                <ion-icon :icon="addOutline" slot="icon-only" />
              </ion-button>
            </ion-item-divider>

            <!-- 未分類 -->
            <ion-item
              button
              :detail="false"
              @click="filterByFolder(null)"
            >
              <ion-icon :icon="folderOutline" slot="start" color="medium" />
              <ion-label>{{ $t('home.uncategorized') }}</ion-label>
              <ion-badge slot="end" color="medium">{{ galleryData?.rootImageCount ?? 0 }}</ion-badge>
            </ion-item>

            <!-- 作成済みフォルダ一覧 -->
            <ion-item
              v-for="folder in galleryData?.folders ?? []"
              :key="folder.id"
              button
              :detail="false"
              @click="filterByFolder(folder.id)"
              @contextmenu.prevent="showFolderActions(folder)"
              @touchstart="startFolderLongPress($event, folder)"
              @touchend="cancelFolderLongPress"
              @touchmove="cancelFolderLongPress"
            >
              <ion-icon
                :icon="folderOutline"
                slot="start"
                :style="folder.color ? `color: ${folder.color}` : ''"
              />
              <ion-label>{{ folder.name }}</ion-label>
              <ion-badge slot="end" color="medium">
                {{ galleryData?.folderImageCounts?.[folder.id] ?? 0 }}
              </ion-badge>
            </ion-item>
          </ion-item-group>

          <!-- 人気のタグ -->
          <ion-item-group v-if="galleryData && galleryData.popularTags.length > 0">
            <ion-item-divider>
              <ion-label>{{ $t('home.popularTags') }}</ion-label>
            </ion-item-divider>

            <ion-item
              v-for="tag in galleryData.popularTags.slice(0, 10)"
              :key="tag.name"
              button
              @click="addTagFilter(tag.name)"
              :detail="false"
            >
              <ion-label>{{ tag.name }}</ion-label>
              <ion-badge slot="end">{{ tag.count }}</ion-badge>
            </ion-item>
          </ion-item-group>

          <!-- その他 -->
          <ion-item-group>
            <ion-item-divider>
              <ion-label>{{ $t('home.other') }}</ion-label>
            </ion-item-divider>

            <ion-item button router-link="/home" router-direction="root">
              <ion-icon :icon="homeOutline" slot="start" />
              <ion-label>{{ $t('home.menu.home') }}</ion-label>
            </ion-item>

            <ion-item button router-link="/settings" router-direction="forward">
              <ion-icon :icon="settingsOutline" slot="start" />
              <ion-label>{{ $t('home.menu.settings') }}</ion-label>
            </ion-item>

            <!-- アプリ情報 -->
            <ion-item lines="none">
              <ion-label>
                <p class="version">NovelAI Gallery v1.0.0</p>
              </ion-label>
            </ion-item>
          </ion-item-group>
        </ion-list>
      </ion-content>
    </ion-menu>

    <!-- メインコンテンツ -->
    <ion-router-outlet id="main-content" :animated="false" />
  </ion-app>
</template>

<script setup lang="ts">
import { ref, onMounted, provide } from 'vue';
import {
  IonApp,
  IonRouterOutlet,
  IonMenu,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonContent,
  IonList,
  IonItem,
  IonItemGroup,
  IonItemDivider,
  IonLabel,
  IonIcon,
  IonBadge,
  IonButton,
  menuController,
} from '@ionic/vue';
import {
  homeOutline,
  settingsOutline,
  imagesOutline,
  heart,
  folderOutline,
  addOutline,
} from 'ionicons/icons';
import { useSettings } from '@/composables/useSettings';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
const { applyDarkMode } = useSettings();

// ギャラリーデータ（HomePageから受け取る）
interface GalleryData {
  totalImages: number;
  popularTags: Array<{ name: string; count: number }>;
  folders: Array<{ id: string; name: string; color?: string }>;
  folderImageCounts: Record<string, number>;
  rootImageCount: number;
}

const galleryData = ref<GalleryData | null>(null);

// フィルタ・フォルダ操作コールバック（HomePageから注入される）
const filterCallbacks = ref({
  clearAllFilters: () => {},
  filterFavorites: () => {},
  addTagFilter: (_tag: string) => {},
  filterByFolder: (_folderId: string | null) => {},
  showCreateFolderPrompt: () => {},
  showFolderActions: (_folder: any) => {},
});

// ギャラリーデータ更新（HomePageが呼ぶ）
function updateGalleryData(data: GalleryData) {
  galleryData.value = data;
}

// コールバック更新（HomePageが呼ぶ）
function updateFilterCallbacks(callbacks: typeof filterCallbacks.value) {
  filterCallbacks.value = callbacks;
}

provide('updateGalleryData', updateGalleryData);
provide('updateFilterCallbacks', updateFilterCallbacks);

// ── メニューアクション ──────────────────────────────────────
async function closeMenu() {
  await menuController.close();
}

function clearAllFilters() {
  filterCallbacks.value.clearAllFilters();
  closeMenu();
}

function filterFavorites() {
  filterCallbacks.value.filterFavorites();
  closeMenu();
}

function addTagFilter(tag: string) {
  filterCallbacks.value.addTagFilter(tag);
  closeMenu();
}

function filterByFolder(folderId: string | null) {
  filterCallbacks.value.filterByFolder(folderId);
  closeMenu();
}

function showCreateFolderPrompt() {
  filterCallbacks.value.showCreateFolderPrompt();
  // フォルダ作成は HomePage 側のダイアログが開くのでメニューは閉じる
  closeMenu();
}

function showFolderActions(folder: any) {
  filterCallbacks.value.showFolderActions(folder);
  closeMenu();
}

// フォルダ長押し検出（サイドメニュー内）
let folderLongPressTimer: number | null = null;

function startFolderLongPress(event: TouchEvent, folder: any) {
  folderLongPressTimer = window.setTimeout(() => {
    if ('vibrate' in navigator) navigator.vibrate(40);
    showFolderActions(folder);
  }, 500);
}

function cancelFolderLongPress() {
  if (folderLongPressTimer !== null) {
    clearTimeout(folderLongPressTimer);
    folderLongPressTimer = null;
  }
}

onMounted(() => {
  applyDarkMode();
});
</script>

<style scoped>
.menu-content {
  --padding-bottom: calc(80px + env(safe-area-inset-bottom, 34px));
}

.version {
  font-size: 12px;
  color: var(--ion-color-medium);
  margin: 4px 0 8px;
  text-align: center;
}

ion-content {
  --padding-bottom: env(safe-area-inset-bottom, 34px);
}

/* フォルダ divider 内の + ボタン位置調整 */
ion-item-divider {
  --padding-end: 4px;
}
</style>
