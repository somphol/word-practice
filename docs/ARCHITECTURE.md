# Architecture

Three files and a favicon. No framework, no bundler, no package.json. This document maps
the moving parts so a change does not require reading 2,600 lines.

## 1. File layout

| File | Lines | Contents |
| --- | --- | --- |
| `index.html` | 242 | meta + Open Graph, pre-paint theme script, header, four tabs, practice panel, stats, word-grid container, footer, noscript |
| `style.css` | 1,719 | design tokens per theme, layout, components, animations, responsive rules, reduced motion |
| `script.js` | 912 | data, state, DOM refs, theme, stats, feedback, tabs, speech, matching, shortcuts |
| `favicon.svg` | — | app icon |

Load order: inline theme script → `style.css` → body → `script.js` (plain `<script>`, last
line of body). Nothing is deferred; the script queries DOM nodes that already exist.

## 2. Data

```js
CATEGORIES = {
  rhymes:  { label, hint, words: [ /* 20 */ ] },
  initial: { … }, vowels: { … }, final: { … }
}
CATEGORY_KEYS = ["rhymes", "initial", "vowels", "final"]   // tab order
```

Words are plain strings. There are no ids, translations or per-word metadata; the word
itself is the key. The same word may appear in more than one group (`Light` is in
`rhymes` and `vowels`) and that is intentional.

## 3. State and storage

```js
state = {
  category: "rhymes",
  word: "",
  listening: false,
  recognition: null,       // active SpeechRecognition instance
  recognitionToken: 0,     // guards against stale callbacks
  activeUtterance: null,
  stats: loadStats(),      // { correct, tries, streak }
  gridTimer: null,
  pulseTimers: { correct: null, wrong: null }
}
```

| Key | Value |
| --- | --- |
| `word-practice.theme` | `"light"` or `"dark"` |
| `word-practice.stats.v1` | JSON `{correct, tries, streak}` |

`loadStats()` clamps to non-negative numbers and returns zeros for missing or corrupt
data. Every storage access is guarded; a blocked `localStorage` means the app runs but
forgets.

## 4. Theme

The inline head script reads the saved theme, falls back to
`prefers-color-scheme`, and sets `document.documentElement.dataset.theme` before the
stylesheet loads. `style.css` switches token blocks on that attribute. `applyTheme()`
also updates the `theme-color` meta tag so mobile browser chrome matches. `toggleTheme()`
persists the new value.

## 5. Speech synthesis (TTS)

`speakWord()`:

1. Bails with a feedback message if `ttsSupported` is false.
2. Stops any active recognition (silently) and cancels pending utterances.
3. Builds `SpeechSynthesisUtterance(state.word)` with `lang = "en-US"`, `rate = 0.8`,
   `pitch = 1`, `volume = 1`.
4. Prefers an installed English voice from `pickEnglishVoice()`; if found, adopts its
   `lang`.
5. Drives the orb captions and feedback through `onstart` / `onend` / `onerror`.

`stopSpeech()` cancels and clears the active utterance.

## 6. Speech recognition (STT)

`RecognitionConstructor = SpeechRecognition || webkitSpeechRecognition`, evaluated once.
`sttSupported` gates the Test button and the support pill.

`startRecognition()`:

1. Refuses if unsupported, if already listening, or if there is no current word.
2. Creates a new recogniser, `lang = "en-US"`, `interimResults = false`, single result.
3. Increments `recognitionToken` and captures it; every callback exits immediately if the
   token no longer matches.
4. Starts an **9 s** timeout (`RECOGNITION_TIMEOUT`) that aborts the attempt.
5. `onresult` compares with `matchesWord(heard, state.word)`; `onerror` maps the error
   code to friendly copy via `recognitionErrorMessage`; `onend` finishes via
   `finishRecognition`.

`finishRecognition(token, result)` is the single exit point: it clears listeners,
restores `listening`/orb state, updates stats, and shows ✅ or ❌ with the transcript.

Error mapping includes blocked permission, no microphone, network, no speech and
aborted.

## 7. Matching

```js
normalizeSpeech(v) // lowercase → NFKD → keep [a-z' ] → collapse spaces
matchesWord(heard, target):
  exact normalized equality
  OR compact equality (punctuation removed)
  OR target is one whole token of the heard phrase   // "the cat" passes
```

This is deliberately lenient. There is no phoneme comparison and no confidence score.

## 8. Stats and feedback

- `renderStats()` writes `correct`, `tries`, `streak`; `bumpNumber()` animates a value
  change.
- `setFeedback(type, title, text)` sets the panel state (`info`, `correct`, `warning`,
  `idle`) and the icon from `FEEDBACK_ICONS`.
- `pulseOrb(className)` / `setSpeaking` / `setListening` drive the central sound orb and
  its caption (`ORB_CAPTIONS`).
- The reset control zeroes all three counters and rewrites storage.

## 9. Navigation and keyboard

- Tabs are real buttons with `role="tab"` semantics; `activateCategory()` renders the
  grid.
- `renderWordGrid()` rebuilds 20 cards; `selectWord()` marks one active and updates the
  panel.
- `chooseNextWord()` picks a random word in the current category (avoiding an immediate
  repeat).
- Keys: `L` listen, `T` test, `N` next — ignored while typing in an input.
  Arrow/Home/End move between tabs and cards; focus is managed explicitly.

## 10. Change guide

| To change… | Touch |
| --- | --- |
| Word list | `CATEGORIES` (keep 20 per group and update README) |
| Speaking speed | `SPEECH_RATE` |
| Recognition window | `RECOGNITION_TIMEOUT` |
| Matching strictness | `normalizeSpeech` / `matchesWord` |
| Palette or type | token blocks in `style.css`, plus the Google Fonts link in `index.html` |
| Stats fields | `loadStats`/`saveStats`/`renderStats` and bump the `stats` key version |
| Shortcuts | `handleShortcut()` |
