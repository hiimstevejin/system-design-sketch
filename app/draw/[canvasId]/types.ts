type SharedProperties = {
  stroke?: string;
  fill?: string;
  strokeWidth?: number;
};

type ImageProperties = SharedProperties & {
  type: "image";
  x: number;
  y: number;
  width: number;
  height: number;
  src: string;
};

type RectProperties = SharedProperties & {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

type ArrowProperties = SharedProperties & {
  type: "arrow";
  x: number;
  y: number;
  x2: number;
  y2: number;
};

type TextProperties = SharedProperties & {
  type: "text";
  x: number;
  y: number;
  text: string;
};

export type RawAiElement = {
  type: "rect" | "text" | "arrow";
  x: number;
  y: number;
  width?: number;
  height?: number;
  text?: number;
  x2?: number;
  y2?: number;
};

export type Element = {
  id: string;
  canvas_id: string;
  properties:
    | RectProperties
    | ArrowProperties
    | TextProperties
    | ImageProperties;
  created_at: string;
};

export type PreviewElement = Omit<
  Element,
  "id" | "created_at" | "canvas_id"
> | null;

export type CursorPosition = {
  id: string;
  x: number;
  y: number;
};

export type Action = "idle" | "drawing" | "moving" | "resize";

export type Camera = {
  x: number;
  y: number;
  zoom: number;
};

export const TOOLS = ["select", "rectangle", "arrow", "text", "image"] as const;
export type Tool = (typeof TOOLS)[number];
export type HandleType = "tl" | "tr" | "bl" | "br" | "start" | "end" | null;

export type DragStartPos =
  | { x: number; y: number; width?: number; height?: number }
  | { x: number; y: number; x2: number; y2: number }
  | null;
