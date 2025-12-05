import { useRef, useState, useEffect } from "react";
import { Camera, Element, PreviewElement } from "../types";

type UseCanvasRendererParams = {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    contextRef: React.RefObject<CanvasRenderingContext2D | null>;
    elements: Element[];
    previewElement: PreviewElement;
    editingElementId: string | null;
    camera: Camera;
    selectedElementId: string | null;
};

export function useCanvasRenderer({
    canvasRef,
    contextRef,
    elements,
    previewElement,
    editingElementId,
    camera,
    selectedElementId,
}: UseCanvasRendererParams) {
    const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());
    const [, setTick] = useState(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const dpr = window.devicePixelRatio || 1;
        canvas.width = window.innerWidth * dpr;
        canvas.height = window.innerHeight * dpr;
        canvas.style.width = `${window.innerWidth}px`;
        canvas.style.height = `${window.innerHeight}px`;

        const context = canvas.getContext("2d");
        if (!context) return;
        contextRef.current = context;
        context.clearRect(0, 0, canvas.width, canvas.height);

        context.save();

        context.scale(dpr, dpr);
        context.translate(camera.x, camera.y);
        context.scale(camera.zoom, camera.zoom);

        // Draw all permanent elements
        elements.forEach((element) => {
            if (element.id === editingElementId) return;
            drawElement(context, element, imageCache.current, () =>
                setTick((t) => t + 1),
            );
        });

        if (selectedElementId) {
            const selectedElement = elements.find(
                (el) => el.id === selectedElementId,
            );
            if (selectedElement && selectedElement.id !== editingElementId) {
                drawSelectionBorder(context, selectedElement);
            }
        }
        // Draw the preview element
        if (previewElement) {
            drawElement(
                context,
                previewElement,
                imageCache.current,
                () => setTick((t) => t + 1),
                "blue",
            );
        }

        context.restore();
    }, [
        canvasRef,
        contextRef,
        elements,
        previewElement,
        editingElementId,
        camera,
        selectedElementId,
    ]);
}

function drawSelectionBorder(
    context: CanvasRenderingContext2D,
    element: Element,
) {
    const handleSize = 8;
    const halfHandle = handleSize / 2;

    context.save();
    context.strokeStyle = "#3b82f6"; // blue-500
    context.lineWidth = 1;
    context.fillStyle = "white";

    if (
        element.properties.type === "rect" ||
        element.properties.type === "text" ||
        element.properties.type === "image"
    ) {
        const x = element.properties.x;
        const y = element.properties.y;
        let width = 0;
        let height = 0;
        if (element.properties.type === "rect" || element.properties.type === "image") {
            width = element.properties.width;
            height = element.properties.height;
        } else if (element.properties.type === "text") {
            width = element.properties.text.length * 8 + 10;
            height = 20;
        }

        // 2. Draw the outline
        context.strokeRect(x - 4, y - 4, width + 8, height + 8);

        // 3. Draw Handles
        const handles = [
            { x: x - 4, y: y - 4 }, // Top-left
            { x: x + width + 4, y: y - 4 }, // Top-right
            { x: x + width + 4, y: y + height + 4 }, // Bottom-right
            { x: x - 4, y: y + height + 4 }, // Bottom-left
        ];

        handles.forEach((handle) => {
            context.fillRect(
                handle.x - halfHandle,
                handle.y - halfHandle,
                handleSize,
                handleSize,
            );
            context.strokeRect(
                handle.x - halfHandle,
                handle.y - halfHandle,
                handleSize,
                handleSize,
            );
        });
    } else if (element.properties.type === "arrow") {
        const { x, y, x2, y2 } = element.properties;

        const handles = [
            { x: x, y: y },
            { x: x2, y: y2 },
        ];

        handles.forEach((handle) => {
            context.fillRect(
                handle.x - halfHandle,
                handle.y - halfHandle,
                handleSize,
                handleSize,
            );
            context.strokeRect(
                handle.x - halfHandle,
                handle.y - halfHandle,
                handleSize,
                handleSize,
            );
        });
    }

    context.restore();
}
// Helper function to draw any element
function drawElement(
    context: CanvasRenderingContext2D,
    element: Element | PreviewElement,
    imageCache: Map<string, HTMLImageElement>,
    onImageLoad: () => void,
    defaultColor: string = "black",
) {
    if (!element) return;

    const stroke = element.properties.stroke || defaultColor;
    const fill = element.properties.fill || "transparent";
    const width = element.properties.strokeWidth || 2;

    context.strokeStyle = stroke;
    context.fillStyle = fill;
    context.lineWidth = width;

    if (element.properties.type === "rect") {
        if (fill !== "transparent") {
            context.fillRect(
                element.properties.x,
                element.properties.y,
                element.properties.width,
                element.properties.height,
            );
        }
        context.strokeRect(
            element.properties.x,
            element.properties.y,
            element.properties.width,
            element.properties.height,
        );
    } else if (element.properties.type === "arrow") {
        const { x, y, x2, y2 } = element.properties;

        if (
            typeof x !== "number" ||
            typeof y !== "number" ||
            typeof x2 !== "number" ||
            typeof y2 !== "number"
        ) {
            return;
        }
        context.beginPath();
        context.moveTo(x, y);
        context.lineTo(x2, y2);
        context.stroke();
        const angle = Math.atan2(y2 - y, x2 - x);
        const headLength = 15;
        context.save();

        context.translate(x2, y2);
        context.rotate(angle);

        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(-headLength, 6);
        context.moveTo(0, 0);
        context.lineTo(-headLength, -6);
        context.stroke();

        context.restore();
    } else if (element.properties.type === "text") {
        context.font = "16px sans-serif";
        context.textBaseline = "middle";
        context.textAlign = "center";
        context.fillStyle = stroke;
        context.fillText(
            element.properties.text,
            element.properties.x,
            element.properties.y,
        );
    } else if (element.properties.type === "image") {
        const { x, y, width, height, src } = element.properties;
        if (imageCache.has(src)) {
            const img = imageCache.get(src)!;
            context.drawImage(img, x, y, width, height);
        } else {
            const img = new Image();
            img.src = src;
            img.onload = () => {
                imageCache.set(src, img);
                onImageLoad();
            };
            img.onerror = () => {
                imageCache.set(src, img);
            };
        }
    }
}
