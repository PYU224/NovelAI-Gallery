<template>
  <div class="nearby-share-stub">
    <ion-icon :icon="wifiOutline" class="stub-icon" />
    <p class="stub-message">WiFi Direct 共有機能は開発中です。</p>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue';
import { wifiOutline } from 'ionicons/icons';

// Phase 3 で KoreMD の実装に置き換える
defineProps<{
  transferType?: string;
  fileUri?: string;
  fileName?: string;
  fileSize?: number;
  mimeType?: string;
  serviceId?: string;
}>();
</script>

<style scoped>
.nearby-share-stub {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 48px 24px;
  color: var(--ion-color-medium);
}

.stub-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.4;
}

.stub-message {
  font-size: 15px;
  text-align: center;
  margin: 0;
}
</style>
