import OpenAI from "openai";
import { NextResponse } from "next/server";
import { systemInstructionsForPlanner, userPromptForPlanner } from "@/lib/prompts";
import type { ArtStyle, StoryPlan } from "@/lib/types";

const SCHEMA_NAME = "story_plan";

/** Story outline + image/narration descriptions (Chat Completions). */
const DEFAULT_PLANNER_MODEL = "gpt-4.1";

export async function POST(req: Request) {
  let body: {
    openaiKey?: string;
    story?: string;
    avatarDescription?: string;
    style?: ArtStyle;
    model?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const openaiKey = body.openaiKey?.trim();
  const story = body.story?.trim();
  const avatarDescription = body.avatarDescription?.trim();
  const style = body.style;
  const model = body.model?.trim() || DEFAULT_PLANNER_MODEL;

  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI API key is required." }, { status: 400 });
  }
  if (!story || story.length < 10) {
    return NextResponse.json(
      { error: "Please enter a story (at least a few sentences)." },
      { status: 400 }
    );
  }
  if (!avatarDescription || avatarDescription.length < 3) {
    return NextResponse.json(
      { error: "Please describe the avatar / main character." },
      { status: 400 }
    );
  }
  if (!style) {
    return NextResponse.json({ error: "Please choose an art style." }, { status: 400 });
  }

  const client = new OpenAI({ apiKey: openaiKey });

  const jsonSchema = {
    name: SCHEMA_NAME,
    strict: true,
    schema: {
      type: "object",
      additionalProperties: false,
      required: [
        "bookTitle",
        "dedication",
        "refinedAvatarDescription",
        "supportingCharacters",
        "scenes",
      ],
      properties: {
        bookTitle: { type: "string" },
        dedication: { type: "string" },
        refinedAvatarDescription: {
          type: "string",
          description:
            "AI-refined model-sheet description of the protagonist for consistent art.",
        },
        supportingCharacters: {
          type: "array",
          minItems: 0,
          maxItems: 6,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["roleLabel", "visualDescription"],
            properties: {
              roleLabel: { type: "string" },
              visualDescription: { type: "string" },
            },
          },
        },
        scenes: {
          type: "array",
          minItems: 8,
          maxItems: 8,
          items: {
            type: "object",
            additionalProperties: false,
            required: ["sceneNumber", "title", "imagePrompt", "narration"],
            properties: {
              sceneNumber: { type: "integer", minimum: 1, maximum: 8 },
              title: { type: "string" },
              imagePrompt: { type: "string" },
              narration: { type: "string" },
            },
          },
        },
      },
    },
  } as const;

  try {
    const completion = await client.chat.completions.create({
      model,
      temperature: 0.7,
      messages: [
        { role: "system", content: systemInstructionsForPlanner() },
        { role: "user", content: userPromptForPlanner(story, avatarDescription, style) },
      ],
      response_format: {
        type: "json_schema",
        json_schema: jsonSchema,
      },
    });

    const raw = completion.choices[0]?.message?.content;
    if (!raw) {
      return NextResponse.json({ error: "Empty response from OpenAI." }, { status: 502 });
    }

    const plan = JSON.parse(raw) as StoryPlan;
    if (!plan.refinedAvatarDescription?.trim() || plan.refinedAvatarDescription.trim().length < 40) {
      return NextResponse.json(
        { error: "Planner returned an avatar bible that is too short; try again." },
        { status: 502 }
      );
    }
    if (!Array.isArray(plan.supportingCharacters)) {
      return NextResponse.json({ error: "Invalid supportingCharacters in plan." }, { status: 502 });
    }
    const sorted = [...plan.scenes].sort((a, b) => a.sceneNumber - b.sceneNumber);
    for (let i = 0; i < 8; i++) {
      if (sorted[i]?.sceneNumber !== i + 1) {
        return NextResponse.json(
          { error: "Story plan scenes must be numbered 1–8 in order." },
          { status: 502 }
        );
      }
    }

    return NextResponse.json({
      plan: { ...plan, scenes: sorted },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
