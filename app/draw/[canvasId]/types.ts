export type Element = {
  id: string;
  canvas_id: string;
  properties: {
    type: "rect" | "arrow" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_at: string;
};

export type PreviewElement = Omit<Element, "id" | "created_at" | "canvas_id"> | null;

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