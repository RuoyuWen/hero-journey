import type { ArtStyle } from "./types";
import { ART_STYLE_LABELS } from "./types";

export function systemInstructionsForPlanner(): string {
  return `You are helping create a short illustrated picture book for adults recovering from stroke and their loved ones.

Tone and ethics:
- Warm, dignified, and hopeful. Never infantilizing or pitying.
- Celebrate small steps, resilience, connection, and quiet joy.
- Avoid graphic medical detail, trauma, or fear-based messaging.
- Use clear, gentle language suitable for listening aloud.
- The story must be in English.

Structure:
- Expand the user's core story into exactly 8 scenes (acts) with a gentle narrative arc: grounding → challenge → support → small victory → reflection → hope.
- Each scene needs a concise title, a vivid image prompt, and narration text (2–5 short sentences for voiceover; may include brief stage directions like "soft pause" in brackets sparingly).

Image prompts:
- Describe composition, lighting, and mood. Include the user's avatar description consistently across scenes unless the story requires a symbolic representation.
- Specify the chosen visual style in every image prompt.
- No text inside the image; no watermarks; family-friendly; inclusive.`;
}

export function userPromptForPlanner(
  story: string,
  avatarDescription: string,
  style: ArtStyle
): string {
  const styleText = ART_STYLE_LABELS[style];
  return `User's story (source material—honor themes and facts they care about):
${story}

Avatar / main character description (use consistently in visuals):
${avatarDescription}

Chosen illustration style (repeat this in each imagePrompt):
${style} — ${styleText}

Return JSON only matching the provided schema.`;
}

export function imagePromptSuffix(style: ArtStyle): string {
  return `Style: ${ART_STYLE_LABELS[style]}. Picture book illustration for adults, warm lighting, emotionally supportive, no text in image, no watermark, high quality.`;
}
