<template>
  <ion-modal
    :is-open="isOpen"
    @did-dismiss="$emit('close')"
  >
    <ion-header>
      <ion-toolbar>
        <ion-buttons slot="start">
          <ion-button @click="$emit('close')">
            {{ t('home.editModal.cancel') }}
          </ion-button>
        </ion-buttons>
        <ion-title>{{ t('home.editModal.title') }}</ion-title>
        <ion-buttons slot="end">
          <ion-button @click="save" strong>
            {{ t('home.editModal.save') }}
          </ion-button>
        </ion-buttons>
      </ion-toolbar>
    </ion-header>

    <ion-content>
      <div v-if="editedImage" class="edit-form">
        <!-- ファイル名 -->
        <ion-item>
          <ion-label position="stacked">{{ t('home.editModal.fileName') }}</ion-label>
          <ion-input
            v-model="editedImage.fileName"
            :placeholder="t('home.editModal.fileNamePlaceholder')"
          />
        </ion-item>

        <!-- プロンプト -->
        <ion-item>
          <ion-label position="stacked">{{ t('home.editModal.prompt') }}</ion-label>
          <ion-textarea
            v-model="editedImage.prompt"
            :rows="6"
            :placeholder="t('home.editModal.promptPlaceholder')"
          />
        </ion-item>

        <!-- ネガティブプロンプト -->
        <ion-item>
          <ion-label position="stacked">{{ t('home.editModal.negativePrompt') }}</ion-label>
          <ion-textarea
            v-model="editedImage.negativePrompt"
            :rows="4"
            :placeholder="t('home.editModal.negativePromptPlaceholder')"
          />
        </ion-item>

        <!-- タグ編集 -->
        <ion-item>
          <ion-label position="stacked">{{ t('home.editModal.tags') }}</ion-label>
          <ion-textarea
            v-model="tagsText"
            :rows="3"
            placeholder="tag1, tag2, tag3"
          />
        </ion-item>

        <!-- 整理 -->
        <ion-list-header>
          <ion-label>{{ t('home.editModal.organize') }}</ion-label>
        </ion-list-header>

        <!-- フォルダ選択 -->
        <ion-item>
          <ion-label position="stacked">{{ t('home.editModal.folder') }}</ion-label>
          <ion-select 
            v-model="editedImage.folderId" 
            interface="action-sheet"
            :placeholder="t('home.editModal.uncategorized')"
            :cancel-text="t('home.editModal.cancel')"
          >
            <ion-select-option :value="undefined">
              📁 {{ t('home.editModal.uncategorized') }}
            </ion-select-option>
            <ion-select-option
              v-for="folder in folders"
              :key="folder.id"
              :value="folder.id"
            >
              📁 {{ folder.name }}
            </ion-select-option>
          </ion-select>
        </ion-item>

        <!-- お気に入り -->
        <ion-item>
          <ion-label>{{ t('home.editModal.favorite') }}</ion-label>
          <ion-toggle
            v-model="editedImage.isFavorite"
            slot="end"
          />
        </ion-item>

        <!-- 生成パラメータ -->
        <ion-list-header>
          <ion-label>{{ t('home.editModal.generationParams') }}</ion-label>
        </ion-list-header>

        <ion-item>
          <ion-label position="stacked">Seed</ion-label>
          <ion-input
            v-model.number="editedImage.seed"
            type="number"
            placeholder="0"
          />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Steps</ion-label>
          <ion-input
            v-model.number="editedImage.steps"
            type="number"
            placeholder="28"
          />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">CFG Scale</ion-label>
          <ion-input
            v-model.number="editedImage.cfgScale"
            type="number"
            step="0.1"
            placeholder="7"
          />
        </ion-item>

        <ion-item>
          <ion-label position="stacked">Sampler</ion-label>
          <ion-input
            v-model="editedImage.sampler"
            placeholder="k_euler"
          />
        </ion-item>
      </div>
    </ion-content>
  </ion-modal>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useI18n } from 'vue-i18n';
import {
  IonModal,
  IonHeader,
  IonToolbar,
  IonButtons,
  IonButton,
  IonTitle,
  IonContent,
  IonItem,
  IonLabel,
  IonInput,
  IonTextarea,
  IonToggle,
  IonListHeader,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue';
import type { ImageData, Folder } from '@/types/image';

interface Props {
  isOpen: boolean;
  image: ImageData | null;
  folders: Folder[];
}

const props = defineProps<Props>();
const { t } = useI18n();

const emit = defineEmits<{
  close: [];
  save: [editedImage: ImageData];
}>();

const editedImage = ref<ImageData | null>(null);
const tagsText = ref('');
const isSaving = ref(false);

// imageが変更されたら編集用のコピーを作成
watch(() => props.image, (newImage) => {
  isSaving.value = false; // モーダル再表示時にガードをリセット
  if (newImage) {
    // ディープコピーを作成（配列もコピー）
    editedImage.value = {
      ...newImage,
      folderId: newImage.folderId ?? undefined,  // null を undefined に変換
      tags: [...newImage.tags],
      characterPrompts: newImage.characterPrompts ? [...newImage.characterPrompts] : undefined,
      characterUCs: newImage.characterUCs ? [...newImage.characterUCs] : undefined,
    };
    tagsText.value = newImage.tags.join(', ');
  }
}, { immediate: true });

function save() {
  if (!editedImage.value || isSaving.value) return;
  isSaving.value = true;

  // タグをパース
  const parsedTags = tagsText.value
    .split(',')
    .map(t => t.trim())
    .filter(t => t.length > 0);

  // Proxyオブジェクトを完全なプレーンオブジェクトに変換
  const plainImage: ImageData = {
    id: editedImage.value.id,
    fileName: editedImage.value.fileName,
    filePath: editedImage.value.filePath,
    thumbnailPath: editedImage.value.thumbnailPath,
    folderId: editedImage.value.folderId || undefined,
    prompt: editedImage.value.prompt,
    negativePrompt: editedImage.value.negativePrompt,
    seed: editedImage.value.seed,
    steps: editedImage.value.steps,
    cfgScale: editedImage.value.cfgScale,
    sampler: editedImage.value.sampler,
    characterPrompts: editedImage.value.characterPrompts ? [...editedImage.value.characterPrompts] : undefined,
    characterUCs: editedImage.value.characterUCs ? [...editedImage.value.characterUCs] : undefined,
    dateAdded: editedImage.value.dateAdded,
    isFavorite: editedImage.value.isFavorite,
    tags: parsedTags,
  };

  emit('save', plainImage);
  // 保存完了後にガードをリセット（モーダルが閉じない場合に備えて）
  setTimeout(() => { isSaving.value = false; }, 500);
}
</script>

<style scoped>
.edit-form {
  padding: 16px;
}

ion-item {
  --padding-start: 0;
  --inner-padding-end: 0;
}

ion-list-header {
  padding-left: 0;
  margin-top: 24px;
}

ion-textarea {
  margin-top: 8px;
}
</style>