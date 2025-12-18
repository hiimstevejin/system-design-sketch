"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { createClient } from "@/lib/supabase/client";
import { Sparkles } from "lucide-react";

import Toolbar from "./_components/toolbar";
import Canvas from "./_components/canvas";
import CursorsOverlay from "./_components/cursors-overlay";
import DebugInfo from "./_components/debug-info";
import EditableText from "./_components/editable-text";
import AiGenerator from "./_components/ai-generator";

import { useRealtime } from "./_hooks/use-realtime";
import { useCanvasRenderer } from "./_hooks/use-canvas-renderer";
import { usePointerEvents } from "./_hooks/use-pointer-events";

import {
  Element,
  PreviewElement,
  CursorPosition,
  Tool,
  RawAiElement,
} from "./types";
import PropertiesPanel from "./_components/properties-panel";

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
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const ourId = useRef(nanoid());
  const fileInputRef = useRef<HTMLInputElement>(null);

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
  const handleToolSelect = useCallback((tool: Tool) => {
    if (tool === "image") {
      fileInputRef.current?.click();
    } else {
      setActiveTool(tool);
      setPreviewElement(null);
    }
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't switch tools if user is typing in a text box
      if (
        document.activeElement?.tagName === "TEXTAREA" ||
        document.activeElement?.tagName === "INPUT"
      ) {
        return;
      }

      switch (e.key) {
        case "1":
          handleToolSelect("select");
          break;
        case "2":
          handleToolSelect("rectangle");
          break;
        case "3":
          handleToolSelect("arrow");
          break;
        case "4":
          handleToolSelect("text");
          break;
        case "5":
          handleToolSelect("image");
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleToolSelect]);

  const handleTextChange = (id: string, newText: string) => {
    // Optimistic update for text
    setElements((current) =>
      current.map((el) => {
        if (el.id === id && el.properties.type === "text") {
          return {
            ...el,
            properties: { ...el.properties, text: newText },
          };
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

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileName = `${nanoid()}-${file.name}`;
    const { data, error } = await supabase.storage
      .from("canvas-assets")
      .upload(fileName, file);

    if (error) {
      console.error("Upload error:", error);
      console.log(data);
      return;
    }
    const { data: urlData } = supabase.storage
      .from("canvas-assets")
      .getPublicUrl(fileName);

    const imgWidth = 200;
    const imgHeight = 200;

    // B. Calculate center of the viewport in Screen Coordinates
    const screenCenterX = window.innerWidth / 2;
    const screenCenterY = window.innerHeight / 2;

    // C. Convert to World Coordinates (accounting for Pan & Zoom)
    const worldCenterX = (screenCenterX - camera.x) / camera.zoom;
    const worldCenterY = (screenCenterY - camera.y) / camera.zoom;

    const newElement: Element = {
      id: nanoid(),
      canvas_id: canvasId,
      properties: {
        type: "image",
        x: worldCenterX - imgWidth / 2,
        y: worldCenterY - imgHeight / 2,
        width: 200, // Default size
        height: 200,
        src: urlData.publicUrl,
      },
      created_at: new Date().toISOString(),
    };

    setElements((cur) => [...cur, newElement]);
    await supabase.from("elements").insert(newElement);

    // Reset input so you can upload same file again
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleAiGenerate = async (prompt: string) => {
    setIsGenerating(true);
    try {
      const screenCenterX = window.innerWidth / 2;
      const screenCenterY = window.innerHeight / 2;

      const worldCenterX = (screenCenterX - camera.x) / camera.zoom;
      const worldCenterY = (screenCenterY - camera.y) / camera.zoom;

      const res = await fetch("/api/ai/generate", {
        method: "POST",
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();

      if (data.elements) {
        const newElements = data.elements.map((el: RawAiElement) => ({
          id: nanoid(),
          canvas_id: canvasId,
          created_at: new Date().toISOString(),
          properties: {
            ...el,
            type: el.type,
            x: el.x + worldCenterX,
            y: el.y + worldCenterY,

            ...(el.type === "arrow" && {
              x2: (el.x2 ?? 0) + worldCenterX,
              y2: (el.y2 ?? 0) + worldCenterY,
            }),
          },
        }));

        // Insert into local state
        setElements((prev) => [...prev, ...newElements]);

        // Insert into Database (Loop or Bulk Insert)
        const { error } = await supabase.from("elements").insert(newElements);
        if (error) console.error("Error saving AI elements", error);

        setIsAiOpen(false);
      }
    } catch (e) {
      console.error(e);
      alert("Failed to generate diagram. Try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const elementToEdit = elements.find(
    (el) => el.id === editingElementId && el.properties.type === "text",
  ) as (Element & { properties: { type: "text" } }) | undefined;
  const selectedElement = elements.find((el) => el.id === selectedElementId);

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <div className="absolute top-4 left-4 z-50 flex items-center gap-3">
        <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
          <h1 className="text-sm font-semibold text-gray-700 truncate max-w-[200px]">
            {canvasName}
          </h1>
        </div>
      </div>

      <button
        onClick={() => setIsAiOpen(true)}
        className="absolute top-4 right-4 z-50 bg-white p-2 rounded-md shadow-sm border border-indigo-100 text-indigo-600 hover:bg-indigo-50 flex gap-2 items-center font-medium text-sm"
      >
        <Sparkles className="w-4 h-4" /> AI Generate
      </button>

      {isAiOpen && (
        <AiGenerator
          onClose={() => setIsAiOpen(false)}
          isGenerating={isGenerating}
          onGenerate={handleAiGenerate}
        />
      )}
      <Toolbar activeTool={activeTool} onToolSelect={handleToolSelect} />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />
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
