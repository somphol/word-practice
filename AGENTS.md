# AGENTS.md — WORD PRACTICE

> Handoff for the next maintainer or agent. Rebuild detail is in
> [docs/REPRODUCTION.md](docs/REPRODUCTION.md); the technical map is
> [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## 1. What this is

A three-file **ESL pronunciation coach**: 80 curated words in four sound groups, spoken
slowly with the browser's `SpeechSynthesis` API, then checked against the learner's
speech with `SpeechRecognition` / `webkitSpeechRecognition`. Correct answers, tries and
the current streak are kept in `localStorage`; theme follows the system and is
remembered. No backend, accounts, analytics or audio storage.

It is **not** an offline app (the page fetches Google Fonts, and Chrome's recogniser may
use a network service), not a recorder, and not a general pronunciation scorer — the
check is token matching, not phonetics. Live copy:
<https://somphol.github.io/word-practice/>. Local master: `~/Projects/word-practice`.
Current release: **v1.0.0**.

## 2. Commands

```bash
cd ~/Projects/word-practice

# run — microphone needs a secure context, so use localhost
python3 -m http.server 8000        # http://localhost:8000/
#    file:// opens the UI but SpeechRecognition will not work

# verify (macOS, Chrome installed)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --virtual-time-budget=3000 \
  --dump-dom "file://$PWD/index.html" | grep -c 'class="word-card'
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/word-practice/

# deploy — Pages serves main / root; no workflow
git push origin main
```

The full matrix, including the microphone checks headless cannot run, is in
[docs/TESTING.md](docs/TESTING.md). There is no CI and no test runner.

## 3. Architecture

| File | Lines | Role |
| --- | --- | --- |
| `index.html` | 242 | shell: meta/OG tags, pre-paint theme script, tabs, practice panel, word grid, footer |
| `style.css` | 1,719 | indigo/slate design system, light/dark tokens, layout, motion |
| `script.js` | 912 | word data, tabs, TTS, STT, matching, stats, shortcuts |

Order matters: the inline theme script runs **before** `style.css` links, and
`script.js` loads at the end of `<body>` with no `defer` needed.

`script.js` sections, in order: categories (12) → constants and feature detection
(~61) → DOM refs (~80) → `state` (~117) → theme → stats → feedback/orb → tabs and grid →
`selectWord` / `activateCategory` → speech synthesis → normalisation and matching →
recognition lifecycle → keyboard shortcuts → `bindEvents` → init.

Key mechanics:

- **Words** — `CATEGORIES` holds four groups (`rhymes`, `initial`, `vowels`, `final`),
  each with exactly 20 words. `CATEGORY_KEYS` fixes tab order.
- **TTS** — `speakWord()` cancels pending speech, builds a `SpeechSynthesisUtterance`
  with `lang = "en-US"` and `rate = SPEECH_RATE` (0.8), prefers an installed English
  voice via `pickEnglishVoice()`, and reports failure through feedback if the API is
  missing.
- **STT** — `startRecognition()` / `stopRecognition()` treat recognition as one-shot:
  `RECOGNITION_TIMEOUT` (9 s) ends the attempt, and every run carries a
  `recognitionToken` so late callbacks from a previous attempt are ignored.
- **Matching** — `normalizeSpeech()` lowercases, applies NFKD, strips everything except
  `a-z`, `'` and spaces; `matchesWord()` accepts an exact match, a compact match ignoring
  punctuation, or the target appearing as a whole token in a phrase ("the cat").
- **Stats** — `{correct, tries, streak}` only. A correct answer increments all three; a
  wrong one increments `tries` and resets `streak` to 0.
- **Storage** — `word-practice.theme`, `word-practice.stats.v1`. Both reads and writes
  are wrapped in `try/catch`; private mode degrades to defaults.
- **Feature detection** — `ttsSupported` and `sttSupported` are computed once and drive
  the support pill and disabled states.

## 4. Decisions and constraints

- **Browser-native speech only.** No cloud API, key or SDK. Adding one is a product
  change, not a refactor.
- **Secure context is a requirement.** Microphone access needs `https://` or
  `localhost`; `file://` is a UI-only preview. Do not "fix" this in code.
- **One-shot recognition with a hard timeout.** Continuous listening would drain battery
  and confuse the feedback state. Keep the token guard or stale results will leak into
  new attempts.
- **Matching is intentionally permissive** (phrase containment) and casing/punctuation
  insensitive. Tightening it will reject valid learners.
- **Exactly 20 words per group.** The UI copy, tests and README all state 20.
- **Theme set before paint.** The inline head script must stay before the stylesheet.
- **Google Fonts are a live dependency.** The page requests Inter and Fraunces from
  `fonts.googleapis.com`; without a network the layout falls back to system fonts but
  still works. Do not claim the app is fully offline.

## 5. Known issues

- **Not offline**: Google Fonts are fetched at runtime, and Chrome's speech recognition
  may use a network service. `README.md`'s "no dependencies" line refers to build-time
  dependencies; the font requests contradict a strict reading.
- **Firefox has no STT** (`SpeechRecognition` missing). The UI degrades to listening and
  practice without scoring; it does not crash.
- Recognition accuracy depends on the browser's engine and the microphone; the app
  cannot distinguish a good attempt from a lucky transcript.
- Headless Chrome cannot exercise the microphone path; automated checks cover rendering
  only.
- `STATE.md` / `state.json` are build records from the original session, not runtime
  configuration. Do not wire them into the app.

## 6. Continuity

- Live: <https://somphol.github.io/word-practice/> (HTTP 200 at the time of writing).
- Pages: `main` branch, repository root, `.nojekyll` present, no Actions workflow.
- Local master copy: `~/Projects/word-practice`.
- Build record: `STATE.md` and `state.json` (session `ses_e6cdc100…`, 2026-10-31).
- Changelog: `CHANGELOG.md`.
