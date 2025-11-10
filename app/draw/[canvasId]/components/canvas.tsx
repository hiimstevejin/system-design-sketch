import { MouseEvent } from "react";

type CanvasProps = {
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  onPointerDown: (e: MouseEvent<HTMLCanvasElement>) => void;
  onPointerMove: (e: MouseEvent<HTMLCanvasElement>) => void;
  onPointerUp: (e: MouseEvent<HTMLCanvasElement>) => void;
  onWheel: React.WheelEventHandler<HTMLCanvasElement>;
};

export default function Canvas({
  canvasRef,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onWheel,
}: CanvasProps) {
  return (
    <canvas
      ref={canvasRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onWheel={onWheel}
      className="w-full h-full bg-gray-50"
    />
  );
}
