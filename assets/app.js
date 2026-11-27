(function () {
  const S = window.Store, ART = window.RB_ART, SEED = window.RB_SEED, PH = window.RB_PHOTO, BR = window.RB_BRAND, VID = window.RB_VIDEO || {};
  const photo = (p, w = 1200, eager) => `<img class="ph" src="https://images.unsplash.com/photo-${p[0]}?auto=format&fit=crop&w=${w}&q=75" alt="${p[1]}"${eager ? "" : ' loading="lazy"'} />`;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
  const app = $("#app");
  const sym = (id) => SEED.symptoms.find((x) => x.id === id) || { label: id };
  const fmtDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const gradeText = { A: "키트로 해결할 수 있어요", B: "부품 없이 직접 해결할 수 있어요", C: "수리점에서 확인이 필요해요" };
  const gradeName = { A: "A · 키트로 해결", B: "B · 무료 가이드", C: "C · 수리점 연결" };
  const KITS = window.RB_KITS || {};
  const kitHref = (kit, m, code) => kit === "ssd-add" ? `#/model/${m.id}${code ? "?code=" + encodeURIComponent(code) : ""}` : `#/buy/${kit}/${m.id}${code ? "?code=" + encodeURIComponent(code) : ""}`;
  function kitFrom(kit) {
    const p = S.prices();
    return { "ssd-add": p.pkg + p.ssd1, "ssd-swap": p.swapPkg + p.ssd1, ram: p.ramPkg + p.ram16, grease: p.grease }[kit];
  }
  function kitCards(kits, m, code) {
    return `<div class="kit-cta">${kits.map((k) => `<a class="kit-cta-card" href="${kitHref(k, m, code)}"><div><div class="eyebrow">${esc(m.name)} 전용</div><div class="kc-name">${esc(KITS[k].name)}</div><div class="small muted">${esc(KITS[k].short)} · ${esc(KITS[k].time)}</div></div><div class="kc-side"><div class="small muted">${k === "grease" ? "" : "부품 포함 "}</div><b>${won(kitFrom(k))}~</b><span class="btn solid sm">키트 보기</span></div></a>`).join("")}</div>`;
  }

  function toast(msg) {
    const t = document.createElement("div"); t.className = "toast"; t.textContent = msg;
    document.body.appendChild(t); setTimeout(() => t.remove(), 2600);
  }
  function modal(html, onBind) {
    const o = document.createElement("div"); o.className = "overlay";
    o.innerHTML = `<div class="modal" role="dialog" aria-modal="true"><button class="x" aria-label="닫기">×</button>${html}</div>`;
    document.body.appendChild(o);
    const close = () => o.remove();
    o.addEventListener("click", (e) => { if (e.target === o || e.target.classList.contains("x")) close(); });
    onBind && onBind(o, close);
    return close;
  }

  // ---------- Router ----------
  function parse() {
    const h = location.hash.replace(/^#\/?/, "");
    const [path, qs] = h.split("?");
    return { parts: path.split("/").filter(Boolean).map(decodeURIComponent), q: new URLSearchParams(qs || "") };
  }
  const routes = {
    "": Home, diagnose: Diagnose, diagnosis: DiagnosisCard, models: Models, model: ModelDetail,
    order: Order, buy: Buy, repair: Repair, done: Done, guide: Guide, orders: Orders, admin: Admin, kit: Kit, upgrade: Upgrade
  };
  function render() {
    const r = parse();
    const view = (routes[r.parts[0] || ""] || NotFound)(r);
    app.innerHTML = view.html;
    document.title = (view.title ? view.title + " — " : "") + "리페어북 RepairBook";
    view.bind && view.bind();
    if (!view.keepScroll) { window.scrollTo(0, 0); requestAnimationFrame(() => window.scrollTo(0, 0)); }
    $$(".nav a").forEach((a) => a.classList.toggle("on", a.getAttribute("href") === "#/" + (r.parts[0] || "")));
    $(".nav").classList.remove("open");
    const n = S.s.orders.length; $("#orderCount").textContent = n ? n : ""; $("#orderCount").style.display = n ? "" : "none";
    maybePanel(r);
  }
  window.addEventListener("hashchange", render);

  // ---------- Shared bits ----------
  function searchBox(id, placeholder) {
    return `<div class="search" id="${id}"><input type="text" autocomplete="off" placeholder="${esc(placeholder)}" aria-label="모델 코드 검색"/>
      <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>
      <div class="suggest" hidden></div></div>`;
  }
  function bindSearch(id, onPick) {
    const box = $("#" + id); if (!box) return;
    const inp = $("input", box), sug = $(".suggest", box);
    let items = [], act = -1;
    const draw = () => {
      const q = inp.value.trim();
      items = S.search(q);
      if (!q || q.length < 2) { sug.hidden = true; return; }
      sug.hidden = false;
      sug.innerHTML = items.length
        ? items.map((x, i) => `<button type="button" data-i="${i}" class="${i === act ? "act" : ""}"><span>${esc(x.m.name)} <span class="code">${esc(x.score > 100 ? q.toUpperCase() : x.code)}</span></span><span class="pill ${S.verdict(x.m)}">${S.verdictShort(S.verdict(x.m))}</span></button>`).join("")
        : `<div style="padding:14px 16px" class="small muted">아직 등록되지 않은 모델이에요. <button type="button" class="tlink" data-req>이 모델 추가 요청하기</button></div>`;
    };
    inp.addEventListener("input", () => { act = -1; draw(); });
    inp.addEventListener("focus", draw);
    inp.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") { act = Math.min(act + 1, items.length - 1); draw(); e.preventDefault(); }
      else if (e.key === "ArrowUp") { act = Math.max(act - 1, 0); draw(); e.preventDefault(); }
      else if (e.key === "Enter") { const x = items[act >= 0 ? act : 0]; if (x) { pick(x); } e.preventDefault(); }
      else if (e.key === "Escape") sug.hidden = true;
    });
    const pick = (x) => { sug.hidden = true; const q = inp.value.trim(); onPick(x.m, x.score > 100 ? q.toUpperCase() : x.code); };
    sug.addEventListener("mousedown", (e) => e.preventDefault());
    sug.addEventListener("click", (e) => {
      const b = e.target.closest("[data-i]"); if (b) return pick(items[+b.dataset.i]);
      if (e.target.closest("[data-req]")) { S.addRequest(inp.value.trim(), inp.value.trim()); sug.hidden = true; toast("모델 추가 요청을 받았어요. 요청이 많은 모델부터 준비해요."); }
    });
    document.addEventListener("click", (e) => { if (!box.contains(e.target)) sug.hidden = true; });
  }
  const howToCode = `<div class="howto"><b style="font-weight:500">모델 코드 찾는 법 (지금 쓰는 노트북에서)</b>
    <ol><li>작업 표시줄 검색창에 <b>시스템 정보</b>를 입력해 열어요.</li><li><b>시스템 모델</b> 줄의 값을 복사해요. 예: 16Z90S-GA5HK, 960XGK</li><li>아래 검색창에 붙여 넣으면 세부 모델까지 찾아요.</li></ol>
    <div class="small muted" style="margin-top:6px">휴대폰으로 보고 있다면 노트북 뒷판 스티커의 ‘모델명’을 입력해도 돼요.</div></div>`;

  // ---------- Home ----------
  function Home() {
    const steps = [
      ["증상 고르기", "‘저장공간이 부족해요’처럼 지금 불편한 점만 골라요"],
      ["화면 사진 올리기", "안내대로 휴대폰으로 찍어 올리면 끝이에요"],
      ["진단 카드 받기", "키트로 해결 · 무료 가이드 · 수리점 중 하나로 알려 드려요"],
      ["내 모델 전용 키트 주문", "모델 코드를 한 번 더 확인하고 결제해요"],
      ["7단계 가이드로 장착", "약 30분, 막히면 원격 지원 버튼 한 번"],
      ["완료 체크", "늘어난 저장공간을 확인하면 끝"]
    ];
    const ms = S.s.models;
    return {
      html: `
      <section class="hero">
        <div class="hero-art">${photo(PH.hero, 2000, true)}</div>
        <div class="hero-word">REPAIRBOOK</div>
        <div class="hero-foot">
          <p>새로 사기 전에, 하나 더 꽂아 보세요.</p>
          <div class="hero-cta"><a class="btn solid" href="#/diagnose">무료 증상 진단</a><a class="btn light" href="#/upgrade">업그레이드 진단</a><a class="btn light" href="#/models">내 모델 찾기</a></div>
        </div>
      </section>

      <section class="sec"><div class="wrap two">
        <div>
          <p class="lead">노트북을 잘 몰라도 괜찮아요. 증상만 알려 주시면 직접 해결할 수 있는지, 수리점이 필요한지 먼저 진단해 드려요. 해결할 수 있을 때만 내 모델 전용 키트를 보내 드리고, 끝까지 함께해요.</p>
          <p style="margin-top:28px"><a class="tlink" href="#/diagnose">1분 증상 진단 시작하기</a></p>
          <div style="margin-top:80px">
            <div class="eyebrow" style="margin-bottom:24px">이렇게 진행돼요</div>
            <ol class="numlist">${steps.map((s, i) => `<li><span class="n">0${i + 1}</span><div><div class="t">${s[0]}</div><div class="d">${s[1]}</div></div></li>`).join("")}</ol>
          </div>
        </div>
        <div class="frame kit-frame">${BR.box}</div>
      </div></section>

      <section class="sec sand"><div class="wrap">
        <div class="sec-head"><h2 class="h-lg">부품만 사는 것과<br/>무엇이 다른가요</h2><a class="tlink" href="#/kit">키트 자세히 보기</a></div>
        <div class="cols3">
          <div class="card-quiet"><div class="ic">${photo(PH.diag, 700)}</div><h3>증상에서 시작하는 진단</h3><p>부품 이름을 몰라도 돼요. 저장공간 부족처럼 키트로 확실히 해결되는 경우에만 판매하고, 전원·화면 고장은 수리점으로 연결해요.</p></div>
          <div class="card-quiet"><div class="ic">${photo(PH.guideArt, 700)}</div><h3>내 모델 그대로의 가이드</h3><p>실제로 분해해 만든 약 4분·7단계 영상과 사진. 나사 매트의 번호까지 영상 자막과 똑같아요.</p></div>
          <div class="card-quiet"><div class="ic">${photo(PH.support, 700)}</div><h3>끝까지 함께하는 지원</h3><p>막히면 지금 단계가 함께 전달되는 원격 지원. 15분 안에 해결되지 않으면 제휴 수리점을 연결해요.</p></div>
        </div>
      </div></section>

      <section class="sec"><div class="wrap">
        <div class="two" style="align-items:end;margin-bottom:40px">
          <div><div class="eyebrow">내 노트북에 맞는지</div><h2 class="h-lg" style="margin-top:10px">모델 코드로 바로 확인</h2></div>
          <div>${searchBox("homeSearch", "모델 코드나 이름 입력 (예: 16Z90S, 갤럭시 북4)")}</div>
        </div>
        <div class="scroll-x"><table class="tbl">
          <thead><tr><th>모델</th><th>빈 자리</th><th>규격</th><th>난이도</th><th>저장공간 추가</th></tr></thead>
          <tbody>${ms.map((m) => `<tr class="click" data-go="#/model/${m.id}"><td class="serif" style="font-size:15.5px">${esc(m.name)}<div class="small muted">${esc(m.codes.join(" · "))}</div></td><td>${m.emptySlots}개</td><td class="small">${esc(m.ssdSpec)}</td><td>${"●".repeat(m.difficulty)}<span style="opacity:.25">${"●".repeat(5 - m.difficulty)}</span></td><td><span class="pill ${S.verdict(m)}">${S.verdictShort(S.verdict(m))}</span></td></tr>`).join("")}</tbody>
        </table></div>
      </div></section>

      <section class="sec paper2"><div class="wrap two">
        <div class="frame wide">${photo(PH.ssd, 1200)}</div>
        <div>
          <div class="eyebrow">오진 안심 보장</div>
          <h2 class="h-md" style="margin:12px 0 20px">진단이 틀렸다면, 저희가 책임져요</h2>
          <p class="muted">구매 전 진단과 결제 확인, 작업 직전 증상 재확인까지 세 번 확인해요. 그래도 틀렸다면 설치 패키지 전액 환불과 수리점 점검비 지원, 진단 카드 전달까지 리페어북이 맡아요. 장착한 저장공간 부품은 그대로 쓰시거나 외장 저장장치로 활용하실 수 있어요.</p>
          <p style="margin-top:26px"><a class="tlink" href="#/kit#guarantee">보장 범위 보기</a></p>
        </div>
      </div></section>

      <section class="sec"><div class="wrap two">
        <div><div class="eyebrow">자주 묻는 질문</div><h2 class="h-lg" style="margin-top:10px">처음이라도<br/>괜찮아요</h2></div>
        <div class="acc">${SEED.faq.map((f) => `<details><summary>${esc(f.q)}</summary><div class="body">${esc(f.a)}</div></details>`).join("")}</div>
      </div></section>`,
      bind() {
        bindSearch("homeSearch", (m, code) => (location.hash = `#/model/${m.id}?code=${encodeURIComponent(code)}`));
        $$("[data-go]").forEach((tr) => tr.addEventListener("click", () => (location.hash = tr.dataset.go)));
      }
    };
  }

  // ---------- Diagnose wizard ----------
  let W = null;
  const brandKo = { Samsung: "삼성", LG: "LG", Lenovo: "레노버" };
  function Diagnose(r) {
    const q = r.q;
    W = { step: 0, symptom: q.get("symptom") || "", modelId: q.get("model") || "", code: q.get("code") || "", mode: "pick", brand: "",
      totalGB: "", freeGB: "", hog: "", cleaned: null, need: "", diskHigh: null, memHigh: null, when: "", heat: null,
      powerFixed: null, lamp: "", before: "", extDisplay: "", look: "", hours: "", swell: null, what: "", since: "",
      age: "", onset: "", recent: "", photo: "", name: "", contact: "" };
    const m0 = S.model(W.modelId); if (m0) W.brand = m0.brand;
    if (W.symptom) W.step = 1;
    if (W.symptom && W.modelId) W.step = 2;
    return {
      title: "무료 증상 진단",
      html: `<div class="wrap page-head" style="padding-bottom:10px"><div class="eyebrow">무료 증상 진단 · 약 3분</div></div><div class="wrap" style="padding-bottom:110px"><div class="wiz" id="wiz"></div></div>`,
      bind: drawWiz
    };
  }
  function q(title, k, opts, cols) {
    return `<div class="qblock"><div class="qt">${title}</div><div class="opts ${cols ? "cols" + cols : ""}">${opts.map((o) => opt(k, o[0], o[1], o[2])).join("")}</div></div>`;
  }
  function modelStep(m) {
    const optional = !["storage", "slow"].includes(W.symptom);
    const brands = [...new Set(S.s.models.map((x) => x.brand))];
    const list = W.brand ? S.s.models.filter((x) => x.brand === W.brand) : [];
    const pick = `<div class="qt">제조사</div><div class="chips">${brands.map((b) => `<button class="chip ${W.brand === b ? "on" : ""}" data-brand="${b}">${esc(brandKo[b] || b)}</button>`).join("")}</div>
      ${W.brand ? `<div class="qt" style="margin-top:24px">모델</div><div class="opts">${list.map((x) => `<button class="opt ${W.modelId === x.id ? "on" : ""}" data-model="${x.id}"><span><div class="ot">${esc(x.name)}</div><div class="od">${esc(x.codes.join(" · "))}</div></span><span class="pill ${S.verdict(x)}">${S.verdictShort(S.verdict(x))}</span></button>`).join("")}</div>` : `<p class="small muted" style="margin-top:14px">제조사를 고르면 모델 목록이 나와요.</p>`}
      ${m && m.codes.length > 1 ? `<div class="qt" style="margin-top:24px">세부 모델 (알면 골라 주세요)</div><div class="chips">${m.codes.map((c) => `<button class="chip ${W.code === c ? "on" : ""}" data-code="${c}">${c}</button>`).join("")}<button class="chip ${!W.code ? "on" : ""}" data-code="">모르겠어요</button></div><p class="small muted" style="margin-top:8px">화면 크기에 따라 코드가 달라요. 노트북 바닥 스티커의 ‘모델명’에서 확인할 수 있어요.</p>` : ""}`;
    const code = `${howToCode}${searchBox("wizSearch", "모델 코드나 이름 입력")}`;
    return `<h2>어떤 노트북을 쓰세요?</h2><p class="sub">${optional ? "모르면 건너뛰어도 돼요." : "모델 이름만 알아도 골라서 진행할 수 있어요. 모델 코드를 알면 세부 모델까지 정확히 확인해요."}</p>
      <div class="seg"><button class="${W.mode === "pick" ? "on" : ""}" data-mode="pick">모델 이름으로 고르기</button><button class="${W.mode === "code" ? "on" : ""}" data-mode="code">모델 코드로 찾기</button></div>
      ${W.mode === "pick" ? pick : code}
      ${m ? `<div class="notice ok" style="margin-top:22px">선택한 모델: <b style="font-weight:500">${esc(m.name)}</b> <span class="small muted">${esc(W.code || "세부 코드 미확인")}</span>${!W.code ? `<div class="small muted" style="margin-top:4px">세부 모델 코드는 주문할 때 한 번 더 확인해요.</div>` : ""}</div>` : ""}
      <div class="wiz-nav"><button class="btn light" data-back>이전</button>
      <div style="display:flex;gap:10px">${!m ? `<button class="btn light" data-skip>목록에 없거나 모르겠어요</button>` : ""}<button class="btn solid" data-next ${m ? "" : "disabled"}>다음</button></div></div>`;
  }
  function drawWiz() {
    const el = $("#wiz"); if (!el) return;
    const total = 5, st = W.step;
    const names = ["증상", "노트북", "자가 점검", "사용 환경", "사진·연락처"];
    const prog = `<div class="wiz-prog">${Array.from({ length: total }, (_, i) => `<span class="${i <= st ? "on" : ""}"></span>`).join("")}</div><div class="wiz-step small muted">${st + 1} / ${total} · ${names[st]}</div>`;
    const m = S.model(W.modelId);
    const nav = `<div class="err" id="err"></div><div class="wiz-nav"><button class="btn light" data-back>이전</button><button class="btn solid" data-next>다음</button></div>`;
    let body = "";
    if (st === 0) {
      body = `<h2>어떤 점이 불편하세요?</h2><p class="sub">부품 이름은 몰라도 돼요. 가장 가까운 걸 하나만 골라 주세요.</p>
        <div class="sym-grid">${SEED.symptoms.map((s) => `<button class="sym" data-sym="${s.id}"><span class="si">${ART[s.icon]}</span><span><div class="st">${esc(s.label)}</div><div class="sd">${esc(s.desc)}</div></span></button>`).join("")}</div>`;
    } else if (st === 1) {
      body = modelStep(m);
    } else if (st === 2) {
      body = `<h2>${esc(sym(W.symptom).label)}</h2>` + selfCheck() + nav;
    } else if (st === 3) {
      body = `<h2>사용 환경을 알려 주세요</h2><p class="sub">같은 증상이라도 쓰신 기간과 시작된 계기에 따라 원인이 달라져요.</p>
        ${q("노트북을 쓴 지 얼마나 됐나요?", "age", [["new", "1년 미만"], ["mid", "1~3년"], ["old", "3년 이상"], ["unk", "모르겠어요"]], 4)}
        ${q("증상은 어떻게 시작됐나요?", "onset", [["sudden", "어느 날 갑자기"], ["gradual", "점점 심해졌어요"], ["unk", "잘 모르겠어요"]], 3)}
        ${q("증상 직전에 이런 일이 있었나요?", "recent", [["update", "윈도우 업데이트"], ["install", "새 프로그램 설치"], ["drop", "떨어뜨림·충격"], ["liquid", "물·음료를 쏟음"], ["none", "특별한 일 없음"]], 3)}
        ${nav}`;
    } else {
      body = `<h2>확인 사진을 올려 주세요</h2><p class="sub">사진이 있으면 더 정확해요. 사람이 직접 보고 판정해요(영업일 24시간 이내).</p>
        <label class="upload" id="up">${W.photo ? `<img src="${W.photo}" alt="올린 사진"/>사진을 바꾸려면 누르세요` : "누르거나 끌어다 놓아 사진 올리기<br/><span class='small'>" + esc(photoHint[W.symptom] || "증상이 보이는 화면이나 부위") + "</span>"}<input type="file" accept="image/*" hidden/></label>
        <div style="margin-top:30px" class="field"><label>이름 (선택)</label><input type="text" id="dName" value="${esc(W.name)}"/></div>
        <div class="field"><label>진단 결과를 받을 연락처 (선택 · 이메일 또는 휴대폰)</label><input type="text" id="dContact" value="${esc(W.contact)}"/><div class="hint">진단 결과는 이 화면에도 바로 나와요.</div></div>
        <div class="wiz-nav"><button class="btn light" data-back>이전</button><button class="btn solid" data-submit>진단 요청하기</button></div>`;
    }
    el.innerHTML = prog + body;

    $$("[data-sym]", el).forEach((b) => b.addEventListener("click", () => { W.symptom = b.dataset.sym; W.step = 1; drawWiz(); }));
    $$("[data-mode]", el).forEach((b) => b.addEventListener("click", () => { W.mode = b.dataset.mode; drawWiz(); }));
    $$("[data-brand]", el).forEach((b) => b.addEventListener("click", () => { if (W.brand !== b.dataset.brand) { W.brand = b.dataset.brand; W.modelId = ""; W.code = ""; } drawWiz(); }));
    $$("[data-model]", el).forEach((b) => b.addEventListener("click", () => { const mm = S.model(b.dataset.model); W.modelId = mm.id; W.code = mm.codes.length === 1 ? mm.codes[0] : ""; drawWiz(); }));
    $$("[data-code]", el).forEach((b) => b.addEventListener("click", () => { W.code = b.dataset.code; drawWiz(); }));
    $("[data-back]", el) && $("[data-back]", el).addEventListener("click", () => { W.step--; drawWiz(); });
    $("[data-skip]", el) && $("[data-skip]", el).addEventListener("click", () => { W.modelId = ""; W.code = ""; W.step = 2; drawWiz(); });
    $("[data-next]", el) && $("[data-next]", el).addEventListener("click", () => {
      if (W.step === 2 && !checkValid()) return;
      if (W.step === 3 && !checkBasic()) return;
      W.step++; drawWiz();
    });
    bindSearch("wizSearch", (mm, code) => { W.modelId = mm.id; W.brand = mm.brand; W.code = code; drawWiz(); });
    $$("[data-set]", el).forEach((b) => b.addEventListener("click", () => {
      const i = b.dataset.set.indexOf(":"); const k = b.dataset.set.slice(0, i), v = b.dataset.set.slice(i + 1);
      W[k] = v === "true" ? true : v === "false" ? false : v; drawWiz();
    }));
    $$("[data-num]", el).forEach((i) => i.addEventListener("input", () => { W[i.dataset.num] = i.value; }));
    const up = $("#up", el);
    if (up) {
      const inp = $("input", up);
      const take = (f) => f && shrink(f).then((d) => { W.photo = d; W.name = $("#dName").value; W.contact = $("#dContact").value; drawWiz(); });
      inp.addEventListener("change", () => take(inp.files[0]));
      up.addEventListener("dragover", (e) => e.preventDefault());
      up.addEventListener("drop", (e) => { e.preventDefault(); take(e.dataTransfer.files[0]); });
    }
    $("[data-submit]", el) && $("[data-submit]", el).addEventListener("click", submitDiag);
  }
  const photoHint = {
    storage: "예: 설정 › 시스템 › 저장소 화면", slow: "예: 작업 관리자 › 성능 탭 화면", power: "예: 충전기를 꽂은 상태의 노트북 옆면(램프)",
    display: "예: 노트북 화면 상태, 외부 모니터 연결 모습", battery: "예: 노트북 옆에서 찍은 뒷판(들뜸 확인)", damage: "예: 물이 닿거나 충격받은 부위"
  };
  function opt(k, v, label, desc) {
    const on = String(W[k]) === String(v);
    return `<button class="opt ${on ? "on" : ""}" data-set="${k}:${v}"><span><div class="ot">${label}</div>${desc ? `<div class="od">${desc}</div>` : ""}</span><span class="radio-dot"></span></button>`;
  }
  function selfCheck() {
    const storageInputs = `<div class="howto"><b style="font-weight:500">이렇게 확인해요</b><ol><li>시작 › <b>설정</b> › <b>시스템</b> › <b>저장소</b>를 열어요.</li><li>맨 위 ‘로컬 디스크 (C:)’ 막대 아래 숫자를 봐요. 예: <i>사용 230GB / 256GB</i></li></ol></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="field"><label>전체 용량 (GB)</label><input type="number" min="1" inputmode="numeric" data-num="totalGB" value="${esc(W.totalGB)}" placeholder="256"/></div>
      <div class="field"><label>남은 용량 (GB)</label><input type="number" min="0" inputmode="numeric" data-num="freeGB" value="${esc(W.freeGB)}" placeholder="26"/><div class="hint">전체 − 사용</div></div></div>`;
    switch (W.symptom) {
      case "storage":
        return `<p class="sub">저장공간 화면의 숫자와 함께, 무엇이 공간을 많이 차지하는지 알려 주세요.</p>${storageInputs}
          ${q("가장 많이 차지하는 건 무엇인가요?", "hog", [["media", "사진·영상"], ["games", "게임"], ["work", "업무·학업 파일"], ["unk", "잘 모르겠어요"]], 2)}
          ${q("임시 파일 정리나 앱 삭제를 해 보셨나요?", "cleaned", [[true, "해 봤는데도 부족해요"], [false, "아직 안 해 봤어요"]], 2)}
          ${q("앞으로 얼마나 더 필요할 것 같나요?", "need", [["500", "500GB 정도"], ["1000", "1TB 정도"], ["2000", "2TB 이상"], ["unk", "추천해 주세요"]], 2)}`;
      case "slow":
        return `<p class="sub">Ctrl + Shift + Esc로 <b>작업 관리자</b>를 열고 ‘성능’ 탭을 1분쯤 지켜봐 주세요.</p>
          ${q("디스크 사용률", "diskHigh", [[true, "자주 90% 안팎이에요"], [false, "대체로 낮아요"]], 2)}
          ${q("메모리 사용률", "memHigh", [[true, "자주 90% 안팎이에요"], [false, "대체로 낮아요"]], 2)}
          ${q("언제 특히 느린가요?", "when", [["boot", "켤 때·부팅"], ["app", "특정 프로그램을 쓸 때"], ["always", "항상"]], 3)}
          ${q("뜨겁거나 팬 소리가 커졌나요?", "heat", [[true, "네, 전보다 심해요"], [false, "아니요"]], 2)}
          <div style="margin-top:30px">${storageInputs}</div>`;
      case "power":
        return `<p class="sub">5분 기본 점검을 해 볼게요.</p><div class="howto"><ol><li>다른 콘센트에 어댑터를 꽂고 충전 램프가 켜지는지 봐요.</li><li>전원 버튼을 15초 길게 눌렀다 떼고, 다시 한 번 눌러요.</li></ol></div>
          ${q("충전기를 꽂으면 충전 램프가 켜지나요?", "lamp", [["on", "켜져요"], ["off", "안 켜져요"], ["unk", "램프를 못 찾겠어요"]], 3)}
          ${q("점검 결과", "powerFixed", [[true, "다시 켜졌어요"], [false, "여전히 안 켜져요"]], 2)}
          ${q("꺼지기 직전 상황", "before", [["battery", "배터리가 다 닳았어요"], ["update", "업데이트 중이었어요"], ["liquid", "물·충격이 있었어요"], ["none", "평소처럼 쓰다가"]], 2)}`;
      case "display":
        return `<p class="sub">TV나 모니터에 HDMI로 연결하고, 밝기 키를 올려 보세요.</p>
          ${q("노트북 화면은 어떤가요?", "look", [["black", "완전히 까매요"], ["dim", "아주 어둡게 희미하게 보여요", "손전등을 비추면 보이는 경우"], ["lines", "줄·얼룩·깨짐이 있어요"], ["flicker", "깜빡이거나 각도에 따라 꺼져요"]], 2)}
          ${q("외부 모니터 연결 결과", "extDisplay", [["ok", "외부 모니터에는 나와요"], ["none", "둘 다 안 나와요"], ["na", "연결할 모니터가 없어요"]], 3)}`;
      case "battery":
        return `<p class="sub">배터리 상태는 수리점에서 정확히 확인할 수 있지만, 위험 신호부터 먼저 확인할게요.</p>
          ${q("뒷판이 들뜨거나 트랙패드가 눌려 올라왔나요?", "swell", [[true, "네, 들뜬 것 같아요", "충전을 멈추고 쓰지 마세요"], [false, "아니요"]], 2)}
          ${q("완전히 충전하면 얼마나 쓸 수 있나요?", "hours", [["lt2", "2시간 미만"], ["2to4", "2~4시간"], ["gt4", "4시간 이상"]], 3)}`;
      default:
        return `<div class="notice stop"><b style="font-weight:500">지금 바로 전원을 끄고 충전기를 빼 주세요.</b><br/>물기나 충격이 있었다면 켜 보지 말고 그대로 두는 게 가장 안전해요.</div>
          ${q("어떤 일이 있었나요?", "what", [["liquid", "물·음료를 쏟았어요"], ["drop", "떨어뜨렸어요"], ["noise", "이상한 소리가 나요"], ["heat", "너무 뜨거워요"]], 2)}
          ${q("언제 있었나요?", "since", [["today", "오늘"], ["week", "일주일 안"], ["older", "그 전"]], 3)}`;
    }
  }
  function checkValid() {
    const err = $("#err"); const say = (t) => { if (err) err.textContent = t; return false; };
    const need = { storage: ["hog", "cleaned", "need"], slow: ["diskHigh", "memHigh", "when", "heat"], power: ["lamp", "powerFixed", "before"], display: ["look", "extDisplay"], battery: ["swell", "hours"], damage: ["what", "since"] }[W.symptom] || [];
    if (need.some((k) => W[k] === null || W[k] === "")) return say("모든 질문에 답해 주세요.");
    if (["storage", "slow"].includes(W.symptom)) {
      const t = +W.totalGB, f = +W.freeGB;
      if (!t || t <= 0) return say("전체 용량을 숫자로 입력해 주세요.");
      if (W.freeGB === "" || f < 0 || f > t) return say("남은 용량은 0부터 전체 용량 사이로 입력해 주세요.");
    }
    return true;
  }
  function checkBasic() {
    if (!W.age || !W.onset || !W.recent) { const err = $("#err"); if (err) err.textContent = "세 가지 모두 골라 주세요."; return false; }
    return true;
  }
  function shrink(file) {
    return new Promise((res) => {
      const rd = new FileReader();
      rd.onload = () => { const img = new Image(); img.onload = () => {
        const k = Math.min(1, 900 / Math.max(img.width, img.height)); const c = document.createElement("canvas");
        c.width = img.width * k; c.height = img.height * k; c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        res(c.toDataURL("image/jpeg", 0.72)); }; img.onerror = () => res(""); img.src = rd.result; };
      rd.readAsDataURL(file);
    });
  }
  function submitDiag() {
    W.name = $("#dName").value.trim(); W.contact = $("#dContact").value.trim();
    const m = S.model(W.modelId);
    const input = { symptom: W.symptom, totalGB: +W.totalGB || 0, freeGB: +W.freeGB || 0 };
    ["hog", "cleaned", "need", "diskHigh", "memHigh", "when", "heat", "powerFixed", "lamp", "before", "extDisplay", "look", "hours", "swell", "what", "since", "age", "onset", "recent"].forEach((k) => { if (W[k] !== null && W[k] !== "") input[k] = W[k]; });
    const result = S.judge(input, m);
    if (result.grade === "A" && !W.photo) result.lowConfidence = true;
    if (result.requestModel && m) S.addRequest(m.name, W.code);
    const d = S.addDiagnosis({ symptom: W.symptom, modelId: W.modelId, code: W.code, input, result, photo: W.photo, name: W.name, contact: W.contact });
    location.hash = "#/diagnosis/" + d.id;
  }

  // ---------- Upgrade diagnosis ----------
  let U = null;
  const UPS = [
    { id: "ssd", t: "SSD 업그레이드", d: "저장공간을 늘려요. 빈 자리가 있으면 추가, 없으면 더 큰 것으로 교체해요." },
    { id: "ram", t: "RAM 업그레이드", d: "메모리를 늘려 여러 프로그램을 동시에 써도 덜 버벅이게 해요." },
    { id: "grease", t: "서멀 구리스 재도포", d: "굳은 구리스를 새로 발라 발열·팬 소음·성능 저하를 줄여요." }
  ];
  function Upgrade(r) {
    const q0 = r.q.get("want");
    U = { step: 0, wants: q0 ? q0.split(",").filter((x) => UPS.some((u) => u.id === x)) : [], mode: "pick", brand: "", modelId: "", code: "",
      curGB: "", goal: "", ramGB: "", ramUse: "", age: "", heat: "", throttle: "", contact: "" };
    return {
      title: "업그레이드 진단",
      html: `<div class="wrap page-head" style="padding-bottom:10px"><div class="eyebrow">업그레이드 진단 · 무료 · 약 2분</div></div><div class="wrap" style="padding-bottom:110px"><div class="wiz" id="upz"></div></div>`,
      bind: drawUp
    };
  }
  function uopt(k, v, label, desc) {
    const on = String(U[k]) === String(v);
    return `<button class="opt ${on ? "on" : ""}" data-uset="${k}:${v}"><span><div class="ot">${label}</div>${desc ? `<div class="od">${desc}</div>` : ""}</span><span class="radio-dot"></span></button>`;
  }
  const uq = (title, k, opts, cols) => `<div class="qblock"><div class="qt">${title}</div><div class="opts ${cols ? "cols" + cols : ""}">${opts.map((o) => uopt(k, o[0], o[1], o[2])).join("")}</div></div>`;
  function upJudge(m) {
    const info = (window.RB_UPGRADE || {})[m.id];
    const out = [];
    const pend = (id) => ({ id, v: "pending", label: "확인 중", why: "이 모델은 아직 검수 중이라 판정할 수 없어요.", next: "모델 정보가 확인되면 연락드려요." });
    U.wants.forEach((id) => {
      if (!info) return out.push(pend(id));
      if (id === "ssd") {
        if (info.ssd === "pending" || !m.verified) return out.push(pend(id));
        const big = U.goal === "2000" || +U.curGB >= 1000;
        if (info.ssd === "add") {
          const rec = Math.min(big ? 2 : 1, m.maxTB || 1);
          out.push({ id, v: "ok", kit: "ssd-add", label: "추가 가능", why: `빈 M.2 슬롯이 ${m.emptySlots}개 있어요. 지금 SSD는 그대로 두고 하나 더 꽂아요(${m.ssdSpec}).`,
            next: `추천: ${rec}TB 추가 키트${(big && rec < 2) ? ` — 이 모델은 ${m.maxTB}TB까지만 판매해요` : ""}.` });
        } else {
          const rec = big ? 2 : 1;
          out.push({ id, v: "replace", kit: "ssd-swap", label: "교체로 가능", why: `SSD 슬롯이 1개뿐이라 추가는 안 돼요. 지금 SSD를 더 큰 것으로 바꾸고, 기존 데이터는 그대로 복제해서 옮겨요(${m.ssdSpec}).`,
            next: `추천: ${rec}TB로 교체 · USB-C 복제 어댑터와 데이터 복제 안내가 키트에 들어 있어요.` });
        }
      }
      if (id === "ram") {
        if (info.ram === null) return out.push(pend(id));
        if (!info.ram) return out.push({ id, v: "no", label: "불가", why: info.ramNote,
          next: "대신 시작 프로그램 줄이기·브라우저 탭 정리로 메모리 여유를 만들 수 있어요. 저장공간 여유가 15% 미만이면 SSD 업그레이드도 체감 속도에 도움이 돼요." });
        const cur = +U.ramGB || 0;
        const rec = cur <= 8 ? "32GB (16GB × 2개로 교체)" : cur <= 16 ? "32GB (16GB 1개 추가 · 같은 규격으로 맞춤)" : "64GB (32GB × 2개)";
        out.push({ id, v: "ok", kit: "ram", label: "가능", why: info.ramNote, next: `추천: ${rec}. ${U.ramUse === "light" ? "문서·웹 위주라면 지금 용량으로도 충분할 수 있어요." : "작업량에 비해 메모리가 부족한 상태라 효과가 커요."}` });
      }
      if (id === "grease") {
        if (!info.grease) return out.push(pend(id));
        const need = U.age === "old" || U.heat === "yes" || U.throttle === "yes";
        const hard = info.grease >= 5;
        if (!need) out.push({ id, v: "later", label: "아직 불필요", why: "사용 기간이 짧고 발열·성능 저하 신호가 없어요. 지금 바르면 보증만 손해예요.", next: "보통 2~3년 뒤, 팬 소음이 커지거나 뜨거워지면 다시 진단해 주세요." });
        else out.push({ id, v: "ok", kit: "grease", label: hard ? "가능 · 대신 장착 권장" : "가능", why: `${U.heat === "yes" ? "발열·팬 소음이 커졌고, " : ""}${U.age === "old" ? "2년 넘게 쓰셔서 " : ""}구리스가 굳었을 가능성이 커요. 난이도 ${"●".repeat(info.grease)}${"○".repeat(5 - info.grease)}`,
          next: `${info.greaseNote} ${hard ? "키트를 사면서 ‘대신 장착’을 고르면 제휴 수리점에서 작업해 드려요." : "재도포 키트와 영상 가이드로 직접 할 수 있어요."}` });
      }
    });
    return { out, src: info ? info.src : "" };
  }
  function drawUp() {
    const el = $("#upz"); if (!el) return;
    const total = 4, st = U.step, names = ["업그레이드 선택", "노트북", "현재 상태", "결과"];
    const prog = `<div class="wiz-prog">${Array.from({ length: total }, (_, i) => `<span class="${i <= st ? "on" : ""}"></span>`).join("")}</div><div class="wiz-step small muted">${st + 1} / ${total} · ${names[st]}</div>`;
    const m = S.model(U.modelId);
    const nav = (label = "다음") => `<div class="err" id="err"></div><div class="wiz-nav"><button class="btn light" data-back>이전</button><button class="btn solid" data-next>${label}</button></div>`;
    let body = "";
    if (st === 0) {
      body = `<h2>어떤 업그레이드를 원하세요?</h2><p class="sub">여러 개를 함께 골라도 돼요. 내 노트북에서 되는지, 안 되면 왜 안 되는지 알려 드려요.</p>
        <div class="up-grid">${UPS.map((u) => `<button class="up-card ${U.wants.includes(u.id) ? "on" : ""}" data-want="${u.id}"><span class="check"></span><div class="st">${u.t}</div><div class="sd">${u.d}</div></button>`).join("")}</div>
        <div class="err" id="err"></div><div class="wiz-nav"><span></span><button class="btn solid" data-next>다음</button></div>`;
    } else if (st === 1) {
      const brands = [...new Set(S.s.models.map((x) => x.brand))];
      const list = U.brand ? S.s.models.filter((x) => x.brand === U.brand) : [];
      body = `<h2>어떤 노트북을 쓰세요?</h2><p class="sub">모델 이름만 알아도 돼요. 같은 시리즈라도 모델마다 슬롯 구성이 달라요.</p>
        <div class="seg"><button class="${U.mode === "pick" ? "on" : ""}" data-umode="pick">모델 이름으로 고르기</button><button class="${U.mode === "code" ? "on" : ""}" data-umode="code">모델 코드로 찾기</button></div>
        ${U.mode === "pick" ? `<div class="qt">제조사</div><div class="chips">${brands.map((b) => `<button class="chip ${U.brand === b ? "on" : ""}" data-ubrand="${b}">${esc(brandKo[b] || b)}</button>`).join("")}</div>
          ${U.brand ? `<div class="qt" style="margin-top:24px">모델</div><div class="opts">${list.map((x) => `<button class="opt ${U.modelId === x.id ? "on" : ""}" data-umodel="${x.id}"><span><div class="ot">${esc(x.name)}</div><div class="od">${esc(x.codes.join(" · "))}</div></span><span class="radio-dot"></span></button>`).join("")}</div>` : ""}`
        : `${howToCode}${searchBox("upSearch", "모델 코드나 이름 입력")}`}
        ${m ? `<div class="notice ok" style="margin-top:22px">선택한 모델: <b style="font-weight:500">${esc(m.name)}</b> <span class="small muted">${esc(U.code || "")}</span></div>` : ""}
        <p class="small muted" style="margin-top:18px">목록에 없나요? <a class="tlink small" href="#/models">모델 찾기에서 추가 요청</a>하면 정보를 찾아 알려 드려요.</p>
        <div class="err" id="err"></div><div class="wiz-nav"><button class="btn light" data-back>이전</button><button class="btn solid" data-next ${m ? "" : "disabled"}>다음</button></div>`;
    } else if (st === 2) {
      const w = (id) => U.wants.includes(id);
      body = `<h2>지금 상태를 알려 주세요</h2><p class="sub">추천 용량과 필요 여부를 정하는 데 써요.</p>
        ${w("ssd") ? `<div class="qhead">SSD</div>${uq("지금 SSD 전체 용량", "curGB", [["256", "256GB"], ["512", "512GB"], ["1000", "1TB"], ["2000", "2TB 이상"]], 4)}${uq("얼마나 늘리고 싶으세요?", "goal", [["1000", "1TB 정도"], ["2000", "2TB 이상"], ["unk", "추천해 주세요"]], 3)}` : ""}
        ${w("ram") ? `<div class="qhead">RAM</div><div class="howto small">작업 관리자(Ctrl + Shift + Esc) › 성능 › 메모리 오른쪽 위 숫자가 지금 용량이에요.</div>${uq("지금 메모리 용량", "ramGB", [["8", "8GB"], ["16", "16GB"], ["32", "32GB 이상"], ["0", "모르겠어요"]], 4)}${uq("주로 어떤 작업을 하세요?", "ramUse", [["light", "문서·웹·영상 시청"], ["multi", "탭·프로그램 여러 개 동시에"], ["heavy", "영상 편집·개발·게임"]], 3)}` : ""}
        ${w("grease") ? `<div class="qhead">발열</div>${uq("노트북을 쓴 기간", "age", [["new", "1년 미만"], ["mid", "1~2년"], ["old", "2년 이상"]], 3)}${uq("예전보다 뜨겁거나 팬 소리가 커졌나요?", "heat", [["yes", "네"], ["no", "아니요"]], 2)}${uq("오래 쓰면 갑자기 느려지나요?", "throttle", [["yes", "네, 뜨거워지면 느려져요"], ["no", "아니요"]], 2)}` : ""}
        ${nav("결과 보기")}`;
    } else {
      const res = upJudge(m);
      const tname = (id) => UPS.find((u) => u.id === id).t;
      const kits = res.out.filter((x) => x.kit).map((x) => x.kit);
      const sig = m.id + "|" + U.code + "|" + JSON.stringify(res.out.map((x) => x.id + x.v));
      if (U.sig !== sig) { U.sig = sig; U.rec = S.addUpgrade({ modelId: m.id, code: U.code, wants: U.wants.slice(), kits, results: res.out.map((x) => ({ id: x.id, v: x.v, label: x.label })) }); }
      const pill = { ok: "ok", replace: "ok", no: "no", pending: "pending", later: "pending" };
      body = `<h2>${esc(m.name)} 업그레이드 진단 결과</h2><p class="sub">${esc(U.code || m.codes.join(" · "))}</p>
        <div class="up-results">${res.out.map((x) => `<div class="up-res ${x.v}"><div class="up-res-head"><b>${tname(x.id)}</b><span class="pill ${pill[x.v]}">${x.label}</span></div>
          <p>${esc(x.why)}</p><p class="muted small">${esc(x.next)}</p>${x.kit ? `<a class="btn solid sm" href="${kitHref(x.kit, m, U.code)}">${esc(KITS[x.kit].name)} 보기 · ${won(kitFrom(x.kit))}~</a>` : ""}</div>`).join("")}</div>
        ${kits.length ? `<p class="small muted" style="margin-top:12px">업그레이드 진단 ${esc(U.rec.id)} — 이 결과로 바로 키트를 주문할 수 있어요.</p>` : ""}
        ${res.src ? `<p class="small muted" style="margin-top:14px">근거: ${esc(res.src)}</p>` : ""}
        <div class="notice" style="margin-top:22px">직접 분해·업그레이드하면 해당 부위의 제조사 무상 수리가 제한될 수 있어요. 불안하면 제휴 수리점 작업으로 연결해 드려요.</div>
        ${res.out.some((x) => x.v === "ok" || x.v === "replace") ? `<div class="field" style="margin-top:26px"><label>상담받을 연락처 (이메일 또는 휴대폰)</label><input type="text" id="uContact" value="${esc(U.contact)}"/></div>
        <div class="wiz-nav"><button class="btn light" data-back>답변 고치기</button><button class="btn" data-uapply>먼저 상담받고 싶어요</button></div>` : `<div class="wiz-nav"><button class="btn light" data-back>답변 고치기</button><a class="btn" href="#/diagnose">증상 진단 해 보기</a></div>`}`;
    }
    el.innerHTML = prog + body;
    const say = (t) => { const e = $("#err"); if (e) e.textContent = t; };
    $$("[data-want]", el).forEach((b) => b.addEventListener("click", () => { const id = b.dataset.want; U.wants = U.wants.includes(id) ? U.wants.filter((x) => x !== id) : [...U.wants, id]; drawUp(); }));
    $$("[data-umode]", el).forEach((b) => b.addEventListener("click", () => { U.mode = b.dataset.umode; drawUp(); }));
    $$("[data-ubrand]", el).forEach((b) => b.addEventListener("click", () => { if (U.brand !== b.dataset.ubrand) { U.brand = b.dataset.ubrand; U.modelId = ""; U.code = ""; } drawUp(); }));
    $$("[data-umodel]", el).forEach((b) => b.addEventListener("click", () => { const mm = S.model(b.dataset.umodel); U.modelId = mm.id; U.code = mm.codes.length === 1 ? mm.codes[0] : ""; drawUp(); }));
    bindSearch("upSearch", (mm, code) => { U.modelId = mm.id; U.brand = mm.brand; U.code = code; drawUp(); });
    $$("[data-uset]", el).forEach((b) => b.addEventListener("click", () => { const i = b.dataset.uset.indexOf(":"); U[b.dataset.uset.slice(0, i)] = b.dataset.uset.slice(i + 1); drawUp(); }));
    $("[data-back]", el) && $("[data-back]", el).addEventListener("click", () => { U.step--; drawUp(); });
    $("[data-next]", el) && $("[data-next]", el).addEventListener("click", () => {
      if (U.step === 0 && !U.wants.length) return say("하나 이상 골라 주세요.");
      if (U.step === 2) {
        const need = [].concat(U.wants.includes("ssd") ? ["curGB", "goal"] : [], U.wants.includes("ram") ? ["ramGB", "ramUse"] : [], U.wants.includes("grease") ? ["age", "heat", "throttle"] : []);
        if (need.some((k) => !U[k])) return say("모든 질문에 답해 주세요.");
      }
      U.step++; drawUp(); scrollTo(0, 0);
    });
    $("[data-uapply]", el) && $("[data-uapply]", el).addEventListener("click", () => {
      U.contact = $("#uContact").value.trim();
      if (!U.contact) { toast("연락처를 입력해 주세요."); return; }
      const res = upJudge(m);
      S.addSupport({ type: "upgrade", modelId: m.id, msg: `업그레이드 상담: ${res.out.map((x) => UPS.find((u) => u.id === x.id).t + "=" + x.label).join(", ")} · ${U.contact}` });
      toast("업그레이드 상담 신청을 받았어요. 연락처로 안내해 드릴게요.");
    });
  }

  // ---------- Repair shop brokerage ----------
  const SHOPS = window.RB_SHOPS || [], REGIONS = window.RB_REGIONS || [];
  const methodKo = { visit: "방문 수리", parcel: "택배 수리" };
  function Repair(r) {
    if (r.parts[1]) return RepairStatus(r.parts[1]);
    const mine = S.s.diagnoses.slice().sort((a, b) => (b.result.grade === "C") - (a.result.grade === "C"));
    const pre = r.q.get("diag") && S.diagnosis(r.q.get("diag"));
    const RQ = { diag: pre ? pre.id : (mine.find((d) => d.result.grade === "C") || {}).id || "", symptom: pre ? pre.symptom : "", modelId: pre ? pre.modelId : "", region: "", method: "visit", shop: "" };
    const perks = [
      ["점검비 면제·할인", "진단 카드를 보여 주면 같은 점검을 다시 받지 않아요."],
      ["진단 내용 그대로 전달", "증상·답변·사진이 수리점에 먼저 전달돼요. 처음부터 설명할 필요가 없어요."],
      ["공임 10% 할인", "리페어북을 통해 맡기면 제휴 수리점 공임을 할인해 드려요."],
      ["진행 상황 한곳에서", "접수부터 견적·완료까지 내 주문에서 확인해요."]
    ];
    const steps = [["요청 접수", "진단 카드와 지역을 골라 요청해요"], ["수리점 확인", "영업일 하루 안에 수리점이 연락드려요"], ["방문·입고", "예약한 날 방문하거나 택배로 보내요"], ["점검·견적", "수리 전 견적을 먼저 알려 드리고 동의를 받아요"], ["수리 완료", "수리 내역이 진단 카드에 함께 남아요"]];
    return {
      title: "수리점 연결",
      html: `<div class="wrap page-head"><div class="eyebrow">제휴 수리점 연결</div><h1>진단 카드 그대로,<br/>믿을 수 있는 수리점으로</h1>
        <p class="muted" style="margin-top:14px;max-width:640px">키트로 해결할 수 없는 고장은 제휴 수리점에 연결해 드려요. 리페어북이 먼저 진단한 내용을 넘겨서, 같은 점검을 두 번 받지 않게 해요.</p></div>
      <section class="sec tight"><div class="wrap"><div class="perks">${perks.map((x, i) => `<div><span class="pn">0${i + 1}</span><h3>${x[0]}</h3><p class="muted small">${x[1]}</p></div>`).join("")}</div></div></section>
      <section class="sec sand"><div class="wrap">
        <div class="sec-head"><div><div class="eyebrow">수리 요청</div><h2 class="h-lg" style="margin-top:10px">수리점 찾고 예약 요청하기</h2></div><span class="small muted">요청은 무료예요. 견적에 동의하기 전까지 비용이 들지 않아요.</span></div>
        <form class="detail" id="rqForm" novalidate>
          <div>
            <div class="qt">01 · 어떤 고장인가요?</div>
            <div class="field"><label>진단 카드</label><select id="rqDiag"><option value="">진단 카드 없이 요청할게요</option>${mine.map((d) => { const m = S.model(d.modelId); return `<option value="${d.id}" ${d.id === RQ.diag ? "selected" : ""}>${esc(d.id)} · ${esc(sym(d.symptom).label)} · ${esc(m ? m.name : "모델 모름")} · ${d.result.grade}</option>`; }).join("")}</select>
              <div class="hint">${mine.length ? "진단 카드를 고르면 증상과 답변이 수리점에 그대로 전달돼요." : `아직 진단 카드가 없어요. <a class="tlink small" href="#/diagnose">무료 증상 진단</a>을 먼저 받으면 점검비 혜택이 커요.`}</div></div>
            <div id="rqManual"></div>
            <div class="qt" style="margin-top:30px">02 · 어디서, 어떻게 맡기세요?</div>
            <div class="field"><label>지역</label><select id="rqRegion"><option value="">지역 고르기</option>${REGIONS.map((x) => `<option>${x}</option>`).join("")}</select></div>
            <div class="opts cols2" id="rqMethod">${["visit", "parcel"].map((k) => `<button type="button" class="opt ${RQ.method === k ? "on" : ""}" data-method="${k}"><span><div class="ot">${methodKo[k]}</div><div class="od">${k === "visit" ? "가까운 매장에 직접 가져가요" : "택배로 보내고 고쳐서 받아요 · 전국"}</div></span><span class="radio-dot"></span></button>`).join("")}</div>
            <div class="qt" style="margin-top:30px">03 · 수리점 고르기</div>
            <div id="shopList"></div>
            <div class="qt" style="margin-top:30px">04 · 연락받을 정보</div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
              <div class="field"><label>이름</label><input type="text" id="rqName" autocomplete="name"/></div>
              <div class="field"><label>휴대폰</label><input type="tel" id="rqPhone" autocomplete="tel" placeholder="010-0000-0000"/></div></div>
            <div class="field"><label>희망 날짜 (선택)</label><input type="date" id="rqDate" min="${new Date().toISOString().slice(0, 10)}"/></div>
            <div class="field"><label>더 알려 줄 내용 (선택)</label><textarea id="rqMemo" rows="3" placeholder="예: 오전에만 방문 가능해요, 데이터는 꼭 살려야 해요"></textarea></div>
            <div class="err" id="rqErr"></div>
          </div>
          <aside class="sticky"><div class="buybox" id="rqSum"></div></aside>
        </form>
      </div></section>
      <section class="sec"><div class="wrap">
        <div class="sec-head"><div><div class="eyebrow">진행 순서</div><h2 class="h-lg" style="margin-top:10px">요청부터 수리 완료까지</h2></div></div>
        <ol class="numlist">${steps.map((x, i) => `<li><span class="n">0${i + 1}</span><div><div class="t">${x[0]}</div><div class="d">${x[1]}</div></div></li>`).join("")}</ol>
      </div></section>
      <section class="sec sand" id="partner"><div class="wrap two">
        <div><div class="eyebrow">파트너 모집</div><h2 class="h-lg" style="margin-top:10px">리페어북 제휴 수리점이 되어 주세요</h2>
          <p class="muted" style="margin-top:16px">진단이 끝난 손님을 연결해 드려요. 증상·모델·사진이 미리 정리돼 와서 점검 시간이 줄고, 리페어북 키트 ‘대신 장착’ 작업도 함께 맡길 수 있어요.</p>
          <ol class="numlist" style="margin-top:28px"><li><span class="n">01</span><div><div class="t">진단 끝난 손님 연결</div><div class="d">C 판정(수리점 필요) 손님을 지역별로 보내 드려요</div></div></li><li><span class="n">02</span><div><div class="t">키트 장착 대행</div><div class="d">SSD·RAM·구리스 키트 ‘대신 장착’ 주문을 맡아 주세요</div></div></li><li><span class="n">03</span><div><div class="t">수수료 없이 시작</div><div class="d">사전예약 기간에는 연결 수수료를 받지 않아요</div></div></li></ol>
        </div>
        <form id="ptForm" class="buybox" novalidate>
          <div class="eyebrow">제휴 신청</div>
          <div class="field" style="margin-top:16px"><label>상호</label><input type="text" id="ptName"/></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
            <div class="field"><label>지역</label><select id="ptRegion"><option value="">고르기</option>${REGIONS.map((x) => `<option>${x}</option>`).join("")}</select></div>
            <div class="field"><label>연락처</label><input type="tel" id="ptPhone" placeholder="010-0000-0000"/></div></div>
          <div class="qt">잘하는 수리 (여러 개)</div>
          <div class="chips" id="ptTags">${["전원·메인보드", "화면", "배터리", "침수·충격", "발열·구리스", "키트 장착"].map((x) => `<button type="button" class="chip" data-pt="${x}">${x}</button>`).join("")}</div>
          <div class="err" id="ptErr"></div>
          <button class="btn solid block" style="margin-top:20px">제휴 신청하기</button>
          <p class="small muted" style="margin-top:10px">담당자가 영업일 2일 안에 연락드려요.</p>
        </form>
      </div></section>`,
      bind() {
        const draw = () => {
          const d = S.diagnosis(RQ.diag);
          const symId = d ? d.symptom : RQ.symptom, mId = d ? d.modelId : RQ.modelId;
          $("#rqManual").innerHTML = d ? `<div class="notice small" style="margin-top:4px">${esc(sym(d.symptom).label)} · ${esc(d.result.why)}</div>` : `
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:6px">
            <div class="field"><label>증상</label><select id="rqSym"><option value="">고르기</option>${SEED.symptoms.map((x) => `<option value="${x.id}" ${x.id === RQ.symptom ? "selected" : ""}>${esc(x.label)}</option>`).join("")}</select></div>
            <div class="field"><label>노트북</label><select id="rqModel"><option value="">모르겠어요·목록에 없어요</option>${S.s.models.map((x) => `<option value="${x.id}" ${x.id === RQ.modelId ? "selected" : ""}>${esc(x.name)}</option>`).join("")}</select></div></div>`;
          $("#rqSym") && $("#rqSym").addEventListener("change", (e) => { RQ.symptom = e.target.value; draw(); });
          $("#rqModel") && $("#rqModel").addEventListener("change", (e) => { RQ.modelId = e.target.value; draw(); });
          const tag = S.repairTag[symId];
          const list = SHOPS.filter((x) => x.methods.includes(RQ.method) && (x.region === RQ.region || (RQ.method === "parcel" && x.region === "전국")))
            .sort((a, b) => (tag && b.tags.includes(tag)) - (tag && a.tags.includes(tag)));
          if (RQ.shop && RQ.shop !== "any" && !list.some((x) => x.id === RQ.shop)) RQ.shop = "";
          $("#shopList").innerHTML = !RQ.region ? `<p class="small muted">지역을 고르면 가까운 제휴 수리점이 나와요.</p>`
            : list.length ? `<div class="opts">${list.map((x) => { const fit = tag && x.tags.includes(tag); return `<button type="button" class="opt shop ${RQ.shop === x.id ? "on" : ""}" data-shop="${x.id}"><span><div class="ot">${esc(x.name)} ${fit ? `<span class="pill ok">${esc(tag)} 가능</span>` : ""}</div><div class="od">${esc(x.region === "전국" ? x.area : x.region + " " + x.area)} · ${esc(x.hours)}</div><div class="od">${x.tags.map(esc).join(" · ")}</div><div class="od perk">${esc(x.perk)}</div></span><span class="radio-dot"></span></button>`; }).join("")}
                <button type="button" class="opt ${RQ.shop === "any" ? "on" : ""}" data-shop="any"><span><div class="ot">가장 빨리 볼 수 있는 곳으로</div><div class="od">리페어북이 일정을 맞춰 골라 드려요</div></span><span class="radio-dot"></span></button></div>`
            : `<div class="notice small">${esc(RQ.region)} 지역 제휴 수리점을 모집하고 있어요. <b style="font-weight:500">택배 수리</b>를 고르면 전국 어디서나 맡길 수 있어요.</div>`;
          $$("[data-shop]").forEach((b) => b.addEventListener("click", () => { RQ.shop = b.dataset.shop; draw(); }));
          const shop = SHOPS.find((x) => x.id === RQ.shop), m = S.model(mId);
          $("#rqSum").innerHTML = `<div class="eyebrow">요청 요약</div>
            <div class="sum-row" style="margin-top:12px"><span>증상</span><span>${symId ? esc(sym(symId).label) : "-"}</span></div>
            <div class="sum-row"><span>노트북</span><span>${m ? esc(m.name) : "-"}</span></div>
            <div class="sum-row"><span>진단 카드</span><span>${d ? esc(d.id) : "없음"}</span></div>
            <div class="sum-row"><span>방식</span><span>${methodKo[RQ.method]}</span></div>
            <div class="sum-row"><span>수리점</span><span>${shop ? esc(shop.name) : RQ.shop === "any" ? "가장 빠른 곳" : "-"}</span></div>
            <div class="sum-row total"><span>혜택</span><span class="small">${d ? (shop ? esc(shop.perk) : "점검비 면제·할인") : "공임 10% 할인"}</span></div>
            ${d && d.result.urgent ? `<div class="notice stop small" style="margin-top:14px">급한 고장이에요. 전원을 켜지 말고 그대로 맡겨 주세요.</div>` : ""}
            <button class="btn solid block" style="margin-top:20px" form="rqForm">수리 요청하기</button>
            <p class="small muted" style="margin-top:10px">견적에 동의하기 전까지 비용이 들지 않아요.</p>`;
        };
        $("#rqDiag").addEventListener("change", (e) => { RQ.diag = e.target.value; draw(); });
        $("#rqRegion").addEventListener("change", (e) => { RQ.region = e.target.value; draw(); });
        $$("[data-method]").forEach((b) => b.addEventListener("click", () => { RQ.method = b.dataset.method; $$("[data-method]").forEach((x) => x.classList.toggle("on", x === b)); draw(); }));
        draw();
        $("#rqForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const d = S.diagnosis(RQ.diag), err = $("#rqErr");
          const symId = d ? d.symptom : RQ.symptom;
          const name = $("#rqName").value.trim(), phone = $("#rqPhone").value.trim();
          if (!symId) return (err.textContent = "진단 카드나 증상을 골라 주세요.");
          if (!RQ.region) return (err.textContent = "지역을 골라 주세요.");
          if (!RQ.shop) return (err.textContent = "수리점을 골라 주세요.");
          if (!name || !/^[0-9\-\s]{9,14}$/.test(phone)) return (err.textContent = "이름과 휴대폰 번호를 확인해 주세요.");
          const x = S.addRepair({ diagnosisId: d ? d.id : "", symptom: symId, modelId: d ? d.modelId : RQ.modelId, region: RQ.region, method: RQ.method, shopId: RQ.shop, date: $("#rqDate").value, name, phone, memo: $("#rqMemo").value.trim() });
          location.hash = "#/repair/" + x.id;
        });
        const PT = new Set();
        $$("[data-pt]").forEach((b) => b.addEventListener("click", () => { const k = b.dataset.pt; PT.has(k) ? PT.delete(k) : PT.add(k); b.classList.toggle("on", PT.has(k)); }));
        $("#ptForm").addEventListener("submit", (e) => {
          e.preventDefault();
          const name = $("#ptName").value.trim(), region = $("#ptRegion").value, phone = $("#ptPhone").value.trim();
          if (!name || !region || !/^[0-9\-\s]{9,14}$/.test(phone)) return ($("#ptErr").textContent = "상호, 지역, 연락처를 확인해 주세요.");
          S.addPartner({ name, region, phone, tags: [...PT] });
          $("#ptForm").reset(); PT.clear(); $$("[data-pt]").forEach((b) => b.classList.remove("on")); $("#ptErr").textContent = "";
          toast("제휴 신청을 받았어요. 영업일 2일 안에 연락드릴게요.");
        });
        if (location.hash.includes("partner")) setTimeout(() => $("#partner").scrollIntoView(), 30);
      }
    };
  }
  function repairBlock(x) {
    const shop = SHOPS.find((s) => s.id === x.shopId), m = S.model(x.modelId);
    return `<div class="eyebrow">${esc(x.id)} · ${fmtDate(x.createdAt)}</div>
      <div class="serif" style="font-size:21px;margin-top:6px">${esc(sym(x.symptom).label)}${m ? " · " + esc(m.name) : ""}</div>
      <div class="small muted" style="margin-top:6px">${methodKo[x.method]} · ${shop ? esc(shop.name) : "가장 빠른 제휴 수리점"}${x.date ? " · 희망일 " + esc(x.date) : ""}</div>
      <ol class="tl">${S.REPAIR_STEPS.map((t, i) => `<li class="${i <= x.status ? "on" : ""}">${t}</li>`).join("")}</ol>`;
  }
  function RepairStatus(id) {
    const x = S.repair(id); if (!x) return NotFound();
    const shop = SHOPS.find((s) => s.id === x.shopId);
    return {
      title: "수리 요청 완료",
      html: `<div class="wrap page-head"><div class="eyebrow">수리 요청 완료</div><h1>수리점에 요청을 보냈어요</h1></div>
      <div class="wrap" style="padding-bottom:110px"><div class="two">
        <div>${repairBlock(x)}
          <div class="eyebrow" style="margin:40px 0 14px">다음에 할 일</div>
          <ol class="numlist"><li><span class="n">01</span><div><div class="t">수리점 연락 기다리기</div><div class="d">영업일 하루 안에 ${esc(x.phone)}로 연락드려요</div></div></li>
          <li><span class="n">02</span><div><div class="t">${x.method === "parcel" ? "택배 보내기" : "방문하기"}</div><div class="d">${x.method === "parcel" ? "충격 방지 포장 후 안내받은 주소로 보내요. 송장 번호는 문자로 알려 주세요." : "예약 시간에 노트북과 충전기를 함께 가져가요"}</div></div></li>
          <li><span class="n">03</span><div><div class="t">진단 카드 보여 주기</div><div class="d">${x.diagnosisId ? `<a class="tlink small" href="#/diagnosis/${x.diagnosisId}">진단 카드 ${esc(x.diagnosisId)}</a>를 휴대폰으로 보여 주면 돼요` : "진단 카드가 없어도 공임 10% 할인은 적용돼요"}</div></div></li></ol>
        </div>
        <div class="buybox"><div class="eyebrow">맡기기 전에</div>
          <ul class="notes small" style="margin-top:12px"><li>중요한 파일은 가능하면 미리 백업해 두세요.</li><li>로그인 암호는 수리점에 알려 주지 않아도 돼요. 필요하면 임시 계정을 만들어 드려요.</li><li>견적에 동의하기 전에는 수리를 시작하지 않아요.</li></ul>
          ${shop ? `<div class="small muted" style="margin-top:16px">${esc(shop.name)} · ${esc(shop.hours)}</div>` : ""}
          <a class="btn block" style="margin-top:18px" href="#/orders">내 주문·요청 보기</a></div>
      </div></div>`
    };
  }

  // ---------- Diagnosis card ----------
  const freeGuide = {
    storage: ["설정 › 시스템 › 저장소 › <b>임시 파일</b>에서 필요 없는 항목 지우기", "<b>저장소 센스</b> 켜서 휴지통·임시 파일 자동 정리", "다운로드 폴더에서 큰 파일 정리(크기순 정렬)", "설정 › 앱에서 쓰지 않는 앱 제거", "사진·영상은 클라우드나 외장 저장장치로 옮기기"],
    slow: ["작업 관리자 › <b>시작 앱</b>에서 필요 없는 항목 ‘사용 안 함’", "브라우저 탭과 확장 프로그램 줄이기", "Windows 업데이트 후 재부팅", "Windows 보안에서 빠른 검사 실행"],
    power: ["같은 증상이 다시 생기면 어댑터와 콘센트를 먼저 바꿔 보기", "전원 버튼 15초 길게 눌러 초기화하기"]
  };
  const ansLabel = {
    hog: { media: "사진·영상이 많음", games: "게임이 많음", work: "업무 파일이 많음" }, cleaned: { true: "정리 해 봄", false: "정리 안 해 봄" },
    when: { boot: "부팅 때 느림", app: "특정 프로그램에서 느림", always: "항상 느림" }, heat: { true: "발열·팬 소음 있음" },
    lamp: { on: "충전 램프 켜짐", off: "충전 램프 꺼짐" }, look: { black: "화면 완전히 까맘", dim: "화면 아주 어두움", lines: "줄·깨짐", flicker: "깜빡임" },
    hours: { lt2: "사용 2시간 미만", "2to4": "사용 2~4시간", gt4: "사용 4시간 이상" }, swell: { true: "뒷판 들뜸" },
    what: { liquid: "액체", drop: "낙하", noise: "소음", heat: "과열" }, since: { today: "오늘", week: "일주일 안", older: "그 전" },
    age: { new: "1년 미만 사용", mid: "1~3년 사용", old: "3년 이상 사용" }, onset: { sudden: "갑자기 시작", gradual: "점점 심해짐" },
    recent: { update: "직전 업데이트", install: "직전 프로그램 설치", drop: "직전 충격", liquid: "직전 액체" }
  };
  const answerSummary = (inp) => Object.keys(ansLabel).map((k) => inp && inp[k] != null && ansLabel[k][String(inp[k])]).filter(Boolean).join(" · ");
  function DiagnosisCard(r) {
    const d = S.diagnosis(r.parts[1]);
    if (!d) return NotFound();
    const m = S.model(d.modelId), g = d.result.grade, review = d.status !== "approved";
    const guide = freeGuide[d.symptom] || freeGuide.storage;
    const p = S.prices();
    let action = "";
    if (review) action = `<div class="notice">사람이 사진과 답변을 확인하고 있어요. 영업일 24시간 안에 이 카드가 확정돼요. 확정 전에는 결제할 수 없어요.</div>`;
    else if (g === "A") action = `<div class="eyebrow" style="margin:6px 0 12px">이 진단에 맞는 키트</div>${kitCards(S.kitsOf(d), m, d.code)}`;
    else if (g === "B") action = `<div class="eyebrow" style="margin:6px 0 12px">무료 해결 가이드</div><ol class="numlist">${guide.map((t, i) => `<li><span class="n">0${i + 1}</span><div class="t" style="letter-spacing:0;font-weight:300">${t}</div></li>`).join("")}</ol>`;
    else action = `<div class="notice ${d.result.urgent ? "stop" : ""}">지금은 부품을 사지 않으셔도 돼요. 이 카드를 제휴 수리점에 보여 주시면 점검비가 면제·할인되고, 같은 점검을 다시 받지 않아도 돼요.</div>
      <a class="btn solid" href="#/repair?diag=${d.id}">제휴 수리점 찾고 예약하기</a>`;
    return {
      title: "진단 카드",
      html: `<div class="wrap page-head"><div class="eyebrow">진단 카드</div><h1>${review ? "확인 중이에요" : esc(gradeText[g])}</h1></div>
      <div class="wrap" style="padding-bottom:110px"><div class="detail">
        <div>
          <div class="dcard"><span class="stamp">${g}</span>
            <div class="eyebrow">${esc(d.id)} · ${fmtDate(d.createdAt)}</div>
            <div class="verdict">${review ? "예비 판정: " : "진단 결과: "}${esc(gradeText[g])}</div>
            <span class="pill ${g}">${gradeName[g]}</span> <span class="pill ${review ? "pending" : "ok"}">${review ? "검토 중" : "확정"}</span>
            <dl>
              <dt>증상</dt><dd>${esc(sym(d.symptom).label)}</dd>
              <dt>노트북</dt><dd>${m ? esc(m.name) + ` <span class="muted small">${esc(d.code)}</span>` : "모름"}</dd>
              ${d.result.freePct != null ? `<dt>점검 결과</dt><dd>저장공간 ${esc(d.input.freeGB)}GB 남음 / 전체 ${esc(d.input.totalGB)}GB (여유 ${d.result.freePct.toFixed(0)}%)</dd>` : ""}
              <dt>이유</dt><dd>${esc(d.result.why)}</dd>
              <dt>다음 할 일</dt><dd>${esc(d.result.next)}</dd>
              ${d.result.recTB ? `<dt>추천 용량</dt><dd>${d.result.recTB}TB 키트</dd>` : ""}
              ${(d.result.notes || []).length ? `<dt>함께 확인할 점</dt><dd><ul class="notes">${d.result.notes.map((t) => `<li>${esc(t)}</li>`).join("")}</ul></dd>` : ""}
              ${answerSummary(d.input) ? `<dt>답변 요약</dt><dd class="small muted">${esc(answerSummary(d.input))}</dd>` : ""}
            </dl>
            ${d.photo ? `<img src="${d.photo}" alt="올린 사진" style="max-height:180px;border:1px solid var(--line);margin-bottom:24px"/>` : ""}
            ${action}
          </div>
          <p class="small muted" style="margin-top:18px">이 카드를 인쇄하거나 캡처해 두세요. 수리점에 보여 주면 점검 내용을 그대로 이어받아요. <button class="tlink small" onclick="window.print()">인쇄하기</button></p>
        </div>
        <aside class="sticky">
          ${d.result.lowConfidence ? `<div class="buybox" style="margin-bottom:20px"><div class="eyebrow">더 정확하게</div><h3 class="h-md" style="margin:8px 0 10px">정밀 원격 진단</h3><p class="muted small">영상통화 20분으로 함께 확인해요. 키트를 사면 전액 차감돼요.</p><div class="price">${won(p.remote)}</div><button class="btn block" style="margin-top:16px" data-remote>신청하기</button></div>` : ""}
          <div class="buybox"><div class="eyebrow">오진 안심 보장</div><p class="small muted" style="margin-top:10px">진단이 틀렸다면 장착 전 전액 환불, 장착 후 다른 부품 고장으로 밝혀지면 설치 패키지 전액 환불과 점검비(최대 11,000원)를 지원해요.</p><a class="tlink small" href="#/kit#guarantee">자세히</a></div>
          <p style="margin-top:20px"><a class="tlink" href="#/diagnose">다른 증상 진단하기</a></p>
        </aside>
      </div></div>`,
      bind() {
        const rp = $("[data-repair]"); rp && rp.addEventListener("click", () => { S.addSupport({ type: "repair", diagnosisId: d.id, modelId: d.modelId, msg: "C 판정 수리점 연결 요청" }); toast("수리점 연결 요청을 받았어요. 연락처로 안내해 드릴게요."); });
        const rm = $("[data-remote]"); rm && rm.addEventListener("click", () => { S.addSupport({ type: "remote-diag", diagnosisId: d.id, modelId: d.modelId, msg: "정밀 원격 진단 신청" }); toast("정밀 원격 진단 신청을 받았어요. (데모 — 결제 없음)"); });
      }
    };
  }

  // ---------- Models ----------
  function Models() {
    const ms = S.s.models;
    return {
      title: "모델 찾기",
      html: `<div class="wrap page-head"><div class="eyebrow">호환 확인</div><h1>내 노트북에 맞는지</h1></div>
      <div class="wrap" style="padding-bottom:110px"><div class="two">
        <div>${howToCode}${searchBox("mSearch", "모델 코드나 이름 입력 (예: NT960XGK)")}
          <form id="reqForm" style="margin-top:60px"><div class="eyebrow" style="margin-bottom:14px">목록에 없나요?</div>
            <div class="field"><label>모델 코드나 이름</label><input type="text" id="reqName" required/></div>
            <button class="btn sm">추가 요청하기</button><div class="hint small muted" style="margin-top:8px">요청이 많은 모델부터 실물 검수해 추가해요.</div></form>
        </div>
        <div><ol class="numlist">${ms.map((m, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><a href="#/model/${m.id}" style="display:flex;justify-content:space-between;gap:12px"><span><span class="t">${esc(m.name)}</span><div class="d">${esc(m.codes.join(" · "))}</div></span><span class="pill ${S.verdict(m)}" style="align-self:center">${S.verdictShort(S.verdict(m))}</span></a></li>`).join("")}</ol></div>
      </div></div>`,
      bind() {
        bindSearch("mSearch", (m, code) => (location.hash = `#/model/${m.id}?code=${encodeURIComponent(code)}`));
        $("#reqForm").addEventListener("submit", (e) => { e.preventDefault(); const v = $("#reqName").value.trim(); if (!v) return; S.addRequest(v, v); $("#reqName").value = ""; toast("요청을 받았어요. 준비되면 알려 드릴게요."); });
      }
    };
  }

  function ModelDetail(r) {
    const m = S.model(r.parts[1]); if (!m) return NotFound();
    const code = r.q.get("code") || "";
    const v = S.verdict(m), p = S.prices(), gate = S.gate(m.id);
    const head = { ok: `이 노트북은 저장공간을 더 넣을 수 있어요`, no: `이 노트북은 저장공간 부품을 추가할 수 없어요`, pending: `이 노트북은 지금 확인 중이에요` }[v];
    let box;
    if (v === "ok") {
      const from = p.pkg;
      box = `<div class="buybox"><div class="eyebrow">이 모델 전용 키트</div>
        <div style="margin:14px 0 4px" class="small muted">설치 패키지</div><div class="price">${won(from)}</div>
        <div class="small muted" style="margin:10px 0 18px">+ 저장공간 부품(시세 연동, ${esc(p.date)} 기준)<br/>1TB ${won(p.ssd1)}${m.maxTB >= 2 ? ` · 2TB ${won(p.ssd2)}` : ""}</div>
        ${gate.ok ? `<div class="notice ok small">진단 카드 확인 완료 · ${esc(gate.d.id)}</div><a class="btn solid block" href="#/order/${m.id}?code=${encodeURIComponent(code || gate.d.code)}">키트 주문하기</a>`
          : gate.reason === "review" ? `<div class="notice small">진단 카드를 사람이 확인 중이에요. 확정되면 주문할 수 있어요.</div><a class="btn block" href="#/diagnosis/${gate.d.id}">진단 카드 보기</a>`
          : `<div class="notice small">잘못 사는 일이 없도록, 주문 전에 1분 진단으로 키트가 맞는지 먼저 확인해요.</div><a class="btn solid block" href="#/diagnose?symptom=storage&model=${m.id}&code=${encodeURIComponent(code)}">1분 진단하고 주문하기</a>`}
        <ul class="small muted" style="padding-left:18px;margin:20px 0 0"><li>약 ${m.minutes}분 · 준비물 없음(키트에 다 들어 있어요)</li><li>맞지 않으면 무료 교환·전액 환불</li><li>부담되면 장착 대행 선택 가능</li></ul></div>`;
    } else if (v === "no") {
      box = `<div class="buybox"><div class="eyebrow">다음에 할 수 있는 일</div><p style="margin-top:12px">${esc(m.note)}</p><a class="btn block" href="#/diagnose?model=${m.id}&code=${encodeURIComponent(code)}">증상 진단 받아 보기</a>${["ssd-swap", "ram", "grease"].some((k) => S.canKit(k, m)) ? `<div class="small muted" style="margin:18px 0 8px">이 모델에서 할 수 있는 업그레이드: ${["ssd-swap", "ram", "grease"].filter((k) => S.canKit(k, m)).map((k) => esc(KITS[k].name)).join(", ")}</div><a class="btn solid block" href="#/upgrade">업그레이드 진단하기</a>` : ""}</div>`;
    } else {
      box = `<div class="buybox"><div class="eyebrow">준비 중</div><p style="margin-top:12px">${esc(m.note || "실물 검수 후 판매를 시작해요.")}</p><button class="btn solid block" data-notify>준비되면 알림 받기</button></div>`;
    }
    return {
      title: m.name,
      html: `<div class="wrap page-head"><a class="tlink small" href="#/models">← 모델 찾기</a><div class="eyebrow" style="margin-top:28px">${esc(m.brand)} · ${esc(code || m.codes.join(" · "))}</div><h1>${esc(m.name)}</h1></div>
      <div class="wrap" style="padding-bottom:110px"><div class="detail">
        <div>
          <span class="pill ${v}">${S.verdictShort(v)}</span>
          <div class="big-verdict">${head}</div>
          <p class="muted">${v === "ok" ? `기본 저장공간 옆에 비어 있는 자리가 ${m.emptySlots}개 있어요. 지금 쓰는 파일과 윈도우는 그대로 두고 하나를 더 꽂아요.` : esc(m.note)}</p>
          ${m.note && v === "ok" ? `<div class="notice small">${esc(m.note)}</div>` : ""}
          <div class="spec" style="margin-top:40px">
            <div>빈 자리(확장 슬롯)</div><div>${m.emptySlots}개 / 전체 ${m.totalSlots}개</div>
            <div>맞는 부품 규격</div><div>${esc(m.ssdSpec)}</div>
            <div>최대 용량</div><div>${m.maxTB ? m.maxTB + "TB" : "—"}</div>
            <div>메모리(RAM)</div><div>${esc(m.ram)}</div>
            <div>난이도</div><div>${"●".repeat(m.difficulty)}<span style="opacity:.25">${"●".repeat(5 - m.difficulty)}</span> ${m.minutes ? `· 약 ${m.minutes}분` : ""}</div>
            <div>확인 근거</div><div class="small">${esc(m.source)}${m.verified ? " · 전문가 검수 완료" : " · 검수 진행 중"}</div>
          </div>
          ${m.warranty ? `<div class="notice" style="margin-top:30px"><b style="font-weight:500">보증 영향 미리 알림</b><br/>${esc(m.warranty)}</div>` : ""}
          <div class="acc" style="margin-top:50px">${SEED.faq.slice(0, 4).map((f) => `<details><summary>${esc(f.q)}</summary><div class="body">${esc(f.a)}</div></details>`).join("")}</div>
        </div>
        <aside class="sticky">${box}</aside>
      </div></div>`,
      bind() { const n = $("[data-notify]"); n && n.addEventListener("click", () => { S.addRequest(m.name, code); toast("알림 신청을 받았어요."); }); }
    };
  }

  // ---------- Order ----------
  function Order(r) {
    const m = S.model(r.parts[1]); if (!m) return NotFound();
    const gate = S.gate(m.id);
    if (!gate.ok) {
      return { title: "주문", html: `<div class="wrap page-head"><h1>주문 전에 진단이 필요해요</h1><p class="muted" style="margin-top:14px">‘키트로 해결’ 판정과 확정된 진단 카드가 있어야 결제할 수 있어요. 잘못 사는 일을 막기 위한 장치예요.</p>
        <p style="margin-top:26px"><a class="btn solid" href="#/diagnose?symptom=storage&model=${m.id}&code=${encodeURIComponent(r.q.get("code") || "")}">1분 진단하기</a></p></div>` };
    }
    const code = r.q.get("code") || gate.d.code;
    const p = S.prices(), st = S.s.settings;
    const O = { kind: m.maxTB >= 1 ? "ssd1" : "pkg", install: false, care: false };
    const options = [
      ["pkg", "설치 패키지만", "부품을 이미 갖고 있어요 · 공구·가이드·지원 포함(8종)", p.pkg],
      ["ssd1", "부품 포함형 1TB", `설치 패키지 + 저장공간 부품 1TB (9종)`, p.pkg + p.ssd1]
    ];
    if (m.maxTB >= 2) options.push(["ssd2", "부품 포함형 2TB", "용량당 가격이 가장 낮아요", p.pkg + p.ssd2]);
    return {
      title: "키트 주문",
      html: `<div class="wrap page-head"><a class="tlink small" href="#/model/${m.id}?code=${encodeURIComponent(code)}">← ${esc(m.name)}</a><h1 style="margin-top:20px">키트 주문</h1></div>
      <div class="wrap" style="padding-bottom:110px"><form class="detail" id="orderForm" novalidate>
        <div>
          <div class="eyebrow" style="margin-bottom:14px">01 · 구성 고르기</div>
          <div class="opts" id="kinds">${options.map((o) => `<button type="button" class="opt" data-kind="${o[0]}"><span><div class="ot">${o[1]}</div><div class="od">${o[2]}</div></span><span class="op">${won(o[3])}</span></button>`).join("")}</div>
          ${m.maxTB < 2 ? `<div class="small muted" style="margin-top:8px">${esc(m.note)}</div>` : ""}
          <div class="eyebrow" style="margin:34px 0 4px">추가 선택</div>
          <label class="check"><input type="checkbox" id="oInstall"/><span><b style="font-weight:500">대신 장착해 주세요</b> +${won(p.install)}<br/><span class="small muted">제휴 수리점에서 장착해 드려요. 직접 하기 부담될 때 언제든 바꿀 수 있어요.</span></span></label>
          <label class="check"><input type="checkbox" id="oCare"/><span><b style="font-weight:500">케어 플랜 (1년)</b> +${won(p.care)}<br/><span class="small muted">연 2회 원격 점검, 클리닝·백업 알림, 우선 지원</span></span></label>

          <div class="eyebrow" style="margin:46px 0 14px">02 · 모델 코드 다시 확인</div>
          <div class="notice small">${code ? `진단 때 확인한 코드: <b style="font-weight:500">${esc(code)}</b> — 미호환 발송을 막기 위해 한 번 더 입력해 주세요.` : "모델 이름으로 진단하셨어요. 노트북 바닥 스티커나 ‘시스템 정보’의 모델 코드를 입력해 주세요."}</div>
          <div class="field"><label>모델 코드</label><input type="text" id="oCode" autocomplete="off" placeholder="${esc(code)}"/><div class="err" id="eCode"></div></div>

          <div class="eyebrow" style="margin:40px 0 4px">03 · 확인하고 동의하기</div>
          <label class="check"><input type="checkbox" class="agree"/><span>보증 영향을 확인했어요. <span class="small muted">${esc(m.warranty)}</span></span></label>
          <label class="check"><input type="checkbox" class="agree"/><span>작업 전에 내 파일을 백업해요. 데이터 복구는 지원 범위 밖이에요.</span></label>
          <label class="check"><input type="checkbox" class="agree"/><span>가이드 미준수로 인한 파손 면책 기준과 오진 안심 보장 내용을 확인했어요. <a class="tlink small" href="#/kit#guarantee" target="_blank">보기</a></span></label>
          <div class="err" id="eAgree"></div>

          <div class="eyebrow" style="margin:40px 0 14px">04 · 받는 분</div>
          <div class="field"><label>이름</label><input type="text" id="oName" autocomplete="name"/></div>
          <div class="field"><label>휴대폰</label><input type="tel" id="oPhone" autocomplete="tel" placeholder="010-0000-0000"/></div>
          <div class="field"><label>주소</label><input type="text" id="oAddr" autocomplete="street-address"/></div>
          <div class="err" id="eShip"></div>
        </div>
        <aside class="sticky"><div class="buybox">
          <div class="eyebrow">주문 요약</div>
          <div class="serif" style="font-size:18px;margin:10px 0 16px">${esc(m.name)} <span class="small muted">${esc(code)}</span></div>
          <div id="sum"></div>
          <button class="btn solid block" style="margin-top:22px" id="payBtn">${st.preorder ? "사전예약 결제하기" : "결제하기"}</button>
          <p class="small muted" style="margin-top:12px">데모 화면이에요. 실제 결제는 일어나지 않아요. 부품 가격은 결제 시점 시세로 확정되고, 결제 후 2~3영업일 안에 출고돼요.</p>
        </div></aside>
      </form></div>`,
      bind() {
        const sum = () => {
          const ssd = O.kind === "ssd1" ? p.ssd1 : O.kind === "ssd2" ? p.ssd2 : 0;
          const rows = [["설치 패키지", p.pkg]];
          if (ssd) rows.push([`저장공간 부품 ${O.kind === "ssd2" ? "2TB" : "1TB"} <span class="small muted">(${esc(p.date)} 시세)</span>`, ssd]);
          if (O.install) rows.push(["장착 대행", p.install]);
          if (O.care) rows.push(["케어 플랜 1년", p.care]);
          const total = rows.reduce((a, b) => a + b[1], 0);
          $("#sum").innerHTML = rows.map((x) => `<div class="sum-row"><span>${x[0]}</span><span>${won(x[1])}</span></div>`).join("") + `<div class="sum-row total"><span>합계</span><span>${won(total)}</span></div>`;
          $$("[data-kind]").forEach((b) => b.classList.toggle("on", b.dataset.kind === O.kind));
          return { rows, total, ssd };
        };
        $$("[data-kind]").forEach((b) => b.addEventListener("click", () => { O.kind = b.dataset.kind; sum(); }));
        $("#oInstall").addEventListener("change", (e) => { O.install = e.target.checked; sum(); });
        $("#oCare").addEventListener("change", (e) => { O.care = e.target.checked; sum(); });
        sum();
        $("#orderForm").addEventListener("submit", (e) => {
          e.preventDefault();
          let ok = true;
          const typed = $("#oCode").value;
          $("#eCode").textContent = ""; $("#eAgree").textContent = ""; $("#eShip").textContent = "";
          if (code ? S.norm(typed) !== S.norm(code) : (S.resolve(typed) || {}).id !== m.id) { $("#eCode").textContent = "진단 때 확인한 코드와 달라요. 노트북의 ‘시스템 모델’ 값을 다시 확인해 주세요."; ok = false; }
          if ($$(".agree").some((c) => !c.checked)) { $("#eAgree").textContent = "세 가지 모두 확인해 주세요."; ok = false; }
          const name = $("#oName").value.trim(), phone = $("#oPhone").value.trim(), addr = $("#oAddr").value.trim();
          if (!name || !/^[0-9\-\s]{9,14}$/.test(phone) || !addr) { $("#eShip").textContent = "이름, 휴대폰 번호, 주소를 확인해 주세요."; ok = false; }
          if (!ok) { toast("입력하지 않은 항목이 있어요."); return; }
          const s = sum();
          const o = S.addOrder({ modelId: m.id, code, kind: O.kind, install: O.install, care: O.care, lines: s.rows.map((x) => [x[0].replace(/<[^>]+>/g, ""), x[1]]), total: s.total, diagnosisId: gate.d.id, ship: { name, phone, addr } });
          location.hash = "#/done/" + o.id;
        });
      }
    };
  }

  // ---------- Buy (SSD 교체 · RAM · 구리스 키트) ----------
  function Buy(r) {
    const kit = r.parts[1], m = S.model(r.parts[2]), K = KITS[kit];
    if (!m || !K || kit === "ssd-add") return NotFound();
    const gate = S.kitGate(kit, m.id);
    if (!gate.ok) {
      const why = gate.reason === "model" ? `${esc(m.name)}은(는) ${esc(K.name)}를 쓸 수 없는 모델이에요.` : gate.reason === "review" ? "진단 카드를 사람이 확인 중이에요. 확정되면 주문할 수 있어요." : "내 노트북에 맞는지 먼저 확인해야 결제할 수 있어요. 잘못 사는 일을 막기 위한 장치예요.";
      const want = { "ssd-swap": "ssd", ram: "ram", grease: "grease" }[kit];
      return { title: "주문", html: `<div class="wrap page-head"><div class="eyebrow">${esc(K.name)}</div><h1>주문 전에 진단이 필요해요</h1><p class="muted" style="margin-top:14px;max-width:620px">${why}</p>
        <p style="margin-top:26px;display:flex;gap:10px;flex-wrap:wrap"><a class="btn solid" href="#/upgrade?want=${want}">업그레이드 진단하기</a><a class="btn" href="#/diagnose">증상 진단하기</a></p></div>` };
    }
    const code = r.q.get("code") || gate.d.code || "";
    const p = S.prices(), st = S.s.settings, up = S.up(m) || {};
    const opts = S.kitOptions(kit, m);
    const O = { kind: opts[0][0], install: kit === "grease" && up.grease >= 5, care: false };
    const warn = kit === "ssd-swap" ? "기존 SSD를 빼는 작업이에요. 복제가 끝나기 전에는 기존 SSD를 지우거나 버리지 마세요." : kit === "ram" ? "기존 모듈과 같은 규격(DDR5 SO-DIMM)만 넣어요. 키트는 모델 규격에 맞춰 보내 드려요." : "구리스는 쌀알 크기만큼만 발라요. 너무 많이 바르면 오히려 열이 잘 빠지지 않아요.";
    return {
      title: K.name + " 주문",
      html: `<div class="wrap page-head"><a class="tlink small" href="#/upgrade">← 업그레이드 진단</a><div class="eyebrow" style="margin-top:20px">${esc(m.name)} 전용</div><h1 style="margin-top:8px">${esc(K.name)}</h1><p class="muted" style="margin-top:10px">${esc(K.short)} · ${esc(K.time)} · 진단 ${esc(gate.d.id)} 확인 완료</p></div>
      <div class="wrap" style="padding-bottom:110px"><form class="detail" id="buyForm" novalidate>
        <div>
          <div class="eyebrow" style="margin-bottom:14px">01 · 구성 고르기</div>
          <div class="opts">${opts.map((o) => `<button type="button" class="opt" data-kind="${o[0]}"><span><div class="ot">${o[1]}</div><div class="od">${o[2]}</div></span><span class="op">${won(o[3].reduce((a, b) => a + b[1], 0))}</span></button>`).join("")}</div>
          <div class="kit-inbox"><div class="qt">상자 안에는</div><ol>${K.items.map((x) => `<li>${esc(x)}</li>`).join("")}</ol></div>
          <div class="notice small" style="margin-top:14px">${esc(warn)}</div>
          <div class="eyebrow" style="margin:34px 0 4px">추가 선택</div>
          <label class="check"><input type="checkbox" id="oInstall" ${O.install ? "checked" : ""}/><span><b style="font-weight:500">대신 장착해 주세요</b> +${won(p.install)}<br/><span class="small muted">${kit === "grease" && up.grease >= 5 ? "이 모델은 난이도가 높아 대신 장착을 권해요." : "제휴 수리점에서 작업해 드려요."}</span></span></label>
          <label class="check"><input type="checkbox" id="oCare"/><span><b style="font-weight:500">케어 플랜 (1년)</b> +${won(p.care)}<br/><span class="small muted">연 2회 원격 점검, 클리닝·백업 알림, 우선 지원</span></span></label>

          <div class="eyebrow" style="margin:46px 0 14px">02 · 모델 코드 다시 확인</div>
          <div class="notice small">${code ? `진단 때 확인한 코드: <b style="font-weight:500">${esc(code)}</b> — 미호환 발송을 막기 위해 한 번 더 입력해 주세요.` : "모델 이름으로 진단하셨어요. 노트북 바닥 스티커나 ‘시스템 정보’의 모델 코드를 입력해 주세요."}</div>
          <div class="field"><label>모델 코드</label><input type="text" id="oCode" autocomplete="off" placeholder="${esc(code || m.codes[0])}"/><div class="err" id="eCode"></div></div>

          <div class="eyebrow" style="margin:40px 0 4px">03 · 확인하고 동의하기</div>
          <label class="check"><input type="checkbox" class="agree"/><span>보증 영향을 확인했어요. <span class="small muted">${esc(m.warranty || "직접 분해하면 해당 부위의 무상 수리가 제한될 수 있어요.")}</span></span></label>
          <label class="check"><input type="checkbox" class="agree"/><span>작업 전에 내 파일을 백업해요. 데이터 복구는 지원 범위 밖이에요.</span></label>
          <label class="check"><input type="checkbox" class="agree"/><span>가이드 미준수로 인한 파손 면책 기준과 오진 안심 보장 내용을 확인했어요. <a class="tlink small" href="#/kit#guarantee" target="_blank">보기</a></span></label>
          <div class="err" id="eAgree"></div>

          <div class="eyebrow" style="margin:40px 0 14px">04 · 받는 분</div>
          <div class="field"><label>이름</label><input type="text" id="oName" autocomplete="name"/></div>
          <div class="field"><label>휴대폰</label><input type="tel" id="oPhone" autocomplete="tel" placeholder="010-0000-0000"/></div>
          <div class="field"><label>주소</label><input type="text" id="oAddr" autocomplete="street-address"/></div>
          <div class="err" id="eShip"></div>
        </div>
        <aside class="sticky"><div class="buybox">
          <div class="eyebrow">주문 요약</div>
          <div class="serif" style="font-size:18px;margin:10px 0 4px">${esc(K.name)}</div>
          <div class="small muted" style="margin-bottom:16px">${esc(m.name)} ${esc(code)}</div>
          <div id="sum"></div>
          <button class="btn solid block" style="margin-top:22px">${st.preorder ? "사전예약 결제하기" : "결제하기"}</button>
          <p class="small muted" style="margin-top:12px">데모 화면이에요. 실제 결제는 일어나지 않아요. 부품 가격은 결제 시점 시세로 확정돼요.</p>
        </div></aside>
      </form></div>`,
      bind() {
        const sum = () => {
          const o = opts.find((x) => x[0] === O.kind);
          const rows = o[3].slice();
          if (O.install) rows.push(["장착 대행", p.install]);
          if (O.care) rows.push(["케어 플랜 1년", p.care]);
          const total = rows.reduce((a, b) => a + b[1], 0);
          $("#sum").innerHTML = rows.map((x) => `<div class="sum-row"><span>${esc(x[0])}</span><span>${won(x[1])}</span></div>`).join("") + `<div class="sum-row total"><span>합계</span><span>${won(total)}</span></div>`;
          $$("[data-kind]").forEach((b) => b.classList.toggle("on", b.dataset.kind === O.kind));
          return { rows, total, label: o[1] };
        };
        $$("[data-kind]").forEach((b) => b.addEventListener("click", () => { O.kind = b.dataset.kind; sum(); }));
        $("#oInstall").addEventListener("change", (e) => { O.install = e.target.checked; sum(); });
        $("#oCare").addEventListener("change", (e) => { O.care = e.target.checked; sum(); });
        sum();
        $("#buyForm").addEventListener("submit", (e) => {
          e.preventDefault();
          let ok = true;
          const typed = $("#oCode").value;
          $("#eCode").textContent = ""; $("#eAgree").textContent = ""; $("#eShip").textContent = "";
          if (code ? S.norm(typed) !== S.norm(code) : (S.resolve(typed) || {}).id !== m.id) { $("#eCode").textContent = "이 모델의 코드와 달라요. 노트북의 ‘시스템 모델’ 값을 다시 확인해 주세요."; ok = false; }
          if ($$(".agree").some((c) => !c.checked)) { $("#eAgree").textContent = "세 가지 모두 확인해 주세요."; ok = false; }
          const name = $("#oName").value.trim(), phone = $("#oPhone").value.trim(), addr = $("#oAddr").value.trim();
          if (!name || !/^[0-9\-\s]{9,14}$/.test(phone) || !addr) { $("#eShip").textContent = "이름, 휴대폰 번호, 주소를 확인해 주세요."; ok = false; }
          if (!ok) { toast("입력하지 않은 항목이 있어요."); return; }
          const sm = sum();
          const o = S.addOrder({ modelId: m.id, code: code || typed.trim().toUpperCase(), kit, kitName: `${K.name} · ${sm.label}`, kind: O.kind, install: O.install, care: O.care, lines: sm.rows, total: sm.total, diagnosisId: gate.d.id, ship: { name, phone, addr } });
          location.hash = "#/done/" + o.id;
        });
      }
    };
  }

  function Done(r) {
    const o = S.order(r.parts[1]); if (!o) return NotFound();
    const m = S.model(o.modelId);
    const link = location.href.split("#")[0] + `#/guide/${o.modelId}?order=${o.id}`;
    return {
      title: "주문 완료",
      html: `<div class="wrap page-head"><div class="eyebrow">주문 완료</div><h1>주문해 주셔서 고마워요</h1></div>
      <div class="wrap" style="padding-bottom:110px"><div class="two">
        <div>
          <div class="spec"><div>주문번호</div><div class="serif">${esc(o.id)}</div><div>모델</div><div>${esc(m ? m.name : "")} <span class="small muted">${esc(o.code)}</span></div><div>결제 금액</div><div>${won(o.total)}</div><div>출고 예정</div><div>결제 후 2~3영업일</div></div>
          ${o.kit && o.kit !== "ssd-add" ? `<div class="notice" style="margin-top:30px">${esc((KITS[o.kit] || {}).name || "")} 전용 영상 가이드는 출고와 함께 문자로 보내 드려요. 아래 저장공간 가이드는 분해·조립 순서가 같아 미리 봐 두면 도움이 돼요.</div>` : ""}<div class="eyebrow" style="margin:46px 0 14px">기다리는 동안</div>
          <ol class="numlist"><li><span class="n">01</span><div><div class="t">내 파일 미리 복사해 두기</div><div class="d">작업 1단계에서 다시 확인해요</div></div></li><li><span class="n">02</span><div><div class="t">휴대폰에서 가이드 열어 두기</div><div class="d">작업 중에는 노트북 화면을 볼 수 없어서 휴대폰으로 봐요</div></div></li><li><span class="n">03</span><div><div class="t">5분 미리보기</div><div class="d">전체 과정을 먼저 훑어보면 훨씬 수월해요</div></div></li></ol>
        </div>
        <div class="buybox"><div class="eyebrow">휴대폰으로 이어 보기</div><p class="small muted" style="margin:10px 0 14px">앱 출시 전까지는 아래 주소를 휴대폰에서 열면 같은 가이드가 열려요. 키트의 QR 카드도 같은 곳으로 연결돼요.</p>
          <div class="field"><input type="text" readonly value="${esc(link)}" id="lnk"/></div>
          <div style="display:flex;gap:10px;flex-wrap:wrap"><button class="btn sm" id="copy">주소 복사</button><a class="btn solid sm" href="#/guide/${o.modelId}?order=${o.id}">가이드 미리 보기</a><a class="btn sm" href="#/orders">주문 현황</a></div>
        </div>
      </div></div>`,
      bind() { $("#copy").addEventListener("click", () => { const i = $("#lnk"); i.select(); try { navigator.clipboard.writeText(i.value); } catch (e) { document.execCommand("copy"); } toast("주소를 복사했어요."); }); }
    };
  }

  // ---------- Guide ----------
  function Guide(r) {
    if (!r.parts[1]) {
      const ok = S.s.models.filter((m) => S.verdict(m) === "ok");
      return { title: "작업 가이드", html: `<div class="wrap page-head"><div class="eyebrow">작업 가이드</div><h1>미리 읽어 두면 30분이면 끝나요</h1><p class="muted" style="margin-top:14px;max-width:620px">실제 작업은 휴대폰으로 보면서 해요. PC에서는 미리 읽어 두는 용도예요.</p></div>
        <div class="wrap" style="padding-bottom:110px"><ol class="numlist">${ok.map((m, i) => `<li><span class="n">0${i + 1}</span><a href="#/guide/${m.id}" style="display:flex;justify-content:space-between"><span class="t">${esc(m.name)}</span><span class="small muted">약 ${m.minutes}분 · 7단계</span></a></li>`).join("")}</ol></div>` };
    }
    const m = S.model(r.parts[1]); if (!m) return NotFound();
    const orderId = r.q.get("order") || "";
    const key = orderId || "preview:" + m.id;
    const prog = S.s.progress[key] || (S.s.progress[key] = { step: 0, done: {}, complete: false });
    const steps = SEED.guide;
    const draw = () => {
      const i = prog.step, s = steps[i];
      const pct = Math.round(((i + (prog.complete ? 1 : 0)) / steps.length) * 100);
      $("#gMain").innerHTML = prog.complete
        ? `<div class="dcard" style="text-align:center"><div class="eyebrow">완료</div><div class="verdict">저장공간이 늘었어요</div><p class="muted">새 드라이브가 생겼다면 성공이에요. 이제 사진과 영상을 새 공간에 옮겨 보세요.</p><div class="frame wide" style="max-width:420px;margin:24px auto">${photo(PH.step.check, 900)}</div><button class="btn" data-reopen>가이드 다시 보기</button></div>`
        : `<div class="progress-txt">${i + 1} / ${steps.length} · ${esc(s.t)}</div><div class="bar"><i style="width:${pct}%"></i></div>
          <div class="media">${VID[s.art] ? `<span class="tag"><span class="rec"></span>영상 · ${i + 1}단계 · 약 ${s.min}분 · ${esc(m.name)}</span><video src="${VID[s.art]}" poster="https://images.unsplash.com/photo-${PH.step[s.art][0]}?auto=format&fit=crop&w=1400&q=70" autoplay muted loop playsinline controls preload="metadata" aria-label="${esc(s.t)} 영상"></video>` : `<span class="tag">사진 · ${i + 1}단계 · 약 ${s.min}분 · ${esc(m.name)}</span>${photo(PH.step[s.art], 1400)}`}</div>
          <p class="lead" style="font-size:19px">${esc(s.body)}</p>
          <div class="eyebrow" style="margin:26px 0 4px">확인하고 넘어가요</div>
          <ul class="tasks">${s.tasks.map((t, k) => `<li><label class="check"><input type="checkbox" data-task="${k}" ${(prog.done[i] || [])[k] ? "checked" : ""}/><span>${esc(t)}</span></label></li>`).join("")}</ul>
          <p class="small muted">지금 멈춰도 괜찮아요. 진행 상황은 저장돼요.</p>
          <div class="wiz-nav"><button class="btn light" data-prev ${i === 0 ? "disabled" : ""}>이전 단계</button><button class="btn solid" data-nextstep>${i === steps.length - 1 ? "완료 체크" : "다음 단계"}</button></div>`;
      $("#gSteps").innerHTML = steps.map((st, k) => { const all = st.tasks.every((_, t) => (prog.done[k] || [])[t]); return `<li><button data-go="${k}" class="${k === i && !prog.complete ? "on" : ""} ${all ? "done" : ""}"><span class="n">0${k + 1}</span><span>${esc(st.t)}</span></button></li>`; }).join("");
      bindG();
    };
    const bindG = () => {
      $$("[data-go]").forEach((b) => b.addEventListener("click", () => { prog.step = +b.dataset.go; prog.complete = false; S.save(); draw(); }));
      $$("[data-task]").forEach((c) => c.addEventListener("change", () => { const a = prog.done[prog.step] || (prog.done[prog.step] = []); a[+c.dataset.task] = c.checked; S.save(); draw(); }));
      const pv = $("[data-prev]"); pv && pv.addEventListener("click", () => { prog.step--; S.save(); draw(); window.scrollTo({ top: 0, behavior: "smooth" }); });
      const nx = $("[data-nextstep]"); nx && nx.addEventListener("click", () => {
        const s = steps[prog.step];
        if (!s.tasks.every((_, t) => (prog.done[prog.step] || [])[t])) { toast("확인 항목을 모두 체크해 주세요. 막히면 원격 지원을 눌러요."); return; }
        if (prog.step === steps.length - 1) { prog.complete = true; const o = S.order(orderId); if (o) { o.status = Math.max(o.status, 5); o.completedAt = new Date().toISOString(); } }
        else prog.step++;
        S.save(); draw(); window.scrollTo({ top: 0, behavior: "smooth" });
      });
      const ro = $("[data-reopen]"); ro && ro.addEventListener("click", () => { prog.complete = false; prog.step = 0; S.save(); draw(); });
    };
    return {
      title: m.name + " 가이드",
      html: `<div class="wrap page-head" style="padding-bottom:30px"><div class="eyebrow">${esc(m.name)} · 저장공간 추가 ${orderId ? "· 주문 " + esc(orderId) : "· 미리 보기"}</div><h1>7단계 작업 가이드</h1></div>
      <div class="wrap" style="padding-bottom:110px"><div class="guide">
        <ol class="steps" id="gSteps"></ol>
        <div id="gMain"></div>
        <aside class="sticky"><div class="stopbox"><h4>이럴 땐 바로 멈추세요</h4><ol>${SEED.stopRules.map((x) => `<li>${esc(x)}</li>`).join("")}</ol>
          <button class="btn solid block" id="helpBtn">원격 지원 요청</button><p class="small muted" style="margin:10px 0 0">지금 단계가 함께 전달돼요. 15분 안에 해결되지 않으면 수리점을 연결해요.</p></div>
          <p class="small muted" style="margin-top:18px">나사 위치 등 모델별 세부 사진은 실물 분해 후 채워져요.</p></aside>
      </div></div>`,
      bind() {
        draw();
        $("#helpBtn").addEventListener("click", () => supportModal({ orderId, modelId: m.id, step: prog.step + 1, stepTitle: steps[prog.step].t }));
      }
    };
  }
  function supportModal(ctx) {
    const url = S.s.settings.kakaoUrl;
    modal(`<div class="eyebrow">원격 지원</div><h3 class="h-md" style="margin:8px 0 16px">무엇이 막혔나요?</h3>
      <div class="notice small">함께 전달돼요: ${ctx.orderId ? "주문 " + esc(ctx.orderId) + " · " : ""}${ctx.step ? esc(ctx.step) + "단계 " + esc(ctx.stepTitle || "") : ""}</div>
      <div class="field"><label>상황을 짧게 적어 주세요</label><textarea id="sMsg" rows="3" placeholder="예: 뒷판 아래쪽 걸쇠가 안 풀려요"></textarea></div>
      <button class="btn solid block" id="sSend">${url ? "카카오톡 상담 연결" : "지원 요청 보내기"}</button>
      <p class="small muted" style="margin-top:10px">${url ? "카카오톡 채널 1:1 상담으로 연결돼요." : "카카오톡 채널 주소가 아직 설정되지 않아 요청만 기록돼요(운영자 화면 › 설정)."}</p>`,
      (o, close) => {
        $("#sSend", o).addEventListener("click", () => {
          S.addSupport({ type: "remote", orderId: ctx.orderId, modelId: ctx.modelId, step: ctx.step, msg: $("#sMsg", o).value.trim() });
          close(); toast("지원 요청을 받았어요. 곧 연결해 드릴게요.");
          if (url) window.open(url, "_blank", "noopener");
        });
      });
  }

  // ---------- Orders ----------
  function Orders() {
    const os = S.s.orders, rs = S.s.repairs || [];
    return {
      title: "내 주문",
      html: `<div class="wrap page-head"><div class="eyebrow">내 주문 · 지원 현황</div><h1>내 주문</h1><p class="small muted" style="margin-top:12px">이 브라우저에서 주문한 내역이 보여요.</p></div>
      <div class="wrap" style="padding-bottom:110px">
        ${rs.length ? `<div class="eyebrow" style="margin:0 0 14px">수리 요청 ${rs.length}건</div>${rs.map((x) => `<div style="border-top:1px solid var(--ink);padding:28px 0 36px">${repairBlock(x)}</div>`).join("")}<div class="eyebrow" style="margin:30px 0 14px">키트 주문</div>` : ""}
        ${os.length ? os.map((o) => { const m = S.model(o.modelId); const sup = S.s.support.filter((x) => x.orderId === o.id); return `
          <div style="border-top:1px solid var(--ink);padding:28px 0 40px">
            <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><div class="eyebrow">${esc(o.id)} · ${fmtDate(o.createdAt)}</div><div class="serif" style="font-size:21px;margin-top:6px">${esc(m ? m.name : "")} · ${o.kitName ? esc(o.kitName) : o.kind === "pkg" ? "설치 패키지" : o.kind === "ssd2" ? "부품 포함 2TB" : "부품 포함 1TB"}</div></div><div class="serif" style="font-size:19px">${won(o.total)}</div></div>
            <ol class="tl">${S.ORDER_STEPS.map((t, i) => `<li class="${i <= o.status ? "on" : ""}">${t}</li>`).join("")}</ol>
            <div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:22px"><a class="btn sm solid" href="#/guide/${o.modelId}?order=${o.id}">작업 가이드</a><button class="btn sm" data-help="${o.id}" data-model="${o.modelId}">원격 지원</button>${o.diagnosisId ? `<a class="btn sm" href="#/diagnosis/${o.diagnosisId}">진단 카드</a>` : ""}</div>
            ${sup.length ? `<div class="small muted" style="margin-top:16px">원격 지원 ${sup.length}건 · 최근: ${esc(sup[0].msg || "(내용 없음)")} (${fmtDate(sup[0].at)})</div>` : ""}
          </div>`; }).join("") : `<div class="empty"><p>아직 주문이 없어요.</p><a class="btn" href="#/diagnose">무료 증상 진단부터 시작하기</a></div>`}
      </div>`,
      bind() { $$("[data-help]").forEach((b) => b.addEventListener("click", () => supportModal({ orderId: b.dataset.help, modelId: b.dataset.model }))); }
    };
  }

  // ---------- Kit ----------
  function Kit() {
    const p = S.prices();
    const guarantee = [
      ["장착 전 재확인에서 증상이 진단과 달라요", "작업 중단, 미개봉이면 전액 환불·수리점 연결", "리페어북 (왕복 배송비 포함)"],
      ["장착 전에 다른 고장으로 밝혀졌어요", "전액 환불, 진단 카드를 수리점에 전달", "리페어북"],
      ["장착 후에도 증상이 남고 다른 고장이었어요", "설치 패키지 전액 환불 + 점검비 최대 11,000원 지원. 부품은 그대로 쓰거나 외장으로 활용", "리페어북 (패키지·점검비)"],
      ["부품이 내 모델과 맞지 않아요", "무료 교환 또는 전액 환불", "리페어북"],
      ["작업 중 막혔어요", "채팅·영상통화 원격 안내", "리페어북 (무료)"],
      ["원격으로 해결되지 않아요", "제휴 수리점 연결, 공임 10% 할인", "고객 (할인 적용)"],
      ["가이드 오류로 문제가 생겼어요", "수리점 공임 지원", "리페어북"],
      ["작업 전 마음이 바뀌었어요", "미개봉 반품 (7일 이내)", "고객 (왕복 배송비)"]
    ];
    return {
      title: "키트",
      keepScroll: false,
      html: `<section class="kit-hero"><div class="wrap kit-hero-in">
        <div class="kit-hero-art">${BR.box}</div>
        <div class="kit-hero-copy">
          <div class="eyebrow">REPAIRBOOK STORAGE UPGRADE KIT</div>
          <h1>받자마자<br/>시작할 수 있게</h1>
          <p class="muted">차콜 상자 하나에 필요한 것을 모두 담았어요. 상자 라벨과 나사 매트, 안내 카드에는 주문한 모델 코드와 주문번호가 찍혀 나가요.</p>
          <ul class="kit-facts"><li><b>9</b><span>구성품</span></li><li><b>7</b><span>단계 가이드</span></li><li><b>30</b><span>분 안팎 장착</span></li></ul>
          <div class="kit-price"><span class="small muted">설치 패키지</span><b>${won(p.pkg)}</b><span class="small muted">부품 포함 1TB ${won(p.pkg + p.ssd1)}</span></div>
          <div class="hero-cta"><a class="btn solid" href="#/diagnose">증상 진단하고 주문하기</a><a class="btn" href="#/models">내 모델 확인</a></div>
        </div>
      </div></section>
      <section class="sec"><div class="wrap">
        <div class="sec-head"><div><div class="eyebrow">키트 라인업</div><h2 class="h-lg" style="margin-top:10px">진단 결과에 맞는 키트만 보내요</h2></div><a class="tlink" href="#/upgrade">업그레이드 진단하기</a></div>
        <div class="lineup">${Object.keys(KITS).map((k) => `<div class="lineup-card"><div class="eyebrow">${k === "ssd-add" || k === "ssd-swap" ? "저장공간" : k === "ram" ? "메모리" : "발열"}</div><h3>${esc(KITS[k].name)}</h3><p class="muted small">${esc(KITS[k].short)} · ${esc(KITS[k].time)}</p><div class="lp">${won(kitFrom(k))}<span class="small muted">부터</span></div><a class="tlink small" href="${k === "ssd-add" ? "#/diagnose?symptom=storage" : "#/upgrade?want=" + ({ "ssd-swap": "ssd", ram: "ram", grease: "grease" }[k])}">${k === "ssd-add" ? "증상 진단으로 시작" : "업그레이드 진단으로 시작"}</a></div>`).join("")}</div>
        <p class="small muted" style="margin-top:16px">모든 키트는 진단으로 내 모델에 맞는지 확인된 뒤에만 결제할 수 있어요. 아래는 SSD 추가 키트 구성이에요.</p>
      </div></section>
      <section class="sec"><div class="wrap">
        <div class="sec-head"><div><div class="eyebrow">상자 안에는</div><h2 class="h-lg" style="margin-top:10px">열면 바로 보이는 순서대로</h2></div><span class="small muted">재사용할 수 있는 폼 트레이에 하나씩 자리를 잡았어요</span></div>
        <div class="kit-open">${BR.open}</div>
        <ol class="kit-items">${SEED.kit.map((k, i) => `<li><span class="kn">${i + 1}</span><div><div class="t">${esc(k.t)}</div><div class="d">${esc(k.d)}</div></div></li>`).join("")}</ol>
      </div></section>
      <section class="sec tight"><div class="wrap kit-design">
        <div><div class="eyebrow">패키지 디자인</div><h3>차콜 매트 상자</h3><p class="muted">노트북 옆에 두어도 어울리도록 무광 차콜에 로고만 담았어요.</p></div>
        <div><div class="eyebrow">모델 라벨</div><h3>실버 라벨 한 장</h3><p class="muted">모델 코드·용량·주문번호가 인쇄돼 다른 모델과 섞이지 않아요.</p></div>
        <div><div class="eyebrow">트레이</div><h3>다시 쓰는 폼 트레이</h3><p class="muted">작업 뒤에는 남은 나사와 공구를 그대로 보관할 수 있어요.</p></div>
      </div></section>
      <section class="sec sand"><div class="wrap">
        <div class="sec-head"><h2 class="h-lg">가격은 이렇게 정해요</h2><span class="small muted">부품 시세 ${esc(p.date)} 기준 · 결제 시점에 확정</span></div>
        <div class="compare">
          <div><div class="eyebrow">직접 사서 맡기면 (1TB)</div><div class="amt">약 350,000원</div><ul><li>부품 최저가 약 33만 원 + 센터 공임 약 2만 원</li><li>내 모델에 맞는지 판단은 직접</li><li>방문·대기 시간</li></ul></div>
          <div><div class="eyebrow">리페어북 부품 포함형 (1TB)</div><div class="amt">${won(p.pkg + p.ssd1)}</div><ul><li>증상 진단과 호환 보장(안 맞으면 무료 교환·환불)</li><li>공구·나사 매트·모델 전용 가이드</li><li>원격 지원과 오진 안심 보장</li><li>설치 패키지만: ${won(p.pkg)}</li></ul></div>
        </div>
      </div></section>
      <section class="sec" id="guarantee"><div class="wrap">
        <div class="sec-head"><div><div class="eyebrow">오진 안심 보장 · 지원 범위</div><h2 class="h-lg" style="margin-top:10px">누가, 어떻게 책임지나요</h2></div></div>
        <div class="scroll-x"><table class="tbl"><thead><tr><th>상황</th><th>리페어북의 대응</th><th>비용 부담</th></tr></thead>
        <tbody>${guarantee.map((g) => `<tr><td>${g[0]}</td><td class="muted">${g[1]}</td><td>${g[2]}</td></tr>`).join("")}</tbody></table></div>
        <p class="small muted" style="margin-top:20px">사용자가 진단 정보를 사실과 다르게 입력했거나 가이드를 따르지 않아 생긴 파손은 사전 고지한 면책 기준이 적용돼요. 데이터 복구는 지원 범위 밖이에요.</p>
      </div></section>`,
      bind() { if (location.hash.includes("guarantee")) setTimeout(() => $("#guarantee").scrollIntoView(), 30); }
    };
  }

  // ---------- Admin ----------
  let adminTab = "overview";
  function Admin() {
    return { title: "운영자", html: `<div class="wrap page-head" style="padding-bottom:24px"><div class="eyebrow">운영자 관리 화면</div><h1>리페어북 운영</h1><p class="small muted" style="margin-top:10px">데모: 이 브라우저에 저장된 데이터예요. Supabase를 연결하면 모든 방문자의 데이터가 여기 모여요.</p></div><div class="wrap" style="padding-bottom:110px" id="adm"></div>`, bind: drawAdmin };
  }
  function drawAdmin() {
    const el = $("#adm"); if (!el) return;
    const s = S.s;
    const tabs = [["overview", "개요"], ["models", "호환성 DB"], ["diag", `진단 요청 (${s.diagnoses.filter((d) => d.status !== "approved").length})`], ["orders", "주문"], ["support", "지원 요청"], ["repairs", `수리 요청 (${(s.repairs || []).filter((x) => x.status < 4).length})`], ["partners", "제휴 신청"], ["requests", "모델 요청"], ["interests", "관심 등록"], ["settings", "설정"]];
    let body = "";
    if (adminTab === "overview") {
      const A = s.diagnoses.filter((d) => d.result.grade === "A").length;
      const done = s.orders.filter((o) => o.status >= 5).length;
      const sup = s.support.filter((x) => x.type === "remote").length;
      body = `<div class="kpis">
        <div><b>${s.diagnoses.length}</b><span>진단 요청</span></div>
        <div><b>${s.diagnoses.length ? Math.round((A / s.diagnoses.length) * 100) : 0}%</b><span>A 판정 비율 (목표 45%)</span></div>
        <div><b>${s.orders.length}</b><span>주문 · A 판정 대비 ${A ? Math.round((s.orders.length / A) * 100) : 0}% (목표 67%)</span></div>
        <div><b>${s.orders.length ? Math.round((done / s.orders.length) * 100) : 0}%</b><span>완료 체크율 (목표 90%)</span></div>
        <div><b>${s.orders.length ? Math.round((sup / s.orders.length) * 100) : 0}%</b><span>원격 지원 요청률 (목표 20% 이하)</span></div></div>
        <div class="kpis" style="grid-template-columns:repeat(3,1fr)"><div><b>${s.interests.length}</b><span>관심 등록 (목표 150명)</span></div><div><b>${s.requests.reduce((a, b) => a + b.count, 0)}</b><span>미지원 모델 요청</span></div><div><b>${s.models.filter((m) => S.verdict(m) === "ok").length} / ${s.models.length}</b><span>판매 가능 모델 / 등록 모델</span></div></div>`;
    } else if (adminTab === "models") {
      body = `<div style="display:flex;justify-content:space-between;margin-bottom:16px;gap:12px;flex-wrap:wrap"><p class="small muted" style="margin:0">빈 자리 1개 이상 + 전문가 검수 완료면 판정이 자동으로 ‘가능’이 돼요.</p><button class="btn sm solid" data-edit="">모델 추가</button></div>
        <div class="scroll-x"><table class="tbl"><thead><tr><th>모델</th><th>코드</th><th>빈 자리</th><th>최대</th><th>검수</th><th>판정</th><th></th></tr></thead><tbody>
        ${s.models.map((m) => `<tr><td>${esc(m.name)}</td><td class="small">${esc(m.codes.join(", "))}</td><td>${m.emptySlots}/${m.totalSlots}</td><td>${m.maxTB || "—"}TB</td><td>${m.verified ? "완료" : "진행 중"}</td><td><span class="pill ${S.verdict(m)}">${S.verdictShort(S.verdict(m))}</span></td><td><button class="tlink small" data-edit="${m.id}">편집</button></td></tr>`).join("")}</tbody></table></div>`;
    } else if (adminTab === "diag") {
      body = s.diagnoses.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>진단 카드</th><th>증상</th><th>모델</th><th>점검</th><th>판정</th><th>상태</th><th></th></tr></thead><tbody>
        ${s.diagnoses.map((d) => { const m = S.model(d.modelId); return `<tr><td class="small"><a class="tlink" href="#/diagnosis/${d.id}">${esc(d.id)}</a><div class="muted">${fmtDate(d.createdAt)}</div></td><td>${esc(sym(d.symptom).label)}</td><td class="small">${m ? esc(m.name) : "모름"}<div class="muted">${esc(d.code)}</div></td><td class="small">${d.result.freePct != null ? "여유 " + d.result.freePct.toFixed(0) + "%" : ""}${d.photo ? " · 사진" : ""}</td>
          <td><select data-grade="${d.id}">${["A", "B", "C"].map((g) => `<option ${g === d.result.grade ? "selected" : ""}>${g}</option>`).join("")}</select></td>
          <td><span class="pill ${d.status === "approved" ? "ok" : "pending"}">${d.status === "approved" ? "확정" : "검토 중"}</span></td>
          <td>${d.status !== "approved" ? `<button class="btn sm" data-approve="${d.id}">승인</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">진단 요청이 없어요.</div>`;
    } else if (adminTab === "orders") {
      body = s.orders.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>주문</th><th>모델</th><th>구성</th><th>금액</th><th>받는 분</th><th>상태</th><th></th></tr></thead><tbody>
        ${s.orders.map((o) => { const m = S.model(o.modelId); return `<tr><td class="small">${esc(o.id)}<div class="muted">${fmtDate(o.createdAt)}</div></td><td class="small">${m ? esc(m.name) : ""}<div class="muted">${esc(o.code)}</div></td><td class="small">${o.lines.map((l) => esc(l[0])).join(" + ")}</td><td>${won(o.total)}</td><td class="small">${esc(o.ship.name)}<div class="muted">${esc(o.ship.phone)}</div></td><td>${S.ORDER_STEPS[o.status]}</td><td>${o.status < 5 ? `<button class="btn sm" data-adv="${o.id}">다음 단계 →</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">주문이 없어요.</div>`;
    } else if (adminTab === "support") {
      body = s.support.length ? `<table class="tbl"><thead><tr><th>시각</th><th>종류</th><th>연결</th><th>내용</th></tr></thead><tbody>${s.support.map((x) => `<tr><td class="small">${fmtDate(x.at)}</td><td>${{ remote: "원격 지원", repair: "수리점 연결", "remote-diag": "정밀 원격 진단" }[x.type] || esc(x.type)}</td><td class="small">${esc(x.orderId || x.diagnosisId || "")}${x.step ? " · " + esc(x.step) + "단계" : ""}</td><td class="small">${esc(x.msg)}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">지원 요청이 없어요.</div>`;
    } else if (adminTab === "repairs") {
      const rs = s.repairs || [];
      body = rs.length ? `<div class="scroll-x"><table class="tbl"><thead><tr><th>요청</th><th>증상·모델</th><th>지역·방식</th><th>수리점</th><th>고객</th><th>상태</th><th></th></tr></thead><tbody>${rs.map((x) => { const m = S.model(x.modelId), sh = SHOPS.find((y) => y.id === x.shopId); return `<tr><td class="small">${esc(x.id)}<div class="muted">${fmtDate(x.createdAt)}</div>${x.diagnosisId ? `<div class="muted">${esc(x.diagnosisId)}</div>` : ""}</td><td class="small">${esc(sym(x.symptom).label)}<div class="muted">${m ? esc(m.name) : "모델 모름"}</div></td><td class="small">${esc(x.region)}<div class="muted">${methodKo[x.method]}</div></td><td class="small">${sh ? esc(sh.name) : "배정 필요"}</td><td class="small">${esc(x.name)}<div class="muted">${esc(x.phone)}</div>${x.memo ? `<div class="muted">${esc(x.memo)}</div>` : ""}</td><td>${S.REPAIR_STEPS[x.status]}</td><td>${x.status < 4 ? `<button class="btn sm" data-radv="${x.id}">다음 단계 →</button>` : ""}</td></tr>`; }).join("")}</tbody></table></div>` : `<div class="empty">수리 요청이 없어요.</div>`;
    } else if (adminTab === "partners") {
      const ps = s.partners || [];
      body = `<p class="small muted" style="margin-bottom:16px">등록된 제휴 수리점 ${SHOPS.length}곳(예시 데이터 · assets/data.js의 RB_SHOPS)</p>` + (ps.length ? `<table class="tbl"><thead><tr><th>시각</th><th>상호</th><th>지역</th><th>연락처</th><th>분야</th></tr></thead><tbody>${ps.map((x) => `<tr><td class="small">${fmtDate(x.at)}</td><td>${esc(x.name)}</td><td>${esc(x.region)}</td><td class="small">${esc(x.phone)}</td><td class="small">${x.tags.map(esc).join(" · ")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">제휴 신청이 없어요.</div>`);
    } else if (adminTab === "requests") {
      const rq = [...s.requests].sort((a, b) => b.count - a.count);
      body = rq.length ? `<ol class="numlist">${rq.map((x, i) => `<li><span class="n">${String(i + 1).padStart(2, "0")}</span><div style="display:flex;justify-content:space-between"><span class="t">${esc(x.name)}</span><span>${x.count}건</span></div></li>`).join("")}</ol>` : `<div class="empty">요청이 없어요.</div>`;
    } else if (adminTab === "interests") {
      body = s.interests.length ? `<table class="tbl"><thead><tr><th>시각</th><th>이름</th><th>연락처</th><th>경로</th></tr></thead><tbody>${s.interests.map((x) => `<tr><td class="small">${fmtDate(x.at)}</td><td>${esc(x.name)}</td><td>${esc(x.email)}</td><td class="small">${esc(x.from || "")}</td></tr>`).join("")}</tbody></table>` : `<div class="empty">관심 등록이 없어요.</div>`;
    } else {
      const st = s.settings;
      const f = (k, label, type = "number", hint = "") => `<div class="field"><label>${label}</label><input type="${type}" data-st="${k}" value="${esc(st[k])}"/>${hint ? `<div class="hint">${hint}</div>` : ""}</div>`;
      body = `<div class="two"><div>
        <div class="eyebrow" style="margin-bottom:16px">가격</div>
        ${f("ssdCost1tb", "1TB 부품 매입가(원)")}${f("ssdCost2tb", "2TB 부품 매입가(원)")}${f("ssdMarginPct", "부품 마진(%)", "number", "판매가 = 매입가 × (1 + 마진) · 분기마다 시세로 재산정")}
        ${f("packagePrice", "설치 패키지(원)")}${f("installService", "장착 대행(원)")}${f("carePlan", "케어 플랜(원/년)")}${f("priceDate", "시세 기준월", "text")}
        </div><div>
        <div class="eyebrow" style="margin-bottom:16px">운영</div>
        ${f("kakaoUrl", "카카오톡 채널 주소", "text", "예: https://pf.kakao.com/_xxxx/chat")}
        <label class="check"><input type="checkbox" data-stc="autoApprove" ${st.autoApprove ? "checked" : ""}/><span>진단 자동 승인 (데모용)<br/><span class="small muted">실제 운영에서는 끄고 ‘진단 요청’ 탭에서 사람이 확인 후 승인해요.</span></span></label>
        <label class="check"><input type="checkbox" data-stc="preorder" ${st.preorder ? "checked" : ""}/><span>사전예약 기간</span></label>
        <div style="margin-top:40px"><button class="btn sm" id="resetAll">데모 데이터 초기화</button><div class="hint small muted" style="margin-top:8px">이 브라우저의 진단·주문·설정이 모두 지워지고 처음 상태로 돌아가요.</div></div>
        </div></div>`;
    }
    el.innerHTML = `<div class="tabs">${tabs.map((t) => `<button data-tab="${t[0]}" class="${t[0] === adminTab ? "on" : ""}">${t[1]}</button>`).join("")}</div>${body}`;
    $$("[data-tab]", el).forEach((b) => b.addEventListener("click", () => { adminTab = b.dataset.tab; drawAdmin(); }));
    $$("[data-edit]", el).forEach((b) => b.addEventListener("click", () => editModel(b.dataset.edit)));
    $$("[data-approve]", el).forEach((b) => b.addEventListener("click", () => { const d = S.diagnosis(b.dataset.approve); d.status = "approved"; d.approvedAt = new Date().toISOString(); S.save(); toast("진단 카드를 확정했어요."); drawAdmin(); }));
    $$("[data-grade]", el).forEach((sl) => sl.addEventListener("change", () => { const d = S.diagnosis(sl.dataset.grade); d.result.grade = sl.value; d.result.why = "운영자가 판정을 변경했어요. " + d.result.why; d.result.next = { A: "이 노트북에 맞는 키트를 확인하세요.", B: "무료 해결 가이드를 따라 해 보세요.", C: "진단 카드를 수리점에 보여 주세요." }[sl.value]; S.save(); toast("판정을 " + sl.value + "로 바꿨어요."); drawAdmin(); }));
    $$("[data-radv]", el).forEach((b) => b.addEventListener("click", () => { const x = S.repair(b.dataset.radv); x.status = Math.min(4, x.status + 1); S.save(); drawAdmin(); }));
    $$("[data-adv]", el).forEach((b) => b.addEventListener("click", () => { const o = S.order(b.dataset.adv); o.status = Math.min(5, o.status + 1); S.save(); drawAdmin(); }));
    $$("[data-st]", el).forEach((i) => i.addEventListener("change", () => { const k = i.dataset.st; S.s.settings[k] = i.type === "number" ? +i.value : i.value.trim(); S.save(); toast("저장했어요."); }));
    $$("[data-stc]", el).forEach((i) => i.addEventListener("change", () => { S.s.settings[i.dataset.stc] = i.checked; S.save(); toast("저장했어요."); }));
    const rs = $("#resetAll", el); rs && rs.addEventListener("click", () => { if (confirm("이 브라우저의 데모 데이터를 모두 지울까요?")) { S.reset(); toast("초기화했어요."); drawAdmin(); } });
  }
  function editModel(id) {
    const m = id ? S.model(id) : { id: "", brand: "", name: "", codes: [], totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 NVMe", maxTB: 1, ram: "온보드(교체 불가)", difficulty: 2, minutes: 30, verified: false, source: "", warranty: "", note: "" };
    const f = (k, label, type = "text") => `<div class="field"><label>${label}</label><input type="${type}" name="${k}" value="${esc(Array.isArray(m[k]) ? m[k].join(", ") : m[k])}"/></div>`;
    modal(`<div class="eyebrow">호환성 DB</div><h3 class="h-md" style="margin:8px 0 20px">${id ? "모델 편집" : "모델 추가"}</h3><form id="mf">
      ${f("name", "모델 이름")}${f("brand", "제조사")}${f("codes", "모델 코드(쉼표로 구분, 접두어)")}
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 20px">${f("totalSlots", "전체 슬롯", "number")}${f("emptySlots", "빈 슬롯", "number")}${f("maxTB", "최대 용량(TB)", "number")}${f("difficulty", "난이도(1~5)", "number")}${f("minutes", "작업 시간(분)", "number")}</div>
      ${f("ssdSpec", "규격")}${f("ram", "메모리 방식")}${f("source", "확인 근거")}${f("warranty", "보증 영향 고지")}${f("note", "안내 문구")}
      <label class="check"><input type="checkbox" name="verified" ${m.verified ? "checked" : ""}/><span>전문가 검수 완료</span></label>
      <div id="mfV" class="notice small"></div>
      <button class="btn solid block" style="margin-top:10px">저장</button></form>`, (o, close) => {
      const form = $("#mf", o);
      const read = () => { const fd = new FormData(form); const x = {}; for (const [k, v] of fd.entries()) x[k] = v; ["totalSlots", "emptySlots", "maxTB", "difficulty", "minutes"].forEach((k) => (x[k] = +x[k] || 0)); x.codes = String(x.codes || "").split(",").map((c) => c.trim()).filter(Boolean); x.verified = form.verified.checked; return x; };
      const pv = () => { const v = S.verdict(read()); $("#mfV", o).innerHTML = `자동 판정: <span class="pill ${v}">${S.verdictShort(v)}</span>`; };
      form.addEventListener("input", pv); pv();
      form.addEventListener("submit", (e) => {
        e.preventDefault(); const x = read();
        if (!x.name || !x.codes.length) { toast("모델 이름과 코드를 입력해 주세요."); return; }
        if (id) Object.assign(m, x); else { x.id = "m-" + Date.now().toString(36); S.s.models.push(x); }
        S.save(); close(); toast("저장했어요."); drawAdmin();
      });
    });
  }

  function NotFound() { return { title: "찾을 수 없음", html: `<div class="wrap page-head" style="padding-bottom:140px"><h1>페이지를 찾을 수 없어요</h1><p style="margin-top:24px"><a class="tlink" href="#/">처음으로</a></p></div>` }; }

  // ---------- Interest panel ----------
  let panelTimer = null;
  function maybePanel(r) {
    clearTimeout(panelTimer);
    if ((r.parts[0] || "") !== "") { const old = $(".panel"); old && old.remove(); return; }
    let seen = false; try { seen = localStorage.getItem("rb_panel") === "1"; } catch (e) {}
    if (seen || $(".panel")) return;
    panelTimer = setTimeout(() => {
      if (location.hash.replace(/^#\/?/, "") !== "" || $(".panel")) return;
      const p = document.createElement("div"); p.className = "panel";
      p.innerHTML = `<button class="x" aria-label="닫기">×</button><h3>사전예약 소식 받기</h3><p class="small">내 노트북 모델이 준비되면, 사전예약이 열리면 가장 먼저 알려 드려요.</p>
        <form><div class="field"><label>이름</label><input type="text" name="name" required/></div><div class="field"><label>이메일</label><input type="email" name="email" required/></div><button class="btn block">알림 받기</button></form>`;
      document.body.appendChild(p);
      const close = () => { p.remove(); try { localStorage.setItem("rb_panel", "1"); } catch (e) {} };
      $(".x", p).addEventListener("click", close);
      $("form", p).addEventListener("submit", (e) => { e.preventDefault(); const fd = new FormData(e.target); S.addInterest({ name: fd.get("name"), email: fd.get("email"), from: "홈 팝업" }); close(); toast("등록했어요. 소식이 생기면 알려 드릴게요."); });
    }, 7000);
  }

  // ---------- Shell ----------
  function shell() {
    $(".menu-btn").addEventListener("click", () => $(".nav").classList.toggle("open"));
    const ann = $(".announce"); $("button", ann).addEventListener("click", () => ann.remove());
    window.addEventListener("scroll", () => $(".site-head").classList.toggle("scrolled", window.scrollY > 10), { passive: true });
    $("#footForm").addEventListener("submit", (e) => { e.preventDefault(); const fd = new FormData(e.target); S.addInterest({ name: fd.get("name") || "", email: fd.get("email"), from: "푸터" }); e.target.reset(); toast("등록했어요."); });
    render();
  }
  shell();
})();
