import { useEffect } from "react";
import { Camera, Element, PreviewElement } from "../types";

type UseCanvasRendererParams = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  contextRef: React.RefObject<CanvasRenderingContext2D | null>;
  elements: Element[];
  previewElement: PreviewElement;
  editingElementId: string | null;
  camera: Camera;
  selectedElementId: string | null;
};

export function useCanvasRenderer({
  canvasRef,
  contextRef,
  elements,
  previewElement,
  editingElementId,
  camera,
  selectedElementId,
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

    if (selectedElementId) {
      const selectedElement = elements.find(
        (el) => el.id === selectedElementId,
      );
      if (selectedElement && selectedElement.id !== editingElementId) {
        drawSelectionBorder(context, selectedElement);
      }
    }
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
    selectedElementId,
  ]);
}

function drawSelectionBorder(
  context: CanvasRenderingContext2D,
  element: Element,
) {
  const handleSize = 8;
  const halfHandle = handleSize / 2;

  context.save();
  context.strokeStyle = "#3b82f6"; // blue-500
  context.lineWidth = 1;

  let x = 0;
  let y = 0;
  let width = 0;
  let height = 0;

  // 1. Determine dimensions based on type
  if (element.properties.type === "rect") {
    // Rectangles have explicit width/height
    x = element.properties.x;
    y = element.properties.y;
    width = element.properties.width;
    height = element.properties.height;
  } else if (element.properties.type === "text") {
    // Text elements don't have width/height in the DB
    // We calculate a rough box based on char length
    x = element.properties.x;
    y = element.properties.y;
    width = element.properties.text.length * 8 + 10;
    height = 20;
  } else {
    // Arrows need different logic (start/end points), skip for now
    context.restore();
    return;
  }

  // 2. Draw the outline
  context.strokeRect(x - 4, y - 4, width + 8, height + 8);

  // 3. Draw Handles
  context.fillStyle = "white";
  const handles = [
    { x: x - 4, y: y - 4 }, // Top-left
    { x: x + width + 4, y: y - 4 }, // Top-right
    { x: x + width + 4, y: y + height + 4 }, // Bottom-right
    { x: x - 4, y: y + height + 4 }, // Bottom-left
  ];

  handles.forEach((handle) => {
    context.fillRect(
      handle.x - halfHandle,
      handle.y - halfHandle,
      handleSize,
      handleSize,
    );
    context.strokeRect(
      handle.x - halfHandle,
      handle.y - halfHandle,
      handleSize,
      handleSize,
    );
  });

  context.restore();
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
