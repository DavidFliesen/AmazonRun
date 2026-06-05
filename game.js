const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const restartBtn = document.getElementById('restartBtn');

const W = canvas.width;
const H = canvas.height;

const keys = new Set();
let running = false;
let gameOver = false;
let win = false;
let lastTime = 0;
let spawnTimer = 0;
let supplyTimer = 0;
let enemyTimer = 0;
let biomeDistance = 0;
let score = 0;
let message = 'Press Start Mission';

const boat = {
  x: W / 2,
  y: H - 105,
  w: 42,
  h: 70,
  speed: 270,
  boost: 100,
  fuel: 100,
  hull: 100,
  supplies: 0,
};

let obstacles = [];
let supplies = [];
let enemies = [];
let wakes = [];

function resetGame() {
  running = false;
  gameOver = false;
  win = false;
  lastTime = 0;
  spawnTimer = 0;
  supplyTimer = 0;
  enemyTimer = 0;
  biomeDistance = 0;
  score = 0;
  message = 'Press Start Mission';
  Object.assign(boat, { x: W / 2, y: H - 105, boost: 100, fuel: 100, hull: 100, supplies: 0 });
  obstacles = [];
  supplies = [];
  enemies = [];
  wakes = [];
  draw(0);
}

function startGame() {
  if (gameOver || win) resetGame();
  running = true;
  message = 'Mission: collect 10 supplies and survive to the extraction point.';
  requestAnimationFrame(loop);
}

function rand(min, max) { return Math.random() * (max - min) + min; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function riverBounds(y = boat.y) {
  const danger = clamp(biomeDistance / 5000, 0, 1);
  const center = W / 2 + Math.sin((biomeDistance + y) / 460) * 80 * danger;
  const width = 620 - danger * 270;
  return { left: center - width / 2, right: center + width / 2, center, width };
}

function currentBiome() {
  if (biomeDistance < 1800) return { name: 'Open River', danger: 1, color: '#176e7e' };
  if (biomeDistance < 3800) return { name: 'River Villages', danger: 1.25, color: '#126776' };
  if (biomeDistance < 6200) return { name: 'Jungle Channel', danger: 1.55, color: '#0f5b69' };
  return { name: 'Deep Amazon', danger: 1.9, color: '#0a4d5c' };
}

function loop(timestamp) {
  if (!running) return;
  const dt = Math.min((timestamp - lastTime) / 1000 || 0, 0.033);
  lastTime = timestamp;
  update(dt);
  draw(dt);
  if (running) requestAnimationFrame(loop);
}

function update(dt) {
  const biome = currentBiome();
  const scrollSpeed = 160 + biome.danger * 28;
  biomeDistance += scrollSpeed * dt;
  score += dt * 12;
  boat.fuel -= dt * 2.4;

  let vx = 0;
  let vy = 0;
  if (keys.has('arrowleft') || keys.has('a')) vx -= 1;
  if (keys.has('arrowright') || keys.has('d')) vx += 1;
  if (keys.has('arrowup') || keys.has('w')) vy -= 1;
  if (keys.has('arrowdown') || keys.has('s')) vy += 1;

  const boosting = keys.has(' ') && boat.boost > 0 && boat.fuel > 0;
  const speed = boat.speed + (boosting ? 180 : 0);
  if (boosting) {
    boat.boost -= dt * 28;
    boat.fuel -= dt * 4;
    score += dt * 8;
  } else {
    boat.boost = clamp(boat.boost + dt * 9, 0, 100);
  }

  boat.x += vx * speed * dt;
  boat.y += vy * speed * dt;
  boat.y = clamp(boat.y, 70, H - 55);

  const bounds = riverBounds();
  boat.x = clamp(boat.x, bounds.left + 24, bounds.right - 24);

  spawnTimer -= dt;
  supplyTimer -= dt;
  enemyTimer -= dt;

  if (spawnTimer <= 0) {
    spawnObstacle(biome);
    spawnTimer = rand(0.45, 1.1) / biome.danger;
  }
  if (supplyTimer <= 0) {
    spawnSupply();
    supplyTimer = rand(1.6, 3.0);
  }
  if (enemyTimer <= 0) {
    spawnEnemy(biome);
    enemyTimer = rand(5.5, 8.5) / biome.danger;
  }

  [...obstacles, ...supplies, ...enemies].forEach(obj => obj.y += scrollSpeed * dt);
  obstacles = obstacles.filter(o => o.y < H + 90);
  supplies = supplies.filter(s => s.y < H + 60);
  enemies = enemies.filter(e => e.y < H + 120 && e.hull > 0);

  enemies.forEach(e => {
    const chase = Math.sign(boat.x - e.x) * e.speed * dt;
    e.x += chase;
    e.y += e.chaseSpeed * dt;
  });

  wakes.push({ x: boat.x, y: boat.y + 34, life: 0.5 });
  wakes.forEach(w => w.life -= dt);
  wakes = wakes.filter(w => w.life > 0);

  obstacles.forEach(o => {
    if (collide(boat, o)) {
      o.y = H + 200;
      boat.hull -= o.damage;
      message = o.type === 'croc' ? 'Crocodile strike! Hull damaged.' : 'Impact! Watch the river hazards.';
    }
  });

  supplies.forEach(s => {
    if (collide(boat, s)) {
      s.y = H + 200;
      boat.supplies += 1;
      boat.fuel = clamp(boat.fuel + 12, 0, 100);
      boat.hull = clamp(boat.hull + 5, 0, 100);
      score += 120;
      message = `Supply crate recovered: ${boat.supplies}/10`;
    }
  });

  enemies.forEach(e => {
    if (collide(boat, e)) {
      e.y = H + 200;
      boat.hull -= 18;
      message = 'Raider boat rammed you!';
    }
  });

  if (boat.fuel <= 0) endGame(false, 'Out of fuel in the Amazon!');
  if (boat.hull <= 0) endGame(false, 'Your boat was destroyed!');
  if (boat.supplies >= 10 && biomeDistance > 7200) endGame(true, 'Extraction reached! Mission complete.');
}

function spawnObstacle(biome) {
  const b = riverBounds(-50);
  const typeRoll = Math.random();
  let type = 'log';
  if (biome.danger > 1.35 && typeRoll > 0.64) type = 'croc';
  else if (typeRoll > 0.72) type = 'rock';

  const size = type === 'log' ? rand(42, 88) : type === 'rock' ? rand(28, 52) : rand(44, 62);
  obstacles.push({
    x: rand(b.left + 40, b.right - 40),
    y: -70,
    w: size,
    h: type === 'log' ? 24 : size,
    type,
    damage: type === 'croc' ? 17 : type === 'rock' ? 15 : 10,
    rot: rand(-0.4, 0.4),
  });
}

function spawnSupply() {
  const b = riverBounds(-50);
  supplies.push({ x: rand(b.left + 45, b.right - 45), y: -50, w: 30, h: 30 });
}

function spawnEnemy(biome) {
  const b = riverBounds(-70);
  enemies.push({
    x: rand(b.left + 70, b.right - 70),
    y: -90,
    w: 46,
    h: 72,
    speed: rand(40, 85) * biome.danger,
    chaseSpeed: rand(16, 34),
    hull: 1,
  });
}

function collide(a, b) {
  return Math.abs(a.x - b.x) < (a.w + b.w) / 2 && Math.abs(a.y - b.y) < (a.h + b.h) / 2;
}

function endGame(success, msg) {
  running = false;
  gameOver = !success;
  win = success;
  message = msg;
  draw(0);
}

function draw() {
  const biome = currentBiome();
  ctx.clearRect(0, 0, W, H);
  drawJungle(biome);
  drawRiver(biome);
  drawWake();
  obstacles.forEach(drawObstacle);
  supplies.forEach(drawSupply);
  enemies.forEach(drawEnemy);
  drawBoat();
  drawHUD(biome);
  if (!running) drawOverlay();
}

function drawJungle(biome) {
  ctx.fillStyle = '#0b2613';
  ctx.fillRect(0, 0, W, H);
  const danger = clamp(biomeDistance / 5000, 0, 1);
  for (let i = 0; i < 34; i++) {
    const side = i % 2 === 0 ? 0 : W;
    const x = side + (side === 0 ? rand(-20, 90) : rand(-90, 20));
    const y = (i * 73 + biomeDistance * 0.35) % (H + 120) - 60;
    ctx.fillStyle = i % 3 === 0 ? '#174d23' : '#1d642b';
    ctx.beginPath();
    ctx.arc(x, y, 38 + danger * 18, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRiver(biome) {
  ctx.fillStyle = biome.color;
  ctx.beginPath();
  for (let y = -20; y <= H + 20; y += 20) {
    const b = riverBounds(y);
    if (y === -20) ctx.moveTo(b.left, y);
    else ctx.lineTo(b.left, y);
  }
  for (let y = H + 20; y >= -20; y -= 20) {
    const b = riverBounds(y);
    ctx.lineTo(b.right, y);
  }
  ctx.closePath();
  ctx.fill();

  ctx.strokeStyle = 'rgba(255,255,255,0.16)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 10; i++) {
    const y = (i * 70 + biomeDistance * 0.8) % (H + 80) - 40;
    const b = riverBounds(y);
    ctx.beginPath();
    ctx.moveTo(b.left + 80, y);
    ctx.quadraticCurveTo(b.center, y + 18, b.right - 80, y);
    ctx.stroke();
  }
}

function drawWake() {
  wakes.forEach(w => {
    ctx.globalAlpha = w.life;
    ctx.strokeStyle = 'white';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(w.x - 18, w.y);
    ctx.lineTo(w.x - 42, w.y + 22);
    ctx.moveTo(w.x + 18, w.y);
    ctx.lineTo(w.x + 42, w.y + 22);
    ctx.stroke();
    ctx.globalAlpha = 1;
  });
}

function drawBoat() {
  ctx.save();
  ctx.translate(boat.x, boat.y);
  ctx.fillStyle = '#9b4a20';
  ctx.beginPath();
  ctx.moveTo(0, -boat.h / 2);
  ctx.lineTo(boat.w / 2, 10);
  ctx.lineTo(boat.w / 3, boat.h / 2);
  ctx.lineTo(-boat.w / 3, boat.h / 2);
  ctx.lineTo(-boat.w / 2, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f1d59b';
  ctx.fillRect(-13, -12, 26, 28);
  ctx.fillStyle = '#303030';
  ctx.fillRect(-9, 26, 18, 12);
  ctx.restore();
}

function drawObstacle(o) {
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate(o.rot || 0);
  if (o.type === 'log') {
    ctx.fillStyle = '#7a4a24';
    ctx.fillRect(-o.w / 2, -o.h / 2, o.w, o.h);
    ctx.fillStyle = '#4c2e17';
    ctx.fillRect(-o.w / 2 + 6, -o.h / 2 + 4, o.w - 12, 4);
  } else if (o.type === 'rock') {
    ctx.fillStyle = '#6f7772';
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 2, 0, 0, Math.PI * 2);
    ctx.fill();
  } else {
    ctx.fillStyle = '#315f25';
    ctx.beginPath();
    ctx.ellipse(0, 0, o.w / 2, o.h / 3, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#f7e2b5';
    ctx.fillRect(-8, -5, 4, 3);
    ctx.fillRect(4, -5, 4, 3);
  }
  ctx.restore();
}

function drawSupply(s) {
  ctx.fillStyle = '#f6c94f';
  ctx.fillRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  ctx.strokeStyle = '#614700';
  ctx.lineWidth = 3;
  ctx.strokeRect(s.x - s.w / 2, s.y - s.h / 2, s.w, s.h);
  ctx.beginPath();
  ctx.moveTo(s.x - 10, s.y);
  ctx.lineTo(s.x + 10, s.y);
  ctx.moveTo(s.x, s.y - 10);
  ctx.lineTo(s.x, s.y + 10);
  ctx.stroke();
}

function drawEnemy(e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  ctx.fillStyle = '#4a1d1d';
  ctx.beginPath();
  ctx.moveTo(0, -e.h / 2);
  ctx.lineTo(e.w / 2, 8);
  ctx.lineTo(e.w / 3, e.h / 2);
  ctx.lineTo(-e.w / 3, e.h / 2);
  ctx.lineTo(-e.w / 2, 8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#d63b31';
  ctx.fillRect(-13, -8, 26, 20);
  ctx.restore();
}

function drawHUD(biome) {
  drawBar(18, 18, 180, 14, boat.hull, '#dd584a', 'Hull');
  drawBar(18, 42, 180, 14, boat.fuel, '#f0c04e', 'Fuel');
  drawBar(18, 66, 180, 14, boat.boost, '#68d4ff', 'Boost');

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(W - 285, 16, 265, 92);
  ctx.fillStyle = '#eef8d8';
  ctx.font = '18px system-ui';
  ctx.fillText(`Biome: ${biome.name}`, W - 270, 42);
  ctx.fillText(`Supplies: ${boat.supplies}/10`, W - 270, 68);
  ctx.fillText(`Score: ${Math.floor(score)}`, W - 270, 94);

  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  ctx.fillRect(18, H - 42, W - 36, 26);
  ctx.fillStyle = '#fff6bf';
  ctx.font = '16px system-ui';
  ctx.fillText(message, 30, H - 23);
}

function drawBar(x, y, w, h, value, color, label) {
  ctx.fillStyle = 'rgba(0,0,0,0.48)';
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * clamp(value / 100, 0, 1), h);
  ctx.strokeStyle = 'rgba(255,255,255,0.55)';
  ctx.strokeRect(x, y, w, h);
  ctx.fillStyle = '#eef8d8';
  ctx.font = '12px system-ui';
  ctx.fillText(label, x + w + 8, y + 12);
}

function drawOverlay() {
  ctx.fillStyle = 'rgba(0,0,0,0.58)';
  ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = win ? '#f6c94f' : '#eef8d8';
  ctx.textAlign = 'center';
  ctx.font = '48px system-ui';
  ctx.fillText(win ? 'Mission Complete!' : gameOver ? 'Mission Failed' : 'Amazon Run', W / 2, H / 2 - 38);
  ctx.font = '22px system-ui';
  ctx.fillText(message, W / 2, H / 2 + 4);
  ctx.font = '18px system-ui';
  ctx.fillText('Use Arrow Keys/WASD. Spacebar boosts.', W / 2, H / 2 + 40);
  ctx.textAlign = 'left';
}

window.addEventListener('keydown', e => keys.add(e.key.toLowerCase()));
window.addEventListener('keyup', e => keys.delete(e.key.toLowerCase()));
startBtn.addEventListener('click', startGame);
restartBtn.addEventListener('click', resetGame);

resetGame();
