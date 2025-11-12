import { useState, useEffect } from "react";
import { Camera, Element } from "../types";
import { worldToScreen } from "../utils";

type TextElement = Element & { properties: { type: "text" } };

type EditableTextProps = {
  element: TextElement;
  onBlur: (element: TextElement) => void; // Function to call when saving
  onChange: (id: string, newText: string) => void; // Function for optimistic update
  camera: Camera;
};

export default function EditableText({
  element,
  onBlur,
  onChange,
  camera,
}: EditableTextProps) {
  const { id, properties } = element;
  const { x, y, text } = properties;

  // This internal state lets the textarea update smoothly
  const [currentText, setCurrentText] = useState(text);

  // Update our internal text if the element's text changes from upstream
  useEffect(() => {
    setCurrentText(text);
  }, [text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setCurrentText(e.target.value);
    // Also update the main elements array for optimistic rendering
    onChange(id, e.target.value);
  };

  const handleBlur = () => {
    // When done, tell the parent to save this element to Supabase
    onBlur({
      ...element,
      properties: {
        ...properties,
        text: currentText,
      },
    });
  };

  const { x: screenX, y: screenY } = worldToScreen(
    element.properties.x,
    element.properties.y,
    camera,
  );
  return (
    <textarea
      value={currentText}
      onChange={handleChange}
      onBlur={handleBlur}
      style={{
        position: "absolute",
        top: screenY,
        left: screenX,
        font: "16px sans-serif",
        border: "1px dashed #333",
        outline: "none",
        resize: "none",
        overflow: "hidden",
        background: "transparent",
        whiteSpace: "pre",
        transform: `scale(${camera.zoom})`,
        transformOrigin: "top left",
      }}
      autoFocus
      onFocus={(e) => e.target.select()}
    />
  );
}
