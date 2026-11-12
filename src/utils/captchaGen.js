const sharp = require("sharp");
const { AttachmentBuilder } = require("discord.js");

/**
 * توليد صورة كابتشا (PNG) عبر SVG + sharp
 * نفس روح التصميم القديم (خلفية داكنة متدرجة، إطار أحمر، توهج، ضوضاء)
 * لكن الأرقام تُرسم كأشكال هندسية (Seven-Segment Display) مباشرة
 * بدون أي اعتماد على خطوط — يحل مشكلة "□□□" (المربعات الفارغة)
 * التي تظهر على Railway بسبب عدم دعم الخطوط في librsvg/@font-face.
 */

// ── تعريف الأرقام 0-9 كشرائح Seven-Segment ──────────────────────
//   _a_
//  f|   |b
//   |_g_|
//  e|   |c
//   |_d_|
const SEGMENTS = {
  0: ["a", "b", "c", "d", "e", "f"],
  1: ["b", "c"],
  2: ["a", "b", "g", "e", "d"],
  3: ["a", "b", "g", "c", "d"],
  4: ["f", "g", "b", "c"],
  5: ["a", "f", "g", "c", "d"],
  6: ["a", "f", "g", "e", "c", "d"],
  7: ["a", "b", "c"],
  8: ["a", "b", "c", "d", "e", "f", "g"],
  9: ["a", "b", "c", "d", "f", "g"],
};

// رسم رقم واحد كمجموعة مستطيلات (segments) عند موضع (x, y) - أعلى يسار
function drawDigit(digit, x, y, w, h, color, t) {
  const segs = SEGMENTS[digit];
  const hh = h / 2; // نصف الارتفاع لكل جزء (علوي/سفلي)

  const rects = {
    a: [t, 0, w - 2 * t, t],                 // أعلى أفقي
    b: [w - t, t, t, hh - t],                // يمين علوي
    c: [w - t, hh + t, t, hh - t],           // يمين سفلي
    d: [t, h - t, w - 2 * t, t],             // أسفل أفقي
    e: [0, hh + t, t, hh - t],               // يسار سفلي
    f: [0, t, t, hh - t],                    // يسار علوي
    g: [t, hh - t / 2, w - 2 * t, t],        // أوسط أفقي
  };

  let svg = "";
  segs.forEach((seg) => {
    const [rx, ry, rw, rh] = rects[seg];
    const px = x + rx, py = y + ry;
    const r = Math.min(t / 2.2, rw / 2, rh / 2);
    svg += `<rect x="${px.toFixed(2)}" y="${py.toFixed(2)}" width="${rw.toFixed(2)}" height="${rh.toFixed(2)}" rx="${r.toFixed(2)}" fill="${color}" />`;
  });
  return svg;
}

async function generateCaptchaImage() {
  // أربعة أرقام فقط
  const code = String(Math.floor(1000 + Math.random() * 9000));

  const W = 320, H = 110;
  const radius = 12;

  // ── نقاط ضوضاء خفيفة ────────────────────────────────────────
  let noiseSvg = "";
  for (let i = 0; i < 180; i++) {
    const opacity = (Math.random() * 0.18 + 0.04).toFixed(2);
    const size = (Math.random() * 2 + 0.5).toFixed(2);
    const x = (Math.random() * W).toFixed(2);
    const y = (Math.random() * H).toFixed(2);
    noiseSvg += `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="rgba(232,54,60,${opacity})" />`;
  }

  // ── خطوط تشويش خفيفة (منحنيات بيزييه) ───────────────────────
  let linesSvg = "";
  for (let i = 0; i < 4; i++) {
    const opacity = (Math.random() * 0.12 + 0.06).toFixed(2);
    const strokeWidth = (Math.random() * 1.5 + 0.5).toFixed(2);
    const x0 = (Math.random() * W).toFixed(2);
    const y0 = (Math.random() * H).toFixed(2);
    const x1 = (Math.random() * W).toFixed(2);
    const y1 = (Math.random() * H).toFixed(2);
    const x2 = (Math.random() * W).toFixed(2);
    const y2 = (Math.random() * H).toFixed(2);
    const x3 = (Math.random() * W).toFixed(2);
    const y3 = (Math.random() * H).toFixed(2);
    linesSvg += `<path d="M ${x0} ${y0} C ${x1} ${y1}, ${x2} ${y2}, ${x3} ${y3}" stroke="rgba(232,54,60,${opacity})" stroke-width="${strokeWidth}" fill="none" />`;
  }

  // ── الأرقام (Seven-Segment) مع إزاحة ودوران خفيف ────────────
  const digits = code.split("");
  const digitW = 38, digitH = 56, thickness = 8;
  const spacing = 68;
  const startX = (W - spacing * (digits.length - 1)) / 2 - digitW / 2;
  const baseY = (H - digitH) / 2;

  let digitsSvg = "";
  digits.forEach((d, i) => {
    const x = startX + i * spacing;
    const y = baseY + (Math.random() * 8 - 4); // إزاحة عمودية خفيفة
    const angle = (Math.random() * 12 - 6).toFixed(2); // دوران طفيف
    const cx = x + digitW / 2;
    const cy = y + digitH / 2;

    digitsSvg += `<g transform="rotate(${angle} ${cx.toFixed(2)} ${cy.toFixed(2)})" filter="url(#glowFilter)">`;
    digitsSvg += drawDigit(parseInt(d, 10), x, y, digitW, digitH, "#ffffff", thickness);
    digitsSvg += `</g>`;
  });

  const svg = `
<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="bgGradient" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#0d0d14" />
      <stop offset="1" stop-color="#1a1a26" />
    </linearGradient>
    <radialGradient id="glow" cx="50%" cy="50%" r="70%">
      <stop offset="0" stop-color="rgba(232,54,60,0.08)" />
      <stop offset="1" stop-color="rgba(232,54,60,0)" />
    </radialGradient>
    <filter id="glowFilter" x="-50%" y="-50%" width="200%" height="200%">
      <feDropShadow dx="0" dy="0" stdDeviation="4" flood-color="#e8363c" flood-opacity="0.6" />
    </filter>
  </defs>

  <!-- خلفية متدرجة داكنة -->
  <rect width="${W}" height="${H}" fill="url(#bgGradient)" rx="${radius}" ry="${radius}" />

  <!-- توهج داخلي خفيف -->
  <rect width="${W}" height="${H}" fill="url(#glow)" rx="${radius}" ry="${radius}" />

  <!-- ضوضاء وخطوط تشويش -->
  ${noiseSvg}
  ${linesSvg}

  <!-- الأرقام -->
  ${digitsSvg}

  <!-- إطار أحمر بزوايا مستديرة -->
  <rect x="1" y="1" width="${W - 2}" height="${H - 2}" rx="${radius}" ry="${radius}"
        fill="none" stroke="#e8363c" stroke-width="2" />
</svg>`;

  const buffer = await sharp(Buffer.from(svg)).png().toBuffer();
  const attachment = new AttachmentBuilder(buffer, { name: "captcha.png" });

  return { code, attachment };
}

module.exports = { generateCaptchaImage };
