type RectProperties = {
  type: "rect";
  x: number;
  y: number;
  width: number;
  height: number;
};

type ArrowProperties = {
  type: "arrow";
  x: number;
  y: number;
  x2: number;
  y2: number;
};

type TextProperties = {
  type: "text";
  x: number;
  y: number;
  text: string;
};

export type Element = {
  id: string;
  canvas_id: string;
  properties: RectProperties | ArrowProperties | TextProperties;
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

export const TOOLS = ["select", "rectangle", "arrow", "text"] as const;
export type Tool = (typeof TOOLS)[number];
export type HandleType = "tl" | "tr" | "bl" | "br" | "start" | "end" | null;

export type DragStartPos =
  | { x: number; y: number; width?: number; height?: number }
  | { x: number; y: number; x2: number; y2: number }
  | null;
