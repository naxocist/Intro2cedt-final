// index.js
// Weeb Guess — main app logic
// IMPORTANT: put your keys here if you have them.
const MAL_CLIENT_ID = ""; // <-- Put your MyAnimeList client id here (optional)
const TYPHOON_API_KEY = ""; // <-- Put Typhoon free API key here (optional)

// If APIs unavailable or keys blank, app falls back to sample data.
const SAMPLE_ANIME = [
  { mal_id: 5114, title: "Fullmetal Alchemist: Brotherhood", image_url: "https://media.kitsu.io/anime/poster_images/5114/large.jpg", year: 2009, genres: ["Action", "Drama", "Fantasy"], synopsis: "Two brothers search for a Philosopher's Stone to restore their bodies." },
  { mal_id: 48263, title: "Spy x Family", image_url: "https://media.kitsu.io/anime/poster_images/48263/large.jpg", year: 2022, genres: ["Action", "Comedy", "Slice of Life"], synopsis: "A spy forms a fake family with unexpected secrets." },
  { mal_id: 1575, title: "Steins;Gate", image_url: "https://media.kitsu.io/anime/poster_images/1575/large.jpg", year: 2011, genres: ["Sci-Fi", "Psychological", "Thriller"], synopsis: "Time travel and consequence." },
  { mal_id: 11061, title: "Hunter x Hunter (2011)", image_url: "https://media.kitsu.io/anime/poster_images/11061/large.jpg", year: 2011, genres: ["Action", "Adventure", "Fantasy"], synopsis: "A boy becomes a Hunter to find his father." }
];

// --- Utilities ---
const $ = sel => document.querySelector(sel);
const $$ = sel => Array.from(document.querySelectorAll(sel));
function byId(n) { return document.getElementById(n); }

function randInt(n) { return Math.floor(Math.random() * n); }
function choose(arr) { return arr[randInt(arr.length)]; }
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] } return a; }

// --- Basic genre list (MAL common genres) ---
const GENRES = [
  "Action", "Adventure", "Comedy", "Drama", "Ecchi", "Fantasy", "Horror", "Mystery",
  "Psychological", "Romance", "Sci-Fi", "Slice of Life", "Sports", "Supernatural", "Thriller"
];

// --- App state ---
let state = {
  list: [], // array of anime objects {mal_id, title, image_url, year, genres, synopsis}
  currentIndex: 0,
  total: 0,
  score: 0,
  perAnimeLog: [], // store attempts and timings
  startTime: null, // for timing each round
};

// --- DOM refs ---
const startBtn = byId('start-btn');
const resetBtn = byId('reset-btn');
const malInput = byId('mal-username');
const userListInput = byId('user-list');
const genresContainer = byId('genres');
const yearFrom = byId('year-from');
const yearTo = byId('year-to');

const gameArea = byId('game-area');
const resultArea = byId('result-area');
const hintArea = byId('hint-area');
const guessInput = byId('guess-input');
const guessBtn = byId('guess-btn');
const nextBtn = byId('next-btn');
const scoreSpan = byId('score');
const currentIndexSpan = byId('current-index');
const totalCountSpan = byId('total-count');
const progressLog = byId('progress-log');
const resultSummary = byId('result-summary');
const memeArea = byId('meme-area');
const playAgainBtn = byId('play-again');

// render genre checkboxes
function renderGenres() {
  genresContainer.innerHTML = "";
  GENRES.forEach(g => {
    const id = `g-${g.replace(/\s+/g, '')}`;
    const div = document.createElement('label');
    div.className = 'genre-item';
    div.innerHTML = `<input type="checkbox" id="${id}" value="${g}" /> <span>${g}</span>`;
    genresContainer.appendChild(div);
  });
}
renderGenres();

// --- MAL API helpers ---
// Using MyAnimeList v2 API: https://api.myanimelist.net/v2
// For public endpoints you normally need a client id sent in Authorization header:
// Authorization: Bearer <access_token> or X-MAL-CLIENT-ID: <client_id> for older public endpoints.
// Implementation here tries to use client id in header if provided; if no key provided we fallback to SAMPLE_ANIME.

async function malSearchByGenreAndYear(genres, yearFromVal, yearToVal, limit = 50) {
  if (!MAL_CLIENT_ID) return SAMPLE_ANIME;
  // MAL search: /anime?q=&limit=...&genres=...&start_date=YYYY&end_date=YYYY
  // Note: actual MAL API query parameters may differ; adjust if necessary.
  const genreParam = genres.map(g => encodeURIComponent(g)).join(',');
  const url = `https://api.myanimelist.net/v2/anime?limit=${limit}&genres=${genreParam}&start_date=${yearFromVal}-01-01&end_date=${yearToVal}-12-31&fields=title,main_picture,genres,start_date,synopsis`;
  try {
    const res = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID } });
    if (!res.ok) throw new Error('MAL fetch failed');
    const data = await res.json();
    // map to our simplified format
    const items = (data.data || []).map(d => {
      const n = d.node || d;
      return {
        mal_id: n.id,
        title: n.title,
        image_url: n.main_picture?.medium || '',
        year: n.start_date ? parseInt(n.start_date.slice(0, 4)) : null,
        genres: (n.genres || []).map(g => g.name),
        synopsis: n.synopsis || ''
      };
    });
    return items.length ? items : SAMPLE_ANIME;
  } catch (err) {
    console.warn("MAL fetch error:", err);
    return SAMPLE_ANIME;
  }
}

async function malGetByTitleFromUserList(lines) {
  // Try to search each title via MAL search endpoint
  if (!MAL_CLIENT_ID) {
    // map simple objects
    return lines.map((t, i) => ({ mal_id: null, title: t, image_url: '', year: null, genres: [], synopsis: '' }));
  }
  const results = [];
  for (const title of lines) {
    try {
      const url = `https://api.myanimelist.net/v2/anime?q=${encodeURIComponent(title)}&limit=1&fields=title,main_picture,genres,start_date,synopsis`;
      const res = await fetch(url, { headers: { 'X-MAL-CLIENT-ID': MAL_CLIENT_ID } });
      if (!res.ok) throw new Error("search fail");
      const data = await res.json();
      const item = (data.data && data.data[0] && data.data[0].node) ? data.data[0].node : (data.data ? data.data : null);
      if (item) {
        results.push({
          mal_id: item.id,
          title: item.title,
          image_url: item.main_picture?.medium || '',
          year: item.start_date ? parseInt(item.start_date.slice(0, 4)) : null,
          genres: (item.genres || []).map(g => g.name),
          synopsis: item.synopsis || ''
        });
      } else {
        results.push({ mal_id: null, title, image_url: '', year: null, genres: [], synopsis: '' });
      }
    } catch (e) {
      console.warn(e);
      results.push({ mal_id: null, title, image_url: '', year: null, genres: [], synopsis: '' });
    }
  }
  return results;
}

// --- Typhoon AI helper (for hint 1 & summary) ---
// We'll call a hypothetical Typhoon endpoint. If no key or call fails, fallback to small local generator.

async function generateCharacterSnippetUsingTyphoon(animeTitle, exampleCharacterPage) {
  // exampleCharacterPage: if we had a character name or page link, use it. For now we only have anime title so pass through.
  if (!TYPHOON_API_KEY) {
    // fallback short template
    return `${animeTitle} — ตัวเอกเป็นตัวละครลึกลับ/น่าสนใจ (คำอธิบายสั้นโดยไม่มี API).`;
  }
  try {
    const url = `https://api.typhoon.ai/generate`; // placeholder
    const payload = {
      key: TYPHOON_API_KEY,
      prompt: `Create a concise character blurb (Thai, ~20-30 words) for the main protagonist of the anime titled "${animeTitle}". Make it evocative but not revealing.`
    };
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (!res.ok) throw new Error("typhoon failed");
    const j = await res.json();
    return j.output || `${animeTitle} — ตัวเอก (generated)`;
  } catch (err) {
    console.warn("Typhoon API error:", err);
    return `${animeTitle} — ตัวเอกถูกอธิบายโดย AI (fallback).`;
  }
}

// --- Create the 5 hints for an anime object ---
async function buildHintsForAnime(anime) {
  // hints: 1) character blurb (AI), 2) genres, 3) opening song (we'll try to find from MAL? fallback), 4) poster fragment, 5) synopsis
  const hints = [];

  // 1) character blurb via Typhoon AI (or fallback)
  const charBlurb = await generateCharacterSnippetUsingTyphoon(anime.title);
  hints.push({ label: "คำอธิบายตัวเอก", content: charBlurb });

  // 2) genre(s) (we will reveal genres aggregated)
  const g = (anime.genres && anime.genres.length) ? anime.genres.slice(0, 4).join(", ") : "ไม่ทราบแนวชัดเจน";
  hints.push({ label: "แนว", content: g });

  // 3) opening song — MAL API does not provide songs directly in v2; fallback to "เพลงเปิด: (อาจไม่แม่น)"
  let opening = "เพลงเปิด: (ไม่พบข้อมูลโดยตรงจาก API)";
  // attempt to fetch via MAL if we have id (note: real MAL endpoint for songs may not exist in v2 public)
  if (anime.mal_id && MAL_CLIENT_ID) {
    try {
      // hypothetical endpoint or alternative — we'll not rely on this: leave fallback
      opening = "เพลงเปิด: (ข้อมูลจาก API ไม่พร้อมใช้งาน - ใช้ fallback)";
    } catch (e) { }
  }
  hints.push({ label: "เพลงเปิด", content: opening });

  // 4) poster fragment — we'll return the image URL and a CSS cropping hint in the DOM rendering
  hints.push({ label: "ส่วนหนึ่งของโปสเตอร์", content: anime.image_url || "" });

  // 5) synopsis
  const syn = anime.synopsis || "ไม่มีเรื่องย่อให้ใช้ — (fallback)";
  hints.push({ label: "เรื่องย่อ", content: syn });

  return hints;
}

// score calculation:
// - If guessed at hint #1 (after seeing only first hint): 100 pts - time bonus
// - Each additional hint reduces base possible score (75,50,25,10,0)
// - Time bonus: faster answers get up to +30 pts based on time limit (e.g., 60s)
function baseScoreForHintNumber(hintNumber) {
  // hintNumber = 1..5 (1 means only first hint shown when guessed)
  const mapping = { 1: 100, 2: 75, 3: 50, 4: 25, 5: 10 };
  return mapping[hintNumber] || 0;
}

function timeBonus(secondsTaken) {
  const maxBonus = 30;
  const maxTime = 60; // seconds for full bonus
  const val = Math.max(0, Math.round((1 - Math.min(secondsTaken, maxTime) / maxTime) * maxBonus));
  return val;
}

// --- Render functions ---
function showCard(container, title, content) { /* not used currently */ }

function renderHints(hints, revealedCount) {
  hintArea.innerHTML = "";
  for (let i = 0; i < hints.length; i++) {
    const h = hints[i];
    const div = document.createElement('div');
    div.className = 'hint';
    div.dataset.hintIndex = i + 1;
    const label = document.createElement('div');
    label.className = 'label';
    label.textContent = `คำใบ้ ${i + 1}: ${h.label}`;
    const content = document.createElement('div');
    content.className = 'content';
    if (i + 1 <= revealedCount) {
      if (h.label === "ส่วนหนึ่งของโปสเตอร์" && h.content) {
        // create a poster fragment: use background-image with random clip
        const wrapper = document.createElement('div');
        wrapper.style.height = '140px';
        wrapper.style.borderRadius = '8px';
        wrapper.style.backgroundImage = `url(${h.content})`;
        wrapper.style.backgroundSize = 'cover';
        // randomize focal point
        const x = Math.floor(Math.random() * 100);
        const y = Math.floor(Math.random() * 100);
        wrapper.style.backgroundPosition = `${x}% ${y}%`;
        wrapper.style.filter = 'contrast(0.95) saturate(0.9)';
        content.appendChild(wrapper);
      } else {
        content.textContent = h.content;
      }
    } else {
      content.textContent = "ยังไม่ถูกเปิดเผย";
      content.style.color = 'var(--muted)';
    }
    div.appendChild(label);
    div.appendChild(content);
    hintArea.appendChild(div);
  }
}

function updateStatus() {
  currentIndexSpan.textContent = state.currentIndex + 1;
  totalCountSpan.textContent = state.total;
  scoreSpan.textContent = state.score;
}

function logProgress(text) {
  const line = document.createElement('div');
  line.textContent = text;
  progressLog.appendChild(line);
  progressLog.scrollTop = progressLog.scrollHeight;
}

// --- Game flow ---
async function startGame() {
  // prepare list based on MAL username, user list, or picker
  state.score = 0;
  state.perAnimeLog = [];
  progressLog.innerHTML = "";
  resultArea.classList.add('hidden');
  gameArea.classList.remove('hidden');

  const malUser = malInput.value.trim();
  const userListRaw = userListInput.value.trim();
  let list = [];

  if (userListRaw) {
    const lines = userListRaw.split(/\n/).map(s => s.trim()).filter(Boolean);
    list = await malGetByTitleFromUserList(lines);
  } else if (malUser) {
    // attempt to fetch user's list from MAL (favorites or list). MAL API requires OAuth to access user list.
    // We'll fallback to sample if not possible.
    try {
      if (!MAL_CLIENT_ID) throw new Error("no client id");
      // MAL user anime list endpoint requires authentication; skipping due to complexity -> fallback
      throw new Error("MAL user list fetching not implemented (requires OAuth). Using sample instead.");
    } catch (e) {
      console.warn(e);
      list = SAMPLE_ANIME;
    }
  } else {
    // use picker
    const checked = Array.from(document.querySelectorAll('#genres input:checked')).map(i => i.value);
    if (checked.length < 4) {
      alert('กรุณาเลือกแนว (อย่างน้อย 4 แนว) หรือใส่ลิสต์/ชื่อ MAL');
      return;
    }
    const yf = parseInt(yearFrom.value), yt = parseInt(yearTo.value);
    list = await malSearchByGenreAndYear(checked, yf, yt, 50);
  }

  // ensure we have at least 5 items to play through or set total to e.g., 5 rounds
  if (list.length === 0) list = SAMPLE_ANIME;
  shuffle(list);
  // play 5 rounds or as many as list (whichever smaller)
  const rounds = Math.min(5, list.length);
  state.list = list.slice(0, rounds);
  state.total = rounds;
  state.currentIndex = 0;
  updateStatus();
  prepareRound();
}

let currentHints = [];
let revealedHints = 1;
let roundStartTs = null;

async function prepareRound() {
  hintArea.innerHTML = `<div class="hint"><div class="label">กำลังเตรียมคำใบ้...</div></div>`;
  guessInput.value = "";
  nextBtn.classList.add('hidden');
  guessBtn.disabled = false;

  const anime = state.list[state.currentIndex];
  // build hints (AI calls included)
  currentHints = await buildHintsForAnime(anime);
  revealedHints = 1;
  roundStartTs = Date.now();
  state.startTime = roundStartTs;
  renderHints(currentHints, revealedHints);
  updateStatus();
  logProgress(`เริ่มชุดที่ ${state.currentIndex + 1}: (เรื่องที่สุ่ม)`);
}

function revealNextHint() {
  if (revealedHints < currentHints.length) {
    revealedHints++;
    renderHints(currentHints, revealedHints);
    logProgress(`เปิดคำใบ้ข้อที่ ${revealedHints}`);
  } else {
    // all revealed; enable skip
    guessBtn.disabled = true;
    nextBtn.classList.remove('hidden');
    logProgress('คำใบ้ทั้งหมดถูกเปิดเผยแล้ว — คุณสามารถกดข้ามได้');
  }
}

function endRound(correct, secondsTaken, usedHintCount) {
  const base = baseScoreForHintNumber(usedHintCount);
  const bonus = correct ? timeBonus(secondsTaken) : 0;
  const gained = correct ? base + bonus : 0;
  state.score += gained;
  scoreSpan.textContent = state.score;

  state.perAnimeLog.push({
    index: state.currentIndex,
    title: state.list[state.currentIndex].title,
    correct, secondsTaken, usedHintCount, gained
  });

  const txt = correct ? `ถูกต้อง! +${gained} คะแนน (${base} base + ${bonus} time bonus)` : `ไม่ถูก — ได้ +0 คะแนน`;
  logProgress(`ชุด ${state.currentIndex + 1}: ${state.list[state.currentIndex].title} → ${txt}`);

  // prepare next or finish
  if (state.currentIndex + 1 < state.total) {
    nextBtn.classList.remove('hidden');
    guessBtn.disabled = true;
  } else {
    // finish
    showResults();
  }
}

function showResults() {
  gameArea.classList.add('hidden');
  resultArea.classList.remove('hidden');

  const total = state.score;
  // Determine tiers 5 levels:
  // 0-99: Newbie, 100-199: Casual, 200-299: Fan, 300-399: Otaku, 400+: Weeb Lord
  let tierLabel = '', meme = '';
  if (total >= 400) { tierLabel = 'Weeb Lord (ระดับ 5)'; meme = 'https://i.imgur.com/3Z3QZ7P.jpg'; }
  else if (total >= 300) { tierLabel = 'Otaku (ระดับ 4)'; meme = 'https://i.imgur.com/4M7Iw5S.jpg'; }
  else if (total >= 200) { tierLabel = 'Fan (ระดับ 3)'; meme = 'https://i.imgur.com/7J2XzQY.jpg'; }
  else if (total >= 100) { tierLabel = 'Casual (ระดับ 2)'; meme = 'https://i.imgur.com/8QqG8mC.jpg'; }
  else { tierLabel = 'Newbie (ระดับ 1)'; meme = 'https://i.imgur.com/0ZQbQ2Y.jpg'; }

  // build summary HTML
  const rows = state.perAnimeLog.map(l => `<li>${l.title} — ${l.correct ? '✅' : '❌'} (+${l.gained}) — hints used: ${l.usedHintCount}, time: ${l.secondsTaken}s</li>`).join('');
  resultSummary.innerHTML = `
    <p>คะแนนรวม: <strong>${total}</strong></p>
    <p>เกณฑ์: ${tierLabel}</p>
    <ul>${rows}</ul>
  `;
  memeArea.innerHTML = `<div><img src="${meme}" alt="meme" /></div>`;
}

// --- event handlers ---
startBtn.addEventListener('click', async (e) => {
  startBtn.disabled = true;
  await startGame();
  startBtn.disabled = false;
});

resetBtn.addEventListener('click', (e) => {
  malInput.value = '';
  userListInput.value = '';
  yearFrom.value = 2000;
  yearTo.value = 2025;
  // uncheck genres
  Array.from(document.querySelectorAll('#genres input')).forEach(i => i.checked = false);
});

guessBtn.addEventListener('click', (e) => {
  const guess = guessInput.value.trim().toLowerCase();
  if (!guess) return alert('กรุณาพิมพ์คำตอบเพื่อทาย');
  const anime = state.list[state.currentIndex];
  const titleNormalized = anime.title.toLowerCase();

  const secondsTaken = Math.round((Date.now() - roundStartTs) / 1000);
  const usedHints = revealedHints;

  // naive matching: exact or includes
  const correct = (titleNormalized === guess) || titleNormalized.includes(guess) || guess.includes(titleNormalized);

  endRound(correct, secondsTaken, usedHints);
  if (!correct) {
    // reveal next hint automatically (and allow more guesses)
    revealNextHint();
    // if all revealed, show answer button
  } else {
    // show next button
    nextBtn.classList.remove('hidden');
    guessBtn.disabled = true;
  }
});

nextBtn.addEventListener('click', (e) => {
  // move to next
  state.currentIndex++;
  if (state.currentIndex < state.total) {
    updateStatus();
    prepareRound();
    nextBtn.classList.add('hidden');
    guessBtn.disabled = false;
  } else {
    showResults();
  }
});

playAgainBtn.addEventListener('click', () => {
  resultArea.classList.add('hidden');
  gameArea.classList.remove('hidden');
  // reset and go to start
  state.score = 0;
  state.perAnimeLog = [];
  state.currentIndex = 0;
  scoreSpan.textContent = '0';
  startGame();
});

// allow pressing Enter to guess
guessInput.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') guessBtn.click(); });

// initial UI setup
updateStatus();

