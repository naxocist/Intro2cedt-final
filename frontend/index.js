// Game state
let currentQuestion = 0;
let currentHint = 0;
let totalScore = 0;
let currentQuestionScore = 500; // Base score per question
let gameData = {
    username: '',
    usernameMal: '',
    filters: {}
};

// Sample anime database with hints
const animeDatabase = [
    {
        name: "Attack on Titan",
        hints: [
            "This anime features giant humanoid creatures that threaten humanity",
            "The story takes place within massive walls that protect the last human city",
            "The main character can transform into a titan",
            "Created by Hajime Isayama and aired starting in 2013",
            "The main character's name is Eren Yeager"
        ],
        year: 2013,
        genre: "action"
    },
    {
        name: "One Piece",
        hints: [
            "A pirate adventure anime that has been running for over 20 years",
            "The main character has rubber powers after eating a Devil Fruit",
            "The crew is searching for the ultimate treasure",
            "The main character wears a straw hat",
            "The captain's name is Monkey D. Luffy"
        ],
        year: 1999,
        genre: "adventure"
    },
    {
        name: "Death Note",
        hints: [
            "A psychological thriller about a supernatural notebook",
            "Writing someone's name in this book causes their death",
            "Features a battle of wits between a student and a detective",
            "The main character is named Light Yagami",
            "The detective is known only as 'L'"
        ],
        year: 2006,
        genre: "thriller"
    },
    {
        name: "Naruto",
        hints: [
            "A ninja-themed anime about a young shinobi",
            "The main character has a nine-tailed fox sealed inside him",
            "Takes place in the Hidden Leaf Village",
            "The main character dreams of becoming Hokage",
            "The protagonist's name is Naruto Uzumaki"
        ],
        year: 2002,
        genre: "action"
    },
    {
        name: "Spirited Away",
        hints: [
            "A Studio Ghibli film about a girl trapped in a spirit world",
            "She works in a bathhouse for spirits to save her parents",
            "Directed by Hayao Miyazaki",
            "Won the Academy Award for Best Animated Feature in 2003",
            "The main character's name is Chihiro"
        ],
        year: 2001,
        genre: "fantasy"
    }
];

let currentAnime = null;
let usedAnime = [];

// Initialize leaderboard from localStorage or create empty one
let leaderboard = JSON.parse(localStorage.getItem('animeQuizLeaderboard')) || [];

function startGame() {
    // Validate required fields
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    let isValid = true;
    
    // Clear previous errors
    document.getElementById('usernameError').textContent = '';
    document.getElementById('passwordError').textContent = '';
    
    if (!username) {
        document.getElementById('usernameError').textContent = 'Username is required';
        isValid = false;
    }
    
    if (!password) {
        document.getElementById('passwordError').textContent = 'Password is required';
        isValid = false;
    }
    
    if (!isValid) return;
    
    // Store game data
    gameData.username = username;
    gameData.usernameMal = document.getElementById('usernameMal').value.trim();
    gameData.filters = {
        startYear: parseInt(document.getElementById('startYear').value) || 2000,
        endYear: parseInt(document.getElementById('endYear').value) || 2024,
        genre: document.getElementById('genre').value
    };
    
    // Reset game state
    currentQuestion = 0;
    totalScore = 0;
    usedAnime = [];
    
    // Show quiz section
    document.getElementById('setupForm').style.display = 'none';
    document.getElementById('quizSection').classList.add('active');
    
    // Start first question
    nextQuestion();
}

function resetForm() {
    document.getElementById('username').value = '';
    document.getElementById('usernameMal').value = '';
    document.getElementById('password').value = '';
    document.getElementById('startYear').value = '2000';
    document.getElementById('endYear').value = '2024';
    document.getElementById('genre').value = 'all';
    
    // Clear errors
    document.getElementById('usernameError').textContent = '';
    document.getElementById('passwordError').textContent = '';
}

function getRandomAnime() {
    // Filter anime based on user preferences
    let filteredAnime = animeDatabase.filter(anime => {
        if (usedAnime.includes(anime.name)) return false;
        
        const filters = gameData.filters;
        if (anime.year < filters.startYear || anime.year > filters.endYear) return false;
        if (filters.genre !== 'all' && anime.genre !== filters.genre) return false;
        
        return true;
    });
    
    if (filteredAnime.length === 0) {
        // Reset used anime if we've used them all
        usedAnime = [];
        filteredAnime = animeDatabase.filter(anime => {
            const filters = gameData.filters;
            if (anime.year < filters.startYear || anime.year > filters.endYear) return false;
            if (filters.genre !== 'all' && anime.genre !== filters.genre) return false;
            return true;
        });
    }
    
    return filteredAnime[Math.floor(Math.random() * filteredAnime.length)];
}

function nextQuestion() {
    currentAnime = getRandomAnime();
    if (!currentAnime) {
        alert('No anime found matching your criteria!');
        return;
    }
    
    usedAnime.push(currentAnime.name);
    currentHint = 0;
    currentQuestionScore = 500; // Reset score for new question
    
    // Clear previous question
    document.getElementById('hintsContainer').innerHTML = '';
    document.getElementById('guessInput').value = '';
    document.getElementById('resultMessage').innerHTML = '';
    document.getElementById('nextBtn').style.display = 'none';
    
    // Show first hint
    showNextHint();
    
    currentQuestion++;
}

function showNextHint() {
    if (currentHint >= currentAnime.hints.length) return;
    
    const hintsContainer = document.getElementById('hintsContainer');
    const hintElement = document.createElement('div');
    hintElement.className = 'hint-item visible';
    hintElement.innerHTML = `
        <div class="hint-label">Hint ${currentHint + 1}:</div>
        <div>${currentAnime.hints[currentHint]}</div>
    `;
    
    hintsContainer.appendChild(hintElement);
    currentHint++;
    
    // Decrease score for each hint shown
    if (currentHint > 1) {
        currentQuestionScore = Math.max(100, currentQuestionScore - 100);
    }
}

function submitGuess() {
    const guess = document.getElementById('guessInput').value.trim().toLowerCase();
    const correctAnswer = currentAnime.name.toLowerCase();
    
    if (!guess) {
        alert('Please enter your guess!');
        return;
    }
    
    const resultDiv = document.getElementById('resultMessage');
    
    if (guess === correctAnswer || isCloseMatch(guess, correctAnswer)) {
        // Correct answer
        totalScore += currentQuestionScore;
        resultDiv.innerHTML = `
            <div class="result-correct">
                <i class="bi bi-check-lg"></i> Correct! The answer is "${currentAnime.name}"<br>
                You earned ${currentQuestionScore} points!
            </div>
        `;
        
        // Update score display
        document.getElementById('currentScore').textContent = totalScore;
        
        // Show next button
        document.getElementById('nextBtn').style.display = 'inline-block';
        
        // Update leaderboard
        updateLeaderboard();
        
    } else {
        // Wrong answer
        resultDiv.innerHTML = `
            <div class="result-wrong">
                ❌ Wrong! Try again or skip to see the next hint.
            </div>
        `;
        
        // Show next hint automatically after wrong answer
        setTimeout(() => {
            if (currentHint < currentAnime.hints.length) {
                showNextHint();
            } else {
                // No more hints, reveal answer
                resultDiv.innerHTML = `
                    <div class="result-wrong">
                        😞 No more hints! The answer was "${currentAnime.name}"<br>
                        No points awarded for this question.
                    </div>
                `;
                document.getElementById('nextBtn').style.display = 'inline-block';
            }
        }, 1500);
    }
}

function skipHint() {
    if (currentHint < currentAnime.hints.length) {
        showNextHint();
    } else {
        alert('No more hints available!');
    }
}

function isCloseMatch(guess, answer) {
    // Simple fuzzy matching - remove common words and check similarity
    const cleanGuess = guess.replace(/[^\w]/g, '').toLowerCase();
    const cleanAnswer = answer.replace(/[^\w]/g, '').toLowerCase();
    
    return cleanGuess === cleanAnswer;
}

function handleEnterPress(event) {
    if (event.key === 'Enter') {
        submitGuess();
    }
}

function updateLeaderboard() {
    // Find existing player or add new one
    const existingPlayerIndex = leaderboard.findIndex(player => player.username === gameData.username);
    
    if (existingPlayerIndex !== -1) {
        // Update existing player's best score
        if (totalScore > leaderboard[existingPlayerIndex].score) {
            leaderboard[existingPlayerIndex].score = totalScore;
        }
    } else {
        // Add new player
        leaderboard.push({
            username: gameData.username,
            score: totalScore,
            malUsername: gameData.usernameMal
        });
    }
    
    // Sort by score (highest first) and keep top 10
    leaderboard.sort((a, b) => b.score - a.score);
    leaderboard = leaderboard.slice(0, 10);
    
    // Save to localStorage
    localStorage.setItem('animeQuizLeaderboard', JSON.stringify(leaderboard));
    
    // Update display
    displayLeaderboard();
}

function displayLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    leaderboardList.innerHTML = '';
    
    if (leaderboard.length === 0) {
        leaderboardList.innerHTML = '<li style="text-align: center; color: #718096;">No scores yet!</li>';
        return;
    }
    
    leaderboard.forEach((player, index) => {
        const listItem = document.createElement('li');
        listItem.className = 'leaderboard-item';
        
        const rankEmoji = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
        
        listItem.innerHTML = `
            <span class="leaderboard-rank">${rankEmoji}</span>
            <span class="leaderboard-name" title="${player.malUsername ? 'MAL: ' + player.malUsername : ''}">${player.username}</span>
            <span class="leaderboard-score">${player.score}</span>
        `;
        
        leaderboardList.appendChild(listItem);
    });
}

function backToSetup() {
    document.getElementById('quizSection').classList.remove('active');
    document.getElementById('setupForm').style.display = 'block';
}

// Initialize leaderboard display on page load
displayLeaderboard();