"use client";

import { useRef, useState } from "react";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";

import Toolbar from "./components/toolbar";
import Canvas from "./components/canvas";
import CursorsOverlay from "./components/cursors-overlay";
import DebugInfo from "./components/debug-info";
import EditableText from "./components/editable-text";

import { useRealtime } from "./hooks/use-realtime";
import { useCanvasRenderer } from "./hooks/use-canvas-renderer";
import { usePointerEvents } from "./hooks/use-pointer-events";

import { Element, PreviewElement, CursorPosition, Tool } from "./types";
import PropertiesPanel from "./components/properties-panel";

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

  const [elements, setElements] = useState<Element[]>(initialElements);
  const [activeTool, setActiveTool] = useState<Tool>("select");
  const [cursors, setCursors] = useState<CursorPosition[]>([]);
  const [previewElement, setPreviewElement] = useState<PreviewElement>(null);
  const [editingElementId, setEditingElementId] = useState<string | null>(null);
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const ourId = useRef(nanoid());

  const channelRef = useRealtime({
    canvasId,
    ourId: ourId.current,
    setElements,
    setCursors,
  });

  const {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDrawing,
    selectedElementId,
  } = usePointerEvents({
    elements,
    setElements,
    previewElement,
    setPreviewElement,
    activeTool,
    canvasId,
    ourId: ourId.current,
    channelRef,
    canvasRef,
    supabase,
    setEditingElementId,
    setActiveTool,
    camera,
    setCamera,
  });

  useCanvasRenderer({
    canvasRef,
    contextRef,
    elements,
    previewElement,
    editingElementId,
    camera,
    selectedElementId,
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
    const { error } = await supabase
      .from("elements")
      .update({ properties: element.properties })
      .eq("id", element.id);

    if (error) console.error("Error updating text:", error);
    setEditingElementId(null);
  };

  const handleUpdateElement = async (
    id: string,
    updates: Partial<Element["properties"]>,
  ) => {
    setElements((current) =>
      current.map((el) => {
        if (el.id === id) {
          return {
            ...el,
            properties: {
              ...el.properties,
              ...updates,
            } as Element["properties"],
          };
        }
        return el;
      }),
    );

    const element = elements.find((el) => el.id === id);
    if (element) {
      const { error } = await supabase
        .from("elements")
        .update({ properties: { ...element.properties, ...updates } })
        .eq("id", id);

      if (error) console.error("Error updating properties:", error);
    }
  };

  const elementToEdit = elements.find(
    (el) => el.id === editingElementId && el.properties.type === "text",
  ) as (Element & { properties: { type: "text" } }) | undefined;
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
      {selectedElement && (
        <PropertiesPanel
          element={selectedElement}
          updateAction={handleUpdateElement}
        />
      )}
      <Canvas
        canvasRef={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
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
