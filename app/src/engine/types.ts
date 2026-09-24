// מבני הנתונים כפי שיוצאו מ-Jigzi (שמות שדות מקוריים — snake_case / PascalCase לפי המקור)

export interface MediaRef { id: string; lib: string; kind?: string }

export interface Transform {
  translation: [number, number, number];
  rotation: [number, number, number, number];
  scale: [number, number, number];
  origin: [number, number, number];
}

export interface Instructions { text: string | null; audio: MediaRef | null }

export type Background = { Image: MediaRef } | { Color: string | null } | null;

export interface SpriteSticker {
  Sprite: {
    image: MediaRef;
    transform: Transform;
    effects: string[];
    flip_horizontal: boolean;
    flip_vertical: boolean;
    hover_animation: unknown;
    hidden: unknown;
  };
}
export interface TextSticker { Text: { value: string; transform: Transform; hover_animation: unknown; hidden: unknown } }
export interface EmbedSticker {
  Embed: {
    host: { Youtube?: YoutubeHost } & Record<string, unknown>;
    transform: Transform;
  };
}
export interface YoutubeHost {
  url: string;
  start_at: number | null;
  end_at: number | null;
  captions: boolean;
  muted: boolean;
  autoplay: boolean;
  done_action: 'Next' | 'Loop' | null;
}
export type Sticker = SpriteSticker | TextSticker | EmbedSticker;

export interface BaseContent {
  instructions: Instructions;
  feedback: Instructions;
  theme: string;
  backgrounds: { layer_1: Background; layer_2: Background };
  stickers: Sticker[];
}

export type TraceShape =
  | { Rect: [number, number] }
  | { Ellipse: [number, number] }
  | { Path: [number, number][] }
  | { PathCommands: unknown };

export interface Trace {
  transform: Transform;
  shape: TraceShape;
  kind: 'Regular' | 'Correct' | 'Wrong' | string;
  audio: MediaRef | null;
  text: string | null;
}

export interface CardContent { Text?: string; Image?: MediaRef; Audio?: MediaRef }
export interface Card { audio: MediaRef | null; card_content: CardContent }

export interface CardBase {
  instructions: Instructions;
  feedback: Instructions;
  mode: string;
  pairs: [Card, Card][];
  theme: string;
  background: Background;
}

export interface TappingBoardContent {
  base: BaseContent;
  mode: string;
  traces: Trace[];
  play_settings: { hint: 'None' | 'Highlight'; next: 'Continue' | 'SelectAll' | { SelectSome: number } | string };
}

export interface FindAnswerQuestion {
  title: string;
  question_text: string;
  question_audio: MediaRef | null;
  incorrect_audio: MediaRef | null;
  correct_audio: MediaRef | null;
  traces: Trace[];
}

export interface FindAnswerContent {
  base: BaseContent;
  mode: string;
  questions: FindAnswerQuestion[];
  question_field: { Text: number } | { Dynamic: unknown } | string;
  play_settings: { ordering: 'InOrder' | 'Randomize'; n_attempts: number | null; time_limit: number | null };
}

export interface DragDropItem { sticker: Sticker; kind: 'Static' | { Interactive: { audio: MediaRef | null; target_transform: Transform | null } } }

export interface DragDropContent {
  instructions: Instructions;
  feedback: Instructions;
  theme: string;
  backgrounds: { layer_1: Background; layer_2: Background };
  items: DragDropItem[];
  item_targets: { sticker_idx: number; transform: Transform; trace_idx: number | null }[];
  mode: string;
  target_areas: { trace: Trace }[];
  play_settings: { time_limit: number | null; hint: 'None' | 'Highlight' };
}

export interface CardGameContent {
  base: CardBase;
  player_settings: {
    n_choices?: number;
    swap?: boolean;
    n_rounds?: number;
    time_limit?: number | null;
    pairs_to_display?: number | null;
    display_mode?: 'Single' | 'Double';
    view_pairs?: number | null;
  };
}

export interface CoverContent { base: BaseContent; audio?: MediaRef | null; play_settings?: { next: string } }
export interface PosterContent { base: BaseContent; mode: string; audio?: MediaRef | null; play_settings?: { next: string } }
export interface VideoContent { base: BaseContent; mode: string; play_settings?: unknown }
export interface EmbedContent { base: BaseContent; mode: string; play_settings?: unknown }

export interface Slide { kind: string; content: any }

export interface UnitContent {
  id: string;
  n: number;
  jigId: string;
  title: string;
  description: string;
  skills: string[];
  plays: number;
  settings: { direction: 'ltr' | 'rtl'; scoring: boolean; dragAssist: boolean };
  slides: Slide[];
  sizes: Record<string, [number, number]>;
}

/** מה ששקף מדווח למנגנון בסיום */
export interface SlideOutcome { correct: number; wrong: number }
