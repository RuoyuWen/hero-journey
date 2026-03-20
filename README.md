# Hero Journey — Healing Picture Book

Turn a short personal story into an **8-scene spoken picture book**: AI-written narration, **DALL·E 3** illustrations, **ElevenLabs** voiceovers, and soft **looping background audio**. The experience is designed to feel **warm, dignified, and hopeful**—especially for **stroke survivors** and people close to them. The interface and generated text are **English**.

---

## Features

| Step | What happens |
|------|----------------|
| **Plan** | OpenAI expands your story into **8 scenes**, each with an image prompt + narration script (structured JSON). |
| **Illustrate** | **DALL·E 3** renders one image per scene, following your chosen art style and avatar description. |
| **Speak** | **ElevenLabs** text-to-speech reads each scene’s narration. |
| **Music** | **ElevenLabs** `sound-generation` produces one **loopable** ambient bed under the voice. |
| **Play** | In-browser player: scene-by-scene images, text, **Play voice**, **Previous / Next**, BGM on/off and volume. |

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **OpenAI** (`openai` SDK): `chat.completions` + JSON schema for planning; `images.generate` (DALL·E 3) for art
- **ElevenLabs** (HTTPS): Text-to-speech + sound generation

---

## Repository layout

```
HeroJourney/
├── app/
│   ├── api/
│   │   ├── plan-story/route.ts    # POST — 8-scene outline
│   │   └── generate-book/route.ts # POST — images + TTS + BGM
│   ├── layout.tsx
│   ├── page.tsx                   # Main form + flow
│   └── globals.css
├── components/
│   └── PictureBookPlayer.tsx      # Carousel + audio controls
├── lib/
│   ├── prompts.ts                 # System prompts (tone, style)
│   └── types.ts                   # Shared types & style labels
├── package.json
├── .nvmrc                         # Suggested Node version (22)
└── README.md
```

---

## Prerequisites

- **Node.js** — **20.19+** or **22 LTS** recommended (see [Node.js](https://nodejs.org/)). Older 20.x may show an `EBADENGINE` warning during `npm install`; upgrading removes it. With [nvm](https://github.com/nvm-sh/nvm) / [nvm-windows](https://github.com/coreybutler/nvm-windows), run `nvm use` in this directory (see `.nvmrc`).
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com/)
- **ElevenLabs API key** — [elevenlabs.io](https://elevenlabs.io/) (TTS + sound generation enabled on your plan)

---

## Quick start

```bash
git clone <your-repo-url>
cd HeroJourney
npm install
npm run dev
```

Open **http://localhost:3000**.

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development server (hot reload) |
| `npm run build` | Production build |
| `npm run start` | Run production server (after `build`) |
| `npm run lint` | ESLint (Next.js config) |

---

## How to use (in the app)

1. **API keys** — Paste **OpenAI** and **ElevenLabs** keys. They are stored in **sessionStorage** in the browser and sent only to **this app’s API routes** when you generate. Optional: **ElevenLabs voice ID** (defaults to the sample ID from their docs if empty).
2. **Story** — Your narrative in English (a few sentences or more).
3. **Avatar** — Describe the main character so visuals stay consistent across scenes.
4. **Style** — Choose a picture-book style (watercolor, pastel, etc.).
5. **Create 8-scene outline** — Review titles, image prompts, and narration.
6. **Generate illustrations & audio** — Wait (this can take **several minutes**; 8 images + 9 ElevenLabs calls).
7. **Play** — Use the player to move between scenes and control voice + background music.

---

## HTTP API (for integration)

### `POST /api/plan-story`

**Body (JSON)**

| Field | Type | Required |
|-------|------|----------|
| `openaiKey` | string | ✓ |
| `story` | string | ✓ |
| `avatarDescription` | string | ✓ |
| `style` | `"watercolor"` \| `"soft_pastel"` \| `"picture_book_flat"` \| `"warm_gouache"` \| `"ink_wash"` | ✓ |
| `model` | string | optional (default `gpt-4o-mini`) |

**Response:** `{ plan: { bookTitle, dedication, scenes: [...] } }` — 8 scenes with `sceneNumber`, `title`, `imagePrompt`, `narration`.

### `POST /api/generate-book`

**Body (JSON)**

| Field | Type | Required |
|-------|------|----------|
| `openaiKey` | string | ✓ |
| `elevenLabsKey` | string | ✓ |
| `style` | same as above | ✓ |
| `scenes` | array (length 8) | ✓ |
| `voiceId` | string | optional |

**Response:** `{ backgroundMusicUrl, pages }` — data URLs (base64) for images and MP3 audio.

---

## Configuration & limits

### ElevenLabs concurrency

Many plans allow **at most 5 concurrent** ElevenLabs API requests. This project:

1. Runs **one** sound-generation call **in parallel with** OpenAI image generation (only **one** ElevenLabs call in that phase).
2. Runs TTS in **batches of up to 5** (`ELEVENLABS_MAX_CONCURRENT` in `app/api/generate-book/route.ts`).

If you still hit **429** / rate limits, lower that constant (e.g. to `3`) or upgrade your ElevenLabs plan. See [ElevenLabs — rate limiting & concurrency](https://elevenlabs.io/docs/eleven-api/resources/errors#rate-limiting-and-concurrency).

### OpenAI

- Planning uses **`gpt-4o-mini`** by default (change in `plan-story` if needed).
- Images use **`dall-e-3`** at `1024×1024`; costs and provider rate limits apply.

---

## Security & production

- **Do not** ship a product where users paste API keys into the browser. Use **server-side secrets**, auth, and per-user quotas.
- This repo is intended for **research / demos**; treat keys like passwords.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| `npm WARN EBADENGINE` for `eslint-visitor-keys` | Upgrade Node to **20.19+** or **22 LTS**. |
| ElevenLabs `concurrent_limit_exceeded` (429) | Already mitigated by batching; reduce `ELEVENLABS_MAX_CONCURRENT` or upgrade plan. |
| Long generation time | Expected: 8 DALL·E images + many audio calls. Keep the tab open. |
| Empty or odd JSON from OpenAI | Retry; ensure the story is long enough and the key has access to the chosen model. |

---

## External documentation

- [OpenAI — Text generation](https://developers.openai.com/api/docs/guides/text)
- [OpenAI — Images & vision](https://developers.openai.com/api/docs/guides/images-vision)
- [ElevenLabs — Text to speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs — Sound generation (`/v1/sound-generation`)](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)

---

## 中文简介

**Hero Journey** 是一个网页应用：输入个人故事与角色、画风后，由 **OpenAI** 扩写为 **8 幕**绘本大纲（旁白 + 配图提示），再生成 **DALL·E 3** 插图、**ElevenLabs** 语音与一段可循环的**背景音乐**，最后在浏览器里以「有声绘本」形式播放。面向脑中风康复者及家属，语气强调**温馨、有尊严、励志**；界面与生成内容为**英文**。

本地运行：`npm install` → `npm run dev` → 浏览器打开 http://localhost:3000 。API Key 目前存在 **sessionStorage**，仅适合演示；正式产品请把密钥放在服务端。

---

## License

Add a license file if you distribute this project (e.g. MIT).
