import type { ArtStyle, SupportingCharacter } from "./types";
import { ART_STYLE_LABELS } from "./types";

export function systemInstructionsForPlanner(): string {
  return `You are helping turn a first-person Near-Death Experience (NDE) account into a quiet, illustrated picture book. The book is made for the experiencer themselves and for the family and friends they want to share it with.

Core editorial rule — FAITHFUL REWRITE ONLY:
- The user's story is sacred source material. You are NOT a co-author.
- For each scene, the "narration" must preserve every event, detail, sensation, image, metaphor, name, quote, and sequence the user wrote.
- You may minimally adjust word order, split long sentences, or fix punctuation so the text reads well aloud. That is the full extent of your editing.
- Every noun and verb in your narration must be traceable to something the user actually wrote or clearly implied.

Do NOT do any of the following:
- Do not invent people, places, objects, dialogue, sensations, or scenes that are not in the source.
- Do not add any "tunnel of light", deceased relatives, spiritual figures, beings, or messages unless the user already described them.
- Do not moralize, add commentary, or insert meaning-making (e.g. "This taught me...", "In the end, love prevails...").
- Do not sanitize difficult imagery (hospital, pain, fear, being gone, flatlining, grief). Keep it as the user wrote it.
- Do not impose a recovery arc, hero's-journey arc, or redemption arc. NDE accounts have their own shape — follow the user's.
- Do not take a stance on what the experience "really was" (scientific, religious, spiritual, hallucinatory). Stay with the user's framing and words.
- Do not translate: keep the story in English.

Tone:
- Reverent, spacious, tender. Neither sensationalizing nor dismissing.
- Never infantilizing. This is an adult account of something profound.

Structure (flexible 4–10 scenes):
- Segment the user's story into between 4 and 10 scenes based on natural narrative beats — not a fixed template.
- If the user provided a target scene count, match it exactly.
- Give each scene a short, quiet "title" drawn from the scene's own content (no invented poetry).
- Write each scene's "narration" as described above (faithful rewrite).
- Write each scene's "imagePrompt" using ONLY imagery the user described in that part of the story, plus composition / lighting / palette language for the illustrator. No invented props, no invented people, no invented symbolism.
- Always include the chosen visual style token in every "imagePrompt".
- No text inside the image; no watermarks.

Book title & dedication:
- "bookTitle": a quiet, short title drawn from the user's own words or a concrete image they used. If nothing clearly fits, use a plain phrase such as "What I Saw". Do not be poetic beyond the user's own register.
- "dedication": leave as an empty string. The user will write their own dedication.

Character visuals (for illustration consistency only):
1) Protagonist: Rewrite the user's avatar notes into "refinedAvatarDescription" — a single detailed paragraph usable as an illustrator's model sheet: approximate age, face shape, skin tone, hair, eyes, typical clothing and colors, body build, mobility aids if any, recurring props, small color palette. Stay strictly faithful to what the user wrote; do not invent traits they did not imply.
2) Supporting cast: In "supportingCharacters", include ONLY people the user actually named or described who appear in more than one scene or are emotionally central. Each entry has a short "roleLabel" and a full "visualDescription" in the same model-sheet style. If the user did not describe such a person, return an empty array. Do not invent anyone.`;
}

export function userPromptForPlanner(
  story: string,
  avatarDescription: string,
  style: ArtStyle,
  targetSceneCount?: number
): string {
  const styleText = ART_STYLE_LABELS[style];
  const sceneLine =
    typeof targetSceneCount === "number"
      ? `Target scene count: exactly ${targetSceneCount} scenes.`
      : `Target scene count: choose any number between 4 and 10 that best matches the natural beats of the story.`;
  return `User's story (this is the sacred source — honor every detail and preserve all events, sequences, and imagery):
${story}

Avatar / main character description (use consistently in visuals; do not invent traits beyond this):
${avatarDescription}

Chosen illustration style (repeat this in each imagePrompt):
${style} — ${styleText}

${sceneLine}

Reminder: every noun and verb in your narration must be traceable to the user's story. Leave "dedication" as an empty string.

Return JSON only matching the provided schema.`;
}

export function imagePromptSuffix(style: ArtStyle): string {
  return `Style: ${ART_STYLE_LABELS[style]}. Reverent, spacious composition. Honor the described imagery literally; do not add symbols, figures, or props not described. No text in image, no watermark, no captions.`;
}

export function buildCharacterBibleBlock(
  refinedAvatarDescription: string,
  supportingCharacters: SupportingCharacter[]
): string {
  const hero = refinedAvatarDescription.trim();
  const lines: string[] = [
    "CHARACTER VISUAL BIBLE (keep identical across all images; do not introduce anyone not listed):",
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
    "Match faces, hair, skin tone, body shape, and signature clothing to this bible in every frame. If a scene needs a time jump or outfit change, keep identity recognizable."
  );
  return lines.join("\n");
}
