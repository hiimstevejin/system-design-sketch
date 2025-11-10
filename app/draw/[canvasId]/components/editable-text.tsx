import { useState, useEffect } from "react";
import { Camera, Element } from "../types";

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

  const screenX = x + camera.x;
  const screenY = y + camera.y;

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
      }}
      autoFocus
      onFocus={(e) => e.target.select()}
    />
  );
}
