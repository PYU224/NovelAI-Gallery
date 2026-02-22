<!-- 
  NovelAI Gallery - ImageViewer.vue
  修正箇所:
  1. showNearbyModal stateを追加
  2. shareImage関数を実装
  3. Nearbyモーダルを追加
-->

<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$emit('close')">
            <ion-icon :icon="close" />
          </ion-button>
        </ion-buttons>
        <ion-buttons slot="end">
          <ion-button @click="toggleFavorite">
            <ion-icon
              :icon="image?.isFavorite ? heart : heartOutline"
              :color="image?.isFavorite ? 'danger' : undefined"
            />
          </ion-button>
          <ion-button @click="openEditModal">
            <ion-icon :icon="createOutline" />
          </ion-button>
          <!-- ⚡ 修正: shareImage関数を呼び出し -->
          <ion-button @click="shareImage">
            <ion-icon :icon="shareOutline" />
          </ion-button>
          <ion-button @click="confirmDelete" color="danger">
            <ion-icon :icon="trashOutline" />
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="image" class="viewer-content">
        <!-- ファイル名（固定表示） -->
        <div class="filename-header">
          <ion-icon :icon="documentTextOutline" />
          <span class="filename-text">{{ image.fileName }}</span>
        </div>

        <!-- 画像表示 -->
        <div 
          class="image-container"
          @touchstart="handleTouchStart"
          @touchend="handleTouchEnd"
        >
          <ion-img
            :src="image.filePath"
            :alt="image.fileName"
          />
        </div>

        <!-- メタデータ表示 -->
        <div class="metadata-section">
          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ t('viewer.prompt') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="prompt-text">{{ image.prompt || '（なし）' }}</p>
            </ion-card-content>
          </ion-card>

          <ion-card v-if="image.negativePrompt">
            <ion-card-header>
              <ion-card-title>{{ t('viewer.negativePrompt') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <p class="prompt-text">{{ image.negativePrompt }}</p>
            </ion-card-content>
          </ion-card>

          <!-- キャラクタープロンプト -->
          <ion-card v-if="image.characterPrompts && image.characterPrompts.length > 0">
            <ion-card-header>
              <ion-card-title>{{ t('viewer.characterReference') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div
                v-for="(charPrompt, index) in image.characterPrompts"
                :key="index"
                class="character-prompt-item"
              >
                <h4>{{ t('viewer.characterReference') }} {{ index + 1 }}</h4>
                <p class="prompt-text">{{ charPrompt }}</p>
                <p
                  v-if="image.characterUCs && image.characterUCs[index]"
                  class="character-uc"
                >
                  <strong>UC:</strong> {{ image.characterUCs[index] }}
                </p>
              </div>
            </ion-card-content>
          </ion-card>

          <ion-card>
            <ion-card-header>
              <ion-card-title>{{ t('viewer.generationSettings') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <ion-list lines="none">
                <ion-item>
                  <ion-label>
                    <h3>{{ t('viewer.seed') }}</h3>
                    <p>{{ image.seed }}</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>
                    <h3>{{ t('viewer.steps') }}</h3>
                    <p>{{ image.steps }}</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>
                    <h3>{{ t('viewer.cfgScale') }}</h3>
                    <p>{{ image.cfgScale }}</p>
                  </ion-label>
                </ion-item>
                <ion-item>
                  <ion-label>
                    <h3>{{ t('viewer.sampler') }}</h3>
                    <p>{{ image.sampler }}</p>
                  </ion-label>
                </ion-item>
              </ion-list>
            </ion-card-content>
          </ion-card>

          <ion-card v-if="image.tags.length > 0">
            <ion-card-header>
              <ion-card-title>{{ t('viewer.tags') }}</ion-card-title>
            </ion-card-header>
            <ion-card-content>
              <div class="tags-container">
                <ion-chip
                  v-for="tag in image.tags"
                  :key="tag"
                  @click="$emit('tag-click', tag)"
                >
                  <ion-label>{{ tag }}</ion-label>
                </ion-chip>
              </div>
            </ion-card-content>
          </ion-card>
        </div>
      </div>
    </ion-content>

    <!-- ⚡ 新規追加: Nearby共有モーダル -->
    <ion-modal :is-open="showNearbyModal" @didDismiss="showNearbyModal = false">
      <ion-header>
        <ion-toolbar>
          <ion-title>{{ t('viewer.shareNearby', '近くのデバイスと共有') }}</ion-title>
          <ion-buttons slot="end">
            <ion-button @click="showNearbyModal = false">{{ t('viewer.close', '閉じる') }}</ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="ion-padding">
        <NearbyShare
          v-if="image"
          transfer-type="file"
          :file-uri="image.filePath"
          :file-name="image.fileName"
          :file-size="getFileSize(image)"
          :mime-type="getMimeType(image.fileName)"
          service-id="io.novelai.nearby"
        />
      </ion-content>
    </ion-modal>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonIcon,
  IonTitle,
  IonContent,
  IonImg,
  IonCard,
  IonCardHeader,
  IonCardTitle,
  IonCardContent,
  IonList,
  IonItem,
  IonLabel,
  IonChip,
  alertController,
} from '@ionic/vue';
import {
  close,
  heart,
  heartOutline,
  createOutline,
  shareOutline,
  trashOutline,
  documentTextOutline,
} from 'ionicons/icons';
// ⚡ 新規追加: NearbyShareコンポーネントをインポート
import NearbyShare from '@/components/NearbyShare.vue';
import type { ImageData } from '@/types/image';

interface Props {
  isOpen: boolean;
  image: ImageData | null;
}

interface Emits {
  (e: 'close'): void;
  (e: 'previous'): void;
  (e: 'next'): void;
  (e: 'toggle-favorite'): void;
  (e: 'delete-image'): void;
  (e: 'edit-image'): void;
  (e: 'tag-click', tag: string): void;
}

const props = defineProps<Props>();
const emit = defineEmits<Emits>();

// 多言語対応
const { t } = useI18n();

// ⚡ 新規追加: Nearbyモーダルの表示状態
const showNearbyModal = ref(false);

function toggleFavorite() {
  emit('toggle-favorite');
}

async function confirmDelete() {
  const alert = await alertController.create({
    header: t('home.dialogs.deleteImage.title'),
    message: t('home.dialogs.deleteImage.message'),
    buttons: [
      {
        text: t('home.dialogs.deleteImage.cancel'),
        role: 'cancel',
      },
      {
        text: t('home.dialogs.deleteImage.confirm'),
        role: 'destructive',
        handler: () => {
          emit('delete-image');
        },
      },
    ],
  });

  await alert.present();
}

function openEditModal() {
  emit('edit-image');
}

// ⚡ 修正: Nearby共有機能を実装
function shareImage() {
  if (!props.image) {
    console.error('No image to share');
    return;
  }
  showNearbyModal.value = true;
}

// ⚡ 新規追加: ファイルサイズを取得（推定）
function getFileSize(image: ImageData): number {
  // 実際のファイルサイズが取得できない場合は推定値を返す
  // TODO: Capacitor Filesystemを使って実際のサイズを取得する実装を追加
  
  // 画像サイズから推定（粗い計算）
  // 一般的なPNG: 幅 × 高さ × 4バイト（RGBA）程度
  // 圧縮を考慮して半分と仮定
  const estimatedSize = 512 * 512 * 2; // デフォルト値: 約512KB
  return estimatedSize;
}

// ⚡ 新規追加: MIMEタイプを取得
function getMimeType(fileName: string): string {
  const extension = fileName.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'png':
      return 'image/png';
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'webp':
      return 'image/webp';
    case 'gif':
      return 'image/gif';
    default:
      return 'image/png'; // デフォルト
  }
}

// スワイプナビゲーション
const startX = ref(0);
const startY = ref(0);

function handleTouchStart(event: TouchEvent) {
  startX.value = event.touches[0].clientX;
  startY.value = event.touches[0].clientY;
}

function handleTouchEnd(event: TouchEvent) {
  const endX = event.changedTouches[0].clientX;
  const endY = event.changedTouches[0].clientY;
  
  const deltaX = endX - startX.value;
  const deltaY = endY - startY.value;
  
  // 横方向のスワイプのみ検出（縦スクロールと区別）
  // 最低50pxのスワイプ距離が必要
  if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
    if (deltaX > 0) {
      // 右スワイプ → 前の画像
      emit('previous');
    } else {
      // 左スワイプ → 次の画像
      emit('next');
    }
  }
}

// キーボードナビゲーション
function handleKeyDown(event: KeyboardEvent) {
  if (!props.isOpen) return;
  
  if (event.key === 'ArrowLeft') {
    emit('previous');
    event.preventDefault();
  } else if (event.key === 'ArrowRight') {
    emit('next');
    event.preventDefault();
  } else if (event.key === 'Escape') {
    emit('close');
    event.preventDefault();
  }
}

// キーボードイベントリスナーの登録/解除
onMounted(() => {
  document.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
/* ⚡ 変更なし - 既存のスタイルをそのまま使用 */
.viewer-content {
  height: 100%;
}

.image-container {
  width: 100%;
  background: var(--ion-color-dark);
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 200px;
  padding: 8px;
}

.image-container ion-img {
  max-width: 100%;
  max-height: 70vh;
  object-fit: contain;
}

.metadata-section {
  padding: 16px;
}

.filename-header {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: var(--ion-background-color, #ffffff);
  border-bottom: 1px solid var(--ion-border-color, #e0e0e0);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filename-header ion-icon {
  font-size: 20px;
  color: var(--ion-color-primary);
  flex-shrink: 0;
}

.filename-text {
  font-size: 14px;
  font-weight: 500;
  word-break: break-all;
  color: var(--ion-text-color);
  line-height: 1.4;
}

.prompt-text {
  white-space: pre-wrap;
  word-break: break-word;
  line-height: 1.5;
  margin: 0;
}

.character-prompt-item {
  margin-bottom: 16px;
  padding: 12px;
  background: rgba(var(--ion-color-primary-rgb), 0.05);
  border-radius: 8px;
}

.character-prompt-item:last-child {
  margin-bottom: 0;
}

.character-prompt-item h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  font-weight: 600;
  color: var(--ion-color-primary);
}

.character-uc {
  margin-top: 8px;
  padding: 8px;
  background: rgba(var(--ion-color-warning-rgb), 0.1);
  border-radius: 4px;
  font-size: 13px;
}

.tags-container {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

ion-list {
  background: transparent;
}

ion-item {
  --background: transparent;
}
</style>