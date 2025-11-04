import { MouseEvent } from "react";

type CanvasProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPointerDown: (e: MouseEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: MouseEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: MouseEvent<HTMLCanvasElement>) => void;
};

export default function Canvas({
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: CanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      className="w-full h-full bg-gray-50"
    />
  );
}