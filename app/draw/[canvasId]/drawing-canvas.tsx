"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Toolbar, { type Tool } from "@/components/draw/toolbar";
import { nanoid } from "nanoid";

// element type
type Element = {
  id: string;
  canvas_id: string;
  properties: {
    type: "rect" | "arrow" | "text";
    x: number;
    y: number;
    width: number;
    height: number;
  };
  created_at: string;
};

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

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const channel = supabase
      .channel(`realtime:elements:${canvasId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "elements",
          filter: `canvas_id=eq.${canvasId}`,
        },
        (payload) => {
          console.log("Change received!", payload);
          if (payload.eventType == "INSERT") {
            setElements((current) => [...current, payload.new as Element]);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, canvasId]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // set canvas to full screen
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const context = canvas.getContext("2d");
    if (!context) return;
    contextRef.current = context;

    context.clearRect(0, 0, canvas.width, canvas.height);

    elements.forEach((element) => {
      if (element.properties.type === "rect") {
        context.strokeStyle = "black";
        context.lineWidth = 2;
        context.strokeRect(
          element.properties.x,
          element.properties.y,
          element.properties.width,
          element.properties.height
        );
      }
    });
  }, [elements]);

  const handlePointerDown = (e: MouseEvent<HTMLCanvasElement>) => {
    if (activeTool === "select") return; //TODO

    setIsDrawing(true);
    setStartPoint({ x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY });
  };

  const handlePointerMove = (e: MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !contextRef.current) return;
    const context = contextRef.current;
    const { offsetX, offsetY } = e.nativeEvent;

    context.clearRect(0, 0, context.canvas.width, context.canvas.height);
    elements.forEach((element) => {
      if (element.properties.type == "rect") {
        context.strokeRect(
          element.properties.x,
          element.properties.y,
          element.properties.width,
          element.properties.height
        );
      }
    });

    if (activeTool === "rectangle") {
      context.strokeStyle = "blue";
      context.lineWidth = 2;
      context.strokeRect(
        startPoint.x,
        startPoint.y,
        offsetX - startPoint.x, //width
        offsetY - startPoint.y // height
      );
    }
  };

  const handlePointerUp = async (e: MouseEvent<HTMLCanvasElement>) => {
    setIsDrawing(false);
    if (activeTool === "select") return;

    const { offsetX, offsetY } = e.nativeEvent;
    const width = offsetX - startPoint.x;
    const height = offsetY - startPoint.y;
    const newId = nanoid(); // Generate a unique client-side ID

    let newElementProperties;

    if (activeTool === "rectangle") {
      newElementProperties = {
        type: "rect" as const, // Assert the type
        x: startPoint.x,
        y: startPoint.y,
        width: width,
        height: height,
      };
    }
    // Add else if (activeTool === 'arrow') { ... } later

    if (newElementProperties) {
      // Insert the new element into the database
      const { error } = await supabase.from("elements").insert({
        id: newId,
        canvas_id: canvasId,
        properties: newElementProperties,
      });

      if (error) {
        console.error("Error inserting element:", error);
        // TODO
      }
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden">
      <Toolbar
        activeTool={activeTool}
        onToolSelect={(tool) => setActiveTool(tool)}
      />
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        className="w-full h-full bg-gray-50"
      />

      <pre className="absolute bottom-4 left-4 z-10 p-4 bg-black rounded-lg shadow-md text-sm">
        Active tool : {activeTool}
        <br />
        Drawing: {isDrawing.toString()}
      </pre>
    </div>
  );
}
