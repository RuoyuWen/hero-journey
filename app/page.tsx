"use client";

import { useCallback, useEffect, useState } from "react";
import { PictureBookPlayer, type GeneratedPage } from "@/components/PictureBookPlayer";
import { ART_STYLE_LABELS, type ArtStyle, type StoryPlan } from "@/lib/types";

const STORAGE_OPENAI = "hj_openai_key";
const STORAGE_ELEVEN = "hj_eleven_key";
const STORAGE_VOICE = "hj_eleven_voice";

export default function HomePage() {
  const [openaiKey, setOpenaiKey] = useState("");
  const [elevenKey, setElevenKey] = useState("");
  const [voiceId, setVoiceId] = useState("");
  const [story, setStory] = useState("");
  const [avatar, setAvatar] = useState("");
  const [style, setStyle] = useState<ArtStyle>("watercolor");
  const [plan, setPlan] = useState<StoryPlan | null>(null);
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
      const res = await fetch("/api/plan-story", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openaiKey,
          story,
          avatarDescription: avatar,
          style,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Planning failed.");
      setPlan(data.plan as StoryPlan);
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

  return (
    <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
      <header className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-sage">
          Hero Journey
        </p>
        <h1 className="mt-2 font-serif text-4xl font-semibold text-ink sm:text-5xl">
          Healing picture book
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-stone-600">
          Share a story in your own words. We will shape it into eight gentle
          scenes with illustrations, spoken narration, and soft background
          music—made with warmth for stroke survivors and those who love them.
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
          Keys are kept in this browser session only (sessionStorage) and sent to
          this app&apos;s server routes when you generate content—they are not
          stored on our server. For production, use your own backend secrets
          instead of pasting keys in the browser.
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
          Story (what happened, what matters to you)
          <textarea
            value={story}
            onChange={(e) => setStory(e.target.value)}
            rows={6}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base leading-relaxed"
            placeholder="Write in English. A few sentences or more—this is the heart of your book."
          />
        </label>
        <label className="mt-4 flex flex-col gap-1 text-sm font-medium">
          Avatar / main character (how they should look in every scene)
          <textarea
            value={avatar}
            onChange={(e) => setAvatar(e.target.value)}
            rows={3}
            className="rounded-lg border border-stone-300 px-3 py-2 text-base"
            placeholder="e.g. A woman in her sixties with short silver hair, warm eyes, a blue cardigan, and a walking stick with a wooden handle."
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

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handlePlanStory}
            disabled={planLoading}
            className="min-h-[52px] rounded-full bg-ink px-8 text-base font-semibold text-paper hover:opacity-95 disabled:opacity-50"
          >
            {planLoading ? "Planning…" : "Create 8-scene outline"}
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
          <p className="mt-1 font-serif text-xl text-stone-700">{plan.bookTitle}</p>
          <p className="mt-2 text-stone-600">{plan.dedication}</p>

          <div className="mt-6 rounded-xl border border-sage/30 bg-paper/90 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-sage">
              Protagonist (AI-refined for art consistency)
            </h3>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-stone-800">
              {plan.refinedAvatarDescription}
            </p>
            {plan.supportingCharacters.length > 0 && (
              <>
                <h3 className="mt-4 text-sm font-semibold uppercase tracking-wide text-sage">
                  Other important characters
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
              These descriptions are injected into every illustration prompt so the hero
              and recurring cast stay visually consistent.
            </p>
          </div>

          <ol className="mt-6 space-y-4">
            {plan.scenes.map((s) => (
              <li
                key={s.sceneNumber}
                className="rounded-xl border border-stone-100 bg-paper/80 p-4"
              >
                <p className="text-sm font-semibold text-sage">
                  Scene {s.sceneNumber}: {s.title}
                </p>
                <p className="mt-2 text-sm text-stone-600">
                  <span className="font-medium text-stone-800">Image prompt:</span>{" "}
                  {s.imagePrompt}
                </p>
                <p className="mt-2 text-sm leading-relaxed text-stone-800">
                  <span className="font-medium">Narration:</span> {s.narration}
                </p>
              </li>
            ))}
          </ol>

          <div className="mt-8">
            <p className="text-sm text-stone-600">
              Generating images and audio can take several minutes (eight images plus
              voiceovers and music). Please keep this page open.
            </p>
            <button
              type="button"
              onClick={handleGenerateBook}
              disabled={genLoading}
              className="mt-3 min-h-[52px] rounded-full bg-sage px-8 text-base font-semibold text-white hover:opacity-95 disabled:opacity-50"
            >
              {genLoading ? "Generating picture book…" : "Generate illustrations & audio"}
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
          Built for dignity and hope. If anything feels off, edit your story and try
          again—the model responds to how you frame the journey.
        </p>
      </footer>
    </main>
  );
}
