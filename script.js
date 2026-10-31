/* ==========================================================================
   Word Practice — ESL Pronunciation Coach
   Vanilla JavaScript: word data, tabs, speech synthesis, and speech recognition.
   ========================================================================== */

"use strict";

/* --------------------------------------------------------------------------
   Word data — 4 categories × exactly 20 words
   -------------------------------------------------------------------------- */

const CATEGORIES = {
  rhymes: {
    label: "Rhymes",
    hint: "Listen for the matching end sound — then say it back.",
    words: [
      "Cat", "Hat", "Bat", "Mat", "Rat",
      "Day", "Say", "Play", "Ray", "Way",
      "Light", "Night", "Bright", "Sight", "Flight",
      "Cold", "Hold", "Bold", "Gold", "Told"
    ]
  },
  initial: {
    label: "Starting sounds",
    hint: "Focus on the first consonant or blend as you begin the word.",
    words: [
      "Blue", "Chair", "Fast", "Green", "House",
      "Jump", "Kite", "Light", "Mouse", "Nest",
      "Play", "Quick", "Read", "Smile", "Train",
      "Voice", "Water", "Yellow", "Zebra", "Sheep"
    ]
  },
  vowels: {
    label: "Vowel sounds",
    hint: "Short and long vowel sounds, side by side. Keep them clean and open.",
    words: [
      "Cat", "Cake", "Bed", "Bee", "Pig",
      "Bike", "Pot", "Bone", "Cup", "Tube",
      "Map", "Rain", "Net", "Tree", "Sit",
      "Light", "Hot", "Boat", "Bus", "Moon"
    ]
  },
  final: {
    label: "Ending sounds",
    hint: "Land the final consonant or blend clearly — don’t let it fade.",
    words: [
      "Bank", "Fast", "Hand", "Milk", "Jump",
      "Desk", "Camp", "Tent", "Bulb", "Wolf",
      "Nest", "Risk", "Pond", "Gift", "Belt",
      "Lamp", "Sand", "Task", "Pink", "Salt"
    ]
  }
};

const CATEGORY_KEYS = ["rhymes", "initial", "vowels", "final"];

/* --------------------------------------------------------------------------
   Constants and feature detection
   -------------------------------------------------------------------------- */

const SPEECH_RATE = 0.8;
const RECOGNITION_TIMEOUT = 9000;
const STORAGE_KEYS = {
  theme: "word-practice.theme",
  stats: "word-practice.stats.v1"
};

const ttsSupported =
  typeof window.speechSynthesis !== "undefined" &&
  typeof window.SpeechSynthesisUtterance === "function";

const RecognitionConstructor =
  window.SpeechRecognition || window.webkitSpeechRecognition;
const sttSupported = typeof RecognitionConstructor === "function";

/* --------------------------------------------------------------------------
   DOM references
   -------------------------------------------------------------------------- */

const refs = {
  html: document.documentElement,
  themeToggle: document.getElementById("themeToggle"),
  themeMeta: document.querySelector('meta[name="theme-color"]'),
  browserPill: document.getElementById("browserPill"),
  browserPillText: document.getElementById("browserPillText"),

  panel: document.getElementById("practicePanel"),
  categoryChip: document.getElementById("categoryChip"),
  wordPosition: document.getElementById("wordPosition"),
  currentWord: document.getElementById("currentWord"),
  categoryHint: document.getElementById("categoryHint"),

  listenBtn: document.getElementById("listenBtn"),
  testBtn: document.getElementById("testBtn"),
  nextBtn: document.getElementById("nextBtn"),
  shuffleBtn: document.getElementById("shuffleBtn"),

  feedback: document.getElementById("feedback"),
  feedbackIcon: document.getElementById("feedbackIcon"),
  feedbackTitle: document.getElementById("feedbackTitle"),
  feedbackText: document.getElementById("feedbackText"),

  soundOrb: document.getElementById("soundOrb"),
  orbCaption: document.getElementById("orbCaption"),
  correctCount: document.getElementById("correctCount"),
  attemptCount: document.getElementById("attemptCount"),
  streakCount: document.getElementById("streakCount"),
  resetStats: document.getElementById("resetStats"),

  wordGrid: document.getElementById("wordGrid")
};

/* --------------------------------------------------------------------------
   Application state
   -------------------------------------------------------------------------- */

const state = {
  category: "rhymes",
  word: "",
  listening: false,
  recognition: null,
  recognitionToken: 0,
  activeUtterance: null,
  stats: loadStats(),
  gridTimer: null,
  pulseTimers: { correct: null, wrong: null }
};

/* --------------------------------------------------------------------------
   Theme
   -------------------------------------------------------------------------- */

function getSavedTheme() {
  try {
    return localStorage.getItem(STORAGE_KEYS.theme);
  } catch (error) {
    return null;
  }
}

function applyTheme(theme) {
  const isDark = theme === "dark";
  refs.html.dataset.theme = isDark ? "dark" : "light";

  if (refs.themeMeta) {
    refs.themeMeta.setAttribute("content", isDark ? "#0a1020" : "#4f46e5");
  }

  if (refs.themeToggle) {
    const label = `Switch to ${isDark ? "light" : "dark"} theme`;
    refs.themeToggle.setAttribute("aria-label", label);
    refs.themeToggle.title = label;
  }
}

function toggleTheme() {
  const next = refs.html.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    localStorage.setItem(STORAGE_KEYS.theme, next);
  } catch (error) {
    /* Storage can be unavailable; the theme still works for this visit. */
  }
}

/* --------------------------------------------------------------------------
   Stats
   -------------------------------------------------------------------------- */

function loadStats() {
  const empty = { correct: 0, tries: 0, streak: 0 };

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEYS.stats));
    if (!stored || typeof stored !== "object") return empty;

    return {
      correct: Number.isFinite(stored.correct) ? Math.max(0, stored.correct) : 0,
      tries: Number.isFinite(stored.tries) ? Math.max(0, stored.tries) : 0,
      streak: Number.isFinite(stored.streak) ? Math.max(0, stored.streak) : 0
    };
  } catch (error) {
    return empty;
  }
}

function saveStats() {
  try {
    localStorage.setItem(STORAGE_KEYS.stats, JSON.stringify(state.stats));
  } catch (error) {
    /* Non-critical: stats simply won't persist between visits. */
  }
}

function bumpNumber(element) {
  if (!element) return;
  element.classList.remove("bump");
  // Force a reflow so the animation can restart on consecutive updates.
  void element.offsetWidth;
  element.classList.add("bump");
  window.setTimeout(() => element.classList.remove("bump"), 320);
}

function renderStats(bumpedElement) {
  refs.correctCount.textContent = String(state.stats.correct);
  refs.attemptCount.textContent = String(state.stats.tries);
  refs.streakCount.textContent = String(state.stats.streak);

  if (bumpedElement) bumpNumber(bumpedElement);
}

/* --------------------------------------------------------------------------
   Browser support indicator
   -------------------------------------------------------------------------- */

function renderSupportPill() {
  let message = "Audio & mic ready";
  let warning = false;

  if (!ttsSupported && !sttSupported) {
    message = "Audio not supported";
    warning = true;
  } else if (!sttSupported) {
    message = "Audio ready · mic unavailable";
    warning = true;
  } else if (!ttsSupported) {
    message = "Mic ready · audio unavailable";
    warning = true;
  }

  refs.browserPillText.textContent = message;
  refs.browserPill.classList.toggle("is-warning", warning);
  refs.browserPill.title = sttSupported
    ? "Speech synthesis and microphone check are supported in this browser."
    : "This browser does not support the Web Speech recognition API. Try Chrome, Edge, or Safari for microphone practice.";

  if (!ttsSupported) {
    refs.listenBtn.disabled = true;
    refs.listenBtn.title = "Speech synthesis is not supported in this browser";
  }
}

/* --------------------------------------------------------------------------
   Feedback and visual state
   -------------------------------------------------------------------------- */

const FEEDBACK_ICONS = {
  idle: "💡",
  info: "🔊",
  listening: "👂",
  correct: "✅",
  wrong: "❌",
  warning: "⚠️"
};

const ORB_CAPTIONS = {
  idle: "Ready when you are",
  info: "Listen closely…",
  listening: "Listening… speak now",
  correct: "Nice work!",
  wrong: "Give it another try",
  warning: "Check your setup"
};

function setFeedback(type, title, text) {
  refs.feedback.className = `feedback is-${type}`;
  refs.feedbackIcon.textContent = FEEDBACK_ICONS[type] || FEEDBACK_ICONS.idle;
  refs.feedbackTitle.textContent = title;
  refs.feedbackText.textContent = text;

  if (ORB_CAPTIONS[type]) {
    refs.orbCaption.textContent = ORB_CAPTIONS[type];
  }
}

function pulseOrb(className) {
  const other = className === "is-correct" ? "is-wrong" : "is-correct";
  document.body.classList.remove(other);
  document.body.classList.add(className);

  window.clearTimeout(state.pulseTimers[className === "is-correct" ? "correct" : "wrong"]);
  state.pulseTimers[className === "is-correct" ? "correct" : "wrong"] = window.setTimeout(() => {
    document.body.classList.remove(className);
  }, 1200);
}

function setSpeaking(isSpeaking) {
  document.body.classList.toggle("is-speaking", isSpeaking);
}

function setListening(isListening) {
  state.listening = isListening;
  document.body.classList.toggle("is-listening", isListening);
}

/* --------------------------------------------------------------------------
   Word cards and category tabs
   -------------------------------------------------------------------------- */

function getTabs() {
  return Array.from(document.querySelectorAll(".tab"));
}

function getWords() {
  return CATEGORIES[state.category].words;
}

function renderWordGrid(activeWord) {
  const words = getWords();
  const fragment = document.createDocumentFragment();

  words.forEach((word, index) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "word-card";
    card.dataset.word = word;
    card.style.setProperty("--i", String(index));
    card.setAttribute("aria-pressed", word === activeWord ? "true" : "false");
    card.setAttribute("aria-label", `Practice ${word}`);

    if (word === activeWord) card.classList.add("is-active");

    const text = document.createElement("span");
    text.className = "word-text";
    text.textContent = word;

    const speaker = document.createElement("span");
    speaker.className = "word-speaker";
    speaker.setAttribute("aria-hidden", "true");
    speaker.innerHTML =
      '<svg viewBox="0 0 20 20" fill="none">' +
      '<path d="M3.5 7.6h2.7L10 4.5v11l-3.8-3.1H3.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/>' +
      '<path d="M12.6 7.2a3.6 3.6 0 0 1 0 5.6M14.7 5.1a6.4 6.4 0 0 1 0 9.8" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>' +
      "</svg>";

    card.append(text, speaker);
    card.addEventListener("click", () => selectWord(word, { speak: true }));
    fragment.append(card);
  });

  refs.wordGrid.replaceChildren(fragment);

  // Replay the staggered entrance animation whenever the grid changes.
  refs.wordGrid.classList.remove("is-animating");
  void refs.wordGrid.offsetWidth;
  refs.wordGrid.classList.add("is-animating");
  window.clearTimeout(state.gridTimer);
  state.gridTimer = window.setTimeout(() => {
    refs.wordGrid.classList.remove("is-animating");
  }, 1200);
}

function updateActiveCard() {
  const cards = refs.wordGrid.querySelectorAll(".word-card");
  cards.forEach((card) => {
    const isActive = card.dataset.word === state.word;
    card.classList.toggle("is-active", isActive);
    card.setAttribute("aria-pressed", isActive ? "true" : "false");
  });
}

function selectWord(word, options = {}) {
  const { speak = false } = options;
  const words = getWords();
  if (!words.includes(word)) return;

  if (state.listening) stopRecognition({ silent: true });
  stopSpeech();

  state.word = word;
  refs.currentWord.textContent = word;
  refs.wordPosition.textContent = `${words.indexOf(word) + 1} / ${words.length}`;
  updateActiveCard();

  setFeedback("idle", "Tap Listen to hear the word", "Then repeat it out loud and test your pronunciation.");
  document.body.classList.remove("is-correct", "is-wrong");

  if (speak) {
    speakWord();
  } else {
    refs.orbCaption.textContent = ORB_CAPTIONS.idle;
  }
}

function activateCategory(category, options = {}) {
  const { animate = true } = options;
  if (!CATEGORIES[category]) return;

  const tabs = getTabs();
  state.category = category;

  tabs.forEach((tab) => {
    const isActive = tab.dataset.category === category;
    tab.classList.toggle("is-active", isActive);
    tab.setAttribute("aria-selected", isActive ? "true" : "false");
    tab.tabIndex = isActive ? 0 : -1;
  });

  refs.panel.setAttribute("aria-labelledby", `tab-${category}`);
  refs.categoryChip.textContent = CATEGORIES[category].label;
  refs.categoryHint.textContent = CATEGORIES[category].hint;

  renderWordGrid(CATEGORIES[category].words[0]);
  selectWord(CATEGORIES[category].words[0], { speak: false });

  if (!animate) refs.wordGrid.classList.remove("is-animating");
}

function handleTabKeydown(event) {
  const tabs = getTabs();
  const index = tabs.indexOf(event.currentTarget);
  if (index === -1) return;

  let nextIndex = null;

  if (event.key === "ArrowRight" || event.key === "ArrowDown") {
    nextIndex = (index + 1) % tabs.length;
  } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
    nextIndex = (index - 1 + tabs.length) % tabs.length;
  } else if (event.key === "Home") {
    nextIndex = 0;
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1;
  }

  if (nextIndex === null) return;

  event.preventDefault();
  const nextTab = tabs[nextIndex];
  nextTab.focus();
  activateCategory(nextTab.dataset.category);
}

function handleGridKeydown(event) {
  if (event.key !== "ArrowRight" && event.key !== "ArrowLeft" && event.key !== "Home" && event.key !== "End") {
    return;
  }

  const cards = Array.from(refs.wordGrid.querySelectorAll(".word-card"));
  if (!cards.length) return;

  const index = cards.indexOf(document.activeElement);
  if (index === -1) return;

  let nextIndex = index;

  if (event.key === "ArrowRight") nextIndex = (index + 1) % cards.length;
  if (event.key === "ArrowLeft") nextIndex = (index - 1 + cards.length) % cards.length;
  if (event.key === "Home") nextIndex = 0;
  if (event.key === "End") nextIndex = cards.length - 1;

  event.preventDefault();
  cards[nextIndex].focus();
}

function chooseNextWord() {
  const words = getWords();
  if (words.length < 2) {
    selectWord(words[0], { speak: true });
    return;
  }

  let next = state.word;
  while (next === state.word) {
    next = words[Math.floor(Math.random() * words.length)];
  }

  selectWord(next, { speak: true });
}

/* --------------------------------------------------------------------------
   Text-to-speech
   -------------------------------------------------------------------------- */

function pickEnglishVoice() {
  if (!ttsSupported) return null;

  const voices = window.speechSynthesis.getVoices();
  const english = voices.filter((voice) => /^en([-_]|$)/i.test(voice.lang));
  if (!english.length) return null;

  return (
    english.find((voice) => /^en[-_]US/i.test(voice.lang) && voice.localService) ||
    english.find((voice) => /^en[-_]US/i.test(voice.lang)) ||
    english[0]
  );
}

function stopSpeech() {
  if (!ttsSupported) return;

  state.activeUtterance = null;
  try {
    window.speechSynthesis.cancel();
  } catch (error) {
    /* Nothing to cancel. */
  }
  setSpeaking(false);
}

function speakWord() {
  if (!state.word) return;

  if (!ttsSupported) {
    setFeedback(
      "warning",
      "Audio is not available",
      "This browser does not support speech synthesis. Try Chrome, Edge, or Safari."
    );
    return;
  }

  if (state.listening) stopRecognition({ silent: true });

  try {
    window.speechSynthesis.cancel();
  } catch (error) {
    /* Ignore cancellation failures. */
  }

  const utterance = new SpeechSynthesisUtterance(state.word);
  utterance.lang = "en-US";
  utterance.rate = SPEECH_RATE;
  utterance.pitch = 1;
  utterance.volume = 1;

  const voice = pickEnglishVoice();
  if (voice) {
    utterance.voice = voice;
    utterance.lang = voice.lang || "en-US";
  }

  state.activeUtterance = utterance;

  utterance.onstart = () => {
    setSpeaking(true);
    setFeedback("info", "Listen closely…", `“${state.word}” at 0.8× speed.`);
  };

  utterance.onend = () => {
    if (state.activeUtterance !== utterance) return;
    state.activeUtterance = null;
    setSpeaking(false);
    refs.orbCaption.textContent = "Your turn — repeat it out loud";
  };

  utterance.onerror = (event) => {
    if (state.activeUtterance !== utterance) return;
    state.activeUtterance = null;
    setSpeaking(false);

    if (event.error === "interrupted" || event.error === "canceled") return;

    setFeedback(
      "warning",
      "Audio could not play",
      "Check your speaker volume and try clicking Listen again."
    );
  };

  window.speechSynthesis.speak(utterance);
}

/* --------------------------------------------------------------------------
   Speech-to-text pronunciation check
   -------------------------------------------------------------------------- */

function normalizeSpeech(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z' ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function matchesWord(heard, target) {
  const heardNormalized = normalizeSpeech(heard);
  const targetNormalized = normalizeSpeech(target);

  if (!heardNormalized || !targetNormalized) return false;
  if (heardNormalized === targetNormalized) return true;

  const heardCompact = heardNormalized.replace(/[^a-z]/g, "");
  const targetCompact = targetNormalized.replace(/[^a-z]/g, "");
  if (heardCompact === targetCompact) return true;

  // Accept natural phrases such as "the cat" while still requiring the full word.
  return heardNormalized.split(" ").includes(targetNormalized);
}

function recognitionErrorMessage(error) {
  switch (error) {
    case "not-allowed":
    case "service-not-allowed":
      return {
        title: "Microphone access is blocked",
        text: "Allow microphone access for this site in your browser settings, then try again."
      };
    case "audio-capture":
      return {
        title: "No microphone found",
        text: "Connect or enable a microphone, then tap Test pronunciation again."
      };
    case "network":
      return {
        title: "Recognition needs a connection",
        text: "Your browser’s speech service could not be reached. Check your connection and retry."
      };
    case "language-not-supported":
      return {
        title: "English recognition is unavailable",
        text: "This browser cannot recognize US English right now. Try Chrome, Edge, or Safari."
      };
    case "start-failed":
      return {
        title: "The microphone did not start",
        text: "Wait a moment, then tap Test pronunciation again."
      };
    default:
      return {
        title: "I could not test that",
        text: "Something interrupted the microphone. Please try again."
      };
  }
}

function stopRecognition(options = {}) {
  const { silent = true } = options;

  if (state.recognition) {
    state.recognitionToken += 1;
    try {
      state.recognition.abort();
    } catch (error) {
      /* The recognizer may already be stopped. */
    }
    state.recognition = null;
  }

  setListening(false);

  if (silent) {
    refs.orbCaption.textContent = ORB_CAPTIONS.idle;
  }
}

function finishRecognition(token, result) {
  if (token !== state.recognitionToken) return;

  state.recognitionToken += 1;
  state.recognition = null;
  setListening(false);

  if (result.aborted) {
    setFeedback("idle", "Tap Listen to hear the word", "Then repeat it out loud and test your pronunciation.");
    return;
  }

  if (result.error) {
    const message = recognitionErrorMessage(result.error);
    setFeedback("warning", message.title, message.text);
    return;
  }

  if (result.noSpeech) {
    setFeedback(
      "warning",
      "I didn’t catch that",
      "No speech was detected. Tap Test pronunciation and speak a little louder."
    );
    return;
  }

  const heard = result.heard;
  const word = state.word;

  if (result.correct) {
    state.stats.correct += 1;
    state.stats.tries += 1;
    state.stats.streak += 1;
    saveStats();
    renderStats(refs.correctCount);
    bumpNumber(refs.streakCount);

    setFeedback(
      "correct",
      "Perfect pronunciation!",
      heard ? `You said “${heard}” — exactly right. Keep going!` : `“${word}” — exactly right. Keep going!`
    );
    pulseOrb("is-correct");
    return;
  }

  state.stats.tries += 1;
  state.stats.streak = 0;
  saveStats();
  renderStats(refs.attemptCount);

  setFeedback(
    "wrong",
    "Not quite — give it another try",
    heard
      ? `I heard “${heard}”. Aim for “${word}” and keep every sound clear.`
      : `Aim for “${word}” and say it slowly and clearly.`
  );
  pulseOrb("is-wrong");
}

function startRecognition() {
  if (!state.word) return;

  if (!sttSupported) {
    setFeedback(
      "warning",
      "Microphone check is not supported here",
      "This browser does not support the Web Speech recognition API. Try Chrome, Edge, or Safari over HTTPS."
    );
    return;
  }

  if (state.listening) {
    stopRecognition({ silent: false });
    setFeedback("idle", "Listening stopped", "Tap Test pronunciation whenever you are ready.");
    return;
  }

  stopSpeech();

  let recognition;
  try {
    recognition = new RecognitionConstructor();
  } catch (error) {
    setFeedback("warning", "The microphone did not start", "Please try again in a moment.");
    return;
  }

  const token = ++state.recognitionToken;
  state.recognition = recognition;
  setListening(true);

  document.body.classList.remove("is-correct", "is-wrong");
  setFeedback(
    "listening",
    "Listening…",
    `Say “${state.word}” clearly into your microphone.`
  );

  let settled = false;
  let timeoutId = null;

  const finish = (result) => {
    if (settled) return;
    settled = true;
    window.clearTimeout(timeoutId);

    try {
      recognition.stop();
    } catch (error) {
      /* The recognizer may have already ended. */
    }

    finishRecognition(token, result);
  };

  recognition.lang = "en-US";
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 3;

  recognition.onresult = (event) => {
    if (token !== state.recognitionToken) return;

    const alternatives = [];
    const firstResult = event.results && event.results[0];

    if (firstResult) {
      for (let index = 0; index < firstResult.length; index += 1) {
        const transcript = firstResult[index] && firstResult[index].transcript;
        if (transcript) alternatives.push(transcript.trim());
      }
    }

    const heard = alternatives[0] || "";
    const correct = alternatives.some((alternative) => matchesWord(alternative, state.word));

    finish({ heard, correct });
  };

  recognition.onerror = (event) => {
    if (token !== state.recognitionToken) return;

    if (event.error === "aborted") {
      finish({ aborted: true });
      return;
    }

    if (event.error === "no-speech") {
      finish({ noSpeech: true });
      return;
    }

    finish({ error: event.error });
  };

  recognition.onend = () => {
    if (token !== state.recognitionToken) return;
    if (!settled) finish({ noSpeech: true });
  };

  timeoutId = window.setTimeout(() => {
    if (settled) return;
    finish({ noSpeech: true });
  }, RECOGNITION_TIMEOUT);

  try {
    recognition.start();
  } catch (error) {
    finish({ error: "start-failed" });
  }
}

/* --------------------------------------------------------------------------
   Global keyboard shortcuts
   -------------------------------------------------------------------------- */

function handleShortcut(event) {
  if (event.metaKey || event.ctrlKey || event.altKey) return;

  const target = event.target;
  const tagName = target && target.tagName ? target.tagName : "";
  if (tagName === "INPUT" || tagName === "TEXTAREA" || tagName === "SELECT" || (target && target.isContentEditable)) {
    return;
  }

  const key = event.key.toLowerCase();

  if (key === "l") {
    event.preventDefault();
    speakWord();
  } else if (key === "t") {
    event.preventDefault();
    startRecognition();
  } else if (key === "n") {
    event.preventDefault();
    chooseNextWord();
  }
}

/* --------------------------------------------------------------------------
   Wiring
   -------------------------------------------------------------------------- */

function bindEvents() {
  refs.themeToggle.addEventListener("click", toggleTheme);

  getTabs().forEach((tab) => {
    tab.addEventListener("click", () => activateCategory(tab.dataset.category));
    tab.addEventListener("keydown", handleTabKeydown);
  });

  refs.listenBtn.addEventListener("click", speakWord);
  refs.testBtn.addEventListener("click", startRecognition);
  refs.nextBtn.addEventListener("click", chooseNextWord);
  refs.shuffleBtn.addEventListener("click", chooseNextWord);

  refs.wordGrid.addEventListener("keydown", handleGridKeydown);

  refs.resetStats.addEventListener("click", () => {
    state.stats = { correct: 0, tries: 0, streak: 0 };
    saveStats();
    renderStats();
    setFeedback("idle", "Stats reset", "A fresh start. Pick a word and show off your pronunciation.");
  });

  document.addEventListener("keydown", handleShortcut);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      stopSpeech();
      if (state.listening) {
        stopRecognition({ silent: true });
        setFeedback("idle", "Practice paused", "Pick up where you left off whenever you are ready.");
      }
    }
  });

  window.addEventListener("beforeunload", () => {
    stopSpeech();
    if (state.listening) stopRecognition({ silent: true });
  });

  if (ttsSupported) {
    // Voices can load asynchronously; touching the list early warms it up.
    window.speechSynthesis.getVoices();
    if (typeof window.speechSynthesis.addEventListener === "function") {
      window.speechSynthesis.addEventListener("voiceschanged", () => {
        window.speechSynthesis.getVoices();
      });
    }
  }
}

function init() {
  applyTheme(getSavedTheme() || (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"));
  renderSupportPill();
  renderStats();
  bindEvents();
  activateCategory("rhymes", { animate: true });
}

init();
