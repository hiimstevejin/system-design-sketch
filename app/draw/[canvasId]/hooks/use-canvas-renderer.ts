import { useEffect } from "react";
import { Camera, Element, PreviewElement } from "../types";

type UseCanvasRendererParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  contextRef: React.RefObject<CanvasRenderingContext2D | null>;
  elements: Element[];
  previewElement: PreviewElement;
  editingElementId: string | null;
  camera: Camera;
};

export function useCanvasRenderer({
  canvasRef,
  contextRef,
  elements,
  previewElement,
  editingElementId,
  camera,
}: UseCanvasRendererParams) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext("2d");
    if (!context) return;
    contextRef.current = context;
    context.clearRect(0, 0, canvas.width, canvas.height);

    context.save();

    context.scale(dpr, dpr);
    context.translate(camera.x, camera.y);
    context.scale(camera.zoom, camera.zoom);

    // Draw all permanent elements
    elements.forEach((element) => {
      if (element.id === editingElementId) return;
      drawElement(context, element);
    });

    // Draw the preview element
    if (previewElement) {
      drawElement(context, previewElement, "blue");
    }

    context.restore();
  }, [
    canvasRef,
    contextRef,
    elements,
    previewElement,
    editingElementId,
    camera,
  ]);
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
