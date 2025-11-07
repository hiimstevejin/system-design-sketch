import { useEffect } from "react";
import { Element, PreviewElement } from "../types";

type UseCanvasRendererParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  contextRef: React.MutableRefObject<CanvasRenderingContext2D | null>;
  elements: Element[];
  previewElement: PreviewElement;
  editingElementId: string | null;
};

export function useCanvasRenderer({
  canvasRef,
  contextRef,
  elements,
  previewElement,
  editingElementId,
}: UseCanvasRendererParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;

    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;

    const context = canvas.getContext("2d");
    if (!context) return;
    contextRef.current = context;

    context.scale(dpr, dpr);

    // Clear the canvas
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Draw all permanent elements
    elements.forEach((element) => {
      if (element.id === editingElementId) return;
      drawElement(context, element);
    });

    // Draw the preview element
    if (previewElement) {
      drawElement(context, previewElement, "blue");
    }
  }, [canvasRef, contextRef, elements, previewElement, editingElementId]);
}

// Helper function to draw any element
function drawElement(
  context: CanvasRenderingContext2D,
  element: Element | PreviewElement,
  color: string = "black",
) {
  if (!element) return;

  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 2;

  if (element.properties.type === "rect") {
    context.strokeRect(
      element.properties.x,
      element.properties.y,
      element.properties.width,
      element.properties.height,
    );
  } else if (element.properties.type === "arrow") {
    context.beginPath();
    context.moveTo(element.properties.x, element.properties.y);
    context.lineTo(element.properties.x2, element.properties.y2);
    context.stroke();
  } else if (element.properties.type === "text") {
    context.font = "16px sans-serif";
    context.fillText(
      element.properties.text,
      element.properties.x,
      element.properties.y,
    );
  }
}
