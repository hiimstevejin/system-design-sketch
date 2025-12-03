import { Camera, Element, HandleType } from "./types";

// convert screen coordinates to world coordinates
export function screenToWorld(x: number, y: number, camera: Camera) {
  return {
    x: (x - camera.x) / camera.zoom,
    y: (y - camera.y) / camera.zoom,
  };
}

export function worldToScreen(x: number, y: number, camera: Camera) {
  return {
    x: x * camera.zoom + camera.x,
    y: y * camera.zoom + camera.y,
  };
}
/**
 * Calculates the distance from a point (x, y) to a line segment (x1, y1) -> (x2, y2).
 */
export function getDistanceToLineSegment(
  x: number,
  y: number,
  x1: number,
  y1: number,
  x2: number,
  y2: number,
) {
  const A = x - x1;
  const B = y - y1;
  const C = x2 - x1;
  const D = y2 - y1;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;
  if (lenSq !== 0) {
    param = dot / lenSq;
  }

  let xx, yy;

  if (param < 0) {
    xx = x1;
    yy = y1;
  } else if (param > 1) {
    xx = x2;
    yy = y2;
  } else {
    xx = x1 + param * C;
    yy = y1 + param * D;
  }

  const dx = x - xx;
  const dy = y - yy;
  return Math.sqrt(dx * dx + dy * dy);
}

export function getElementAtPosition(
  x: number,
  y: number,
  elements: Element[],
) {
  // Loop backwards to select the top-most element
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (el.properties.type === "rect") {
      // add padding so that the element is selected even if the cursor is slightly outside the element
      const padding = 10;
      const { x: elX, y: elY, width: elW, height: elH } = el.properties;
      if (
        x >= elX - padding &&
        x <= elX + elW + padding &&
        y >= elY - padding &&
        y <= elY + elH + padding
      ) {
        return el;
      }
    } else if (el.properties.type === "arrow") {
      const padding = 10;
      const { x: x1, y: y1, x2, y2 } = el.properties;
      const distance = getDistanceToLineSegment(x, y, x1, y1, x2, y2);
      if (distance <= padding) {
        return el;
      }
    } else if (el.properties.type === "text") {
      const padding = 10;
      const { x: elX, y: elY, text } = el.properties;
      const width = text.length * 8;
      const height = 16;
      if (
        x >= elX - width / 2 - padding &&
        x <= elX + width / 2 + padding &&
        y >= elY - height / 2 - padding &&
        y <= elY + height / 2 + padding
      ) {
        return el;
      }
    }
    // Add 'else if' for other shapes later
  }
  return null;
}

export function getResizeHandleAtPosition(
  x: number,
  y: number,
  element: Element,
): HandleType {
  const { properties } = element;

  // 1. Arrows use different logic (endpoints), so ignore them for box resizing
  if (properties.type === "arrow") {
    return null;
  }

  // 2. Initialize variables for the bounding box
  let elX: number, elY: number, w: number, h: number;

  // 3. Narrow the type to safely access properties
  if (properties.type === "rect") {
    // TypeScript knows this is RectProperties here
    elX = properties.x;
    elY = properties.y;
    w = properties.width;
    h = properties.height;
  } else if (properties.type === "text") {
    // TypeScript knows this is TextProperties here
    elX = properties.x;
    elY = properties.y;
    // Calculate roughly, just like in the renderer
    w = properties.text.length * 8;
    h = 16;
  } else {
    return null;
  }

  // 4. Perform the hit detection using the normalized variables
  const handleSize = 8;
  const padding = handleSize / 2 + 5; // Added extra padding for easier clicking

  // Top-Left
  if (Math.abs(x - (elX - 4)) <= padding && Math.abs(y - (elY - 4)) <= padding)
    return "tl";

  // Top-Right
  if (
    Math.abs(x - (elX + w + 4)) <= padding &&
    Math.abs(y - (elY - 4)) <= padding
  )
    return "tr";

  // Bottom-Left
  if (
    Math.abs(x - (elX - 4)) <= padding &&
    Math.abs(y - (elY + h + 4)) <= padding
  )
    return "bl";

  // Bottom-Right
  if (
    Math.abs(x - (elX + w + 4)) <= padding &&
    Math.abs(y - (elY + h + 4)) <= padding
  )
    return "br";

  return null;
}
