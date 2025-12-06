"use client";

import { Element } from "../types";

const COLORS = [
  { name: "Black", value: "#000000" },
  { name: "Red", value: "#ef4444" },
  { name: "Green", value: "#22c55e" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Yellow", value: "#eab308" },
  { name: "Transparent", value: "transparent" },
];

type PropertiesPanelProps = {
  element: Element;
  updateAction: (id: string, updates: Partial<Element["properties"]>) => void;
};

export default function PropertiesPanel({
  element,
  updateAction,
}: PropertiesPanelProps) {
  const { stroke, fill, strokeWidth } = element.properties;

  return (
    <div className="absolute top-4 right-4 bg-white p-4 rounded-lg shadow-lg border border-gray-200 w-64 z-50">
      <h3 className="text-sm font-semibold mb-4 text-gray-700">Styles</h3>

      {/* STROKE COLOR */}
      <div className="mb-4">
        <label className="text-xs text-gray-500 block mb-2">Stroke</label>
        <div className="flex gap-2 flex-wrap">
          {COLORS.filter((c) => c.value !== "transparent").map((c) => (
            <button
              key={c.value}
              className={`w-6 h-6 rounded-full border ${
                stroke === c.value ? "ring-2 ring-offset-1 ring-blue-500" : ""
              }`}
              style={{ backgroundColor: c.value }}
              onClick={() => updateAction(element.id, { stroke: c.value })}
              title={c.name}
            />
          ))}
        </div>
      </div>

      {/* FILL COLOR (Only for Rects) */}
      {element.properties.type === "rect" && (
        <div className="mb-4">
          <label className="text-xs text-gray-500 block mb-2">Fill</label>
          <div className="flex gap-2 flex-wrap">
            {COLORS.map((c) => (
              <button
                key={c.value}
                className={`w-6 h-6 rounded-full border ${
                  fill === c.value ? "ring-2 ring-offset-1 ring-blue-500" : ""
                }`}
                style={{
                  backgroundColor:
                    c.value === "transparent" ? "white" : c.value,
                  // Add a diagonal line for transparent
                  backgroundImage:
                    c.value === "transparent"
                      ? "linear-gradient(45deg, transparent 45%, red 45%, red 55%, transparent 55%)"
                      : "none",
                }}
                onClick={() => updateAction(element.id, { fill: c.value })}
                title={c.name}
              />
            ))}
          </div>
        </div>
      )}

      {/* STROKE WIDTH */}
      <div>
        <label className="text-xs text-gray-500 block mb-2">Thickness</label>
        <input
          type="range"
          min="1"
          max="10"
          value={strokeWidth || 2}
          onChange={(e) =>
            updateAction(element.id, { strokeWidth: parseInt(e.target.value) })
          }
          className="w-full"
        />
      </div>
    </div>
  );
}
