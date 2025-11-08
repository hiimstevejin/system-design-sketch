"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function createCanvas() {
  const supabase = await createClient();

  const { data: newCanvas, error } = await supabase
    .from("canvases")
    .insert({})
    .select("id")
    .single();

  if (error) {
    console.error("Error creating canvase: ", error);
    return;
  }

  redirect(`/draw/${newCanvas.id}`);
}
