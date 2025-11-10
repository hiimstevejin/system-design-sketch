"use client";

import { useRef, useState } from "react";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";

// Import components
import Toolbar from "./components/toolbar";
import Canvas from "./components/canvas";
import CursorsOverlay from "./components/cursors-overlay";
import DebugInfo from "./components/debug-info";
import EditableText from "./components/editable-text";

// Import hooks
import { useRealtime } from "./hooks/use-realtime";
import { useCanvasRenderer } from "./hooks/use-canvas-renderer";
import { usePointerEvents } from "./hooks/use-pointer-events";

// Import types
import { Element, PreviewElement, CursorPosition, Tool } from "./types";

type DrawingCanvasProps = {
  canvasId: string;
  canvasName: string;
  initialElements: Element[];
};

export default function DrawingCanvas({
  canvasId,
  canvasName,
  initialElements,
}: DrawingCanvasProps) {
  const supabase = createClient();

  // --- Core State ---
  const [elements, setElements] = useState<Element[]>(initialElements);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [previewElement, setPreviewElement] = useState<PreviewElement>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0 });

  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const ourId = useRef(nanoid());

  // --- Custom Hooks ---
  const channelRef = useRealtime({
    canvasId,
    ourId: ourId.current,
    setElements,
    setCursors,
  });

  useCanvasRenderer({
    canvasRef,
    contextRef,
    elements,
    previewElement,
    editingElementId,
    camera,
  });

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDrawing,
    handleWheel,
  } = usePointerEvents({
    elements,
    setElements,
    previewElement,
    setPreviewElement,
    activeTool,
    canvasId,
    ourId: ourId.current,
    channelRef,
    supabase,
    setEditingElementId,
    setActiveTool,
    camera,
    setCamera,
  });

  // --- Event Handlers ---
  const handleToolSelect = (tool: Tool) => {
    setActiveTool(tool);
    setPreviewElement(null);
  };

  const handleTextChange = (id: string, newText: string) => {
    // Optimistic update for text
    setElements((current) =>
      current.map((el) => {
        if (el.id === id && el.properties.type === "text") {
          return { ...el, properties: { ...el.properties, text: newText } };
        }
        return el;
      }),
    );
  };

  const handleTextBlur = async (element: Element) => {
    // Save to Supabase
    const { error } = await supabase
      .from("elements")
      .update({ properties: element.properties })
      .eq("id", element.id);

    if (error) console.error("Error updating text:", error);
    setEditingElementId(null);
  };

  // --- Render ---
  const elementToEdit = elements.find(
    (el) => el.id === editingElementId && el.properties.type === "text",
  ) as (Element & { properties: { type: "text" } }) | undefined;

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
      <Canvas
        canvasRef={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onWheel={handleWheel}
      />
      <CursorsOverlay cursors={cursors} camera={camera} />
      <DebugInfo activeTool={activeTool} isDrawing={isDrawing} />

      {elementToEdit && (
        <EditableText
          element={elementToEdit}
          onChange={handleTextChange}
          onBlur={handleTextBlur}
          camera={camera}
        />
      )}
    </div>
  );
}
