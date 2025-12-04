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

  useEffect(() => {
    const channel = supabase.channel(`canvas:${canvasId}`);
    channelRef.current = channel;

    // listen to db changes made by users and immediately update local screen
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
              // prevent echo duplicates
              if (current.some((el) => el.id === payload.new.id)) {
                return current;
              }
              // add new shape to screen
              return [...current, payload.new as Element];
            });
          }
          if (payload.eventType === "UPDATE") {
            // if updated shape paint on screen
            setElements((current) =>
              current.map((el) =>
                el.id === payload.new.id ? (payload.new as Element) : el,
              ),
            );
          }
          if (payload.eventType === "DELETE") {
            // if deleted shape remove from screen
            console.log("DELETE Event received", payload.old.id);
            setElements((current) =>
              current.filter((el) => el.id !== payload.old.id),
            );
          }
        },
      )

      // deal with live cursor sharing
      .on("broadcast", { event: "cursor-move" }, (payload) => {
        const newPosition = payload.payload as CursorPosition;
        if (newPosition.id === ourId) return;

        setCursors((current) => {
          const existing = current.find((c) => c.id === newPosition.id);
          if (existing) {
            return current.map((c) =>
              c.id === newPosition.id ? newPosition : c,
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
