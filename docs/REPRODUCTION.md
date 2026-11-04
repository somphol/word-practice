# Reproduction book

How to rebuild **Word Practice** from scratch, or verify that a rebuild matches the
release. Read [ARCHITECTURE.md](ARCHITECTURE.md) first for the map.

> **The source is the truth.** The three files on `main` are the release. Rebuild only
> when they are lost or you are deliberately making a variant.

## 1. What is being reproduced

A browser-native **ESL pronunciation coach**:

- **Content** — 80 words in four groups of exactly 20: rhymes, starting sounds, vowel
  sounds, ending sounds.
- **Audio** — `SpeechSynthesisUtterance`, `en-US`, rate 0.8, with an installed English
  voice preferred.
- **Check** — one-shot `SpeechRecognition`/`webkitSpeechRecognition` attempt, 9 s
  timeout, transcript normalised and matched against the target word (exact, compact, or
  whole-token containment).
- **Stats** — correct, tries and streak in `localStorage`; reset control.
- **Shell** — four accessible tabs, practice panel, 20-card word grid, sound orb with
  live captions, support pill for missing APIs.
- **Presentation** — indigo/slate light and dark themes, responsive down to 390 px,
  reduced-motion support.
- **Delivery** — `index.html`, `style.css`, `script.js`, `favicon.svg`; no build step.
  GitHub Pages, `main` / root. Google Fonts loaded from the CDN.
- **Release** — v1.0.0.

## 2. Requirements matrix

| # | Requirement | Implementation | File |
| --- | --- | --- | --- |
| 1 | Four sound groups, 20 words each | `CATEGORIES`, `CATEGORY_KEYS` | `script.js` |
| 2 | Tabs with proper ARIA semantics | `role="tablist"`, `activateCategory`, arrow keys | `index.html`, `script.js` |
| 3 | Slow, clear playback | `speakWord`, `SPEECH_RATE = 0.8`, `pickEnglishVoice` | `script.js` |
| 4 | Pronunciation check | `startRecognition`, `finishRecognition` | `script.js` |
| 5 | Lenient matching | `normalizeSpeech`, `matchesWord` | `script.js` |
| 6 | Clear pass/fail feedback | `setFeedback`, `FEEDBACK_ICONS`, orb states | `script.js`, `style.css` |
| 7 | Stats persisted locally | `loadStats`/`saveStats`, `word-practice.stats.v1` | `script.js` |
| 8 | Theme follows system, then remembers | head script, `applyTheme` | `index.html`, `script.js` |
| 9 | Keyboard shortcuts | `handleShortcut` (`L`, `T`, `N`) + arrow navigation | `script.js` |
| 10 | Graceful degradation | `ttsSupported`, `sttSupported`, support pill, noscript | all |
| 11 | Static hosting over HTTPS | `.nojekyll`, `robots.txt`, `sitemap.xml`, Pages | repo root |

## 3. Build order

1. **Shell** — `index.html` with meta/OG, the pre-paint theme script, header, tabs,
   panel skeleton, stats, grid container, footer, noscript.
2. **Tokens** — light and dark custom properties, typography, spacing, then layout.
3. **Data** — `CATEGORIES` with 20 words per group, `CATEGORY_KEYS`.
4. **State and storage** — `state`, `loadStats`, `saveStats`, theme helpers.
5. **Navigation** — tabs (`activateCategory`), grid rendering (`renderWordGrid`), active
   selection (`selectWord`), next-word choice.
6. **TTS** — `pickEnglishVoice`, `speakWord`, `stopSpeech`, orb captions.
7. **STT** — feature detection, `startRecognition`, timeout and token guard,
   `stopRecognition`, `finishRecognition`, error mapping.
8. **Matching** — normalise and match before wiring the result into stats.
9. **Feedback and motion** — feedback panel, orb pulses, number bumps, reduced motion.
10. **Accessibility pass** — labels, live regions, focus management, contrast.
11. **Metadata and docs** — README, CHANGELOG, social card, sitemap, this book.

## 4. Acceptance checks

A rebuild is done when, over `http://localhost:8000/` in a desktop Chromium browser:

1. The four tabs render and switch groups; each group shows exactly 20 cards.
2. The active card and the practice panel agree, and the panel shows the word.
3. **Listen** speaks at a noticeably slow rate; the orb animates while speaking.
4. **Test pronunciation** requests the microphone, listens once, and ends on its own
   after a result or about 9 s.
5. Saying the word clearly gives ✅ with the transcript; saying something else gives ❌
   and the streak resets to 0.
6. Saying "the cat" when the target is "Cat" still passes.
7. Correct/tries/streak persist across reload; reset zeroes them.
8. Theme follows the OS on a first visit; toggling persists with no flash on reload.
9. `L`, `T`, `N` work; typing in a field does not trigger them.
10. Arrow keys move between tabs and cards; focus is visible.
11. At 390 px wide there is no horizontal scroll.
12. Denying microphone permission shows a friendly message, not an uncaught error.
13. Firefox (no STT) still renders and plays audio; the check is disabled with an
    explanation.

## 5. Provenance

| Item | Value |
| --- | --- |
| Initial build | `e08bab8` "Build Word Practice ESL pronunciation coach" |
| Build record | `3eecf7e`, refreshed `1404e02` (`STATE.md`, `state.json`) |
| Dark-mode contrast fix | `f17998d` |
| Social card + README header | `cb6648f` |
| Repo docs and community files | `f360c23` |
| Release docs | this commit (`AGENTS.md` + `docs/`) |
| Original session | `ses_e6cdc100…`, 2026-10-31, 11m 42s |
| License | MIT |

`CHANGELOG.md` and `STATE.md` are the historical records; do not restate token counts in
new files.
