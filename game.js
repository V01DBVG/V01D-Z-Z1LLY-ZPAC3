const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const scoreEl = document.getElementById('score');
const livesEl = document.getElementById('lives');
const bestEl = document.getElementById('best');
const stateEl = document.getElementById('state');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');

const laneCount = 3;
const laneWidth = canvas.width / laneCount;
const groundY = canvas.height - 72;
const gravity = 0.6;

let gameState = 'ready';
let score = 0;
let lives = 3;
let best = Number(localStorage.getItem('cookie-kingdom-best') || 0);
let speed = 5;
let frames = 0;

const keys = {
  left: false,
  right: false
};

const player = {
  lane: 1,
  x: laneWidth * 1 + laneWidth / 2,
  y: groundY,
  vy: 0,
  width: 52,
  height: 58,
  onGround: true,
  invulnerableFrames: 0
};

let obstacles = [];
let jellies = [];

bestEl.textContent = best;

function setState(value) {
  gameState = value;
  stateEl.textContent = value[0].toUpperCase() + value.slice(1);
}

function laneToX(lane) {
  return lane * laneWidth + laneWidth / 2;
}

function resetGame() {
  score = 0;
  lives = 3;
  speed = 5;
  frames = 0;
  obstacles = [];
  jellies = [];
  player.lane = 1;
  player.x = laneToX(player.lane);
  player.y = groundY;
  player.vy = 0;
  player.onGround = true;
  player.invulnerableFrames = 0;
  scoreEl.textContent = score;
  livesEl.textContent = lives;
  setState('running');
  restartBtn.disabled = false;
}

function spawnObstacle() {
  const lane = Math.floor(Math.random() * laneCount);
  const type = Math.random() < 0.35 ? 'tower' : 'spike';
  const size = type === 'tower'
    ? { w: 48, h: 92 }
    : { w: 52, h: 40 };

  obstacles.push({
    lane,
    x: laneToX(lane),
    y: groundY,
    width: size.w,
    height: size.h,
    type,
    passed: false
  });
}

function spawnJelly() {
  const lane = Math.floor(Math.random() * laneCount);
  jellies.push({
    lane,
    x: laneToX(lane),
    y: groundY - 42 - Math.random() * 65,
    radius: 13,
    collected: false
  });
}

function updateEntities() {
  if (keys.left) {
    player.lane = Math.max(0, player.lane - 1);
    keys.left = false;
  }

  if (keys.right) {
    player.lane = Math.min(laneCount - 1, player.lane + 1);
    keys.right = false;
  }

  const targetX = laneToX(player.lane);
  player.x += (targetX - player.x) * 0.32;

  player.vy += gravity;
  player.y += player.vy;

  if (player.y >= groundY) {
    player.y = groundY;
    player.vy = 0;
    player.onGround = true;
  }

  if (player.invulnerableFrames > 0) {
    player.invulnerableFrames -= 1;
  }

  for (const obstacle of obstacles) {
    obstacle.y += speed;
  }

  for (const jelly of jellies) {
    jelly.y += speed;
  }

  obstacles = obstacles.filter(item => item.y - item.height / 2 < canvas.height + 12);
  jellies = jellies.filter(item => item.y - item.radius < canvas.height + 12 && !item.collected);
}

function intersectsRect(a, b) {
  return Math.abs(a.x - b.x) * 2 < (a.width + b.width)
    && Math.abs(a.y - b.y) * 2 < (a.height + b.height);
}

function updateCollisions() {
  const playerHitbox = {
    x: player.x,
    y: player.y - player.height / 2,
    width: player.width * 0.72,
    height: player.height * 0.9
  };

  for (const obstacle of obstacles) {
    const obstacleHitbox = {
      x: obstacle.x,
      y: obstacle.y - obstacle.height / 2,
      width: obstacle.width,
      height: obstacle.height
    };

    if (!obstacle.passed && obstacle.y > player.y + obstacle.height) {
      obstacle.passed = true;
      score += 10;
      scoreEl.textContent = score;
    }

    if (player.invulnerableFrames === 0 && intersectsRect(playerHitbox, obstacleHitbox)) {
      lives -= 1;
      livesEl.textContent = lives;
      player.invulnerableFrames = 70;
      if (lives <= 0) {
        endGame();
      }
    }
  }

  for (const jelly of jellies) {
    const dx = player.x - jelly.x;
    const dy = (player.y - player.height / 2) - jelly.y;
    const distance = Math.hypot(dx, dy);

    if (!jelly.collected && distance < jelly.radius + player.width * 0.3) {
      jelly.collected = true;
      score += 15;
      scoreEl.textContent = score;
    }
  }
}

function endGame() {
  setState('game over');
  if (score > best) {
    best = score;
    localStorage.setItem('cookie-kingdom-best', String(best));
    bestEl.textContent = best;
  }
}

function drawBackground() {
  ctx.save();
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  for (let i = 1; i < laneCount; i += 1) {
    const x = i * laneWidth;
    ctx.fillRect(x - 2, 0, 4, canvas.height);
  }

  ctx.fillStyle = '#f4a460';
  ctx.fillRect(0, groundY, canvas.width, canvas.height - groundY);

  ctx.fillStyle = '#e18d52';
  for (let x = 0; x < canvas.width; x += 36) {
    ctx.fillRect(x, groundY + 20, 22, 8);
  }
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  if (player.invulnerableFrames > 0 && Math.floor(player.invulnerableFrames / 6) % 2 === 0) {
    ctx.globalAlpha = 0.45;
  }

  const px = player.x;
  const py = player.y;

  ctx.fillStyle = '#c97f39';
  ctx.beginPath();
  ctx.roundRect(px - 26, py - 58, 52, 58, 18);
  ctx.fill();

  ctx.fillStyle = '#f6d09f';
  ctx.beginPath();
  ctx.roundRect(px - 23, py - 52, 46, 46, 16);
  ctx.fill();

  ctx.fillStyle = '#3f2d1d';
  ctx.beginPath();
  ctx.arc(px - 10, py - 32, 4, 0, Math.PI * 2);
  ctx.arc(px + 10, py - 32, 4, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = '#3f2d1d';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(px, py - 20, 8, 0.1, Math.PI - 0.1);
  ctx.stroke();
  ctx.restore();
}

function drawObstacle(obstacle) {
  ctx.save();
  if (obstacle.type === 'tower') {
    ctx.fillStyle = '#6e3b24';
    ctx.fillRect(obstacle.x - obstacle.width / 2, obstacle.y - obstacle.height, obstacle.width, obstacle.height);
    ctx.fillStyle = '#8a4f2e';
    ctx.fillRect(obstacle.x - obstacle.width / 2 - 6, obstacle.y - obstacle.height, 12, obstacle.height);
  } else {
    ctx.fillStyle = '#8d2b2b';
    const x = obstacle.x;
    const y = obstacle.y;
    const w = obstacle.width;
    const h = obstacle.height;
    ctx.beginPath();
    ctx.moveTo(x - w / 2, y);
    ctx.lineTo(x, y - h);
    ctx.lineTo(x + w / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function drawJelly(jelly) {
  ctx.save();
  ctx.fillStyle = '#44f7dc';
  ctx.beginPath();
  ctx.arc(jelly.x, jelly.y, jelly.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,255,255,0.45)';
  ctx.beginPath();
  ctx.arc(jelly.x - 4, jelly.y - 4, jelly.radius * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTexts() {
  if (gameState === 'ready') {
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 36px Trebuchet MS';
    ctx.fillText('Press Start Run', canvas.width / 2 - 130, canvas.height / 2);
  }

  if (gameState === 'game over') {
    ctx.fillStyle = 'rgba(0,0,0,0.58)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffdf95';
    ctx.font = 'bold 48px Trebuchet MS';
    ctx.fillText('Game Over', canvas.width / 2 - 125, canvas.height / 2 - 8);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 26px Trebuchet MS';
    ctx.fillText(`Final Score: ${score}`, canvas.width / 2 - 90, canvas.height / 2 + 36);
  }

  if (gameState === 'paused') {
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 42px Trebuchet MS';
    ctx.fillText('Paused', canvas.width / 2 - 70, canvas.height / 2);
  }
}

function update() {
  drawBackground();

  if (gameState === 'running') {
    frames += 1;

    if (frames % 55 === 0) {
      spawnObstacle();
    }

    if (frames % 70 === 0) {
      spawnJelly();
    }

    if (frames % 360 === 0) {
      speed += 0.35;
    }

    updateEntities();
    updateCollisions();
  }

  for (const obstacle of obstacles) {
    drawObstacle(obstacle);
  }

  for (const jelly of jellies) {
    drawJelly(jelly);
  }

  drawPlayer();
  drawTexts();

  requestAnimationFrame(update);
}

function jump() {
  if (gameState === 'running' && player.onGround) {
    player.vy = -12.8;
    player.onGround = false;
  }
}

window.addEventListener('keydown', event => {
  const key = event.key.toLowerCase();
  if (['arrowleft', 'a'].includes(key)) {
    keys.left = true;
  }
  if (['arrowright', 'd'].includes(key)) {
    keys.right = true;
  }
  if (['arrowup', 'w', ' '].includes(key)) {
    event.preventDefault();
    jump();
  }
  if (key === 'p' && ['running', 'paused'].includes(gameState)) {
    setState(gameState === 'running' ? 'paused' : 'running');
  }
});

startBtn.addEventListener('click', () => {
  resetGame();
});

restartBtn.addEventListener('click', () => {
  resetGame();
});

update();
