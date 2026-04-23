"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { PictureBookPlayer, type GeneratedPage } from "@/components/PictureBookPlayer";
import { ART_STYLE_LABELS, type ArtStyle, type ScenePlan, type StoryPlan } from "@/lib/types";

const STORAGE_OPENAI = "lum_openai_key";
const STORAGE_ELEVEN = "lum_eleven_key";
const STORAGE_VOICE = "lum_eleven_voice";

const MIN_SCENES = 4;
const MAX_SCENES = 10;

type SceneCountMode = "auto" | "manual";

/**
 * Split `text` into exactly `n` ordered chunks that together cover every word.
 * Prefers paragraph boundaries, then sentence boundaries; falls back to
 * equal-length word slices so nothing is dropped.
 */
function segmentTextIntoScenes(text: string, n: number): string[] {
  const src = text.trim();
  if (!src || n <= 0) return Array.from({ length: Math.max(n, 0) }, () => "");

  const paragraphs = src
    .split(/\n\s*\n+/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length === n) return paragraphs;

  const sentences = src
    .replace(/\r\n/g, "\n")
    .split(/(?<=[.!?…])\s+(?=[A-Z0-9"“‘'])/)
    .map((s) => s.trim())
    .filter(Boolean);

  const units = sentences.length >= n ? sentences : src.split(/\s+/);
  const out: string[] = [];
  const per = units.length / n;
  for (let i = 0; i < n; i++) {
    const start = Math.floor(i * per);
    const end = i === n - 1 ? units.length : Math.floor((i + 1) * per);
    out.push(units.slice(start, end).join(units === sentences ? " " : " ").trim());
  }
  return out;
}

export default function HomePage() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [elevenKey, setElevenKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [story, setStory] = useState("");
  const [avatar, setAvatar] = useState("");
  const [style, setStyle] = useState<ArtStyle>("watercolor");
  const [sceneCountMode, setSceneCountMode] = useState<SceneCountMode>("auto");
  const [manualSceneCount, setManualSceneCount] = useState<number>(6);
  const [plan, setPlan] = useState<StoryPlan | null>(null);
  /** Snapshot of the user's story at the moment the current plan was generated. */
  const [planSourceStory, setPlanSourceStory] = useState<string>("");
  const [planError, setPlanError] = useState<string | null>(null);
  const [genError, setGenError] = useState<string | null>(null);
  const [planLoading, setPlanLoading] = useState(false);
  const [genLoading, setGenLoading] = useState(false);
  const [book, setBook] = useState<{
    backgroundMusicUrl: string;
    pages: GeneratedPage[];
    bookTitle: string;
    dedication: string;
  } | null>(null);

  useEffect(() => {
    try {
      setOpenaiKey(sessionStorage.getItem(STORAGE_OPENAI) || "");
      setElevenKey(sessionStorage.getItem(STORAGE_ELEVEN) || "");
      setVoiceId(sessionStorage.getItem(STORAGE_VOICE) || "");
    } catch {
      /* private mode */
    }
  }, []);

  const persistKeys = useCallback(() => {
    try {
      sessionStorage.setItem(STORAGE_OPENAI, openaiKey);
      sessionStorage.setItem(STORAGE_ELEVEN, elevenKey);
      sessionStorage.setItem(STORAGE_VOICE, voiceId);
    } catch {
      /* ignore */
    }
  }, [openaiKey, elevenKey, voiceId]);

  const handlePlanStory = async () => {
    setPlanError(null);
    setPlan(null);
    setBook(null);
    persistKeys();
    setPlanLoading(true);
    try {
      const targetSceneCount =
        sceneCountMode === "manual"
          ? Math.max(MIN_SCENES, Math.min(MAX_SCENES, Math.round(manualSceneCount)))
          : undefined;
      const res = await fetch("/api/plan-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiKey,
          story,
          avatarDescription: avatar,
          style,
          targetSceneCount,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Planning failed.");
      setPlan(data.plan as StoryPlan);
      setPlanSourceStory(story);
    } catch (e) {
      setPlanError(e instanceof Error ? e.message : "Planning failed.");
    } finally {
      setPlanLoading(false);
    }
  };

  const handleGenerateBook = async () => {
    if (!plan) return;
    setGenError(null);
    setBook(null);
    persistKeys();
    setGenLoading(true);
    try {
      const res = await fetch("/api/generate-book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiKey,
          elevenLabsKey: elevenKey,
          style,
          scenes: plan.scenes,
          refinedAvatarDescription: plan.refinedAvatarDescription,
          supportingCharacters: plan.supportingCharacters,
          voiceId: voiceId.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Generation failed.");
      setBook({
        backgroundMusicUrl: data.backgroundMusicUrl,
        pages: data.pages,
        bookTitle: plan.bookTitle,
        dedication: plan.dedication,
      });
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Generation failed.");
    } finally {
      setGenLoading(false);
    }
  };

  const updateScene = useCallback(
    (idx: number, patch: Partial<ScenePlan>) => {
      setPlan((p) =>
        p
          ? {
              ...p,
              scenes: p.scenes.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
            }
          : p
      );
    },
    []
  );

  const handleUseMyExactWords = useCallback(() => {
    setPlan((p) => {
      if (!p || !planSourceStory.trim()) return p;
      const parts = segmentTextIntoScenes(planSourceStory, p.scenes.length);
      return {
        ...p,
        scenes: p.scenes.map((s, i) => ({ ...s, narration: parts[i] ?? s.narration })),
      };
    });
  }, [planSourceStory]);

  const sceneCountNote = useMemo(() => {
    if (sceneCountMode === "manual") {
      return `Luminaria will cut your story into exactly ${manualSceneCount} scenes.`;
    }
    return `Luminaria will choose between ${MIN_SCENES} and ${MAX_SCENES} scenes based on the natural beats of your story.`;
  }, [sceneCountMode, manualSceneCount]);

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">
          Luminaria
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink sm:text-5xl">
          A book of what you saw
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
          Write down a Near-Death Experience in your own words. Luminaria gathers it
          into a quiet illustrated book — with your narration, soft voiceover, and
          ambient sound — to share with family and friends, or to keep for yourself.
          Your words stay your words.
        </p>
      </header>

      <section
        className="mb-10 rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur"
        aria-labelledby="keys-heading"
      >
        <h2 id="keys-heading" className="font-serif text-2xl font-semibold text-ink">
          API keys
        </h2>
        <p className="mt-2 text-sm text-stone-600">
          Keys are kept in this browser session only (sessionStorage) and sent to this
          app&apos;s server routes when you generate content — they are not stored on
          our server. Your words are sent to OpenAI only to segment and illustrate
          your story, and to ElevenLabs to voice it. For production use, put keys on
          a backend instead of pasting them in the browser.
        </p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm font-medium">
            OpenAI API key
            <input
              type="password"
              autoComplete="off"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              className="min-h-[48px] rounded-lg border border-stone-300 px-3 py-2 text-base"
              placeholder="sk-..."
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium">
            ElevenLabs API key
            <input
              type="password"
              autoComplete="off"
              value={elevenKey}
              onChange={(e) => setElevenKey(e.target.value)}
              className="min-h-[48px] rounded-lg border border-stone-300 px-3 py-2 text-base"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
            ElevenLabs voice ID (optional — default from docs is used if empty)
            <input
              type="text"
              value={voiceId}
              onChange={(e) => setVoiceId(e.target.value)}
              className="min-h-[48px] rounded-lg border border-stone-300 px-3 py-2 font-mono text-sm"
              placeholder="JBFqnCBsd6RMkjVDRZzb"
            />
          </label>
        </div>
      </section>

      <section
        className="mb-10 rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur"
        aria-labelledby="story-heading"
      >
        <h2 id="story-heading" className="font-serif text-2xl font-semibold text-ink">
          Your story
        </h2>
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
          What you remember (in your own words)
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={8}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base leading-relaxed"
            placeholder="Write in English. Describe what happened in the order you lived it — where you were, what you noticed, what you saw or felt, who was there, what you remember coming back to. Include only what you actually remember; Luminaria will not add anything you did not write."
          />
        </label>
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
          Main character (so the pictures stay recognisable across pages)
          <textarea
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            rows={3}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
            placeholder="e.g. A man in his forties with short dark hair, round glasses, a trimmed beard, wearing a pale hospital gown."
          />
        </label>
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
          Picture book style
          <select
            value={style}
            onChange={(e) => setStyle(e.target.value as ArtStyle)}
            className="min-h-[48px] rounded-lg border border-stone-300 px-3 py-2 text-base"
          >
            {(Object.keys(ART_STYLE_LABELS) as ArtStyle[]).map((k) => (
              <option key={k} value={k}>
                {ART_STYLE_LABELS[k]}
              </option>
            ))}
          </select>
        </label>

        <fieldset className="mt-4 rounded-lg border border-stone-200 p-4">
          <legend className="px-1 text-sm font-semibold text-stone-700">
            Number of scenes
          </legend>
          <div className="mt-2 flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="sceneCountMode"
                value="auto"
                checked={sceneCountMode === "auto"}
                onChange={() => setSceneCountMode("auto")}
                className="h-4 w-4"
              />
              Auto ({MIN_SCENES}–{MAX_SCENES})
            </label>
            <label className="flex items-center gap-2">
              <input
                type="radio"
                name="sceneCountMode"
                value="manual"
                checked={sceneCountMode === "manual"}
                onChange={() => setSceneCountMode("manual")}
                className="h-4 w-4"
              />
              Set exactly
              <input
                type="number"
                min={MIN_SCENES}
                max={MAX_SCENES}
                value={manualSceneCount}
                onChange={(e) => {
                  setSceneCountMode("manual");
                  const v = Number(e.target.value);
                  if (Number.isFinite(v)) {
                    setManualSceneCount(Math.max(MIN_SCENES, Math.min(MAX_SCENES, Math.round(v))));
                  }
                }}
                className="w-16 rounded-md border border-stone-300 px-2 py-1 text-sm"
              />
            </label>
          </div>
          <p className="mt-2 text-xs text-stone-500">{sceneCountNote}</p>
        </fieldset>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePlanStory}
            disabled={planLoading}
            className="min-h-[52px] rounded-full bg-ink px-8 text-base font-semibold text-paper hover:opacity-95 disabled:opacity-50"
          >
            {planLoading ? "Preparing outline…" : "Prepare outline"}
          </button>
        </div>
        {planError && (
          <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
            {planError}
          </p>
        )}
      </section>

      {plan && (
        <section
          className="mb-10 rounded-2xl border border-stone-200 bg-white/80 p-6 shadow-sm backdrop-blur"
          aria-labelledby="outline-heading"
        >
          <h2 id="outline-heading" className="font-serif text-2xl font-semibold text-ink">
            Outline
          </h2>
          <p className="mt-1 text-sm text-stone-600">
            Read each scene and edit any wording that isn&apos;t yours. Whatever is in
            these boxes at the moment you press <em>Generate</em> is what your book
            will say.
          </p>

          <label className="mt-5 flex flex-col gap-1 text-sm font-medium">
            Book title
            <input
              type="text"
              value={plan.bookTitle}
              onChange={(e) => setPlan((p) => (p ? { ...p, bookTitle: e.target.value } : p))}
              className="min-h-[44px] rounded-lg border border-stone-300 px-3 py-2 font-serif text-lg"
            />
          </label>
          <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
            Dedication (optional — for whom, or in whose memory)
            <textarea
              value={plan.dedication}
              onChange={(e) => setPlan((p) => (p ? { ...p, dedication: e.target.value } : p))}
              rows={2}
              className="rounded-lg border border-stone-300 px-3 py-2 text-base"
              placeholder="e.g. For my children, so they know."
            />
          </label>

          <div className="mt-6 rounded-xl border border-sage/30 bg-paper/90 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-sage">
              Main character (used by the illustrator for visual consistency)
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {plan.refinedAvatarDescription}
            </p>
            {plan.supportingCharacters.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-sage">
                  Other people in your story
                </h3>
                <ul className="mt-2 space-y-3">
                  {plan.supportingCharacters.map((c, idx) => (
                    <li key={idx} className="text-sm text-stone-800">
                      <span className="font-semibold text-ink">{c.roleLabel}:</span>{" "}
                      <span className="leading-relaxed">{c.visualDescription}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-3 text-xs text-stone-500">
              These descriptions are injected into every illustration prompt so the
              people in your story stay visually consistent. They aren&apos;t spoken
              aloud.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-3 rounded-lg border border-stone-200 bg-paper/70 px-4 py-3">
            <p className="text-sm text-stone-700">
              If the narration drifted from your words, reset it to your exact text:
            </p>
            <button
              type="button"
              onClick={handleUseMyExactWords}
              className="min-h-[40px] rounded-full border border-stone-400 bg-white px-4 text-sm font-medium text-ink hover:bg-stone-50"
            >
              Use my exact words
            </button>
          </div>

          <ol className="mt-6 space-y-4">
            {plan.scenes.map((s, idx) => (
              <li
                key={s.sceneNumber}
                className="rounded-xl border border-stone-100 bg-paper/80 p-4"
              >
                <p className="text-sm font-semibold text-sage">
                  Scene {s.sceneNumber} of {plan.scenes.length}
                </p>
                <label className="mt-2 flex flex-col gap-1 text-sm font-medium">
                  Title
                  <input
                    type="text"
                    value={s.title}
                    onChange={(e) => updateScene(idx, { title: e.target.value })}
                    className="min-h-[40px] rounded-md border border-stone-300 px-2 py-1 font-serif text-base"
                  />
                </label>
                <label className="mt-3 flex flex-col gap-1 text-sm font-medium">
                  Narration (this is what will be read aloud — edit freely)
                  <textarea
                    value={s.narration}
                    onChange={(e) => updateScene(idx, { narration: e.target.value })}
                    rows={4}
                    className="rounded-md border border-stone-300 px-2 py-2 text-base leading-relaxed"
                  />
                </label>
                <details className="mt-3 text-sm text-stone-600">
                  <summary className="cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-stone-500">
                    Image prompt (advanced)
                  </summary>
                  <textarea
                    value={s.imagePrompt}
                    onChange={(e) => updateScene(idx, { imagePrompt: e.target.value })}
                    rows={3}
                    className="mt-2 w-full rounded-md border border-stone-300 px-2 py-2 text-sm"
                  />
                </details>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <p className="text-sm text-stone-600">
              Generating illustrations and audio can take several minutes (one image
              per scene plus voiceovers and ambient sound). Please keep this page
              open.
            </p>
            <button
              type="button"
              onClick={handleGenerateBook}
              disabled={genLoading}
              className="mt-3 min-h-[52px] rounded-full bg-sage px-8 text-base font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {genLoading ? "Generating Luminaria…" : "Generate illustrations & audio"}
            </button>
            {genError && (
              <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">
                {genError}
              </p>
            )}
          </div>
        </section>
      )}

      {book && (
        <PictureBookPlayer
          bookTitle={book.bookTitle}
          dedication={book.dedication}
          backgroundMusicUrl={book.backgroundMusicUrl}
          pages={book.pages}
        />
      )}

      <footer className="mt-16 border-t border-stone-200 pt-8 text-center text-sm text-stone-500">
        <p>
          Luminaria keeps your words as you wrote them. This is your account, to
          share at your own pace.
        </p>
      </footer>
    </main>
  );
}
