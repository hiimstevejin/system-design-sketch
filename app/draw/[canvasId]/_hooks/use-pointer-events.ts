import { useState, useRef, MouseEvent, useEffect, useCallback } from "react";
import { nanoid } from "nanoid";
import { SupabaseClient, RealtimeChannel } from "@supabase/supabase-js";
import {
  Element,
  PreviewElement,
  Action,
  Tool,
  Camera,
  HandleType,
  DragStartPos,
} from "../types";
import {
  getElementAtPosition,
  getResizeHandleAtPosition,
  screenToWorld,
} from "../utils";

type UsePointerEventsParams = {
  elements: Element[];
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  previewElement: PreviewElement;
  setPreviewElement: React.Dispatch<React.SetStateAction<PreviewElement>>;
  activeTool: Tool;
  canvasId: string;
  ourId: string;
  channelRef: React.RefObject<RealtimeChannel | null>;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  supabase: SupabaseClient;
  setEditingElementId: (id: string | null) => void;
  setActiveTool: (tool: Tool) => void;
  camera: Camera;
  setCamera: React.Dispatch<React.SetStateAction<Camera>>;
};

export function usePointerEvents({
  elements,
  setElements,
  setPreviewElement,
  activeTool,
  canvasId,
  ourId,
  channelRef,
  canvasRef,
  supabase,
  setEditingElementId,
  setActiveTool,
  camera,
  setCamera,
}: UsePointerEventsParams) {
  const [action, setAction] = useState<Action>("idle");
  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });
  const [selectedElementId, setSelectedElementId] = useState<string | null>(
    null,
  );
  const [selectedHandle, setSelectedHandle] = useState<HandleType>(null);
  const dragStartElementPos = useRef<DragStartPos>(null);
  const prevElementsRef = useRef<Element[] | null>(null);
  const clipboard = useRef<Element | null>(null);

  const handleWheel = useCallback(
    (e: WheelEvent) => {
      // Update camera x and y based on scroll delta
      e.preventDefault();

      const { offsetX, offsetY, deltaX, deltaY, ctrlKey } = e;

      if (ctrlKey) {
        const zoomIntensity = 0.05;
        const newZoom = camera.zoom - deltaY * zoomIntensity;
        const clampedZoom = Math.max(0.1, Math.min(newZoom, 5));

        const worldX = (offsetX - camera.x) / camera.zoom;
        const worldY = (offsetY - camera.y) / camera.zoom;

        const newCameraX = offsetX - worldX * clampedZoom;
        const newCameraY = offsetY - worldY * clampedZoom;

        setCamera({ x: newCameraX, y: newCameraY, zoom: clampedZoom });
      } else {
        setCamera((prev) => ({
          ...prev,
          x: prev.x - deltaX,
          y: prev.y - deltaY,
        }));
      }
    },
    [camera, setCamera],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.addEventListener("wheel", handleWheel, { passive: false });

    return () => {
      canvas.removeEventListener("wheel", handleWheel);
    };
  }, [canvasRef, handleWheel]); // Run when the canvas or handler changes

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

  const pasteElement = useCallback(
    async (elementToPaste: Element, offset: number = 20) => {
      const newElement: Element = {
        ...elementToPaste,
        id: nanoid(), // Generate NEW ID
        properties: {
          ...elementToPaste.properties,
          x: elementToPaste.properties.x + offset, // Shift position slightly
          y: elementToPaste.properties.y + offset,
          // Handle 'x2/y2' for arrows if they exist
          ...(elementToPaste.properties.type === "arrow" && {
            x2: elementToPaste.properties.x2 + offset,
            y2: elementToPaste.properties.y2 + offset,
          }),
        },
        created_at: new Date().toISOString(),
      };

      // Optimistic Update
      setElements((current) => [...current, newElement]);

      // Select the new element
      setSelectedElementId(newElement.id);

      // Save to DB
      const { error } = await supabase.from("elements").insert(newElement);
      if (error) {
        console.error("Error pasting element:", error);
        setElements((current) =>
          current.filter((el) => el.id !== newElement.id),
        );
      }
    },
    [canvasId, setElements, supabase],
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === "TEXTAREA") {
        return;
      }
      const isCtrlOrCmd = e.ctrlKey || e.metaKey;
      if (e.key === "Delete" || e.key === "Backspace") {
        handleDeleteSelected();
      }

      // COPY (Cmd+C)
      if (isCtrlOrCmd && e.key === "c") {
        if (selectedElementId) {
          const el = elements.find((e) => e.id === selectedElementId);
          if (el) {
            clipboard.current = el; // Save to ref
            console.log("Copied to clipboard:", el);
          }
        }
      }

      // PASTE (Cmd+V)
      if (isCtrlOrCmd && e.key === "v") {
        if (clipboard.current) {
          pasteElement(clipboard.current);
        }
      }

      // DUPLICATE (Cmd+D)
      if (isCtrlOrCmd && e.key === "d") {
        e.preventDefault(); // Prevent browser "Bookmark" shortcut
        if (selectedElementId) {
          const el = elements.find((e) => e.id === selectedElementId);
          if (el) {
            pasteElement(el);
          }
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleDeleteSelected]);

  const handlePointerDown = useCallback(
    async (e: MouseEvent<HTMLCanvasElement>) => {
      const { x: worldX, y: worldY } = screenToWorld(
        e.nativeEvent.offsetX,
        e.nativeEvent.offsetY,
        camera,
      );
      if (activeTool === "select") {
        if (selectedElementId) {
          const selectedElement = elements.find(
            (el) => el.id === selectedElementId,
          );
          if (selectedElement) {
            const handle = getResizeHandleAtPosition(
              worldX,
              worldY,
              selectedElement,
            );
            if (handle) {
              setAction("resize");
              setSelectedHandle(handle);
              setStartPoint({ x: worldX, y: worldY });

              if (
                selectedElement.properties.type === "rect" ||
                selectedElement.properties.type === "image"
              ) {
                dragStartElementPos.current = {
                  x: selectedElement.properties.x,
                  y: selectedElement.properties.y,
                  width: selectedElement.properties.width,
                  height: selectedElement.properties.height,
                };
              } else if (selectedElement.properties.type === "arrow") {
                dragStartElementPos.current = {
                  x: selectedElement.properties.x,
                  y: selectedElement.properties.y,
                  x2: selectedElement.properties.x2,
                  y2: selectedElement.properties.y2,
                };
              }
              return;
            }
          }
        }
        const element = getElementAtPosition(worldX, worldY, elements);
        if (element) {
          setAction("moving");
          setSelectedElementId(element.id);
          setStartPoint({ x: worldX, y: worldY });

          if (
            element.properties.type === "rect" ||
            element.properties.type === "text" ||
            element.properties.type === "image"
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
        } else {
          setSelectedElementId(null);
        }
      } else if (activeTool == "text") {
        const newTextElement: Element = {
          id: nanoid(),
          canvas_id: canvasId,
          properties: {
            type: "text",
            x: worldX,
            y: worldY,
            text: "Text",
          },
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
        setStartPoint({ x: worldX, y: worldY });
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
      camera,
      selectedElementId,
    ],
  );

  const handlePointerMove = useCallback(
    (e: MouseEvent<HTMLCanvasElement>) => {
      const { x: worldX, y: worldY } = screenToWorld(
        e.nativeEvent.offsetX,
        e.nativeEvent.offsetY,
        camera,
      );

      // Broadcast cursor
      if (channelRef.current) {
        channelRef.current.send({
          type: "broadcast",
          event: "cursor-move",
          payload: { id: ourId, x: worldX, y: worldY },
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
              width: worldX - startPoint.x,
              height: worldY - startPoint.y,
            },
          });
        } else if (activeTool === "arrow") {
          setPreviewElement({
            properties: {
              type: "arrow",
              x: startPoint.x,
              y: startPoint.y,
              x2: worldX,
              y2: worldY,
            },
          });
        }
      }

      if (
        action === "resize" &&
        selectedElementId &&
        dragStartElementPos.current &&
        selectedHandle
      ) {
        const original = dragStartElementPos.current;
        const dx = worldX - startPoint.x;
        const dy = worldY - startPoint.y;

        setElements((prev) =>
          prev.map((el) => {
            if (el.id === selectedElementId) {
              if (
                el.properties.type === "rect" ||
                el.properties.type === "image"
              ) {
                // Safety check: ensure original data has width
                if (!("width" in original)) return el;

                let { x, y, width = 0, height = 0 } = original;

                switch (selectedHandle) {
                  case "br":
                    width += dx;
                    height += dy;
                    break;
                  case "bl":
                    x += dx;
                    width -= dx;
                    height += dy;
                    break;
                  case "tr":
                    y += dy;
                    width += dx;
                    height -= dy;
                    break;
                  case "tl":
                    x += dx;
                    y += dy;
                    width -= dx;
                    height -= dy;
                    break;
                }

                return {
                  ...el,
                  properties: {
                    ...el.properties,
                    x,
                    y,
                    width,
                    height,
                  },
                };
              } else if (el.properties.type === "arrow") {
                // Safety check: ensure original data has x2/y2
                if (!("x2" in original)) return el;

                const { x, y, x2, y2 } = original;

                // Move Start Point
                if (selectedHandle === "start") {
                  return {
                    ...el,
                    properties: {
                      ...el.properties,
                      x: x + dx,
                      y: y + dy,
                      // x2/y2 stay the same
                    },
                  };
                }

                // Move End Point
                if (selectedHandle === "end") {
                  return {
                    ...el,
                    properties: {
                      ...el.properties,
                      // x/y stay the same
                      x2: x2! + dx,
                      y2: y2! + dy,
                    },
                  };
                }
              }
            }
            return el;
          }),
        );
      }
      // Handle moving
      if (
        action === "moving" &&
        selectedElementId &&
        dragStartElementPos.current
      ) {
        const dx = worldX - startPoint.x;
        const dy = worldY - startPoint.y;

        setElements((currentElements) =>
          currentElements.map((el) => {
            if (el.id === selectedElementId) {
              const originalPos = dragStartElementPos.current!;
              if (
                el.properties.type === "rect" ||
                el.properties.type === "text" ||
                el.properties.type === "image"
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
      camera,
      selectedHandle,
    ],
  );

  const handlePointerUp = useCallback(
    async (e: MouseEvent<HTMLCanvasElement>) => {
      const { x: worldX, y: worldY } = screenToWorld(
        e.nativeEvent.offsetX,
        e.nativeEvent.offsetY,
        camera,
      );

      if (action === "drawing") {
        setIsDrawing(false);
        setPreviewElement(null);

        let newElementProperties: Element["properties"] | undefined;

        if (activeTool === "rectangle") {
          const width = worldX - startPoint.x;
          const height = worldY - startPoint.y;
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
          if (worldX !== startPoint.x || worldY !== startPoint.y) {
            newElementProperties = {
              type: "arrow",
              x: startPoint.x,
              y: startPoint.y,
              x2: worldX,
              y2: worldY,
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

      if ((action === "moving" || action === "resize") && selectedElementId) {
        const hasMoved = startPoint.x !== worldX || startPoint.y !== worldY;

        if (action === "resize" || hasMoved) {
          const updatedElement = elements.find(
            (el) => el.id === selectedElementId,
          );
          if (updatedElement) {
            const { error } = await supabase
              .from("elements")
              .update({ properties: updatedElement.properties })
              .eq("id", selectedElementId);
            if (error) console.error("Error updating element:", error);
          }
        }
      }
      setAction("idle");
      dragStartElementPos.current = null;
      setSelectedHandle(null);
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
      camera,
    ],
  );

  // We need to return isDrawing for the DebugInfo component
  return {
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    isDrawing,
    selectedElementId,
  };
}
