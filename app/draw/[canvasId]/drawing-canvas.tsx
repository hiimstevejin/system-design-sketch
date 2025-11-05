"use client";

import { useRef, useState, MouseEvent } from "react";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";

// Import our new components
import Toolbar, { type Tool } from "./components/toolbar";
import Canvas from "./components/canvas";
import CursorsOverlay from "./components/cursors-overlay";
import DebugInfo from "./components/debug-info";

// Import our new hooks
import { useRealtime } from "./hooks/use-realtime";
import { useCanvasRenderer } from "./hooks/use-canvas-renderer";

// Import types
import {
  Element,
  PreviewElement,
  CursorPosition,
  DrawingCanvasProps,
  Action,
} from "./types";

// Define a type for our new preview element

export default function DrawingCanvas({
  canvasId,
  canvasName,
  initialElements,
}: DrawingCanvasProps) {
  const supabase = createClient();

  const [elements, setElements] = useState<Element[]>(initialElements);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [previewElement, setPreviewElement] = useState<PreviewElement>(null);
  const [action, setAction] = useState<Action>("idle");
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const ourId = useRef(nanoid());
  const dragStartElementPos = useRef<{ x: number; y: number } | null>(null);

  // Hook to manage all Supabase subscriptions
  const channelRef = useRealtime({
    canvasId,
    ourId: ourId.current,
    setElements,
    setCursors,
  });

  // Hook to handle all canvas drawing
  useCanvasRenderer({
    canvasRef,
    contextRef,
    elements,
    previewElement,
  });

  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
    // FIX: Clear the preview element any time a new tool is selected
    setPreviewElement(null);
  };

  // --- Event Handlers ---
  const handlePointerDown = (e: MouseEvent<HTMLCanvasElement>) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (activeTool === "select") {
      // console.log(`PointerDown @ (${x}, ${y}) with "select" tool.`);
      const element = getElementAtPosition(x, y, elements);
      if (element) {
        console.log(`Found element: ${element.id}`);
        setAction("moving");
        setSelectedElementId(element.id);
        setStartPoint({ x, y });

        if (element.properties.type === "rect") {
          dragStartElementPos.current = {
            x: element.properties.x,
            y: element.properties.y,
          };
        } else if (element.properties.type === "arrow") {
          dragStartElementPos.current = {
            x: element.properties.x,
            y: element.properties.y,
            x2: element.properties.x2, // <-- Store end points
            y2: element.properties.y2,
          };
        }
      }
    } else {
      console.log("No element found at this position.");
      setAction("drawing");
      setIsDrawing(true);
      setStartPoint({ x, y });
    }
  };

  const handlePointerMove = (e: MouseEvent<HTMLCanvasElement>) => {
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    // Broadcast our cursor
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "cursor-move",
        payload: { id: ourId.current, x, y },
      });
    }

    if (action === "drawing" && isDrawing) {
      if (activeTool === "rectangle") {
        setPreviewElement({
          properties: {
            type: "rect",
            x: startPoint.x,
            y: startPoint.y,
            width: x - startPoint.x,
            height: y - startPoint.y,
          },
        });
      } else if (activeTool === "arrow" && isDrawing) {
        setPreviewElement({
          properties: {
            type: "arrow",
            x: startPoint.x,
            y: startPoint.y,
            x2: x,
            y2: y,
          },
        });
      }
    }

    if (
      action === "moving" &&
      selectedElementId &&
      dragStartElementPos.current
    ) {
      console.log(`Moving element ${selectedElementId}`);
      // Calculate how much the mouse has moved
      const dx = x - startPoint.x;
      const dy = y - startPoint.y;

      const originalX = dragStartElementPos.current.x;
      const originalY = dragStartElementPos.current.y;

      // Optimistically update the element's position locally
      setElements((currentElements) =>
        currentElements.map((el) => {
          if (el.id === selectedElementId) {
            const originalPos = dragStartElementPos.current!;

            // NEW: Check element type for correct move logic
            if (el.properties.type === "rect") {
              return {
                ...el,
                properties: {
                  ...el.properties,
                  x: originalPos.x + dx,
                  y: originalPos.y + dy,
                },
              };
            } else if (el.properties.type === "arrow") {
              return {
                ...el,
                properties: {
                  ...el.properties,
                  x: originalPos.x + dx,
                  y: originalPos.y + dy,
                  x2: originalPos.x2! + dx, // <-- Move end point
                  y2: originalPos.y2! + dy, // <-- Move end point
                },
              };
            }
          }
          return el;
        }),
      );
    }
  };

  const handlePointerUp = async (e: MouseEvent<HTMLCanvasElement>) => {
    if (action === "drawing") {
      setIsDrawing(false);
      setPreviewElement(null);

      let newElementProperties: Element["properties"] | undefined;
      const { offsetX, offsetY } = e.nativeEvent;

      if (activeTool === "rectangle") {
        const width = offsetX - startPoint.x;
        const height = offsetY - startPoint.y;
        if (width !== 0 || height !== 0) {
          newElementProperties = {
            type: "rect",
            x: startPoint.x,
            y: startPoint.y,
            width,
            height,
          };
        }
      } else if (activeTool === "arrow") {
        if (offsetX !== startPoint.x || offsetY !== startPoint.y) {
          newElementProperties = {
            type: "arrow",
            x: startPoint.x,
            y: startPoint.y,
            x2: offsetX,
            y2: offsetY,
          };
        }
      }
      if (newElementProperties) {
        const newElement: Element = {
          id: nanoid(),
          canvas_id: canvasId,
          properties: newElementProperties,
          created_at: new Date().toISOString(),
        };

        // clear preview and add new element in one go

        setElements((current) => [...current, newElement]);

        const { error } = await supabase.from("elements").insert(newElement);

        if (error) {
          console.error("Error inserting element:", error);
          setElements((current) =>
            current.filter((el) => el.id !== newElement.id),
          );
        }
      }
    }

    if (action === "moving" && selectedElementId) {
      // Find the element we just moved
      const movedElement = elements.find((el) => el.id === selectedElementId);

      if (movedElement) {
        // Send the FINAL updated properties to Supabase
        const { error } = await supabase
          .from("elements")
          .update({ properties: movedElement.properties })
          .eq("id", selectedElementId);

        if (error) {
          console.error("Error updating element:", error);
          // TODO: Revert optimistic update on error
        }
      }
    }

    // Reset actions
    setAction("idle");
    setSelectedElementId(null);
    dragStartElementPos.current = null;
  };

  /**
   * Calculates the distance from a point (x, y) to a line segment (x1, y1) -> (x2, y2).
   */
  function getDistanceToLineSegment(
    x: number,
    y: number,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
  ) {
    const A = x - x1;
    const B = y - y1;
    const C = x2 - x1;
    const D = y2 - y1;

    const dot = A * C + B * D;
    const lenSq = C * C + D * D;
    let param = -1;
    if (lenSq !== 0) {
      param = dot / lenSq;
    }

    let xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    } else if (param > 1) {
      xx = x2;
      yy = y2;
    } else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    const dx = x - xx;
    const dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function getElementAtPosition(x: number, y: number, elements: Element[]) {
    // Loop backwards to select the top-most element
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.properties.type === "rect") {
        // add padding so that the element is selected even if the cursor is slightly outside the element
        const padding = 10;
        const { x: elX, y: elY, width: elW, height: elH } = el.properties;
        if (
          x >= elX - padding &&
          x <= elX + elW + padding &&
          y >= elY - padding &&
          y <= elY + elH + padding
        ) {
          return el;
        }
      } else if (el.properties.type === "arrow") {
        const padding = 10;
        const { x: x1, y: y1, x2, y2 } = el.properties;
        const distance = getDistanceToLineSegment(x, y, x1, y1, x2, y2);
        if (distance <= padding) {
          return el;
        }
      }
      // Add 'else if' for other shapes later
    }
    return null;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
      <Canvas
        canvasRef={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      />
      <CursorsOverlay cursors={cursors} />
      <DebugInfo activeTool={activeTool} isDrawing={isDrawing} />
    </div>
  );
}
