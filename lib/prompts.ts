import type { ArtStyle, SupportingCharacter } from "./types";
import { ART_STYLE_LABELS } from "./types";

export function systemInstructionsForPlanner(): string {
  return `You are helping create a short illustrated picture book for adults recovering from stroke and their loved ones.

Tone and ethics:
- Warm, dignified, and hopeful. Never infantilizing or pitying.
- Celebrate small steps, resilience, connection, and quiet joy.
- Avoid graphic medical detail, trauma, or fear-based messaging.
- Use clear, gentle language suitable for listening aloud.
- The story must be in English.

Character visuals (critical for illustration consistency):
1) Protagonist: Take the user's rough avatar notes and rewrite them into "refinedAvatarDescription"—a single detailed English paragraph (or two short paragraphs) usable as an illustrator's model sheet: approximate age, face shape, skin tone, hair, eyes, typical clothing and colors, body build, mobility aids if any, recurring props, and a small color palette. Stay faithful to what the user implied; do not invent traits that contradict the user.
2) Supporting cast: Read the story. If there are other people who appear in more than one scene or are emotionally central (family, caregiver, friend, clinician), add up to six entries in "supportingCharacters". Each needs a short "roleLabel" and a full "visualDescription" in the same model-sheet style. If there are no such characters, return an empty array. Do not invent characters the user did not imply unless they are generic background figures—only named recurring roles need entries.

Structure:
- Expand the user's core story into exactly 8 scenes (acts) with a gentle narrative arc: grounding → challenge → support → small victory → reflection → hope.
- Each scene needs a concise title, a vivid image prompt, and narration text (2–5 short sentences for voiceover; may include brief stage directions like "soft pause" in brackets sparingly).

Per-scene image prompts:
- Focus on action, composition, setting, lighting, and mood. Refer to people as "the protagonist", "the partner", etc.—do NOT paste the full appearance text here; a separate system step will inject the full character bible into every image generation call.
- Still mention the chosen visual style in every imagePrompt (see user message for the style token).
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

export function buildCharacterBibleBlock(
  refinedAvatarDescription: string,
  supportingCharacters: SupportingCharacter[]
): string {
  const hero = refinedAvatarDescription.trim();
  const lines: string[] = [
    "CHARACTER VISUAL BIBLE (keep identical across all images):",
    "",
    "Protagonist:",
    hero,
  ];
  if (supportingCharacters.length > 0) {
    lines.push("", "Other recurring characters:");
    for (const c of supportingCharacters) {
      const label = c.roleLabel.trim();
      const desc = c.visualDescription.trim();
      lines.push(`- ${label}: ${desc}`);
    }
  }
  lines.push(
    "",
    "Match faces, hair, skin tone, body shape, and signature clothing to this bible in every frame. If a scene needs a time jump or outfit change, state it in the scene description but keep identity recognizable."
  );
  return lines.join("\n");
}
