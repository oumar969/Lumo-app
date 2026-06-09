// Generates assets/icon.png (1024×1024), assets/adaptive-icon.png (1024×1024),
// and assets/splash-icon.png (200×200 white version for splash).
const { createCanvas } = require('@napi-rs/canvas');
const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'assets');

// ─── Sparkle path ────────────────────────────────────────────────────────────
// Draws the ✦ four-pointed sparkle centered at (cx, cy) with outer radius R.
// The waist radius r controls how "pinched" the star is.
function drawSparkle(ctx, cx, cy, R, r) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - R);
  ctx.quadraticCurveTo(cx + r, cy - r, cx + R, cy);
  ctx.quadraticCurveTo(cx + r, cy + r, cx, cy + R);
  ctx.quadraticCurveTo(cx - r, cy + r, cx - R, cy);
  ctx.quadraticCurveTo(cx - r, cy - r, cx, cy - R);
  ctx.closePath();
}

// ─── Main icon (1024×1024) ────────────────────────────────────────────────────
function generateIcon(size = 1024) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  // Background: dark radial gradient
  const bg = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, size * 0.72);
  bg.addColorStop(0,   '#2d0e5a');
  bg.addColorStop(0.45,'#1a0a2e');
  bg.addColorStop(1,   '#0a0a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  // Soft outer glow ring
  const glow = ctx.createRadialGradient(cx, cy, size * 0.18, cx, cy, size * 0.52);
  glow.addColorStop(0,   'rgba(167,139,250,0.18)');
  glow.addColorStop(1,   'rgba(167,139,250,0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, size, size);

  // Sparkle shadow / bloom
  ctx.save();
  ctx.shadowColor  = '#a78bfa';
  ctx.shadowBlur   = size * 0.18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  const sparkleGrad = ctx.createLinearGradient(cx, cy - size * 0.32, cx, cy + size * 0.32);
  sparkleGrad.addColorStop(0,   '#e0d0ff');
  sparkleGrad.addColorStop(0.5, '#a78bfa');
  sparkleGrad.addColorStop(1,   '#7c3aed');

  drawSparkle(ctx, cx, cy, size * 0.32, size * 0.04);
  ctx.fillStyle = sparkleGrad;
  ctx.fill();
  ctx.restore();

  // Thin inner sparkle highlight
  ctx.save();
  drawSparkle(ctx, cx, cy, size * 0.32, size * 0.04);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth   = 2;
  ctx.stroke();
  ctx.restore();

  // Small dot in center
  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.022, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  return canvas;
}

// ─── Adaptive icon (same design, no padding) ─────────────────────────────────
function generateAdaptiveIcon(size = 1024) {
  // Android adaptive icons show a 72dp circle; generate the full square
  // with extra padding so the sparkle doesn't get clipped when rounded.
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  const bg = ctx.createRadialGradient(cx, cy * 0.7, 0, cx, cy, size * 0.72);
  bg.addColorStop(0,   '#2d0e5a');
  bg.addColorStop(0.45,'#1a0a2e');
  bg.addColorStop(1,   '#0a0a0f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);

  ctx.save();
  ctx.shadowColor = '#a78bfa';
  ctx.shadowBlur  = size * 0.14;

  const sparkleGrad = ctx.createLinearGradient(cx, cy - size * 0.26, cx, cy + size * 0.26);
  sparkleGrad.addColorStop(0,   '#e0d0ff');
  sparkleGrad.addColorStop(0.5, '#a78bfa');
  sparkleGrad.addColorStop(1,   '#7c3aed');

  drawSparkle(ctx, cx, cy, size * 0.26, size * 0.032);
  ctx.fillStyle = sparkleGrad;
  ctx.fill();
  ctx.restore();

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.018, 0, Math.PI * 2);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  return canvas;
}

// ─── Splash icon (white on transparent, 200×200) ─────────────────────────────
function generateSplashIcon(size = 200) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  const cx = size / 2;
  const cy = size / 2;

  drawSparkle(ctx, cx, cy, size * 0.38, size * 0.05);
  ctx.fillStyle = '#ffffff';
  ctx.fill();

  ctx.beginPath();
  ctx.arc(cx, cy, size * 0.026, 0, Math.PI * 2);
  ctx.fillStyle = '#0a0a0f';
  ctx.fill();

  return canvas;
}

// ─── Write files ──────────────────────────────────────────────────────────────
function save(canvas, filename) {
  const buf = canvas.toBuffer('image/png');
  const dest = path.join(OUT, filename);
  fs.writeFileSync(dest, buf);
  console.log(`✓ ${filename}  (${(buf.length / 1024).toFixed(0)} KB)`);
}

save(generateIcon(),         'icon.png');
save(generateAdaptiveIcon(), 'adaptive-icon.png');
save(generateSplashIcon(),   'splash-icon.png');
console.log('Done — all icons written to assets/');
