import { useEffect } from "react";
import { Element, PreviewElement } from "../types";

type UseCanvasRendererParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  contextRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  elements: Element[];
  previewElement: PreviewElement;
};

export function useCanvasRenderer({
  canvasRef,
  contextRef,
  elements,
  previewElement,
}: UseCanvasRendererParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const context = canvas.getContext("2d");
    if (!context) return;
    contextRef.current = context;

    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all permanent elements
    elements.forEach((element) => {
      drawElement(context, element);
    });

    // Draw the preview element
    if (previewElement) {
      drawElement(context, previewElement, "blue");
    }
  }, [canvasRef, contextRef, elements, previewElement]);
}

// Helper function to draw any element
function drawElement(
  context: CanvasRenderingContext2D,
  element: Element | PreviewElement,
  strokeColor: string = "black"
) {
  if (!element) return;

  if (element.properties.type === "rect") {
    context.strokeStyle = strokeColor;
    context.lineWidth = 2;
    context.strokeRect(
      element.properties.x,
      element.properties.y,
      element.properties.width,
      element.properties.height
    );
  }
  // Add 'else if' for 'arrow', 'text', etc. later
}
