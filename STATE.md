# Build State

| Field | Value |
| --- | --- |
| Project | Word Practice — ESL Pronunciation Coach |
| Started | 2026-10-31 18:06:08 UTC |
| Completed | 2026-10-31 18:16:33 UTC |
| Duration | **10m 25s** (625.2 seconds) |
| Harness | OpenCode 2.2.5 |
| Model | DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) |
| Session | `ses_e6cdc100effeUsFm8ov5Bn2BiU` |
| Repository | <https://github.com/somphol/word-practice> |
| Live demo | <https://somphol.github.io/word-practice/> |

## Token usage

| Metric | Tokens |
| --- | ---: |
| Input | 77,705 |
| Output | 33,354 |
| Reasoning | 27,613 |
| **Total (input + output + reasoning)** | **138,672** |
| Cache read | 2,512,640 |
| Cache write | 1,048 |
| Total including cache | 2,652,360 |

> Snapshot taken from the OpenCode session record when the build state was packaged. Committing these state files and the final response are outside this snapshot.

## What was built

A three-file ESL pronunciation app with no dependencies or build step:

- **`index.html`** — semantic app shell, four accessible tabs, the practice panel, and the word-grid container.
- **`style.css`** — an indigo/slate design system with light and dark themes, soft gradients, card shadows, responsive grids, and motion that respects `prefers-reduced-motion`.
- **`script.js`** — 80 words across four categories, tab and card navigation, native TTS at 0.8× speed, native STT pronunciation matching, local stats, keyboard shortcuts, and graceful fallbacks when browser APIs are unavailable.

A headless Chrome pass verified 20 rendered word cards, tab switching, active-card state, theme switching, and a 390 px layout with no horizontal overflow. The published site and all assets return HTTP 200.

## Scope notes

- Microphone recognition uses the browser’s Web Speech API and requires HTTPS or localhost, plus microphone permission.
- The app stores only theme and practice stats in `localStorage`; it never records or stores audio.
- GitHub Pages is served from the `main` branch at the repository root.

## Credits

Built with [OpenCode](https://opencode.ai) and **DeepSeek V4.1 Flash**. The interface, word data, speech features, documentation, screenshots, and publishing checks were completed in a single agent session.
