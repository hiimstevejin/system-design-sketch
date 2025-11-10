"use client";

import { MousePointer2 } from "lucide-react";
import { Camera, CursorPosition } from "@/app/draw/[canvasId]/types";

type CursorsOverlayProps = {
  cursors: CursorPosition[];
  camera: Camera;
};

export default function CursorsOverlay({
  cursors,
  camera,
}: CursorsOverlayProps) {
  return (
    <>
      {cursors.map((cursor) => {
        // 3. Convert the cursor's WORLD position back to SCREEN position
        const screenX = cursor.x + camera.x;
        const screenY = cursor.y + camera.y;

        return (
          <div
            key={cursor.id}
            className="absolute top-0 left-0 z-50 pointer-events-none"
            style={{
              // 4. Render at the calculated SCREEN position
              transform: `translate(${screenX}px, ${screenY}px)`,
            }}
          >
            <MousePointer2 className="text-blue-500" />
            <span className="ml-1 text-sm bg-blue-500 text-white px-2 py-0.5 rounded-full">
              User {cursor.id.substring(0, 4)}
            </span>
          </div>
        );
      })}
    </>
  );
}
