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

export type DrawingCanvasProps = {
  canvasId: string;
  canvasName: string;
  initialElements: Element[];
};

export type Action = "idle" | "drawing" | "moving";

export const TOOLS = ["select", "rectangle", "arrow", "text"] as const;
export type Tool = (typeof TOOLS)[number];
