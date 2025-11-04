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
    null
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

        dragStartElementPos.current = {
          x: element.properties.x,
          y: element.properties.y,
        };
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

    if (action === "drawing" && activeTool === "rectangle") {
      setPreviewElement({
        properties: {
          type: "rect",
          x: startPoint.x,
          y: startPoint.y,
          width: x - startPoint.x,
          height: y - startPoint.y,
        },
      });
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
            return {
              ...el,
              properties: {
                ...el.properties,
                x: originalX + dx,
                y: originalY + dy,
              },
            };
          }
          return el;
        })
      );
    }
  };

  const handlePointerUp = async (e: MouseEvent<HTMLCanvasElement>) => {
    if (action === "drawing") {
      setIsDrawing(false);
      setPreviewElement(null);

      const { offsetX, offsetY } = e.nativeEvent;
      const width = offsetX - startPoint.x;
      const height = offsetY - startPoint.y;

      if (activeTool === "rectangle" && (width !== 0 || height !== 0)) {
        // Insert the new element into the database
        const { error } = await supabase.from("elements").insert({
          id: nanoid(),
          canvas_id: canvasId,
          properties: {
            type: "rect" as const,
            x: startPoint.x,
            y: startPoint.y,
            width: width,
            height: height,
          },
        });

        if (error) {
          console.error("Error inserting element:", error);
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

  function getElementAtPosition(x: number, y: number, elements: Element[]) {
    // Loop backwards to select the top-most element
    for (let i = elements.length - 1; i >= 0; i--) {
      const el = elements[i];
      if (el.properties.type === "rect") {
        const { x: elX, y: elY, width: elW, height: elH } = el.properties;
        if (x >= elX && x <= elX + elW && y >= elY && y <= elY + elH) {
          return el;
        }
      }
      // Add 'else if' for other shapes later
    }
    return null;
  }

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Toolbar
        activeTool={activeTool}
        onToolSelect={(tool) => setActiveTool(tool)}
      />
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
