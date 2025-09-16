const API = {
  mal: username => `/api/mal/${username}`,
  users: "/api/users"
};

// State
let currentUser = null; // { name, mal, password, score }
let currentClues = null; // clues object
let revealed = 0; // number of clues revealed 0..5
let roundScore = 0;
let finalGuessUsed = false; // restricts one guess after final clue

// Elements
const els = {
  bestScore: document.getElementById("bestScore"),
  name: document.getElementById("name"),
  mal: document.getElementById("mal"),
  password: document.getElementById("password"),
  registerBtn: document.getElementById("registerBtn"),
  deleteBtn: document.getElementById("deleteBtn"),
  startBtn: document.getElementById("startBtn"),
  gameArea: document.getElementById("gameArea"),
  skeleton: document.getElementById("skeleton"),
  clueIndex: document.getElementById("clueIndex"),
  roundScore: document.getElementById("roundScore"),
  clue1: document.getElementById("clue1"),
  clue2: document.getElementById("clue2"),
  clue3: document.getElementById("clue3"),
  clue4: document.getElementById("clue4"),
  clue5: document.getElementById("clue5"),
  answer: document.getElementById("answer"),
  submitBtn: document.getElementById("submitBtn"),
  skipBtn: document.getElementById("skipBtn"),
  leaderboard: document.getElementById("leaderboard"),
  activeUserProfile: document.getElementById("activeUserProfile"),
  refreshLb: document.getElementById("refreshLb"),
  toast: document.getElementById("toast")
};

function showToast(message) {
  els.toast.textContent = message;
  els.toast.classList.add("show");
  setTimeout(() => els.toast.classList.remove("show"), 2000);
}

async function fetchJSON(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { "Content-Type": "application/json", ...(opts.headers || {}) } });
  if (!res.ok) throw new Error(`${res.status}`);
  return await res.json().catch(() => ({}));
}

// Leaderboard
async function loadLeaderboard() {
  try {
    const users = await fetch(API.users, {
      method: "GET",
      headers: { "Content-Type": "application/json" }
    }).then(res => res.json());

    els.leaderboard.innerHTML = "";

    // Render all users with rank
    users.forEach((u, idx) => {
      const rank = idx + 1;
      const li = document.createElement("li");
      if (currentUser && u.name === currentUser.name) {
        li.classList.add("me");
        currentUser = { ...currentUser, ...u }; // update score, in case changed
      }

      const rankEl = document.createElement("span");
      rankEl.className = "lb-rank";
      rankEl.textContent = rank;
      const name = document.createElement("span");
      name.className = "name";
      name.textContent = u.name;
      const score = document.createElement("span");
      score.className = "score";
      score.textContent = u.score;

      li.appendChild(rankEl);
      li.appendChild(name);
      li.appendChild(score);

      els.leaderboard.appendChild(li);
      if (currentUser && u.name === currentUser.name) {
        els.bestScore.textContent = String(u.score);
      }
    });

    updateActiveUser(users);
  } catch (e) {
    // silent
  }
}

function updateActiveUser() {
  const container = els.activeUserProfile;
  if (!currentUser) { container.classList.add("hidden"); return; }

  const nameEl = container.querySelector(".name");
  const scoreEl = container.querySelector(".score");
  nameEl.textContent = currentUser.name;
  scoreEl.textContent = currentUser.score;

  container.classList.remove("hidden");
}

const updateData = async () => {
  await loadLeaderboard();
  updateActiveUser();
  els.bestScore.textContent = String(currentUser?.score || "-");
}

// handle login + register
async function confirmUser() {
  const name = els.name.value.trim();
  const mal = els.mal.value.trim();
  const password = els.password.value;

  if (!name || !password) {
    showToast("Please fill name and password");
    return;
  }

  try {
    // try creating first (201) then fallback to login (200)
    const res = await fetch(API.users, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name, password, mal
      })
    });

    const json = await res.json();
    const userInDB = json.user;

    if (res.status === 201) {
      // created
      currentUser = userInDB;
      showToast("Created new user!");
    } else if (res.status === 200) {
      // existing user, verify password
      if (password !== userInDB.password) {
        showToast("Wrong password");
        return;
      }
      currentUser = userInDB
      showToast("Welcome back!");
    } else {
      showToast("Login failed 🥲");
    }

    await updateData();
  } catch (e) {
    showToast("An Error occurred");
  }
}

async function deleteUser() {

  if (!currentUser) {
    showToast("Please login first!");
    return;
  }

  try {
    const res = await fetch(API.users, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: currentUser.name, password: currentUser.password })
    });

    if (res.ok) {
      showToast("Deleted");
      currentUser = null;
      await updateData();
    } else if (res.status === 403) {
      showToast("Wrong password");
    } else if (res.status === 404) {
      showToast("User not found");
    } else {
      showToast("Delete failed");
    }
  } catch (e) {
    showToast("An Error occurred");
  }
}

// Game flow
function scoreForReveal(index) {
  const points = [-1, 100, 80, 60, 40, 20];
  return points[index] || 0;
}

function resetGame() {
  els.clue1.textContent = "";
  els.clue2.textContent = "";
  els.clue3.textContent = "";
  els.clue4.textContent = "";
  els.clue5.innerHTML = "";
  els.answer.value = "";
  els.roundScore.textContent = "0";
  els.clueIndex.textContent = "1";
  finalGuessUsed = false;
}

async function startGame() {
  if (!currentUser) {
    showToast("Please login first!");
    return;
  }

  resetGame();
  revealed = 0;
  roundScore = 0;

  // show skeleton while loading, hide game area
  els.gameArea.classList.add("hidden");
  els.skeleton.classList.remove("hidden");

  els.startBtn.disabled = true;
  showToast("Fetching clues...");
  try {
    const malUser = currentUser.mal
    currentClues = await fetchJSON(API.mal(malUser));

    // swap skeleton with game area
    els.skeleton.classList.add("hidden");
    els.gameArea.classList.remove("hidden");

    revealNextClue();
  } catch (e) {
    showToast("Failed to load clues");
    els.skeleton.classList.add("hidden");
  } finally {
    els.startBtn.disabled = false;
  }
}

function revealNextClue() {
  if (!currentClues) return;

  revealed = Math.min(revealed + 1, 5);
  const c = currentClues[revealed];
  if (!c) return;

  if (revealed === 1) {
    const txt = [
      c.studios?.length ? `Studios: ${c.studios.join(", ")}` : null,
      c.status ? `Status: ${c.status}` : null
    ].filter(Boolean).join(" | ");
    els.clue1.textContent = txt;
  }
  if (revealed === 2) {
    const txt = [
      c.mean != null ? `Mean: ${c.mean}` : null,
      c.num_eps != null ? `Episodes: ${c.num_eps}` : null,
      c.rating ? `Rating: ${c.rating}` : null
    ].filter(Boolean).join(" | ");
    els.clue2.textContent = txt;
  }
  if (revealed === 3) {
    const txt = [
      c.popularity != null ? `Popularity: ${c.popularity}` : null,
      c.genres?.length ? `Genres: ${c.genres.join(", ")}` : null,
      c.season ? `Season: ${c.season}` : null
    ].filter(Boolean).join(" | ");
    els.clue3.textContent = txt;
  }
  if (revealed === 4) {
    const parts = (c.synopsis || "").split("|").map(s => s.trim());
    const en = parts[0] || "";
    const th = parts[1] || "";
    els.clue4.textContent = th ? `${en}\n${th}` : en;
  }
  if (revealed === 5) {
    const pics = c.pictures || [];
    els.clue5.innerHTML = "";
    const list = pics.slice(0, 6);
    list.forEach(p => {
      const img = document.createElement("img");
      img.src = p.medium || p.large || p.small || p?.jpg?.image_url || "";
      img.loading = "lazy";
      els.clue5.appendChild(img);
    });
    if (!list.length && c.main_picture?.medium) {
      const img = document.createElement("img");
      img.src = c.main_picture.medium;
      img.loading = "lazy";
      els.clue5.appendChild(img);
    }

    finalGuessUsed = false; // ensure one final attempt
    showToast("Final clue. One last guess!");
  }

  els.clueIndex.textContent = String(revealed);
}

async function endRound(win) {
  if (!currentUser) return;
  if (win) {
    roundScore = scoreForReveal(revealed);
    els.roundScore.textContent = String(roundScore);
    showToast(`Correct! +${roundScore} points`);
    resetGame();
    // clearCluesPanel();
  } else {
    if (revealed === 5) {
      showToast("Game over! Better luck next time.");
    } else {
      showToast("Out of clues");
    }
  }

  els.gameArea.classList.add("hidden");
  await submitScore();
  await updateData();
}

async function submitScore() {
  if (!currentUser) return;

  try {
    const nwScore = roundScore + currentUser.score;
    console.log(roundScore, currentUser.score, nwScore);
    await fetch(API.users, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: currentUser.name,
        password: currentUser.password,
        score: nwScore
      })
    })

  } catch (e) {
    console.log("Error on submit score", e.message);
  }
}

async function handleSubmitAnswer() {
  if (!currentUser) { showToast("Please login first!"); return; }
  if (!currentClues) { showToast("Start a round first!"); return; }

  const input = parseInt(els.answer.value, 10); // convert string to base 10
  if (!input) { showToast("Enter a MAL anime ID"); return; }

  const answerId = currentClues.answer;

  const correct = Number(input) === Number(answerId);

  if (revealed === 5) {
    await endRound(correct);
    return;
  }

  if (correct) {
    await endRound(true);
    return;
  }

  if (revealed === 4) {
    showToast("You have one last guess after the final clue!");
  }
  revealNextClue();
  els.answer.value = "";
}

function handleSkip() {
  if (!currentClues) { showToast("Start a round first"); return; }
  if (revealed < 5) {
    revealNextClue();
  } else {
    endRound(false);
  }
}

// Wire events
els.registerBtn.addEventListener("click", confirmUser);
els.deleteBtn.addEventListener("click", deleteUser);
els.startBtn.addEventListener("click", startGame);
els.submitBtn.addEventListener("click", handleSubmitAnswer);
els.skipBtn.addEventListener("click", handleSkip);
els.answer.addEventListener("keydown", (e) => { if (e.key === "Enter") handleSubmitAnswer(); });
els.refreshLb.addEventListener("click", loadLeaderboard);

// Startup
loadLeaderboard();


