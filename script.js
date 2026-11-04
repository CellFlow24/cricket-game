const canvas = document.getElementById('game-canvas');
const ctx = canvas.getContext('2d');
const startScreen = document.getElementById('start-screen');
const startBtn = document.getElementById('start-btn');
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');

// Responsive Canvas Size
function resize() {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
}
window.addEventListener('resize', resize);
resize();

// Core Game Variables
let gameLoop;
let isPlaying = false;
let score = 0;
let highScore = localStorage.getItem('cellflow_cricket_highscore') || 0;
highScoreDisplay.textContent = `Best: ${highScore}`;

// Game Objects
let bat = { y: 0, swingTimer: 0 };
let ball = { x: 0, y: 0, radius: 6, speed: 0, status: 'idle' }; // statuses: idle, bowled, hit
let hitDirection = 'straight';

// Touch tracking
let touchStartX = 0;

function initGame() {
    score = 0;
    scoreDisplay.textContent = `Score: ${score}`;
    isPlaying = true;
    startScreen.classList.add('hidden');
    bowl();
    requestAnimationFrame(update);
}

function bowl() {
    ball.x = canvas.width / 2;
    ball.y = -20; // Start slightly off-screen
    // The speed increases subtly as the score goes up to build difficulty
    ball.speed = 6 + (score * 0.4); 
    ball.status = 'bowled';
}

function update() {
    if (!isPlaying) return;

    // 1. Clear the canvas for the next frame
    ctx.fillStyle = '#222';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 2. Draw Pitch Elements (Crease and Stumps)
    bat.y = canvas.height - 120; // The hitting zone

    // Crease line
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(20, bat.y);
    ctx.lineTo(canvas.width - 20, bat.y);
    ctx.stroke();

    // Stumps (Three simple blocks)
    ctx.fillStyle = '#ffaa00';
    let stumpX = canvas.width / 2;
    ctx.fillRect(stumpX - 15, bat.y + 10, 6, 35);
    ctx.fillRect(stumpX - 3, bat.y + 10, 6, 35);
    ctx.fillRect(stumpX + 9, bat.y + 10, 6, 35);

    // 3. Ball Physics & Logic
    if (ball.status === 'bowled') {
        ball.y += ball.speed; // Move down
        
        // Missed the ball!
        if (ball.y > bat.y + 20) {
            gameOver();
        }
    } else if (ball.status === 'hit') {
        // Move the ball back up depending on the swipe
        ball.y -= ball.speed * 1.5;
        if (hitDirection === 'left') ball.x -= ball.speed;
        if (hitDirection === 'right') ball.x += ball.speed;
        
        // Reset for next ball when it flies off screen
        if (ball.y < -20) {
            score++;
            scoreDisplay.textContent = `Score: ${score}`;
            bowl();
        }
    }

    // 4. Draw Ball
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fillStyle = '#f00'; // Classic red ball
    ctx.fill();
    ctx.closePath();

    // 5. Draw Bat Swing Visual
    if (bat.swingTimer > 0) {
        ctx.fillStyle = '#fff';
        // A quick flash of the "bat" across the crease
        ctx.fillRect(canvas.width / 2 - 40, bat.y - 10, 80, 8);
        bat.swingTimer--;
    }

    // Loop
    gameLoop = requestAnimationFrame(update);
}

function attemptHit(swipeDirection) {
    if (!isPlaying || ball.status !== 'bowled') return;
    
    bat.swingTimer = 8; // Frames to show the bat swing
    hitDirection = swipeDirection;

    // THE TIMING WINDOW: How close the ball is to the crease when tapped
    const distance = Math.abs(ball.y - bat.y);
    
    // If the ball is within 40 pixels of the crease, it's a successful hit
    if (distance < 40) {
        ball.status = 'hit';
        
        // Trigger haptic feedback if the browser supports it
        if (navigator.vibrate) {
            navigator.vibrate(40); 
        }
    } 
    // If swung too early/late, the ball continues downwards to hit the stumps
}

function gameOver() {
    isPlaying = false;
    startScreen.classList.remove('hidden');
    
    // Update UI text
    document.querySelector('#start-screen h1').textContent = 'OUT!';
    document.querySelector('#start-screen p').textContent = `Final Score: ${score}`;
    startBtn.textContent = 'RETRY';

    // Save High Score
    if (score > highScore) {
        highScore = score;
        localStorage.setItem('cellflow_cricket_highscore', highScore);
        highScoreDisplay.textContent = `Best: ${highScore}`;
    }
}

// --- Event Listeners ---

startBtn.addEventListener('click', initGame);

// Touch inputs for mobile devices
canvas.addEventListener('touchstart', e => {
    e.preventDefault(); // Stop scrolling
    if(!isPlaying) return;
    touchStartX = e.changedTouches[0].screenX;
}, {passive: false});

canvas.addEventListener('touchend', e => {
    e.preventDefault();
    if(!isPlaying) return;
    let touchEndX = e.changedTouches[0].screenX;
    let dx = touchEndX - touchStartX;
    
    let direction = 'straight';
    if (Math.abs(dx) > 30) {
        direction = dx > 0 ? 'right' : 'left';
    }
    
    attemptHit(direction);
}, {passive: false});

// Mouse fallback for testing on a computer without a touchscreen
canvas.addEventListener('mousedown', e => {
    if(!isPlaying) return;
    // Simple logic for mouse: left click left side of screen for left hit, etc.
    let rect = canvas.getBoundingClientRect();
    let clickX = e.clientX - rect.left;
    
    let direction = 'straight';
    if (clickX < canvas.width / 3) direction = 'left';
    else if (clickX > (canvas.width / 3) * 2) direction = 'right';
    
    attemptHit(direction);
});
