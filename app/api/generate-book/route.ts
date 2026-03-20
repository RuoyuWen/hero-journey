import OpenAI from "openai";
import { NextResponse } from "next/server";
import { buildCharacterBibleBlock, imagePromptSuffix } from "@/lib/prompts";
import type { ArtStyle, ScenePlan, SupportingCharacter } from "@/lib/types";

/** Default voice from ElevenLabs docs; replace in UI if you prefer another voice. */
const DEFAULT_VOICE = "JBFqnCBsd6RMkjVDRZzb";

/** ElevenLabs enforces a concurrent request cap per account (often 5 on lower tiers). */
const ELEVENLABS_MAX_CONCURRENT = 5;

/** OpenAI Images API — GPT Image 1.5 snapshot. */
const IMAGE_MODEL = "gpt-image-1";

async function mapInBatches<T, R>(
  items: T[],
  batchSize: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += batchSize) {
    const chunk = items.slice(i, i + batchSize);
    const part = await Promise.all(chunk.map((item) => fn(item)));
    out.push(...part);
  }
  return out;
}

async function bufferToDataUrl(
  buf: ArrayBuffer,
  mime: string
): Promise<string> {
  const b64 = Buffer.from(buf).toString("base64");
  return `data:${mime};base64,${b64}`;
}

async function elevenLabsTts(
  apiKey: string,
  voiceId: string,
  text: string
): Promise<string> {
  const url = new URL(
    `https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}`
  );
  url.searchParams.set("output_format", "mp3_44100_128");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: "eleven_multilingual_v2",
      voice_settings: {
        stability: 0.55,
        similarity_boost: 0.72,
        style: 0.15,
        speed: 0.92,
      },
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs TTS failed (${res.status}): ${errText}`);
  }

  const buf = await res.arrayBuffer();
  return bufferToDataUrl(buf, "audio/mpeg");
}

async function elevenLabsSoundscape(apiKey: string): Promise<string> {
  const url = new URL("https://api.elevenlabs.io/v1/sound-generation");
  url.searchParams.set("output_format", "mp3_44100_128");

  const res = await fetch(url.toString(), {
    method: "POST",
    headers: {
      "xi-api-key": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      text: "Soft, warm ambient music: gentle piano chords, airy pads, slow tempo, hopeful and peaceful mood, no percussion hits, suitable as background under spoken narration for a healing picture book.",
      model_id: "eleven_text_to_sound_v2",
      loop: true,
      duration_seconds: 30,
      prompt_influence: 0.35,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`ElevenLabs sound generation failed (${res.status}): ${errText}`);
  }

  const buf = await res.arrayBuffer();
  return bufferToDataUrl(buf, "audio/mpeg");
}

function buildFullImagePrompt(
  scene: ScenePlan,
  style: ArtStyle,
  refinedAvatarDescription: string,
  supportingCharacters: SupportingCharacter[]
): string {
  const bible = buildCharacterBibleBlock(
    refinedAvatarDescription,
    supportingCharacters
  );
  const suffix = imagePromptSuffix(style);
  return `${scene.imagePrompt.trim()}\n\n${bible}\n\n${suffix}`;
}

export async function POST(req: Request) {
  let body: {
    openaiKey?: string;
    elevenLabsKey?: string;
    style?: ArtStyle;
    scenes?: ScenePlan[];
    refinedAvatarDescription?: string;
    supportingCharacters?: SupportingCharacter[];
    voiceId?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const openaiKey = body.openaiKey?.trim();
  const elevenKey = body.elevenLabsKey?.trim();
  const style = body.style;
  const scenes = body.scenes;
  const refinedAvatarDescription = body.refinedAvatarDescription?.trim() ?? "";
  const supportingCharacters = Array.isArray(body.supportingCharacters)
    ? body.supportingCharacters
    : [];
  const voiceId = body.voiceId?.trim() || DEFAULT_VOICE;

  if (!openaiKey) {
    return NextResponse.json({ error: "OpenAI API key is required." }, { status: 400 });
  }
  if (!elevenKey) {
    return NextResponse.json({ error: "ElevenLabs API key is required." }, { status: 400 });
  }
  if (!style || !scenes || scenes.length !== 8) {
    return NextResponse.json(
      { error: "Eight scenes and art style are required." },
      { status: 400 }
    );
  }
  if (refinedAvatarDescription.length < 40) {
    return NextResponse.json(
      {
        error:
          "Refined avatar description is missing or too short. Regenerate the 8-scene outline first.",
      },
      { status: 400 }
    );
  }

  const openai = new OpenAI({ apiKey: openaiKey });

  try {
    // Only one ElevenLabs call here (BGM) while images generate — avoids 1+8=9 concurrent EL requests.
    const [bgmDataUrl, imageRows] = await Promise.all([
      elevenLabsSoundscape(elevenKey),
      Promise.all(
        scenes.map(async (scene) => {
          const fullPrompt = buildFullImagePrompt(
            scene,
            style,
            refinedAvatarDescription,
            supportingCharacters
          );
          const img = await openai.images.generate({
            model: IMAGE_MODEL,
            prompt: fullPrompt.slice(0, 32000),
            size: "1536x1024",
            quality: "medium",
            n: 1,
          });
          const b64 = img.data?.[0]?.b64_json;
          if (!b64) throw new Error("No image data from the image model.");
          return {
            sceneNumber: scene.sceneNumber,
            imageDataUrl: `data:image/png;base64,${b64}`,
          };
        })
      ),
    ]);

    const narrationRows = await mapInBatches(
      scenes,
      ELEVENLABS_MAX_CONCURRENT,
      async (scene) => {
        const narrationAudioUrl = await elevenLabsTts(
          elevenKey,
          voiceId,
          scene.narration
        );
        return { sceneNumber: scene.sceneNumber, narrationAudioUrl };
      }
    );

    const imageByScene = new Map(
      imageRows.map((r) => [r.sceneNumber, r.imageDataUrl])
    );
    const audioByScene = new Map(
      narrationRows.map((r) => [r.sceneNumber, r.narrationAudioUrl])
    );

    const pages = scenes.map((s) => ({
      ...s,
      imageDataUrl: imageByScene.get(s.sceneNumber),
      narrationAudioUrl: audioByScene.get(s.sceneNumber),
    }));

    return NextResponse.json({
      backgroundMusicUrl: bgmDataUrl,
      pages,
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 502 });
  }
}
