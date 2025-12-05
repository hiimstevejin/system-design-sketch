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
  arrow: <ArrowRight size={30} />,
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
      <div className="flex gap-2 p-2 bg-white rounded-lg shadow-md">
        {TOOLS.map((tool) => (
          <button
            key={tool}
            onClick={() => onToolSelect(tool)}
            className={cn(
              "flex items-center justify-center w-12 rounded-md cursor-pointer",
              activeTool === tool
                ? "bg-indigo-100 text-indigo-600"
                : "hover:bg-gray-100 text-gray-700",
            )}
            title={tool.charAt(0).toUpperCase() + tool.slice(1)}
          >
            {toolIcons[tool]}
          </button>
        ))}
      </div>
    </div>
  );
}
