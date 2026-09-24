# Jigzi module format and player behaviour: implementation spec

Source: `ji-devs/ji-cloud`, branch `sandbox` (fetched 2026-09). Paths are relative to the repo root.
Sample data: `WILK/archive/json/{jigId}_{moduleId}.json` (240 files: 73 tappingBoard, 40 findAnswer,
38 video, 34 cover, 12 dragDrop, 11 cardQuiz, 5 poster, 5 memoryGame, 2 matching, 1 flashcards, 1 embed).

Serde naming: **the outer API envelope is camelCase** (`jigData`, `publishedAt`, `audioEffects`, the body
key `tappingBoard`/`findAnswer`/`dragDrop`/`cardQuiz`/`memoryGame`/...). **Everything inside `body.<kind>` is
snake_case field names** (`play_settings`, `flip_horizontal`, `question_field`, `item_targets`,
`card_content`, `layer_1`). **Enum variants are PascalCase, externally tagged** (`{"Sprite":{...}}`,
`{"Image":{...}}`, `{"Ellipse":[rx,ry]}`, `"Regular"`, `"Continue"`). Exceptions: `SpriteEffect` is
snake_case (`"remove_white"`), `Image.kind` is camelCase (`"png"`/`"gif"`), `MediaLibrary` is `"Global"|"User"|"Web"`.
Inside the rich-text JSON string (text stickers) keys are camelCase (`fontSize`, `highlightColor`, `boxColor`).

---

## 0. Common JSON types (as in the samples)

```ts
type Uuid = string;
type Lib = "Global" | "User" | "Web";               // MediaLibrary; URL segment is lowercase
interface Image { id: Uuid; lib: Lib; kind?: "png" | "gif" }   // kind defaults to png (serde default)
interface Audio { id: Uuid; lib: Lib }
interface Transform {                                 // shared/rust/src/domain/module/body.rs
  translation: [number, number, number];            // normalized, see §1
  rotation: [number, number, number, number];       // quaternion x,y,z,w (only z,w used in 2D)
  scale: [number, number, number];
  origin: [number, number, number];                 // always [0,0,0] in data (0 of 240 files differ)
}
interface ModuleAssist { text: string | null; audio: Audio | null }   // instructions / feedback
type Background = { Image: Image } | { Color: RGBA8 | null };
// RGBA8 is the `rgb` crate type -> serialized as {"r":..,"g":..,"b":..,"a":..} (0-255). No Color
// backgrounds occur in the samples, so verify if you meet one.
interface Backgrounds { layer_1: Background | null; layer_2: Background | null }
type ThemeId = "Blank" | "Jigzi" | "JigziGreen" | "JigziBlue" | "JigziRed" | "Chalkboard" | "Iml"
  | "TuBishvat" | "IlluminatingHanukkah" | "Surreal" | "Flowers" | ... ;   // full list: body.rs enum ThemeId

type Sticker =
  | { Sprite: { image: Image; transform: Transform; effects: ("remove_white")[];
                flip_horizontal: boolean; flip_vertical: boolean;
                hover_animation: HoverAnimation | null; hidden: StickerHidden | null } }
  | { Text:   { value: string /* JSON string, §2 */; transform: Transform;
                hover_animation: HoverAnimation | null; hidden: StickerHidden | null } }
  | { Embed:  { host: EmbedHost; transform: Transform } };
type HoverAnimation = "Grow" | "Tilt" | "Buzz";
type ShowHideAnimation = "Appear" | "FadeInTop" | "FadeInBottom" | "FadeInLeft" | "FadeInRight";
type StickerHidden = { OnClick: ShowHideAnimation } | { UntilClick: ShowHideAnimation };

// "design" base content (Cover, Poster, Video, Embed, TappingBoard, FindAnswer)
interface DesignBase {                               // body/_groups/design.rs BaseContent
  instructions: ModuleAssist; feedback: ModuleAssist; // feedback has serde(default)
  theme: ThemeId; backgrounds: Backgrounds; stickers: Sticker[];
}
```

Media URLs (`frontend/apps/crates/utils/src/path.rs`, `shared/rust/src/media.rs` `media_key`):
`https://uploads.jigzi.org/media/{global|user|web}/{id}/{original.png|resized.png|thumbnail.png|animation.gif|audio.mp3}`.
Audio: `https://uploads.jigzi.org/media/user/{id}/audio.mp3` (HEAD 200 verified).
UI/theme/font assets: `https://media.jigzi.org/ui/{path}` (`ts-utils/path.ts` `mediaUi`).

---

## 1. Stage and coordinates

- Stage = **1920 x 1080 reference units**, 16:9 (`frontend/config/constants.js` `STAGE_PLAYER {width:1920,height:1080}`;
  legacy modules 1024x768). The player letterboxes a 16:9 `#content` box (`elements/src/core/module-page/iframe.ts`:
  `aspect-ratio:16/9`, centered, `background-color:white`, `overflow:hidden`) and sets
  `html { font-size: scale px }` with `scale = contentWidthPx / 1920`, so **`1rem` = 1 reference px**.
  Implement: a 1920x1080 div scaled with `transform: scale(k)`, or set root font-size; all sizes below are in reference px.
- `ResizeInfo.get_pos_denormalized(x,y) = (x * stageW, y * stageH)` (`utils/src/resize.rs`). Translation is
  **normalized to stage width (x) and height (y) separately**; y grows **down** (CSS).

### Sprite / sticker placement (`components/src/stickers/sprite/dom.rs`, `utils/src/math/{transform_ext,mat4,bounds}.rs`)
- Element size = **natural pixel size of the loaded image, used 1:1 as reference px** (`width: {naturalW}rem`).
  The image loaded is **`resized.png`** (`load_and_render` -> `ImageEffect::new` -> `module_image_url(..., PngImageFile::Resized, ..)`),
  or `animation.gif` when `kind=="gif"` and no effects.
- Element is `position:absolute; left: (1920 - w)/2; top: (1080 - h)/2` (`bounds::center_rem`: "0,0 means centering
  in the middle of the screen"), i.e. **the sticker's center sits at the stage center before the transform**.
- Then `transform: matrix3d(...)` from `Matrix4::new_from_trs_origin` = T * R * S (glMatrix `fromRotationTranslationScaleOrigin`),
  translation replaced by `(tx*1920, ty*1080)`. CSS `transform-origin` is the default (50% 50%), so
  rotation/scale are **about the sticker's center**. Equivalent CSS:
  ```
  left: (1920-w)/2; top: (1080-h)/2; width:w; height:h;
  transform: translate(tx*1920px, ty*1080px) rotate(θ rad) scale(sx, sy);
  ```
  Final center in stage px: `cx = 960 + tx*1920`, `cy = 540 + ty*1080`. Displayed size `w*sx` by `h*sy` (sx, sy can differ).
- Rotation: quaternion about z only. `θ = 2 * atan2(z, w)` radians; positive = clockwise on screen (matrix m0 = 1-2z², m1 = 2wz,
  which CSS reads as cos θ, sin θ). Example sample `[0,0,-0.9974,0.0721]` gives θ ≈ -2.997 rad (≈ -171.7°).
  `rotate_z` in `transform_ext.rs` confirms: `q.z = sin(rad/2), q.w = cos(rad/2)`.
- `origin` is always 0: ignore (the formula would add `o - M*o`).
- Flip: applied to the inner `<img>`: `transform: scaleX(flipH ? -1 : 1) scaleY(flipV ? -1 : 1)` (inside the rotated/scaled box).
- `effects: ["remove_white"]`: canvas pass, every pixel with r,g,b **> 250** gets alpha 0 (`utils/src/image_effects.rs`, `THRESHHOLD: u8 = 250`).
- Sticker `<img>` has `pointer-events:none; user-select:none` in play; the wrapper is `position:absolute; display:block`.
- Paint order = array order (later stickers on top). Layers: theme bg, layer_1, layer_2, stickers, then (module-specific) traces overlay.

### Text sticker placement (`components/src/stickers/text/dom.rs` `render_sticker_text_raw`)
- Size = measured size of the rendered text box (an invisible `position:fixed; left:-100%` copy is measured).
- `left/top` from `aabb_no_rotation_transform_px(coords_in_center=true)`:
  `x = tx*1920 + (1920 - w)/2 - (w*sx - w)/2`, same for y. So **the text box center is at `(960 + tx*1920, 540 + ty*1080)`**.
- `transform: rotation only` (`rotation_matrix_string`); **scale is NOT applied to text** (text is resized via font size; all
  sample text stickers have scale 1).

### Embed sticker placement: see §6 Video.

---

## 2. Text stickers (rich text)

`Text.value` is a JSON **string** (parse twice). Format `version "0.1.0"` (`elements/src/core/wysiwyg/wysiwyg-types.ts`,
must stay in sync with `components/src/text_editor/wysiwyg_types.rs`):

```ts
interface WysiwygValue { version: "0.1.0"; content: EditorElement[]; boxColor?: string }   // root
interface EditorElement { children: EditorText[]; align?: "Left" | "Center" | "Right" }    // one paragraph
interface EditorText {                       // one span (leaf)
  text: string;
  element?: "H1" | "H2" | "P1" | "P2";      // default in editor state: H1
  font?: string;       // CSS font-family string incl. quotes, e.g. "\"FredokaOne-regular\"" or "\"quicksand\""
  fontSize?: number;   // reference px (rendered as `${fontSize}rem`)
  weight?: number;     // 200 | 400 | 700 | 900 (UI options); BOLD_WEIGHT=700, REGULAR_WEIGHT=400
  color?: string;      // "#RRGGBB" or "#RRGGBBAA" (e.g. "#4B3924FF")
  highlightColor?: string;   // span background-color
  italic?: boolean; underline?: boolean;
}
```
Sample stats (all files): element H1 942, P2 44, H2 7, P1 1; align Center 53, Right 5; fontSize 20..253 (most 90/100/172/218);
weight 200 (47), 700 (1); highlightColor 42; boxColor 1; underline 1.

Rendering (`elements/src/core/wysiwyg/wysiwyg-output-renderer.ts`, `styles.ts`, `wysiwyg-theme.ts`):
- Host: `display:inline-block; padding: 0 5px; white-space: pre-wrap; overflow-wrap: break-word;` background = `boxColor` if set.
- Each element -> `<p dir="auto" style="margin:0; text-align:center|right">` (Left = no style). Each leaf ->
  `<span type="{element}" style=...>`; empty `text` renders `<br>`. Paragraphs are separate lines; `\n` inside text is kept (pre-wrap).
- Leaf styles: `underline -> text-decoration:underline`, `italic -> font-style:italic`, `fontSize -> font-size:{n}rem`,
  `color`, `highlightColor -> background-color`, `font -> font-family`, `weight -> font-weight`.
- **Theme defaults** per element via CSS vars on the host, from `frontend/config/themes.json`:
  `span[type=H1]{color:var(--h1-color); font-family:var(--h1-font); font-size:var(--h1-font-size)}` etc., where
  `--h1-color = theme.colors[theme.textEditor.h1.fontColor]`, `--h1-font = theme.fontFamilies[textEditor.h1.fontFamily]`,
  `--h1-font-size = textEditor.h1.fontSize rem`. Leaf props override.
  Examples:
  | theme id (json key) | fontFamilies | colors | H1 / H2 / P1 / P2 size (font idx, color idx) |
  |---|---|---|---|
  | `blank` | `'Alef-Regular'`, `'Shesek FM Regular', 'Caveat - Medium'`, `'Alef-bold'` | #272727 #ffffff #272727 #387AF4 | 120/70/40/30 (H: font 2, P: font 0; color 0) |
  | `tubishvat` | `'RubikDirt', 'RubikDirt'`, `'Shesek FM Regular', 'Caveat - Medium'` | #FFFDE6 #4B3924 #4B3924 | 120/70/50/40 (font 0, color 2) |
  | `illuminating-hanukkah` | `'Tinos-Regular'`, Shesek/Caveat | #9E875A #ffffff #F0DB75 | 120/80/48/38 (font 0, color 2) |
  | `chalkboard` | Shesek+Architects Daughter; Alef-Heb+Architects; Alef-Heb+Glegoo | #272727 #AFCBF4 #FFFFFF #272727 | 120/70/40/30 (H font 0, P font 2; color 2) |
  Ship `themes.json` verbatim (83 KB) and do the lookup at runtime.
- Line height: not set anywhere -> browser `normal`. No explicit width: the box is shrink-to-fit (max-content, wraps only at
  explicit breaks or when it would exceed the available width). Letter spacing default.
- Fonts: `frontend/config/fonts.json` maps family name -> file; loaded as `new FontFace(name, url(https://media.jigzi.org/ui/fonts/{file}) format('{format}'), {unicodeRange: range})`
  (`elements/src/_themes/themes.ts` `loadFonts`). One face per family (no weight variants: bold is synthesized, 200 renders as regular).
  Verified: `https://media.jigzi.org/ui/fonts/FredokaOne-Regular.ttf` (200 font/ttf), `.../fonts/Shesek/shesek-regular-fm.woff2` (200).
  Hebrew families (Shesek, Frank Ruhl) have `range: "U+0590-05FF, U+FB1D-FB4F"` so a pair like `'Shesek FM Regular', 'Caveat - Medium'`
  renders Hebrew in Shesek and Latin in Caveat. Family names are matched case-insensitively (themes say `'Alef-Regular'`, fonts.json `Alef-regular`).
- Default page fallback (if a leaf has no element and no font): body `font-family: Poppins; color:#4a4a4a` (`https://frontend.jigzi.org/static/head.css`).
- Text box transform: see §1 (center at stage center + translation, rotation only).

---

## 3. Backgrounds (`components/src/backgrounds/dom.rs`)

Stacked in a 1x1 CSS grid covering the whole stage, in order:
1. **theme background** `<img-ui path="theme/{themeKebab}/bg.jpg">` -> `https://media.jigzi.org/ui/theme/{themeKebab}/bg.jpg` (always, even for Blank; blank bg.jpg is a plain 1920x1080 image),
2. `layer_1`, 3. `layer_2`.
Each layer: `object-fit: contain; width:100%; height:100%; overflow:hidden` (`BG_STYLES`).
- `Image` -> `<img-ji size="full">` = **`resized.png`** (`ts-utils/path.ts` `sizeVariant: full -> "resized"`). Canvas images are
  resized **exactly** to 1920x1080 at upload (`backend/api/src/image_ops.rs` `ImageSize::Canvas => resize_exact(1920,1080)`), so contain == fill.
  Verified: global bg `fe159f50-.../resized.png` is 1920x1080, its `original.png` 4096x2304.
- `Color(Some(rgba))` -> div with `background-color` (hex). `Color(null)` -> nothing.
- Cards modules (Memory/Matching/CardQuiz/Flashcards) have a single `background: Background | null` (same rendering, over the theme bg).

---

## 4. Themes

- JSON value `"TuBishvat"` etc. (PascalCase). Asset/config id = strum kebab-case (`utils/src/themes.rs` `as_str_id`):
  `Blank->blank`, `JigziBlue->jigzi-blue`, `IlluminatingHanukkah->illuminating-hanukkah`, `LostInSpace->lost-in-space`.
  **Special cases** (`#[strum(serialize=..)]` in body.rs): `TuBishvat -> "tubishvat"`, `PassoveMatza -> "passover-matza"`,
  `Valentine -> "valentine_s-day"`. Both `RoshHashana` and `RoshHashanah` exist.
- A theme affects: (a) the full-stage background image `bg.jpg` (this is the decorative frame; there is no separate border asset),
  (b) text defaults per H1/H2/P1/P2 (font family, size, color) (§2), (c) card styling: `cards.{fontColor,fillColor,borderColor}`
  (color indices), `cards.fontFamily`, `fontFamilyLetteringLeft/Right`, plus `theme/{id}/card-back.png` and `card-back-icon.png`
  (`elements/src/module/_groups/cards/helpers.ts`), (d) editor-only icons `theme/{id}/icon.jpg`, `icon-hover.jpg`. `premium: true` is editor-only.
- Verified HEAD 200: `https://media.jigzi.org/ui/theme/tubishvat/bg.jpg` (image/jpeg 1,498,083 B, 1920x1080),
  `.../theme/blank/bg.jpg`, `.../theme/illuminating-hanukkah/bg.jpg`, `.../theme/chalkboard/bg.jpg`,
  `.../theme/tubishvat/card-back.png`, `.../theme/tubishvat/card-back-icon.png`.
- Config: `frontend/config/themes.json` (keys = kebab ids). Shape:
  ```ts
  interface Theme { id: string; label:{en:string}; premium?: boolean; fontFamilies: string[]; colors: string[] /* "#RRGGBB" */;
    textEditor: { h1|h2|p1|p2: { fontFamily: number; fontSize: number; fontColor: number }; fontList: string[] };
    cards: { fontColor: number; fillColor: number; borderColor: number; fontFamily: number;
             fontFamilyLetteringLeft: number; fontFamilyLetteringRight: number } }
  ```

---

## 5. Traces (`body/_groups/design.rs` Trace, `components/src/traces/{utils.rs,svg/*}`)

```ts
interface Trace {
  transform: Transform;
  shape: { Rect: [w, h] } | { Ellipse: [rx, ry] } | { Path: [x, y][] } | { PathCommands: [PathCommand, boolean /*absolute*/][] };
  kind: "Regular" | "Correct" | "Wrong";    // Regular = blue (general), Correct = green, Wrong = red/orange
  audio: Audio | null;                       // played on tap (TappingBoard)
  text: string | null;                       // bubble text (TappingBoard)
}
// PathCommand: {MoveTo:[x,y]} | "ClosePath" | {LineTo:[x,y]} | {HorizontalLineTo:x} | {VerticalLineTo:y}
//   | {CurveTo:[..6]} | {SmoothCurveTo:[..4]} | {QuadCurveTo:[..4]} | {SmoothQuadCurveTo:[x,y]} | {ArcTo:[..7]}
```
Samples: 425 Rect, 419 Ellipse, 10 Path, 0 PathCommands; kinds Regular 514, Correct 340.

**Coordinate system differs from stickers: traces use a TOP-LEFT stage origin.** All values normalized: x * 1920, y * 1080.
- Local shape geometry (before transform), in stage px:
  - `Rect [w,h]` -> rect at (0,0) size (w*1920, h*1080).
  - `Ellipse [rx,ry]` -> ellipse `cx=rx*1920, cy=ry*1080, rx=rx*1920, ry=ry*1080` (bounding box (0,0)-(2rx,2ry)).
  - `Path [[x,y]...]` -> `d = "M x0 y0 x1 y1 ... Z"` with each point * (1920,1080) (implicit line-to, closed). Points are relative to
    the translation (they start near 0) in the samples.
- Transform: `translation` * (1920,1080) = offset of the shape's local origin (top-left) from the stage top-left; may be negative.
  Rotation/scale about the **center of the shape bounds size**: `transform: matrix3d(T*R*S); transform-origin: w/2 h/2`
  where (w,h) = bounds size (`svg/state.rs` `TransformSize::get_style_string`). Equivalent:
  `translate(tx*1920, ty*1080) translate(w/2,h/2) rotate(θ) scale(sx,sy) translate(-w/2,-h/2)`.
  Note for Path the bounds origin is the min point but transform-origin still uses (w/2,h/2) from local (0,0) - replicate as-is.
- Rendering: one full-stage `<svg>` (`position:absolute; top:0; left:0`), shapes as `<rect>/<ellipse>/<path>`.
  Masked mode (`render_masks`): a black rect with `fill-opacity:0.5` covering the stage with holes cut by the shapes (mask: white rect + black shapes).
  Stroke styles (`svg/styles.rs`), all `fill-opacity:0` except mask:
  | style | Regular (General) | Correct | Wrong (Incorrect) |
  |---|---|---|---|
  | Play Selected | stroke #005aff, width 4 | #46ba6f, 9 | #fd7c44, 5 |
  | Play Deselected | #2343A0, 8 | #518973, 9 | #af6c27, 5 |
  | Play Hint | #AFCBF4, 8 (any kind) | | |
  | Transparent (hit area only) | fill-opacity 0, no stroke | | |
  Interactive shapes get `cursor:pointer`.
- Hit testing: the SVG shape receives the pointer event (so point-in-transformed-shape).
