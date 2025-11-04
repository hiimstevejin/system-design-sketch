"use client";

import { Hand, RectangleHorizontal, Type, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// definition of available tools
export const TOOLS = ["select", "rectangle", "arrow", "text"] as const;
export type Tool = (typeof TOOLS)[number];

// define icons
// Record<K, V> is a utility type where
// k = key
// v = value
const toolIcons: Record<Tool, React.ReactNode> = {
  select: <Hand size={20} />,
  rectangle: <RectangleHorizontal size={20} />,
  arrow: <ArrowRight size={20} />,
  text: <Type size={20} />,
};

type ToolbarProps = {
  activeTool: Tool;
  onToolSelect: (tool: Tool) => void;
};

export default function Toolbar({ activeTool, onToolSelect }: ToolbarProps) {
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="flex gap-2 p-2 bg-white rounded-lg shadow-lg">
        {TOOLS.map((tool) => (
          <button
            key={tool}
            onClick={() => onToolSelect(tool)}
            className={cn(
              "flex items-center justify-center w-10 rounded-md cursor-pointer",
              activeTool === tool
                ? "bg-indigo-100 text-indigo-600" //active state
                : "bg-gray-50 hover:bg-gray-100 text-gray-700" // inactive state
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
