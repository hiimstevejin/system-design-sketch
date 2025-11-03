"use client";

import { useEffect, useRef, useState, MouseEvent } from "react";
import { createClient } from "@/lib/supabase/client";
import Toolbar, { type Tool } from "@/components/draw/toolbar";
import { nanoid } from "nanoid";
import { RealtimeChannel } from "@supabase/supabase-js";
import { MousePointer2 } from "lucide-react";

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

type CursorPosition = {
  id: string;
  x: number;
  y: number;
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
  const [cursors, setCursors] = useState<CursorPosition[]>([]);

  const channelRef = useRef<RealtimeChannel | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);

  const ourId = useRef(nanoid());

  useEffect(() => {
    const channel = supabase.channel(`realtime:elements:${canvasId}`);
    channelRef.current = channel;

    channel
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
          if (payload.eventType === "UPDATE") {
            setElements((current) =>
              current.map((el) =>
                el.id === payload.new.id ? (payload.new as Element) : el
              )
            );
          }
          if (payload.eventType === "DELETE") {
            setElements((current) =>
              current.filter((el) => el.id !== payload.old.id)
            );
          }
        }
      )
      .on("broadcast", { event: "cursor-move" }, (payload) => {
        const newPosition = payload.payload as CursorPosition;

        if (newPosition.id === ourId.current) {
          return;
        }

        setCursors((current) => {
          const existing = current.find((c) => c.id === newPosition.id);
          if (existing) {
            // update existing cursor position
            return current.map((c) =>
              c.id === newPosition.id ? newPosition : c
            );
          } else {
            // add new cursor to the list
            return [...current, newPosition];
          }
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ id: ourId.current });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
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
    const x = e.nativeEvent.offsetX;
    const y = e.nativeEvent.offsetY;

    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "cursor-move",
        payload: {
          id: ourId.current,
          x,
          y,
        },
      });
    }

    if (!isDrawing || !contextRef.current) return;
    const context = contextRef.current;

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
        x - startPoint.x, //width
        y - startPoint.y // height
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

    if (activeTool === "rectangle" && (width !== 0 || height !== 0)) {
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
      {cursors.map((cursor) => (
        <div
          key={cursor.id}
          className="absolute top-0 left-0 z-50 pointer-events-none"
          style={{
            transform: `translate(${cursor.x}px, ${cursor.y}px)`,
          }}
        >
          <MousePointer2 className="text-blue-500" />
          <span className="ml-1 text-sm bg-blue-500 text-white px-2 py-0.5 rounded-full">
            User {cursor.id.substring(0, 4)}
          </span>
        </div>
      ))}
      <pre className="absolute bottom-4 left-4 z-10 p-4 bg-black rounded-lg shadow-md text-sm">
        Active tool : {activeTool}
        <br />
        Drawing: {isDrawing.toString()}
      </pre>
    </div>
  );
}
