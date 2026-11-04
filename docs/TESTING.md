# Testing

## Status of this release

| Evidence | When | Result |
| --- | --- | --- |
| Live Pages probe (`curl`) | 2026-11-03 | **200** |
| Headless Chromium render, `file://` | 2026-11-03 | **20 word cards, "Cat" active** |
| Headless screenshot (1200 × 900) | 2026-11-03 | **rendered, 378 KB PNG** |
| Manual microphone pass (§3) | — | **Not run** in this release |
| Safari / Firefox / mobile devices | — | **Not verified** |

The documentation commit changed Markdown only. The headless pass proves the shell,
tabs and word grid render; it cannot grant a microphone or run `SpeechRecognition`, so
the two features this app exists for are **unverified by automation**.

There is no CI and no test runner. `STATE.md` records an earlier headless pass from the
original build; treat it as history, not as a current result.

## 1. Commands

```bash
cd ~/Projects/word-practice

# live
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/word-practice/

# headless render: expect 20
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --virtual-time-budget=3000 \
  --dump-dom "file://$PWD/index.html" | grep -c 'class="word-card'

# screenshot: expect a large, non-blank PNG
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --virtual-time-budget=3000 \
  --window-size=1200,900 --screenshot=/tmp/wp.png \
  "file://$PWD/index.html"
ls -l /tmp/wp.png

# interactive pass (microphone needs localhost or https)
python3 -m http.server 8000     # http://localhost:8000/
```

## 2. Static results (2026-11-03)

- Live site: HTTP `200`.
- Headless Chromium: `class="word-card"` appears **20** times; the practice panel shows
  `id="currentWord" … Cat`; the hero heading and tabs are present.
- Screenshot: 1200 × 900, **378,473 bytes** — the page painted, it is not a blank frame.
- External requests at load: Google Fonts CSS and font files. If a check depends on
  offline behaviour, block the network and expect system-font fallback.

## 3. Manual matrix

Run over `http://localhost:8000/` in desktop Chromium, with a working microphone. Add a
Safari pass if you can.

| # | Check | Expected |
| --- | --- | --- |
| 1 | Load the page | four tabs, 20 cards, one active word, panel matches |
| 2 | Click each tab | 20 cards change to that group; panel resets to that group's first word |
| 3 | Click **Listen** | word spoken slowly (0.8×), orb animates, caption changes |
| 4 | Click a card, then **Listen** | that word is spoken and becomes active |
| 5 | Arrow keys on tabs | focus moves, `Home`/`End` jump, activation works |
| 6 | Arrow keys in the grid | moves between cards, `Home`/`End` jump |
| 7 | Press `L`, `T`, `N` | listen, test, next word — none fire while typing in a field |
| 8 | **Test pronunciation**, say the word | ✅, transcript shown, correct +1, tries +1, streak +1 |
| 9 | Say a different word | ❌, streak resets to 0, tries +1 |
| 10 | Say "the cat" for **Cat** | passes (phrase containment) |
| 11 | Stay silent for ~9 s | attempt ends with a friendly "didn't catch that" |
| 12 | Deny microphone permission | clear blocked-permission message, no uncaught error |
| 13 | Reload | stats persist; reset button zeroes them |
| 14 | Toggle theme, reload | theme persists, no flash of the wrong theme |
| 15 | Set OS to dark, first visit | dark theme chosen automatically |
| 16 | 390 px viewport | single column, no horizontal scroll |
| 17 | Enable reduced motion | pulses/animations subdued |
| 18 | Firefox | audio works, Test is disabled with a support explanation |

## 4. Failure triage

- **Test button does nothing** — `sttSupported` false (Firefox) or the page is not on
  `https`/`localhost`.
- **Immediate "blocked" error** — site permission denied at the browser level, not an app
  bug.
- **Stale result appears after a retry** — the `recognitionToken` guard was removed or
  not incremented in `startRecognition`.
- **Recognition never ends** — the 9 s timeout was cleared or the `onend` path skipped.
- **Wrong theme flash** — the inline head script moved after `style.css`.
- **Fonts look wrong offline** — expected; Google Fonts is a live dependency.

## 5. Not verified

- Real microphones and accents; recognition quality is the browser's.
- Safari on macOS/iOS, Chrome on Android, Firefox beyond the no-STT path.
- Screen-reader output beyond the ARIA attributes in the markup.
- Long sessions and repeated recognition attempts (no soak test).
