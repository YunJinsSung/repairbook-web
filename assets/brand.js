// 리페어북 브랜드: 로고 마크 + 키트 패키지 렌더
// 마크: 펼친 책(= 펼친 노트북). 왼쪽 면은 선, 오른쪽 면은 채움 → "하나 더 채운다"
(function () {
  const mark = (tile = "#36454f", fg = "#ffffff") =>
    `<svg viewBox="0 0 40 40" aria-hidden="true"><rect width="40" height="40" rx="9" fill="${tile}"/>` +
    `<path d="M9.5 13.5 L20 16.6 V30 L9.5 26.9 Z" fill="none" stroke="${fg}" stroke-width="1.9" stroke-linejoin="round"/>` +
    `<path d="M20 16.6 L30.5 13.5 V26.9 L20 30 Z" fill="${fg}" stroke="${fg}" stroke-width="1.9" stroke-linejoin="round"/></svg>`;

  // 9x9 가짜 QR (장식용)
  const qr = (x, y, s) => {
    const bits = "111010111100101001101110101110010010000111101011001011100101111100111010101011";
    let r = "";
    const sq = (cx, cy) => `<rect x="${x + cx * s}" y="${y + cy * s}" width="${s * 3}" height="${s * 3}" fill="none" stroke="#36454f" stroke-width="${s * 0.8}"/><rect x="${x + (cx + 1) * s}" y="${y + (cy + 1) * s}" width="${s}" height="${s}" fill="#36454f"/>`;
    for (let i = 0; i < 81; i++) {
      const cx = i % 9, cy = Math.floor(i / 9);
      if ((cx < 3 && cy < 3) || (cx > 5 && cy < 3) || (cx < 3 && cy > 5)) continue;
      if (bits[i % bits.length] === "1") r += `<rect x="${x + cx * s}" y="${y + cy * s}" width="${s}" height="${s}" fill="#36454f"/>`;
    }
    return r + sq(0, 0) + sq(6, 0) + sq(0, 6);
  };

  const word = (x, y, size, fill, anchor = "middle", sp = ".32em") =>
    `<text x="${x}" y="${y}" text-anchor="${anchor}" font-family="Inter Tight, Pretendard Variable, sans-serif" font-weight="500" font-size="${size}" letter-spacing="${sp}" fill="${fill}">REPAIRBOOK</text>`;

  // 닫힌 상자 (3/4 시점)
  const box = `<svg class="kit-render" viewBox="0 0 640 480" role="img" aria-label="리페어북 저장공간 추가 키트 상자">
  <defs>
    <linearGradient id="bxTop" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#4d5d68"/><stop offset="1" stop-color="#36454f"/></linearGradient>
    <linearGradient id="bxL" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#303d46"/><stop offset="1" stop-color="#263038"/></linearGradient>
    <linearGradient id="bxR" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f282e"/><stop offset="1" stop-color="#252f36"/></linearGradient>
    <linearGradient id="bxLabel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e4e6e8"/><stop offset="1" stop-color="#bfc4c8"/></linearGradient>
    <filter id="bxBlur" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <ellipse cx="330" cy="392" rx="215" ry="34" fill="#1b2328" opacity=".32" filter="url(#bxBlur)"/>
  <path d="M140 200 L330 135 L500 200 L310 265Z" fill="url(#bxTop)"/>
  <path d="M140 200 L310 265 L310 395 L140 330Z" fill="url(#bxL)"/>
  <path d="M310 265 L500 200 L500 330 L310 395Z" fill="url(#bxR)"/>
  <path d="M140 234 L310 299 L500 234" fill="none" stroke="#151c21" stroke-width="1.4"/>
  <path d="M140 236 L310 301 L500 236" fill="none" stroke="#ffffff" stroke-opacity=".07" stroke-width="1"/>
  <path d="M140 200 L310 265 L500 200" fill="none" stroke="#ffffff" stroke-opacity=".22" stroke-width="1.2"/>
  <path d="M310 265 V395" stroke="#ffffff" stroke-opacity=".08"/>
  <g transform="matrix(.85 .325 -.95 .325 330 135)">
    <g transform="translate(34 84)">${mark("rgba(255,255,255,.92)", "#3a4953").replace("<svg", '<svg width="30" height="30"')}</g>
    <text x="74" y="104" font-family="Inter Tight, sans-serif" font-weight="500" font-size="13" letter-spacing="2.6" fill="#f1f3f4">REPAIRBOOK</text>
    <text x="75" y="118" font-family="Inter Tight, sans-serif" font-size="6.4" letter-spacing="2.6" fill="#b5bdc2">STORAGE  UPGRADE  KIT</text>
  </g>
  <g transform="matrix(.85 .325 0 1 140 200)">
    <rect x="22" y="54" width="132" height="56" rx="2" fill="url(#bxLabel)"/>
    <text x="32" y="70" font-family="Inter Tight, sans-serif" font-size="6.5" letter-spacing="1.6" fill="#5f6c74">MODEL</text>
    <text x="32" y="86" font-family="Inter Tight, sans-serif" font-weight="600" font-size="12" letter-spacing=".8" fill="#36454f">NT940XGK</text>
    <text x="32" y="101" font-family="Inter Tight, sans-serif" font-size="7.5" letter-spacing="1" fill="#36454f">NVMe M.2 · 1TB</text>
    <rect x="128" y="62" width="16" height="16" fill="none" stroke="#36454f" stroke-width="1"/>
    <rect x="132" y="66" width="8" height="8" fill="#36454f"/>
  </g>
  <g transform="matrix(.95 -.325 0 1 310 265)" opacity=".75">
    <g transform="translate(18 62)">${mark("rgba(255,255,255,.16)", "#c0c0c0").replace("<svg", '<svg width="16" height="16"')}</g>
    <text x="42" y="74" font-family="Inter Tight, sans-serif" font-size="7" letter-spacing="2.4" fill="#c0c0c0">FIX · ADD · KEEP</text>
    <text x="18" y="112" font-family="Inter Tight, sans-serif" font-size="6" letter-spacing="1.6" fill="#8b969d">RB-KIT · ORDER NO. PRINTED INSIDE</text>
  </g>
</svg>`;

  // 펼친 키트 (위에서 본 구성)
  const n = (x, y, t) => `<g transform="translate(${x} ${y})"><circle r="11" fill="#ffffff"/><text y="4" text-anchor="middle" font-family="Inter Tight, sans-serif" font-weight="600" font-size="11" fill="#36454f">${t}</text></g>`;
  const screw = (cx, cy) => `<circle cx="${cx}" cy="${cy}" r="9" fill="url(#kMetal)"/><path d="M${cx - 4} ${cy}h8M${cx} ${cy - 4}v8" stroke="#6b7880" stroke-width="1.6"/>`;
  const open = `<svg class="kit-render" viewBox="0 0 1000 640" role="img" aria-label="키트 구성: 상자 뚜껑과 트레이 안의 SSD, 드라이버, 헤라, 손목 밴드, 나사 매트, 카드">
  <defs>
    <linearGradient id="kLid" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#465661"/><stop offset="1" stop-color="#303d45"/></linearGradient>
    <linearGradient id="kMetal" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f1f2f3"/><stop offset=".5" stop-color="#a7afb4"/><stop offset="1" stop-color="#d9dcdf"/></linearGradient>
    <linearGradient id="kLabel" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e6e8ea"/><stop offset="1" stop-color="#c3c8cb"/></linearGradient>
    <filter id="kShadow" x="-10%" y="-10%" width="120%" height="125%"><feDropShadow dx="0" dy="8" stdDeviation="10" flood-color="#1b2328" flood-opacity=".28"/></filter>
    <filter id="kSoft" x="-10%" y="-10%" width="120%" height="130%"><feDropShadow dx="0" dy="2" stdDeviation="2" flood-color="#000" flood-opacity=".35"/></filter>
  </defs>

  <g transform="rotate(-4 190 300)" filter="url(#kShadow)">
    <rect x="40" y="70" width="300" height="460" rx="6" fill="url(#kLid)"/>
    <rect x="52" y="82" width="276" height="436" rx="3" fill="none" stroke="#ffffff" stroke-opacity=".06"/>
    <g transform="translate(160 214)">${mark("rgba(255,255,255,.93)", "#3a4953").replace("<svg", '<svg width="60" height="60"')}</g>
    ${word(190, 318, 19, "#f1f3f4")}
    <text x="190" y="342" text-anchor="middle" font-family="Inter Tight, sans-serif" font-size="9" letter-spacing="3.6" fill="#aab3b9">STORAGE UPGRADE KIT</text>
    <rect x="80" y="440" width="220" height="50" rx="2" fill="url(#kLabel)"/>
    <text x="96" y="459" font-family="Inter Tight, sans-serif" font-size="8" letter-spacing="2" fill="#5f6c74">MODEL · ORDER</text>
    <text x="96" y="479" font-family="Inter Tight, sans-serif" font-weight="600" font-size="14" letter-spacing="1" fill="#36454f">NT940XGK · 1TB</text>
  </g>

  <g filter="url(#kShadow)"><rect x="390" y="40" width="570" height="560" rx="6" fill="#2c3840"/></g>
  <rect x="406" y="56" width="538" height="528" rx="3" fill="#222b31"/>

  <rect x="430" y="80" width="340" height="104" rx="5" fill="#161c20"/>
  <g filter="url(#kSoft)">
    <rect x="446" y="94" width="308" height="76" rx="3" fill="#1a1f23"/>
    <rect x="470" y="104" width="200" height="56" rx="1.5" fill="url(#kLabel)"/>
    <text x="482" y="126" font-family="Inter Tight, sans-serif" font-weight="600" font-size="12" letter-spacing=".6" fill="#36454f">NVMe M.2 2280</text>
    <text x="482" y="145" font-family="Inter Tight, sans-serif" font-size="9.5" letter-spacing="1" fill="#5f6c74">1TB · PCIe Gen4</text>
    <g transform="translate(640 112)">${mark("#36454f", "#e6e8ea").replace("<svg", '<svg width="20" height="20"')}</g>
    <rect x="684" y="110" width="26" height="18" fill="#2b3237"/><rect x="684" y="134" width="26" height="18" fill="#2b3237"/>
    <rect x="736" y="98" width="16" height="68" fill="#c9a24a"/>
    <rect x="736" y="140" width="16" height="5" fill="#161c20"/>
    <circle cx="446" cy="132" r="6" fill="#161c20"/>
  </g>

  <rect x="792" y="80" width="128" height="104" rx="5" fill="#161c20"/>
  <g filter="url(#kSoft)">${screw(830, 122)}${screw(860, 146)}</g>
  <text x="856" y="174" text-anchor="middle" font-family="Inter Tight, sans-serif" font-size="8" letter-spacing="1.6" fill="#6b7880">SPARE ×2</text>

  <rect x="430" y="204" width="490" height="58" rx="29" fill="#161c20"/>
  <g filter="url(#kSoft)">
    <rect x="446" y="216" width="214" height="34" rx="17" fill="url(#kMetal)"/>
    ${Array.from({ length: 14 }, (_, i) => `<path d="M${478 + i * 7} 219v28" stroke="#36454f" stroke-opacity=".16"/>`).join("")}
    <rect x="652" y="218" width="16" height="30" rx="3" fill="#36454f"/>
    <rect x="668" y="229" width="140" height="8" fill="#b8bec3"/>
    <path d="M808 229 L826 231 V235 L808 237Z" fill="#8f989e"/>
    ${[848, 872, 896].map((x) => `<path d="M${x} 222 l6 -3 l6 3 v20 l-6 3 l-6 -3Z" fill="url(#kMetal)"/>`).join("")}
  </g>

  <rect x="430" y="284" width="304" height="82" rx="5" fill="#161c20"/>
  <g filter="url(#kSoft)">
    <path d="M446 316 H610 L640 324 L610 332 H446 Q440 324 446 316Z" fill="#e4e6e8"/>
    <path d="M674 304 Q694 292 714 304 Q710 332 694 350 Q678 332 674 304Z" fill="#c0c0c0"/>
  </g>

  <rect x="756" y="284" width="164" height="168" rx="10" fill="#161c20"/>
  <g filter="url(#kSoft)">
    <circle cx="838" cy="366" r="50" fill="none" stroke="#3b4851" stroke-width="16"/>
    <circle cx="838" cy="366" r="50" fill="none" stroke="#ffffff" stroke-opacity=".08" stroke-width="1" stroke-dasharray="3 5"/>
    <rect x="858" y="404" width="34" height="18" rx="3" fill="url(#kMetal)"/>
  </g>

  <g filter="url(#kSoft)">
    <g transform="rotate(-1.5 580 445)">
      <rect x="430" y="388" width="306" height="112" rx="3" fill="#f6f7f8"/>
      <text x="446" y="408" font-family="Inter Tight, sans-serif" font-size="8.5" letter-spacing="2" fill="#5f6c74">SCREW MAP · NT940XGK</text>
      ${Array.from({ length: 7 }, (_, i) => `<circle cx="${462 + i * 40}" cy="448" r="13" fill="none" stroke="#36454f" stroke-width="1.2"/><text x="${462 + i * 40}" y="452" text-anchor="middle" font-family="Inter Tight, sans-serif" font-size="10" fill="#36454f">${i + 1}</text>`).join("")}
      <text x="551" y="478" text-anchor="middle" font-size="13" fill="#9b3d3d">★</text>
      <text x="446" y="490" font-family="Inter Tight, sans-serif" font-size="7.5" letter-spacing="1.4" fill="#98a1a7">MAGNETIC · KEEP IN ORDER</text>
    </g>
    <rect x="432" y="514" width="142" height="62" rx="3" fill="#ffffff"/>
    ${qr(440, 521, 5.3)}
    <text x="496" y="538" font-family="Pretendard Variable, sans-serif" font-size="10" font-weight="600" fill="#36454f">가이드 1단계</text>
    <text x="496" y="554" font-family="Inter Tight, sans-serif" font-size="7.5" letter-spacing="1.2" fill="#5f6c74">SCAN TO START</text>
    <rect x="588" y="508" width="150" height="68" rx="3" fill="#d3d3d3"/>
    <text x="602" y="530" font-family="Inter Tight, sans-serif" font-size="8.5" letter-spacing="2" fill="#36454f">QUICK START</text>
    <text x="602" y="560" font-family="Inter Tight, sans-serif" font-weight="300" font-size="22" letter-spacing="1" fill="#36454f">01 — 07</text>
    <rect x="756" y="476" width="164" height="100" rx="3" fill="#ffffff"/>
    <rect x="756" y="476" width="6" height="100" fill="#9b3d3d"/>
    <text x="774" y="504" font-family="Pretendard Variable, sans-serif" font-size="13" font-weight="600" fill="#36454f">멈춰야 할 때</text>
    <text x="774" y="522" font-family="Inter Tight, sans-serif" font-size="7.5" letter-spacing="1.6" fill="#9b3d3d">STOP · SUPPORT</text>
    <path d="M774 538h120M774 550h96M774 562h108" stroke="#d3d3d3" stroke-width="3"/>
  </g>

  ${n(430, 80, 1)}${n(430, 204, 2)}${n(430, 284, 3)}${n(756, 284, 4)}${n(430, 388, 5)}${n(792, 80, 6)}${n(432, 514, 7)}${n(588, 508, 8)}${n(756, 476, 9)}
</svg>`;

  window.RB_BRAND = { mark, box, open };
})();
