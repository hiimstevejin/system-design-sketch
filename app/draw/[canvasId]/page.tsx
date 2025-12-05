import DrawingCanvas from "./drawing-canvas";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    canvasId: string;
  }>;
};

// takes url param and fetches canvas details
export default async function CanvasPage({ params }: PageProps) {
  const supabase = await createClient();
  const { canvasId } = await params;

  // fetch canvas details
  const { data: canvasData, error: canvasError } = await supabase
    .from("canvases")
    .select("name")
    .eq("id", canvasId)
    .single();

  // fetch elements for this canvas
  const { data: initialElements, error: elementsError } = await supabase
    .from("elements")
    .select("*")
    .eq("canvas_id", canvasId);

  if (canvasError || elementsError) {
    console.error(canvasError || elementsError);
    //TODO improve error message
    return <div>Error loading canvas.</div>;
  }

  if (!canvasData) {
    //TODO improve error message
    return <div>Canvas not found</div>;
  }

  return (
    <DrawingCanvas
      canvasId={canvasId}
      canvasName={canvasData.name}
      initialElements={initialElements || []}
    />
  );
}
