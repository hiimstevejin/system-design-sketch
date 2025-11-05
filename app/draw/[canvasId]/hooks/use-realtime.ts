import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { RealtimeChannel } from "@supabase/supabase-js";
import { Element, CursorPosition } from "../types";

// Define a type for the hook's arguments for clarity
type UseRealtimeParams = {
  canvasId: string;
  ourId: string;
  setElements: React.Dispatch<React.SetStateAction<Element[]>>;
  setCursors: React.Dispatch<React.SetStateAction<CursorPosition[]>>;
};

export function useRealtime({
  canvasId,
  ourId,
  setElements,
  setCursors,
}: UseRealtimeParams) {
  const supabase = createClient();
  const channelRef = useRef<RealtimeChannel | null>(null);

  // Effect to set up and tear down the channel
  useEffect(() => {
    const channel = supabase.channel(`canvas:${canvasId}`);
    channelRef.current = channel;

    // Subscribe to Database changes
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
          if (payload.eventType === "INSERT") {
            setElements((current) => {
              if (current.some((el) => el.id === payload.new.id)) {
                return current;
              }
              return [...current, payload.new as Element];
            });
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
      // Subscribe to Broadcasts
      .on("broadcast", { event: "cursor-move" }, (payload) => {
        const newPosition = payload.payload as CursorPosition;
        if (newPosition.id === ourId) return;

        setCursors((current) => {
          const existing = current.find((c) => c.id === newPosition.id);
          if (existing) {
            return current.map((c) =>
              c.id === newPosition.id ? newPosition : c
            );
          } else {
            return [...current, newPosition];
          }
        });
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          channel.track({ id: ourId });
        }
      });

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
  }, [supabase, canvasId, ourId, setElements, setCursors]);

  // Return the channel ref so our handlers can use it
  return channelRef;
}