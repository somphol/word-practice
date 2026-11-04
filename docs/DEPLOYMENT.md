# Deployment

Hosted on **GitHub Pages** from the repository root. No build output, no workflow: the
committed files on `main` are what learners load.

- Live URL: <https://somphol.github.io/word-practice/>
- Repository: <https://github.com/somphol/word-practice>
- Source branch: `main`, folder `/` (root)
- Entry file: `index.html`
- Required context: **HTTPS** (Pages provides it) — microphone access depends on it

## 1. Deploy a change

```bash
cd ~/Projects/word-practice

# verify locally over localhost, not file://
python3 -m http.server 8000     # http://localhost:8000/
# run the matrix in docs/TESTING.md, including one microphone attempt

git add -A
git commit -m "…"
git push origin main
```

Confirm:

```bash
curl -s -o /dev/null -w '%{http_code}\n' https://somphol.github.io/word-practice/
```

Pages normally updates within a minute. Hard-refresh if the old build appears; there is
no service worker.

## 2. Repository settings that matter

| Setting | Value | Why |
| --- | --- | --- |
| Pages source | branch `main`, `/ (root)` | the app is three root files |
| Custom domain | none | default `*.github.io` host |
| Enforce HTTPS | **on** | speech recognition needs a secure context |
| Actions | none | no workflow exists |

`.nojekyll` must stay committed. On a custom domain you would also need to keep HTTPS
enabled, or the Test button stops working on anything but `localhost`.

## 3. Published files

Everything in the root is public: `index.html`, `style.css`, `script.js`, `favicon.svg`,
`screenshot.png`, `docs/social-card.png`, the Markdown docs (including `STATE.md`),
`state.json`, `robots.txt`, `sitemap.xml`.

There are no secrets, keys or environment variables. Note that the app makes two kinds of
network request:

1. **Google Fonts** (`fonts.googleapis.com`, `fonts.gstatic.com`) for Inter and Fraunces.
2. The **browser's speech service**, indirectly, when Chrome performs recognition.

Neither is configured here; both are browser/platform behaviour.

## 4. Rollback

```bash
git revert <bad-commit>        # preferred
git push origin main
```

A revert that breaks `style.css` or `script.js` is immediately live; there is no staging
environment. For anything risky, publish from a branch preview first or test with a
local server.

## 5. Caching

Pages serves static files with ETags and short caching. After a deploy, a stale
`script.js` is the usual symptom (old behaviour, new HTML). Hard-refresh or test in a
private window. The font CSS is cached by Google's CDN independently of your deploy.

## 6. Local versus production

- `file://` — UI renders, but microphone access is blocked and recognition will fail.
- `http://localhost` — treated as a secure context; the full flow works.
- `https://somphol.github.io/word-practice/` — the release configuration.

Document which one you tested; "works locally" over `file://` does not prove the mic
path.
