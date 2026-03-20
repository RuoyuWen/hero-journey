export type ArtStyle =
  | "watercolor"
  | "soft_pastel"
  | "picture_book_flat"
  | "warm_gouache"
  | "ink_wash";

export const ART_STYLE_LABELS: Record<ArtStyle, string> = {
  watercolor: "Gentle watercolor (soft edges, paper texture)",
  soft_pastel: "Soft pastel (dreamy, luminous)",
  picture_book_flat: "Modern flat picture-book (bold shapes, friendly)",
  warm_gouache: "Warm gouache (cozy, hand-painted)",
  ink_wash: "Minimal ink wash (calm, spacious)",
};

export type ScenePlan = {
  sceneNumber: number;
  title: string;
  imagePrompt: string;
  narration: string;
};

/** A recurring character other than the protagonist (for consistent illustration). */
export type SupportingCharacter = {
  /** Short label used in scenes, e.g. "Partner", "Physical therapist". */
  roleLabel: string;
  /** Detailed, stable visual description (face, age, hair, clothing, palette). */
  visualDescription: string;
};

export type StoryPlan = {
  bookTitle: string;
  dedication: string;
  /** AI-expanded visual bible for the hero—injected into every image prompt. */
  refinedAvatarDescription: string;
  /** Zero or more important recurring characters from the story (empty if none). */
  supportingCharacters: SupportingCharacter[];
  scenes: ScenePlan[];
};
