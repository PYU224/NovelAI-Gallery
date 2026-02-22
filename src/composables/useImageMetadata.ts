import { ref } from 'vue';
import type { NovelAIMetadata, ImageData as AppImageData } from '@/types/image';
// @ts-ignore
import extractChunks from 'png-chunks-extract';
// @ts-ignore
import { decode } from 'png-chunk-text';
// @ts-ignore
import pako from 'pako';

// Canvas API の ImageData 型を明示的に定義
type CanvasImageData = globalThis.ImageData;

export function useImageMetadata() {
  const isLoading = ref(false);
  const error = ref<string | null>(null);

  /**
   * NovelAI画像からメタデータを読み取る（PNG/WebP対応）
   */
  async function extractMetadata(file: File): Promise<NovelAIMetadata | null> {
    try {
      isLoading.value = true;
      error.value = null;

      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);

      // 画像形式を判定
      const format = detectImageFormat(uint8Array);

      let metadata: NovelAIMetadata = {};

      if (format === 'PNG') {
        // PNG形式のメタデータ抽出
        metadata = await extractPNGMetadata(uint8Array);
      } else if (format === 'WebP') {
        // WebP形式のメタデータ抽出
        metadata = await extractWebPMetadata(uint8Array);
      } else {
        throw new Error(`サポートされていない画像形式です: ${format}`);
      }

      return metadata;
    } catch (e) {
      error.value = (e as Error).message;
      console.error('Failed to extract metadata:', e);
      return null;
    } finally {
      isLoading.value = false;
    }
  }

  /**
   * PNG形式のメタデータを抽出
   */
  async function extractPNGMetadata(uint8Array: Uint8Array): Promise<NovelAIMetadata> {
    // PNGチャンクを抽出
    const chunks = extractChunks(uint8Array);
    const metadata: NovelAIMetadata = {};

    // tEXtチャンクからメタデータ取得
    for (const chunk of chunks) {
      if (chunk.name === 'tEXt') {
        const textData = decode(chunk.data);
        const keyword = textData.keyword;
        const text = textData.text;

        if (keyword === 'Comment') {
          try {
            metadata.Comment = JSON.parse(text);
          } catch (e) {
            console.warn('Failed to parse Comment JSON:', e);
            metadata.Comment = {};
          }
        } else {
          // @ts-ignore
          metadata[keyword] = text;
        }
      }
    }

    // Commentフィールドがない場合、ステルスPNGinfoを試す
    if (!metadata.Comment || Object.keys(metadata.Comment).length === 0) {
      const stealthData = await extractStealthMetadata(uint8Array);
      if (stealthData) {
        metadata.Comment = stealthData;
      }
    }

    return metadata;
  }

  /**
   * WebP形式のメタデータを抽出
   */
  async function extractWebPMetadata(uint8Array: Uint8Array): Promise<NovelAIMetadata> {
    const metadata: NovelAIMetadata = {};
    
    try {
      // WebPチャンクを解析
      const chunks = parseWebPChunks(uint8Array);
      
      // EXIFチャンクからメタデータを探す
      for (const chunk of chunks) {
        if (chunk.fourcc === 'EXIF') {
          const exifData = chunk.data;
          
          // EXIFデータ内のJSON検索
          try {
            const text = new TextDecoder('utf-8').decode(exifData);
            
            // JSONの開始位置を探す
            const jsonStart = text.indexOf('{');
            if (jsonStart !== -1) {
              // JSON終了位置を探す（ブレースのバランスを見る）
              let braceCount = 0;
              let jsonEnd = jsonStart;
              
              for (let i = jsonStart; i < text.length; i++) {
                if (text[i] === '{') braceCount++;
                else if (text[i] === '}') {
                  braceCount--;
                  if (braceCount === 0) {
                    jsonEnd = i + 1;
                    break;
                  }
                }
              }
              
              if (jsonEnd > jsonStart) {
                const jsonText = text.substring(jsonStart, jsonEnd);
                const jsonData = JSON.parse(jsonText);
                
                metadata.Comment = jsonData;
              }
            }
          } catch (e) {
            // JSON parse error - skip silently
          }
        }
      }
    } catch (e) {
      console.error('Failed to extract WebP metadata:', e);
    }
    
    return metadata;
  }

  /**
   * 画像形式を検出
   */
  function detectImageFormat(uint8Array: Uint8Array): string {
    // PNG: 89 50 4E 47 0D 0A 1A 0A
    if (uint8Array.length >= 8 &&
        uint8Array[0] === 0x89 &&
        uint8Array[1] === 0x50 &&
        uint8Array[2] === 0x4E &&
        uint8Array[3] === 0x47 &&
        uint8Array[4] === 0x0D &&
        uint8Array[5] === 0x0A &&
        uint8Array[6] === 0x1A &&
        uint8Array[7] === 0x0A) {
      return 'PNG';
    }
    
    // WebP: RIFF???? WEBP
    if (uint8Array.length >= 12 &&
        uint8Array[0] === 0x52 && // R
        uint8Array[1] === 0x49 && // I
        uint8Array[2] === 0x46 && // F
        uint8Array[3] === 0x46 && // F
        uint8Array[8] === 0x57 && // W
        uint8Array[9] === 0x45 && // E
        uint8Array[10] === 0x42 && // B
        uint8Array[11] === 0x50) { // P
      return 'WebP';
    }
    
    return 'Unknown';
  }

  /**
   * WebPチャンクを解析
   */
  function parseWebPChunks(uint8Array: Uint8Array): Array<{ fourcc: string; data: Uint8Array }> {
    const chunks = [];
    let offset = 12; // RIFF + size + WEBP をスキップ
    
    const dataView = new DataView(uint8Array.buffer);
    const fileSize = dataView.getUint32(4, true) + 8; // RIFFヘッダーを含む全体サイズ
    
    while (offset < Math.min(fileSize, uint8Array.length)) {
      if (offset + 8 > uint8Array.length) break;
      
      // FourCC (4 bytes)
      const fourcc = String.fromCharCode(
        uint8Array[offset],
        uint8Array[offset + 1],
        uint8Array[offset + 2],
        uint8Array[offset + 3]
      );
      
      // Chunk size (4 bytes, little-endian)
      const chunkSize = dataView.getUint32(offset + 4, true);
      
      // Chunk data
      const dataStart = offset + 8;
      const dataEnd = Math.min(dataStart + chunkSize, uint8Array.length);
      const chunkData = uint8Array.slice(dataStart, dataEnd);
      
      chunks.push({
        fourcc,
        data: chunkData
      });
      
      // 次のチャンクへ（パディング考慮）
      offset = dataEnd;
      if (chunkSize % 2 === 1) {
        offset++; // 奇数バイトの場合は1バイトパディング
      }
    }
    
    return chunks;
  }

  /**
   * ステルスPNGinfo（アルファチャンネル）からメタデータを抽出
   * 参考: https://imaya.github.io/StealthPNGInfo.js/
   */
  async function extractStealthMetadata(uint8Array: Uint8Array): Promise<any | null> {
    try {
      // 画像をCanvasに読み込んでアルファチャンネルを取得
      const blob = new Blob([uint8Array as any], { type: 'image/png' });
      const imageData = await loadImageData(blob);
      
      if (!imageData) return null;

      const { data, width, height } = imageData;
      
      // アルファチャンネルのLSBを抽出
      const bits: number[] = [];
      for (let i = 0; i < width * height; i++) {
        const alpha = data[i * 4 + 3]; // アルファチャンネル
        bits.push(alpha & 1); // 最下位ビット
      }

      // ビット列をバイト配列に変換（MSBファースト）
      const bytes: number[] = [];
      for (let i = 0; i < bits.length; i += 8) {
        let byte = 0;
        for (let j = 0; j < 8 && i + j < bits.length; j++) {
          byte = (byte << 1) | bits[i + j];
        }
        bytes.push(byte);
      }

      // サポートされているシグネチャ
      const signatures = [
        { name: 'stealth_pngcomp', compressed: true },
        { name: 'stealth_pnginfo', compressed: false },
        { name: 'stealth_rgbcomp', compressed: true },
        { name: 'stealth_rgbinfo', compressed: false }
      ];

      for (const sig of signatures) {
        const sigBytes = new TextEncoder().encode(sig.name);
        const index = findSequence(bytes, Array.from(sigBytes));
        
        if (index !== -1) {
          try {
            // シグネチャの後に32ビットの長さフィールド（ビッグエンディアン）
            const offset = index + sigBytes.length;
            
            // 十分なデータがあるか確認
            if (offset + 4 >= bytes.length) {
              console.warn(`Not enough data after ${sig.name} signature`);
              continue;
            }

            const length = (bytes[offset] << 24) |
                          (bytes[offset + 1] << 16) |
                          (bytes[offset + 2] << 8) |
                          bytes[offset + 3];

            // 長さの妥当性チェック
            if (length <= 0 || length > bytes.length - offset - 4) {
              console.warn(`Invalid payload length for ${sig.name}:`, length);
              continue;
            }

            // ペイロード取得
            const payload = bytes.slice(offset + 4, offset + 4 + length);
            
            let jsonText: string;

            // gzip圧縮されている場合は解凍
            if (sig.compressed) {
              try {
                const decompressed = pako.inflate(new Uint8Array(payload), { to: 'string' });
                jsonText = decompressed;
              } catch (e) {
                console.warn(`Failed to decompress ${sig.name}:`, e);
                continue;
              }
            } else {
              // 非圧縮（UTF-8デコード、エラー許容）
              jsonText = new TextDecoder('utf-8', { fatal: false }).decode(new Uint8Array(payload));
            }

            // JSONパース
            try {
              const parsed = JSON.parse(jsonText);
              return parsed;
            } catch (e) {
              console.warn(`Failed to parse JSON from ${sig.name}:`, e);
              continue;
            }
          } catch (e) {
            console.warn(`Failed to extract from ${sig.name}:`, e);
            continue;
          }
        }
      }

      return null;
    } catch (e) {
      console.warn('Failed to extract stealth metadata:', e);
      return null;
    }
  }

  /**
   * BlobをCanvasに読み込んでImageDataを取得
   */
  function loadImageData(blob: Blob): Promise<CanvasImageData | null> {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        resolve(ctx.getImageData(0, 0, img.width, img.height));
      };
      img.onerror = () => resolve(null);
      img.src = URL.createObjectURL(blob);
    });
  }

  /**
   * バイト配列からシーケンスを検索
   */
  function findSequence(array: number[], sequence: number[]): number {
    for (let i = 0; i <= array.length - sequence.length; i++) {
      let found = true;
      for (let j = 0; j < sequence.length; j++) {
        if (array[i + j] !== sequence[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  }

  /**
   * メタデータをImageData形式に変換
   */
  function convertToImageData(
    file: File,
    metadata: NovelAIMetadata
  ): AppImageData {
    const comment = metadata.Comment || {};
    const prompt = comment.prompt || metadata.Description || '';
    
    // キャラクタープロンプトを抽出（先に宣言）
    const characterPrompts: string[] = [];
    const characterUCs: string[] = [];

    // 方法1: reference_information_extracted_multiple から抽出（NovelAI V4）
    if (comment.reference_information_extracted_multiple && 
        Array.isArray(comment.reference_information_extracted_multiple)) {
      comment.reference_information_extracted_multiple.forEach((ref, idx) => {
        if (ref && ref.information) {
          characterPrompts.push(ref.information);
        }
      });
    }

    // 方法2: char_prompts / char_ucs から抽出
    if (comment.char_prompts && Array.isArray(comment.char_prompts)) {
      comment.char_prompts.forEach((charPrompt, idx) => {
        if (charPrompt) {
          characterPrompts.push(charPrompt);
        }
      });
    }
    
    if (comment.char_ucs && Array.isArray(comment.char_ucs)) {
      comment.char_ucs.forEach((charUC, idx) => {
        if (charUC) {
          characterUCs.push(charUC);
        }
      });
    }

    // 方法3: v4_prompt / v4_negative_prompt から抽出（NovelAI V4の新形式）
    if (comment.v4_prompt?.caption?.char_captions && Array.isArray(comment.v4_prompt.caption.char_captions)) {
      comment.v4_prompt.caption.char_captions.forEach((charItem: any, idx: number) => {
        // char_captions配列の各要素はオブジェクト {char_caption: string, centers: array}
        if (charItem && typeof charItem === 'object' && charItem.char_caption) {
          const charCaption = charItem.char_caption;
          if (charCaption && typeof charCaption === 'string' && charCaption.trim()) {
            characterPrompts.push(charCaption);
          }
        }
      });
    }
    
    if (comment.v4_negative_prompt?.caption?.char_captions && Array.isArray(comment.v4_negative_prompt.caption.char_captions)) {
      comment.v4_negative_prompt.caption.char_captions.forEach((charItem: any, idx: number) => {
        // char_captions配列の各要素はオブジェクト {char_caption: string, centers: array}
        if (charItem && typeof charItem === 'object' && charItem.char_caption) {
          const charCaption = charItem.char_caption;
          if (charCaption && typeof charCaption === 'string' && charCaption.trim()) {
            characterUCs.push(charCaption);
          }
        }
      });
    }

    // 方法4: 動的にキャラクター関連フィールドを探す
    Object.keys(comment).forEach(key => {
      const lowerKey = key.toLowerCase();
      const value = comment[key];
      
      // パターン1: キャラクタープロンプト（日本語・英語）
      const isCharPrompt = 
        lowerKey.includes('char') && (lowerKey.includes('prompt') || lowerKey.includes('caption')) ||
        lowerKey.includes('キャラクター') && lowerKey.includes('プロンプト') ||
        lowerKey.includes('character') && (lowerKey.includes('prompt') || lowerKey.includes('caption'));
      
      // パターン2: キャラクターUC
      const isCharUC = 
        lowerKey.includes('char') && (lowerKey.includes('uc') || lowerKey.includes('negative')) ||
        lowerKey.includes('キャラクター') && lowerKey.includes('uc');
      
      if (isCharPrompt) {
        console.log(`  → Matched as character prompt: "${key}"`);
        
        if (typeof value === 'string' && value.length > 0) {
          characterPrompts.push(value);
          console.log(`✓ Found via dynamic search (${key}):`, value.substring(0, 50) + '...');
        } else if (Array.isArray(value)) {
          value.forEach((item, idx) => {
            if (typeof item === 'string' && item.length > 0) {
              characterPrompts.push(item);
              console.log(`✓ Found via dynamic search (${key}[${idx}]):`, item.substring(0, 50) + '...');
            }
          });
        }
      }
      
      if (isCharUC) {
        console.log(`  → Matched as character UC: "${key}"`);
        
        if (typeof value === 'string' && value.length > 0) {
          characterUCs.push(value);
        } else if (Array.isArray(value)) {
          value.forEach((item, idx) => {
            if (typeof item === 'string' && item.length > 0) {
              characterUCs.push(item);
            }
          });
        }
      }
    });

    // プロンプトからタグを抽出（カンマ区切り・上限なし）
    const tags = prompt
      .split(',')
      .map(t => t.trim())
      .filter(t => t.length > 0);

    // キャラクタープロンプトからもタグを抽出
    if (characterPrompts.length > 0) {
      const charTags = characterPrompts
        .flatMap(cp => cp.split(',').map(t => t.trim()).filter(t => t.length > 0));
      
      // 重複を避けて追加
      charTags.forEach(tag => {
        if (!tags.includes(tag)) {
          tags.push(tag);
        }
      });
    }

    return {
      id: generateId(),
      fileName: file.name,
      filePath: '', // 後で設定
      thumbnailPath: '',
      prompt,
      negativePrompt: comment.uc || '',
      seed: comment.seed || 0,
      steps: comment.steps || 28,
      cfgScale: comment.scale || 7,
      sampler: comment.sampler || 'k_euler',
      characterPrompts: characterPrompts.length > 0 ? characterPrompts : undefined,
      characterUCs: characterUCs.length > 0 ? characterUCs : undefined,
      dateAdded: Date.now(),
      isFavorite: false,
      tags,
    };
  }

  /**
   * 複数ファイルを一括処理
   */
  async function extractMultipleMetadata(
    files: File[]
  ): Promise<AppImageData[]> {
    const results: AppImageData[] = [];

    for (const file of files) {
      const metadata = await extractMetadata(file);
      if (metadata) {
        results.push(convertToImageData(file, metadata));
      }
    }

    return results;
  }

  /**
   * サムネイル生成
   */
  async function generateThumbnail(file: File, maxSize: number = 300): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Canvas context not available'));
        return;
      }

      img.onload = () => {
        let width = img.width;
        let height = img.height;

        // アスペクト比を保ちながらリサイズ
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width;
            width = maxSize;
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height;
            height = maxSize;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        // JPEG形式で圧縮（品質80%）
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };

      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = URL.createObjectURL(file);
    });
  }

  function isPNG(data: Uint8Array): boolean {
    return (
      data[0] === 0x89 &&
      data[1] === 0x50 &&
      data[2] === 0x4e &&
      data[3] === 0x47
    );
  }

  function generateId(): string {
    return `${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }

  return {
    isLoading,
    error,
    extractMetadata,
    convertToImageData,
    extractMultipleMetadata,
    generateThumbnail,
  };
}