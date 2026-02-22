import { ref } from 'vue';
import type { ImageData } from '@/types/image';
// @ts-ignore
import JSZip from 'jszip';

export function useExport() {
  const isExporting = ref(false);
  const progress = ref(0);

  /**
   * 選択した画像をZIPでダウンロード
   */
  async function exportImages(images: ImageData[]): Promise<void> {
    if (images.length === 0) {
      throw new Error('エクスポートする画像がありません');
    }

    try {
      isExporting.value = true;
      progress.value = 0;

      const zip = new JSZip();
      const imagesFolder = zip.folder('images');
      const metadataFolder = zip.folder('metadata');

      for (let i = 0; i < images.length; i++) {
        const image = images[i];

        // 画像ファイルを追加
        if (image.filePath) {
          const response = await fetch(image.filePath);
          const blob = await response.blob();
          imagesFolder?.file(image.fileName, blob);
        }

        // メタデータをJSON形式で保存
        const metadata = {
          fileName: image.fileName,
          prompt: image.prompt,
          negativePrompt: image.negativePrompt,
          seed: image.seed,
          steps: image.steps,
          cfgScale: image.cfgScale,
          sampler: image.sampler,
          tags: image.tags,
          characterPrompts: image.characterPrompts,
          characterUCs: image.characterUCs,
          isFavorite: image.isFavorite,
          dateAdded: image.dateAdded,
        };

        const metadataFileName = image.fileName.replace(/\.[^.]+$/, '.json');
        metadataFolder?.file(metadataFileName, JSON.stringify(metadata, null, 2));

        progress.value = ((i + 1) / images.length) * 100;
      }

      // ZIPファイルを生成してダウンロード
      const blob = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novelai-gallery-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      throw e;
    } finally {
      isExporting.value = false;
      progress.value = 0;
    }
  }

  /**
   * メタデータをCSVでダウンロード
   */
  async function exportMetadataAsCSV(images: ImageData[]): Promise<void> {
    if (images.length === 0) {
      throw new Error('エクスポートするデータがありません');
    }

    try {
      isExporting.value = true;

      // CSVヘッダー
      const headers = [
        'ファイル名',
        'プロンプト',
        'ネガティブプロンプト',
        'Seed',
        'Steps',
        'CFG Scale',
        'Sampler',
        'タグ',
        'お気に入り',
        '追加日時',
      ];

      // CSVデータ
      const rows = images.map(img => [
        img.fileName,
        `"${img.prompt.replace(/"/g, '""')}"`, // ダブルクォートをエスケープ
        `"${img.negativePrompt.replace(/"/g, '""')}"`,
        img.seed,
        img.steps,
        img.cfgScale,
        img.sampler,
        `"${img.tags.join(', ')}"`,
        img.isFavorite ? 'はい' : 'いいえ',
        new Date(img.dateAdded).toLocaleString('ja-JP'),
      ]);

      // CSV生成
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(',')),
      ].join('\n');

      // BOMを追加（Excelで文字化けを防ぐ）
      const bom = '\uFEFF';
      const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });

      // ダウンロード
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novelai-metadata-${Date.now()}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('CSV export failed:', e);
      throw e;
    } finally {
      isExporting.value = false;
    }
  }

  /**
   * メタデータをJSONでダウンロード
   */
  async function exportMetadataAsJSON(images: ImageData[]): Promise<void> {
    if (images.length === 0) {
      throw new Error('エクスポートするデータがありません');
    }

    try {
      isExporting.value = true;

      const jsonData = {
        version: '1.0',
        exportDate: new Date().toISOString(),
        totalImages: images.length,
        images: images.map(img => ({
          fileName: img.fileName,
          prompt: img.prompt,
          negativePrompt: img.negativePrompt,
          seed: img.seed,
          steps: img.steps,
          cfgScale: img.cfgScale,
          sampler: img.sampler,
          tags: img.tags,
          characterPrompts: img.characterPrompts,
          characterUCs: img.characterUCs,
          isFavorite: img.isFavorite,
          dateAdded: img.dateAdded,
        })),
      };

      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json',
      });

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `novelai-metadata-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('JSON export failed:', e);
      throw e;
    } finally {
      isExporting.value = false;
    }
  }

  return {
    isExporting,
    progress,
    exportImages,
    exportMetadataAsCSV,
    exportMetadataAsJSON,
  };
}
