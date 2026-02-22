// NovelAI画像のメタデータ型定義
export interface NovelAIMetadata {
  // 基本情報
  Title?: string;
  Software?: string;
  Source?: string;
  Description?: string; // ポジティブプロンプト
  
  // Comment フィールド（JSON形式）
  Comment?: {
    prompt?: string;
    uc?: string; // ネガティブプロンプト
    steps?: number;
    seed?: number;
    scale?: number; // CFG Scale
    sampler?: string;
    strength?: number;
    noise?: number;
    sm?: boolean; // SMEA
    sm_dyn?: boolean; // SMEA DYN
    controlnet_strength?: number;
    reference_strength_multiple?: number[];
    signed_hash?: string;
    // Vibe Transfer (キャラクター参照)
    reference_information_extracted_multiple?: Array<{
      information?: string; // キャラクタープロンプト
      strength?: number;
    }>;
    reference_strength?: number;
    char_prompts?: string[]; // キャラクター1プロンプト
    char_ucs?: string[]; // キャラクター1 UC
    // NovelAI V4の新形式
    v4_prompt?: {
      caption?: {
        base_caption?: string;
        char_captions?: Array<{
          char_caption: string;
          centers: Array<{ x: number; y: number }>;
        }>;
      };
      use_coords?: boolean;
      use_order?: boolean;
      legacy_uc?: boolean;
    };
    v4_negative_prompt?: {
      caption?: {
        base_caption?: string;
        char_captions?: Array<{
          char_caption: string;
          centers: Array<{ x: number; y: number }>;
        }>;
      };
      use_coords?: boolean;
      use_order?: boolean;
      legacy_uc?: boolean;
    };
    // その他のフィールドを受け入れる
    [key: string]: any;
  };
  // その他のフィールドも受け入れる
  [key: string]: any;
}

// フォルダ情報
export interface Folder {
  id: string;
  name: string;
  createdAt: number;
  color?: string; // フォルダの色（オプション）
}

// アプリで扱う画像データ
export interface ImageData {
  id: string;
  fileName: string;
  filePath: string;
  thumbnailPath?: string;
  
  // フォルダ
  folderId?: string; // 所属フォルダID（未設定の場合はルート）
  
  // メタデータ
  prompt: string;
  negativePrompt: string;
  seed: number;
  steps: number;
  cfgScale: number;
  sampler: string;
  
  // キャラクタープロンプト（Vibe Transfer）
  characterPrompts?: string[]; // キャラクター1, 2, 3...のプロンプト
  characterUCs?: string[]; // キャラクター1, 2, 3...のUC
  
  // その他
  dateAdded: number;
  isFavorite: boolean;
  tags: string[]; // プロンプトから抽出したタグ
}

// 検索フィルタ
export interface SearchFilter {
  query: string;
  tags: string[];
  tagMode: 'or' | 'and'; // タグのAND/OR切り替え
  sampler?: string;       // サンプラーフィルタ（undefined = 全て）
  stepsRange?: {
    min?: number;
    max?: number;
  };
  cfgRange?: {
    min?: number;
    max?: number;
  };
  dateRange?: {
    start: number;
    end: number;
  };
  favoritesOnly: boolean;
  folderId?: string; // フォルダでフィルタ
}

// ソート順
export type SortBy = 'date-desc' | 'date-asc' | 'seed' | 'steps';