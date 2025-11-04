type DebugInfoProps = {
  activeTool: string;
  isDrawing: boolean;
};

export default function DebugInfo({ activeTool, isDrawing }: DebugInfoProps) {
  return (
    <pre className="absolute bottom-4 left-4 z-10 p-4 bg-black/80 text-white rounded-lg shadow-md text-sm pointer-events-none">
      Active tool : {activeTool}
      <br />
      Drawing: {isDrawing.toString()}
    </pre>
  );
}