"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { ScenePlan } from "@/lib/types";

export type GeneratedPage = ScenePlan & {
  imageDataUrl?: string;
  narrationAudioUrl?: string;
};

type Props = {
  bookTitle: string;
  dedication: string;
  backgroundMusicUrl: string;
  pages: GeneratedPage[];
};

export function PictureBookPlayer({
  bookTitle,
  dedication,
  backgroundMusicUrl,
  pages,
}: Props) {
  const [index, setIndex] = useState(0);
  const [bgmOn, setBgmOn] = useState(true);
  const [bgmVol, setBgmVol] = useState(0.22);
  const [narrationVol, setNarrationVol] = useState(1);
  const [playing, setPlaying] = useState(false);

  const bgmRef = useRef<HTMLAudioElement | null>(null);
  const narrRef = useRef<HTMLAudioElement | null>(null);

  const page = pages[index];

  useEffect(() => {
    const bgm = new Audio(backgroundMusicUrl);
    bgm.loop = true;
    bgm.volume = bgmVol;
    bgmRef.current = bgm;
    return () => {
      bgm.pause();
      bgmRef.current = null;
    };
    // Volume is synced in the following effect; only recreate when URL changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [backgroundMusicUrl]);

  useEffect(() => {
    const a = bgmRef.current;
    if (!a) return;
    a.volume = bgmVol;
  }, [bgmVol]);

  useEffect(() => {
    const a = bgmRef.current;
    if (!a) return;
    if (bgmOn) {
      void a.play().catch(() => {});
    } else {
      a.pause();
    }
  }, [bgmOn, backgroundMusicUrl]);

  useEffect(() => {
    narrRef.current?.pause();
    setPlaying(false);
    const n = page?.narrationAudioUrl;
    let el: HTMLAudioElement | null = null;
    if (n) {
      el = new Audio(n);
      el.volume = narrationVol;
      el.onended = () => {
        setPlaying(false);
        const b = bgmRef.current;
        if (b && bgmOn) b.volume = bgmVol;
      };
      narrRef.current = el;
    } else {
      narrRef.current = null;
    }
    return () => {
      el?.pause();
    };
  }, [index, page?.narrationAudioUrl, bgmOn, bgmVol, narrationVol]);

  useEffect(() => {
    const el = narrRef.current;
    if (el) el.volume = narrationVol;
  }, [narrationVol]);

  const playNarration = useCallback(() => {
    const el = narrRef.current;
    const bgm = bgmRef.current;
    if (!el) return;
    if (bgm && bgmOn) {
      bgm.volume = Math.min(bgmVol * 0.35, 0.12);
    }
    setPlaying(true);
    void el.play().catch(() => setPlaying(false));
  }, [bgmOn, bgmVol]);

  const stopNarration = useCallback(() => {
    const el = narrRef.current;
    const bgm = bgmRef.current;
    el?.pause();
    if (el) el.currentTime = 0;
    setPlaying(false);
    if (bgm && bgmOn) bgm.volume = bgmVol;
  }, [bgmOn, bgmVol]);

  const go = (dir: -1 | 1) => {
    stopNarration();
    setIndex((i) => Math.min(Math.max(i + dir, 0), pages.length - 1));
  };

  return (
    <section
      className="rounded-2xl border border-stone-200 bg-white/90 p-6 shadow-sm backdrop-blur"
      aria-labelledby="book-title"
    >
      <header className="mb-6 text-center">
        <p className="text-xs font-medium uppercase tracking-widest text-sage">
          Your Luminaria
        </p>
        <h2 id="book-title" className="font-serif text-3xl font-semibold text-ink">
          {bookTitle}
        </h2>
        {dedication?.trim() ? (
          <p className="mt-2 font-serif text-lg text-stone-600">{dedication}</p>
        ) : null}
      </header>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <figure className="overflow-hidden rounded-xl bg-stone-100">
          {page?.imageDataUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={page.imageDataUrl}
              alt={`Illustration for scene ${page.sceneNumber}: ${page.title}`}
              className="h-auto w-full object-cover"
            />
          ) : (
            <div className="flex aspect-[4/3] items-center justify-center text-stone-400">
              No image
            </div>
          )}
          <figcaption className="border-t border-stone-200 bg-white px-4 py-3">
            <p className="text-sm font-medium text-sage">
              Scene {page?.sceneNumber} of {pages.length}
            </p>
            <h3 className="font-serif text-xl text-ink">{page?.title}</h3>
          </figcaption>
        </figure>

        <div className="flex flex-col gap-4">
          <div
            className="rounded-xl bg-paper p-4 text-base leading-relaxed text-stone-800"
            role="region"
            aria-label="Narration text"
          >
            {page?.narration}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => go(-1)}
              disabled={index === 0}
              className="min-h-[48px] min-w-[48px] rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-stone-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              disabled={index >= pages.length - 1}
              className="min-h-[48px] min-w-[48px] rounded-full border border-stone-300 bg-white px-4 py-2 text-sm font-medium text-ink hover:bg-stone-50 disabled:opacity-40"
            >
              Next
            </button>
            <button
              type="button"
              onClick={playing ? stopNarration : playNarration}
              className="min-h-[48px] rounded-full bg-sage px-6 py-2 text-sm font-semibold text-white hover:opacity-95"
            >
              {playing ? "Stop voice" : "Play voice"}
            </button>
          </div>

          <fieldset className="rounded-xl border border-stone-200 p-4">
            <legend className="px-1 text-sm font-semibold text-stone-700">
              Sound
            </legend>
            <label className="mt-2 flex items-center gap-3 text-sm">
              <input
                type="checkbox"
                checked={bgmOn}
                onChange={(e) => setBgmOn(e.target.checked)}
                className="h-5 w-5"
              />
              Background music
            </label>
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span>Music volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={bgmVol}
                onChange={(e) => setBgmVol(Number(e.target.value))}
                className="w-full"
              />
            </label>
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span>Voice volume</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.01}
                value={narrationVol}
                onChange={(e) => setNarrationVol(Number(e.target.value))}
                className="w-full"
              />
            </label>
          </fieldset>
        </div>
      </div>
    </section>
  );
}
