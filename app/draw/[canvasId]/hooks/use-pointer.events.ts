import { useState, useRef, MouseEvent, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import { Element, PreviewElement, Action, Tool } from "../types";
import { getElementAtPosition } from "../utils";

type UsePointerEventsParams = {
  elements: Element[];
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  previewElement: PreviewElement;
  setPreviewElement: React.Dispatch<React.SetStateAction<PreviewElement>>;
  activeTool: Tool;
  canvasId: string;
  ourId: string;
  channelRef: React.RefObject<RealtimeChannel | null>;
  supabase: SupabaseClient;
  setEditingElementId: (id: string | null) => void;
  setActiveTool: (tool: Tool) => void;
};

// This type must match the ref in drawing-canvas.tsx
type DragStartPos =
  | { x: number; y: number }
  | { x: number; y: number; x2: number; y2: number }
  | null;

export function usePointerEvents({
  elements,
  setElements,
  setPreviewElement,
  activeTool,
  canvasId,
  ourId,
  channelRef,
  supabase,
  setEditingElementId,
  setActiveTool,
}: UsePointerEventsParams) {
  const [action, setAction] = useState<Action>("idle");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const dragStartElementPos = useRef<DragStartPos>(null);
  const prevElementsRef = useRef<Element[] | null>(null);

  const handleDeleteSelected = useCallback(async () => {
    if (!selectedElementId) return;

    prevElementsRef.current = elements;

    setElements((current) =>
      current.filter((el) => el.id !== selectedElementId),
    );

    const { error } = await supabase
      .from("elements")
      .delete()
      .eq("id", selectedElementId);

    if (error) {
      console.error("Error deleting element:", error);
      if (prevElementsRef.current) {
        setElements(prevElementsRef.current);
      }
    }

    setSelectedElementId(null);
  }, [
    selectedElementId,
    elements,
    setElements,
    setSelectedElementId,
    supabase,
  ]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDeleteSelected]);

  const handlePointerDown = useCallback(
    async (e: MouseEvent<HTMLCanvasElement>) => {
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;

      if (activeTool === "select") {
        const element = getElementAtPosition(x, y, elements);
        if (element) {
          setAction("moving");
          setSelectedElementId(element.id);
          setStartPoint({ x, y });

          if (
            element.properties.type === "rect" ||
            element.properties.type === "text"
          ) {
            dragStartElementPos.current = {
              x: element.properties.x,
              y: element.properties.y,
            };
          } else if (element.properties.type === "arrow") {
            dragStartElementPos.current = {
              x: element.properties.x,
              y: element.properties.y,
              x2: element.properties.x2,
              y2: element.properties.y2,
            };
          }
        }
      } else if (activeTool == "text") {
        const newTextElement: Element = {
          id: nanoid(),
          canvas_id: canvasId,
          properties: { type: "text", x, y, text: "Text" },
          created_at: new Date().toISOString(),
        };

        setElements((current) => [...current, newTextElement]);

        setTimeout(() => setEditingElementId(newTextElement.id), 0);
        setAction("idle");
        setActiveTool("select");

        const { error } = await supabase
          .from("elements")
          .insert(newTextElement);
        if (error) {
          console.error("Error inserting text element:", error);
          setElements((current) =>
            current.filter((el) => el.id !== newTextElement.id),
          );
        }
      } else {
        setAction("drawing");
        setIsDrawing(true);
        setStartPoint({ x, y });
      }
    },
    [
      activeTool,
      elements,
      canvasId,
      setElements,
      setEditingElementId,
      setActiveTool,
      supabase,
    ],
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const x = e.nativeEvent.offsetX;
      const y = e.nativeEvent.offsetY;

      // Broadcast cursor
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "cursor-move",
          payload: { id: ourId, x, y },
        });
      }

      // Handle preview drawing
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
        } else if (activeTool === "arrow") {
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

      // Handle moving
      if (
        action === "moving" &&
        selectedElementId &&
        dragStartElementPos.current
      ) {
        const dx = x - startPoint.x;
        const dy = y - startPoint.y;

        setElements((currentElements) =>
          currentElements.map((el) => {
            if (el.id === selectedElementId) {
              const originalPos = dragStartElementPos.current!;
              if (
                el.properties.type === "rect" ||
                el.properties.type === "text"
              ) {
                return {
                  ...el,
                  properties: {
                    ...el.properties,
                    x: originalPos.x + dx,
                    y: originalPos.y + dy,
                  },
                };
              } else if (
                el.properties.type === "arrow" &&
                "x2" in originalPos
              ) {
                return {
                  ...el,
                  properties: {
                    ...el.properties,
                    x: originalPos.x + dx,
                    y: originalPos.y + dy,
                    x2: originalPos.x2 + dx,
                    y2: originalPos.y2 + dy,
                  },
                };
              }
            }
            return el;
          }),
        );
      }
    },
    [
      action,
      isDrawing,
      activeTool,
      selectedElementId,
      channelRef,
      ourId,
      setElements,
      setPreviewElement,
      startPoint,
    ],
  );

  const handlePointerUp = useCallback(
    async (e: MouseEvent<HTMLCanvasElement>) => {
      const { offsetX, offsetY } = e.nativeEvent;

      if (action === "drawing") {
        setIsDrawing(false);
        setPreviewElement(null);

        let newElementProperties: Element["properties"] | undefined;

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
          setElements((current) => [...current, newElement]);
          const { error } = await supabase.from("elements").insert(newElement);
          if (error) {
            console.error("Error inserting element:", error);
            setElements((current) =>
              current.filter((el) => el.id !== newElement.id),
            );
          }
        }
        setAction("idle");
        setSelectedElementId(null);
        dragStartElementPos.current = null;
      }

      if (action === "moving" && selectedElementId) {
        const hasMoved = startPoint.x !== offsetX || startPoint.y !== offsetY;

        if (hasMoved) {
          const movedElement = elements.find(
            (el) => el.id === selectedElementId,
          );
          if (movedElement) {
            const { error } = await supabase
              .from("elements")
              .update({ properties: movedElement.properties })
              .eq("id", selectedElementId);
            if (error) console.error("Error updating element:", error);
          }
          setAction("idle");
          setSelectedElementId(null);
          dragStartElementPos.current = null;
        } else {
          setAction("idle");
        }
      }
      // Reset actions
    },
    [
      action,
      activeTool,
      canvasId,
      elements,
      selectedElementId,
      setElements,
      setPreviewElement,
      startPoint,
      supabase,
    ],
  );

  // We need to return isDrawing for the DebugInfo component
  return { handlePointerDown, handlePointerMove, handlePointerUp, isDrawing };
}
