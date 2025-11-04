import { MousePointer2 } from "lucide-react";
import { CursorPosition } from "@/app/draw/[canvasId]/types";

type CursorsOverlayProps = {
  cursors: CursorPosition[];
};

export default function CursorsOverlay({ cursors }: CursorsOverlayProps) {
  return (
    <>
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
    </>
  );
}