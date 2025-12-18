import OpenAI from "openai";
import { NextResponse } from "next/server";

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const SYSTEM_PROMPT = `
You are a system design architecture assistant.
You will receive a description of a system (e.g. "Scalable URL shortener").
You must output a JSON object containing an "elements" array to draw this system on a canvas.
You must state the relationship between elements near the arrow to show how different elements interact with each other.
You must provide a comprehensive summary below the entire diagram to explain what the diagram does and the architecture decision of the system.

The canvas is infinite. Start drawing around x=0, y=0.
Spread elements out so they don't overlap (at least 200px gap).

Supported Element Types:
1. Rectangle (Services/Databases):
   { "type": "rect", "x": number, "y": number, "width": 120, "height": 60 }

2. Text (Labels inside rectangles):
   { "type": "text", "x": number, "y": number, "text": string }
   NOTE: Text x/y should be the CENTER of the rectangle.

3. Arrow (Connections):
   { "type": "arrow", "x": number, "y": number, "x2": number, "y2": number }

CRITICAL RULES:
- Return ONLY valid JSON.
- The root object must be { "elements": [...] }
- If you create a "rect", you MUST create a corresponding "text" element centered inside it.
- If the text is long consider making the arrow longer and rectangle bigger so that the text does not overlap
`;

export async function POST(req: Request) {
  try {
    const { prompt } = await req.json();

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API Key not configured" },
        { status: 500 },
      );
    }

    const completion = await openai.chat.completions.create({
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: prompt },
      ],
      model: "gpt-4o",
      response_format: { type: "json_object" },
    });

    const content = completion.choices[0].message.content;
    if (!content) throw new Error("No content generated");

    const data = JSON.parse(content);
    // console.log(data);
    return NextResponse.json({ elements: data.elements });
  } catch (error) {
    console.error("AI Generation Error:", error);
    return NextResponse.json(
      { error: "Failed to generate diagram" },
      { status: 500 },
    );
  }
}
