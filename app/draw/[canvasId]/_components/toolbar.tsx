import {
  Hand,
  RectangleHorizontal,
  Type,
  ArrowRight,
  ImageIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TOOLS, Tool } from "../types";

const toolIcons: Record<Tool, React.ReactNode> = {
  select: <Hand size={25} />,
  rectangle: <RectangleHorizontal size={25} />,
  arrow: <ArrowRight size={25} />,
  text: <Type size={25} />,
  image: <ImageIcon size={25} />,
};

type ToolbarProps = {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
};

export default function Toolbar({ activeTool, onToolSelect }: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex gap-2 p-2 bg-white rounded-lg shadow-lg border border-gray-200">
        {TOOLS.map((tool, i) => (
          <button
            key={tool}
            onClick={() => onToolSelect(tool)}
            className={cn(
              "relative group flex items-center justify-center w-12 h-12 rounded-md transition-all",
              activeTool === tool
                ? "bg-indigo-100 text-indigo-600"
                : "bg-gray-50 hover:bg-gray-100 text-gray-700",
            )}
            title={`${tool.charAt(0).toUpperCase() + tool.slice(1)} (${i + 1})`}
          >
            {toolIcons[tool]}
            <span className="absolute bottom-0.5 right-1 text-[9px] font-medium text-gray-400 opacity-50 group-hover:opacity-100">
              {i + 1}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
