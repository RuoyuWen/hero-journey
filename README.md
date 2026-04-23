# Luminaria — A book of what you saw

Turn a **Near-Death Experience** (NDE) into a quiet, illustrated picture book — in the experiencer's own words — to share with family and friends, or to keep for themselves. **`gpt-4.1`** segments the written account into scenes with a faithful-rewrite rule (no invention, no sanitising, no imposed arc), **`gpt-image-2`** draws one illustration per scene, **ElevenLabs** reads the narration aloud, and a soft loop of ambient sound sits underneath. The interface and generated text are **English**.

> The story is sacred source material. Luminaria does not add tunnels of light, deceased relatives, spiritual figures, or meaning-making that are not already in what you wrote.

---

## What Luminaria does — and doesn't

| Step | What happens |
|------|----------------|
| **Outline** | OpenAI segments your story into **4–10 scenes** (you choose, or let it pick). For each scene it writes a short title, a narration (a **faithful rewrite** of your own words — light punctuation and sentence-order edits only), and an illustrator's image prompt drawn only from imagery you described. It also writes a **protagonist model sheet** from your avatar notes and, if your text named recurring people, short descriptions of them. |
| **You edit** | Every title, narration, image prompt, book title, and dedication is editable on the outline page. A **Use my exact words** button resets all narration to your source text, split across the scenes. |
| **Illustrate** | **GPT Image 2** (`gpt-image-2`) renders one image per scene, using your chosen style and the character model sheet. |
| **Speak** | **ElevenLabs** text-to-speech reads each scene's narration. |
| **Music** | **ElevenLabs** `sound-generation` produces one **loopable** contemplative ambient bed under the voice. |
| **Play** | In-browser player: scene-by-scene images, text, **Play voice**, **Previous / Next**, BGM on/off and volume. |

**Explicit non-goals of the planner prompt:** no invented people / props / dialogue, no added spiritual or scientific framing, no redemption arc, no softening of hospital / pain / fear imagery, no translation.

---

## Tech stack

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **OpenAI** (`openai` SDK): `chat.completions` + JSON schema for planning (**`gpt-4.1`**); `images.generate` with **`gpt-image-2`** for illustrations
- **ElevenLabs** (HTTPS): text-to-speech + sound generation

---

## Repository layout

```
luminaria/
├── app/
│   ├── api/
│   │   ├── plan-story/route.ts    # POST — 4–10-scene outline (faithful rewrite)
│   │   └── generate-book/route.ts # POST — images + TTS + ambient bed
│   ├── layout.tsx
│   ├── page.tsx                   # Form, outline editor, scene-count toggle
│   └── globals.css
├── components/
│   └── PictureBookPlayer.tsx      # Carousel + audio controls
├── lib/
│   ├── prompts.ts                 # System prompts (faithful-rewrite rules)
│   └── types.ts                   # Shared types & art-style labels
├── package.json
├── .nvmrc                         # Suggested Node version (22)
└── README.md
```

---

## Prerequisites

- **Node.js** — **20.19+** or **22 LTS** recommended (see [Node.js](https://nodejs.org/)). With [nvm](https://github.com/nvm-sh/nvm) / [nvm-windows](https://github.com/coreybutler/nvm-windows), run `nvm use` in this directory.
- **OpenAI API key** — [platform.openai.com](https://platform.openai.com/); your account needs access to `gpt-image-2`.
- **ElevenLabs API key** — [elevenlabs.io](https://elevenlabs.io/) (TTS + sound generation enabled on your plan).

---

## Quick start

```bash
git clone <your-repo-url>
cd luminaria
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

1. **API keys** — Paste **OpenAI** and **ElevenLabs** keys. They live in `sessionStorage` and are sent only to this app's API routes when you generate. Optional: **ElevenLabs voice ID** (their sample voice is used if empty).
2. **Story** — Write what you remember, in English, in your own words. Include only what you actually remember; Luminaria will not add anything you did not write.
3. **Main character** — Describe how the protagonist looks so the illustrator keeps them recognisable across pages.
4. **Style** — Pick a picture-book style (watercolor, soft pastel, luminous dream, twilight ink, warm gouache, minimal ink wash).
5. **Scenes** — Let Luminaria choose between 4 and 10, or set an exact number.
6. **Prepare outline** — Review and edit every scene's title and narration. Press **Use my exact words** to reset narration to your source text. Write a dedication if you like.
7. **Generate illustrations & audio** — This can take several minutes (one image per scene + voiceovers + ambient bed). Keep the tab open.
8. **Play** — Use the player to move between scenes and control voice + background music.

---

## HTTP API (for integration)

### `POST /api/plan-story`

**Body (JSON)**

| Field | Type | Required |
|-------|------|----------|
| `openaiKey` | string | yes |
| `story` | string | yes |
| `avatarDescription` | string | yes |
| `style` | `"watercolor"` \| `"soft_pastel"` \| `"luminous_dream"` \| `"twilight_ink"` \| `"warm_gouache"` \| `"ink_wash"` | yes |
| `targetSceneCount` | integer 4–10 | optional (omit for auto) |
| `model` | string | optional (default **`gpt-4.1`**) |

**Response:** `{ plan: { bookTitle, dedication, refinedAvatarDescription, supportingCharacters, scenes: [...] } }` — `dedication` is returned as an empty string so the user can author it; `refinedAvatarDescription` is the illustrator's model sheet; `supportingCharacters` is an array of `{ roleLabel, visualDescription }` (0–6 entries). Each scene includes `sceneNumber`, `title`, `imagePrompt`, `narration`.

### `POST /api/generate-book`

**Body (JSON)**

| Field | Type | Required |
|-------|------|----------|
| `openaiKey` | string | yes |
| `elevenLabsKey` | string | yes |
| `style` | same as above | yes |
| `scenes` | array of 4–10 `ScenePlan` | yes |
| `voiceId` | string | optional |
| `refinedAvatarDescription` | string | yes (from latest plan) |
| `supportingCharacters` | array | optional (defaults to `[]`) |

**Response:** `{ backgroundMusicUrl, pages }` — data URLs (base64) for images and MP3 audio. Each image prompt includes the **character visual bible** (hero + supporting cast) for consistency.

---

## Configuration & limits

### ElevenLabs concurrency

Many plans allow **at most 5 concurrent** ElevenLabs API requests. This project:

1. Runs **one** sound-generation call in parallel with OpenAI image generation (only one ElevenLabs call in that phase).
2. Runs TTS in batches of up to 5 (`ELEVENLABS_MAX_CONCURRENT` in `app/api/generate-book/route.ts`).

If you still hit **429** / rate limits, lower that constant or upgrade your ElevenLabs plan. See [ElevenLabs — rate limiting & concurrency](https://elevenlabs.io/docs/eleven-api/resources/errors#rate-limiting-and-concurrency).

### OpenAI

- Planning uses **`gpt-4.1`** at low temperature (`0.4`) to discourage embellishment. Override via `model` in the request body if needed.
- Images use **`gpt-image-2`** at **`1536×1024`** (landscape), `quality: medium`; costs and provider rate limits apply.

---

## Editorial principles (baked into the prompts)

- **Faithful rewrite only.** Every noun and verb in the narration must be traceable to the user's text. Word order and punctuation may be adjusted for read-aloud flow; nothing else.
- **No invention.** No tunnels of light, deceased relatives, spiritual figures, dialogue, sensations, or scenes that the user did not write.
- **No imposed arc.** NDE accounts have their own shape; the planner follows the user's order instead of forcing a five-act or hero's-journey template.
- **No stance.** Luminaria does not frame the experience as scientific, religious, spiritual, or hallucinatory. It stays with the words you used.
- **Editable by default.** The outline page is the user's final edit surface before illustration and audio are generated.

---

## Security & production

- **Do not** ship a product where users paste API keys into the browser. Use server-side secrets, auth, and per-user quotas.
- This repo is intended for research / demos; treat keys like passwords.

---

## Troubleshooting

| Issue | What to try |
|-------|-------------|
| `npm WARN EBADENGINE` | Upgrade Node to **20.19+** or **22 LTS**. |
| ElevenLabs `concurrent_limit_exceeded` (429) | Already mitigated by batching; reduce `ELEVENLABS_MAX_CONCURRENT` or upgrade plan. |
| Long generation time | Expected: up to 10 `gpt-image-2` generations + voiceovers. Keep the tab open. |
| Planner drifted from your words | Edit each narration field on the outline page, or press **Use my exact words** to reset. Lower temperature / shorter stories help as well. |
| Empty or odd JSON from OpenAI | Retry; ensure the story is long enough and the key has access to the chosen model. |

---

## External documentation

- [OpenAI — Text generation](https://developers.openai.com/api/docs/guides/text)
- [OpenAI — Image generation (`gpt-image-2`)](https://developers.openai.com/api/docs/guides/image-generation)
- [ElevenLabs — Text to speech](https://elevenlabs.io/docs/api-reference/text-to-speech/convert)
- [ElevenLabs — Sound generation (`/v1/sound-generation`)](https://elevenlabs.io/docs/api-reference/text-to-sound-effects/convert)

---

## 中文简介

**Luminaria** 是一个让**濒死体验（NDE）**亲历者把自己的记忆变成一本安静绘本的网页应用，可以送给家人朋友，也可以自留。你用自己的话写下经历，**OpenAI（`gpt-4.1`）** 会把原文切成 **4–10 幕**（你可选或由它自动决定），每幕生成一段**忠实改写**的旁白（仅允许调整语序和标点，不增不减事实与意象）、一个插画提示，以及用于保持人物一致的角色模型描述；**`gpt-image-2`** 画图、**ElevenLabs** 配音和环境音，最后在浏览器里作为有声绘本播放。

关键约束已写进 Prompt：不虚构人物/对话/场景、不加光隧道或已故亲人之类未在原文出现的意象、不强行升华或"疗愈化"、不给体验下科学或宗教定论。大纲页的每一段旁白都是可编辑的，还有一个**"用我的原话"**按钮，可以把全部旁白一键重置为你原文按段落的等分切片。

本地运行：`npm install` → `npm run dev` → 浏览器打开 http://localhost:3000 。API Key 目前存在 **sessionStorage**，仅适合演示；正式产品请把密钥放在服务端。

---

## License

Add a license file if you distribute this project (e.g. MIT).
