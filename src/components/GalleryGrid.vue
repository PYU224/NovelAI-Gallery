<template>
  <div :class="['gallery-container', viewMode]">
    <div
      v-for="image in images"
      :key="image.id"
      :class="['image-card', viewMode, { 'is-selected': selectedIds.has(image.id), 'select-mode': selectMode }]"
      @click="handleClick($event, image)"
      @contextmenu.prevent="handleContextMenu($event, image)"
      @touchstart="handleTouchStart($event, image)"
      @touchend="handleTouchEnd($event, image)"
      @touchmove="handleTouchMove"
    >
      <!-- サムネイル -->
      <div class="image-wrapper">
        <ion-img
          :src="image.thumbnailPath || image.filePath"
          :alt="image.fileName"
        />

        <!-- 選択チェックマーク（選択モード時） -->
        <div v-if="selectMode" class="select-overlay">
          <div :class="['select-check', { checked: selectedIds.has(image.id) }]">
            <ion-icon :icon="checkmark" />
          </div>
        </div>

        <!-- お気に入りバッジ（選択モード時は非表示） -->
        <ion-icon
          v-if="image.isFavorite && !selectMode"
          :icon="heart"
          class="favorite-badge"
        />
      </div>

      <!-- 画像情報 -->
      <div class="image-info">
        <div v-if="viewMode === 'list'" class="file-name">
          <ion-text color="dark">
            <strong>{{ image.fileName }}</strong>
          </ion-text>
        </div>

        <div class="prompt-preview">
          <ion-text :color="viewMode === 'list' ? 'medium' : 'medium-shade'">
            {{ truncateText(image.prompt, viewMode === 'list' ? 150 : 40) }}
          </ion-text>
        </div>

        <div v-if="viewMode === 'list' && image.negativePrompt" class="negative-prompt">
          <ion-text color="danger">
            <small>🚫 {{ truncateText(image.negativePrompt, 100) }}</small>
          </ion-text>
        </div>

        <div class="meta-info">
          <ion-chip size="small">
            <ion-icon :icon="colorWandOutline" />
            <ion-label>{{ image.seed }}</ion-label>
          </ion-chip>
          <ion-chip size="small">
            <ion-label>{{ image.steps }} steps</ion-label>
          </ion-chip>
          <ion-chip size="small">
            <ion-label>CFG {{ image.cfgScale }}</ion-label>
          </ion-chip>
          <ion-chip v-if="viewMode === 'list'" size="small">
            <ion-label>{{ image.sampler }}</ion-label>
          </ion-chip>
        </div>

        <div v-if="viewMode === 'list' && image.tags.length > 0" class="tags-preview">
          <ion-chip
            v-for="tag in image.tags.slice(0, 5)"
            :key="tag"
            size="small"
            color="primary"
            outline
          >
            <ion-label>{{ tag }}</ion-label>
          </ion-chip>
          <span v-if="image.tags.length > 5" class="more-tags">
            +{{ image.tags.length - 5 }}
          </span>
        </div>

        <div v-if="viewMode === 'list'" class="date-info">
          <ion-text color="medium">
            <small>{{ formatDate(image.dateAdded) }}</small>
          </ion-text>
        </div>
      </div>
    </div>

    <!-- 空の状態 -->
    <div v-if="images.length === 0" class="empty-state">
      <ion-icon :icon="imageOutline" size="large" />
      <p>{{ $t('home.empty.title') }}</p>
      <ion-button @click="$emit('import-click')">
        {{ $t('home.empty.button') }}
      </ion-button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import {
  IonImg,
  IonIcon,
  IonChip,
  IonLabel,
  IonButton,
  IonText,
} from '@ionic/vue';
import { heart, colorWandOutline, imageOutline, checkmark } from 'ionicons/icons';
import type { ImageData } from '@/types/image';

interface Props {
  images: ImageData[];
  viewMode?: 'grid' | 'list';
  selectMode?: boolean;
  selectedIds?: Set<string>;
}

const props = withDefaults(defineProps<Props>(), {
  viewMode: 'grid',
  selectMode: false,
  selectedIds: () => new Set(),
});

const emit = defineEmits<{
  'image-click': [image: ImageData];
  'import-click': [];
  'image-long-press': [image: ImageData];
  'image-select': [image: ImageData];
}>();

// 長押し検出用
const longPressTimer = ref<number | null>(null);
const isTouchMoved = ref(false);
const longPressTriggered = ref(false);

function handleClick(_event: MouseEvent | TouchEvent, image: ImageData) {
  if (props.selectMode) {
    emit('image-select', image);
  } else {
    emit('image-click', image);
  }
}

function handleTouchStart(event: TouchEvent, image: ImageData) {
  isTouchMoved.value = false;
  longPressTriggered.value = false;

  longPressTimer.value = window.setTimeout(() => {
    if (!isTouchMoved.value) {
      longPressTriggered.value = true;
      if ('vibrate' in navigator) {
        try { navigator.vibrate(50); } catch (_) { /* ブラウザ制限は無視 */ }
      }
      emit('image-long-press', image);
    }
  }, 500);
}

function handleTouchMove() {
  isTouchMoved.value = true;
  if (longPressTimer.value !== null) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
}

function handleTouchEnd(event: TouchEvent, _image: ImageData) {
  if (longPressTimer.value !== null) {
    clearTimeout(longPressTimer.value);
    longPressTimer.value = null;
  }
  if (longPressTriggered.value) {
    event.preventDefault();
  }
}

function handleContextMenu(_event: MouseEvent, image: ImageData) {
  emit('image-long-press', image);
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 60) return `${diffMins}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString('ja-JP', { year: 'numeric', month: 'short', day: 'numeric' });
}
</script>

<style scoped>
.gallery-container {
  padding: 12px;
}

.image-card {
  cursor: pointer;
  border-radius: 8px;
  overflow: hidden;
  background: var(--ion-color-light);
  transition: transform 0.2s ease, box-shadow 0.2s ease, outline 0.15s ease;
}

.image-card:active {
  transform: scale(0.98);
}

.image-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* 選択モード：選択済みカード */
.image-card.is-selected {
  outline: 3px solid var(--ion-color-primary);
  outline-offset: -3px;
}

/* 選択モード：未選択カードを少し暗く */
.image-card.select-mode:not(.is-selected) {
  opacity: 0.6;
}

/* 選択オーバーレイ */
.select-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: flex-start;
  justify-content: flex-start;
  padding: 8px;
  pointer-events: none;
  z-index: 20;
}

.select-check {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 2.5px solid #fff;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.15s ease;
}

.select-check.checked {
  background: var(--ion-color-primary);
  border-color: var(--ion-color-primary);
}

.select-check ion-icon {
  color: #fff;
  font-size: 15px;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.select-check.checked ion-icon {
  opacity: 1;
}

/* グリッド表示 */
.gallery-container.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 12px;
}

.image-card.grid .image-wrapper {
  position: relative;
  width: 100%;
  padding-top: 100%;
  overflow: hidden;
  background: var(--ion-color-medium);
}

.image-card.grid .image-wrapper ion-img {
  position: absolute;
  top: 0; left: 0;
  width: 100%; height: 100%;
  object-fit: cover;
}

.image-card.grid .image-info {
  padding: 8px;
}

.image-card.grid .prompt-preview {
  font-size: 12px;
  margin-bottom: 4px;
  line-height: 1.3;
  height: 2.6em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

/* リスト表示 */
.gallery-container.list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.image-card.list {
  display: flex;
  gap: 16px;
  padding: 12px;
  align-items: flex-start;
}

.image-card.list .image-wrapper {
  position: relative;
  width: 120px;
  min-width: 120px;
  height: 120px;
  overflow: hidden;
  background: var(--ion-color-medium);
  border-radius: 8px;
}

.image-card.list .image-wrapper ion-img {
  width: 100%; height: 100%;
  object-fit: cover;
}

.image-card.list .image-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.image-card.list .file-name {
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.image-card.list .prompt-preview {
  font-size: 13px;
  line-height: 1.4;
  max-height: 3.6em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  word-break: break-word;
}

.image-card.list .negative-prompt {
  font-size: 11px;
  line-height: 1.3;
  padding: 4px 8px;
  background: rgba(var(--ion-color-danger-rgb), 0.1);
  border-radius: 4px;
  max-height: 2.6em;
  overflow: hidden;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.image-card.list.select-mode .image-wrapper {
  border-radius: 8px;
  overflow: hidden;
}

.image-card.list .tags-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}

.image-card.list .tags-preview .more-tags {
  font-size: 11px;
  color: var(--ion-color-medium);
  padding: 0 4px;
}

.image-card.list .date-info {
  font-size: 11px;
}

.favorite-badge {
  position: absolute;
  top: 8px; right: 8px;
  font-size: 24px;
  color: var(--ion-color-danger);
  filter: drop-shadow(0 2px 4px rgba(0,0,0,0.3));
  z-index: 10;
}

.meta-info {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}

.meta-info ion-chip {
  margin: 0;
  font-size: 10px;
  height: 22px;
}

.image-card.list .meta-info ion-chip {
  font-size: 11px;
  height: 24px;
}

.empty-state {
  grid-column: 1 / -1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  text-align: center;
  color: var(--ion-color-medium);
}

.empty-state ion-icon {
  font-size: 80px;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-state p {
  margin: 0 0 16px 0;
  font-size: 16px;
}

@media (min-width: 768px) {
  .gallery-container.grid {
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 16px;
    padding: 16px;
  }
  .image-card.list { padding: 16px; }
  .image-card.list .image-wrapper { width: 150px; min-width: 150px; height: 150px; }
}

@media (min-width: 1024px) {
  .gallery-container.grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  }
  .image-card.list .image-wrapper { width: 180px; min-width: 180px; height: 180px; }
}
</style>
