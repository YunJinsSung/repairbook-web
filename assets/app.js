(function () {
  const S = window.Store, ART = window.RB_ART, SEED = window.RB_SEED, PH = window.RB_PHOTO;
  const photo = (p, w = 1200, eager) => `<img class="ph" src="https://images.unsplash.com/photo-${p[0]}?auto=format&fit=crop&w=${w}&q=75" alt="${p[1]}"${eager ? "" : ' loading="lazy"'} />`;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const won = (n) => Number(n || 0).toLocaleString("ko-KR") + "원";
  const app = $("#app");
  const sym = (id) => SEED.symptoms.find((x) => x.id === id) || { label: id };
  const fmtDate = (iso) => { const d = new Date(iso); return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`; };
  const gradeText = { A: "저장공간을 추가하면 해결돼요", B: "부품 없이 직접 해결할 수 있어요", C: "수리점에서 확인이 필요해요" };
  const gradeName = { A: "A · 키트로 해결", B: "B · 무료 가이드", C: "C · 수리점 연결" };

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
    order: Order, done: Done, guide: Guide, orders: Orders, admin: Admin, kit: Kit
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
          <div class="hero-cta"><a class="btn solid" href="#/diagnose">무료 증상 진단</a><a class="btn light" href="#/models">내 모델 찾기</a></div>
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
        <div class="frame">${photo(PH.box, 900)}</div>
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
  function Diagnose(r) {
    const q = r.q;
    W = { step: 0, symptom: q.get("symptom") || "", modelId: q.get("model") || "", code: q.get("code") || "", totalGB: "", freeGB: "", diskHigh: null, memHigh: null, powerFixed: null, extDisplay: "", photo: "", name: "", contact: "" };
    if (W.symptom) W.step = 1;
    if (W.symptom && W.modelId) W.step = 2;
    return {
      title: "무료 증상 진단",
      html: `<div class="wrap page-head" style="padding-bottom:10px"><div class="eyebrow">무료 증상 진단 · 약 1분</div></div><div class="wrap" style="padding-bottom:110px"><div class="wiz" id="wiz"></div></div>`,
      bind: drawWiz
    };
  }
  function drawWiz() {
    const el = $("#wiz"); if (!el) return;
    const total = 4, st = W.step;
    const prog = `<div class="wiz-prog">${Array.from({ length: total }, (_, i) => `<span class="${i <= st ? "on" : ""}"></span>`).join("")}</div>`;
    const m = S.model(W.modelId);
    let body = "";
    if (st === 0) {
      body = `<h2>어떤 점이 불편하세요?</h2><p class="sub">부품 이름은 몰라도 돼요. 가장 가까운 걸 하나만 골라 주세요.</p>
        <div class="sym-grid">${SEED.symptoms.map((s) => `<button class="sym" data-sym="${s.id}"><span class="si">${ART[s.icon]}</span><span><div class="st">${esc(s.label)}</div><div class="sd">${esc(s.desc)}</div></span></button>`).join("")}</div>`;
    } else if (st === 1) {
      const optional = !["storage", "slow"].includes(W.symptom);
      body = `<h2>어떤 노트북을 쓰세요?</h2><p class="sub">${optional ? "모르면 건너뛰어도 돼요." : "같은 이름이라도 세부 모델마다 빈 자리가 달라서, 모델 코드로 확인해요."}</p>
        ${howToCode}
        ${searchBox("wizSearch", "모델 코드나 이름 입력")}
        ${m ? `<div class="notice ok" style="margin-top:22px">선택한 모델: <b style="font-weight:500">${esc(m.name)}</b> <span class="small muted">${esc(W.code)}</span></div>` : ""}
        <div class="wiz-nav"><button class="btn light" data-back>이전</button>
        <div style="display:flex;gap:10px">${!m ? `<button class="btn light" data-skip>모르겠어요</button>` : ""}<button class="btn solid" data-next ${m ? "" : "disabled"}>다음</button></div></div>`;
    } else if (st === 2) {
      body = `<h2>${esc(sym(W.symptom).label)}</h2>` + selfCheck();
    } else {
      body = `<h2>확인 사진을 올려 주세요</h2><p class="sub">사진이 있으면 더 정확해요. 사람이 직접 보고 판정해요(영업일 24시간 이내).</p>
        <label class="upload" id="up">${W.photo ? `<img src="${W.photo}" alt="올린 사진"/>사진을 바꾸려면 누르세요` : "누르거나 끌어다 놓아 사진 올리기<br/><span class='small'>예: 설정 › 시스템 › 저장소 화면, 작업 관리자 화면</span>"}<input type="file" accept="image/*" hidden/></label>
        <div style="margin-top:30px" class="field"><label>이름 (선택)</label><input type="text" id="dName" value="${esc(W.name)}"/></div>
        <div class="field"><label>진단 결과를 받을 연락처 (선택 · 이메일 또는 휴대폰)</label><input type="text" id="dContact" value="${esc(W.contact)}"/><div class="hint">진단 결과는 이 화면에도 바로 나와요.</div></div>
        <div class="wiz-nav"><button class="btn light" data-back>이전</button><button class="btn solid" data-submit>진단 요청하기</button></div>`;
    }
    el.innerHTML = prog + body;

    $$("[data-sym]", el).forEach((b) => b.addEventListener("click", () => { W.symptom = b.dataset.sym; W.step = 1; drawWiz(); }));
    $("[data-back]", el) && $("[data-back]", el).addEventListener("click", () => { W.step--; drawWiz(); });
    $("[data-skip]", el) && $("[data-skip]", el).addEventListener("click", () => { W.modelId = ""; W.code = ""; W.step = 2; drawWiz(); });
    $("[data-next]", el) && $("[data-next]", el).addEventListener("click", () => {
      if (W.step === 2 && !checkValid()) return;
      W.step++; drawWiz();
    });
    bindSearch("wizSearch", (mm, code) => { W.modelId = mm.id; W.code = code; drawWiz(); });
    // self-check controls
    $$("[data-set]", el).forEach((b) => b.addEventListener("click", () => {
      const [k, v] = b.dataset.set.split(":"); W[k] = v === "true" ? true : v === "false" ? false : v; drawWiz();
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
  function opt(k, v, label, desc) {
    const on = String(W[k]) === String(v);
    return `<button class="opt ${on ? "on" : ""}" data-set="${k}:${v}"><span><div class="ot">${label}</div>${desc ? `<div class="od">${desc}</div>` : ""}</span><span class="radio-dot"></span></button>`;
  }
  function selfCheck() {
    const nav = `<div class="wiz-nav"><button class="btn light" data-back>이전</button><button class="btn solid" data-next>다음</button></div>`;
    const storageInputs = `<div class="howto"><b style="font-weight:500">이렇게 확인해요</b><ol><li>시작 › <b>설정</b> › <b>시스템</b> › <b>저장소</b>를 열어요.</li><li>맨 위 ‘로컬 디스크 (C:)’ 막대 아래 숫자를 봐요. 예: <i>사용 230GB / 256GB</i></li></ol></div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
      <div class="field"><label>전체 용량 (GB)</label><input type="number" min="1" inputmode="numeric" data-num="totalGB" value="${esc(W.totalGB)}" placeholder="256"/></div>
      <div class="field"><label>남은 용량 (GB)</label><input type="number" min="0" inputmode="numeric" data-num="freeGB" value="${esc(W.freeGB)}" placeholder="26"/><div class="hint">전체 − 사용</div></div></div>`;
    switch (W.symptom) {
      case "storage":
        return `<p class="sub">저장공간 화면에 보이는 숫자 두 개만 알려 주세요.</p>${storageInputs}<div class="err" id="err"></div>${nav}`;
      case "slow":
        return `<p class="sub">Ctrl + Shift + Esc로 <b>작업 관리자</b>를 열고 ‘성능’ 탭을 1분쯤 지켜봐 주세요.</p>
          <div class="eyebrow" style="margin:6px 0 10px">디스크 사용률</div><div class="opts">${opt("diskHigh", true, "자주 90% 안팎이에요")}${opt("diskHigh", false, "대체로 낮아요")}</div>
          <div class="eyebrow" style="margin:26px 0 10px">메모리 사용률</div><div class="opts">${opt("memHigh", true, "자주 90% 안팎이에요")}${opt("memHigh", false, "대체로 낮아요")}</div>
          <div style="margin-top:30px">${storageInputs}</div><div class="err" id="err"></div>${nav}`;
      case "power":
        return `<p class="sub">5분 기본 점검을 해 볼게요.</p><div class="howto"><ol><li>다른 콘센트에 어댑터를 꽂고 충전 램프가 켜지는지 봐요.</li><li>전원 버튼을 15초 길게 눌렀다 떼고, 다시 한 번 눌러요.</li></ol></div>
          <div class="opts">${opt("powerFixed", true, "다시 켜졌어요")}${opt("powerFixed", false, "여전히 안 켜져요")}</div><div class="err" id="err"></div>${nav}`;
      case "display":
        return `<p class="sub">TV나 모니터에 HDMI로 연결하고, 밝기 키를 올려 보세요.</p>
          <div class="opts">${opt("extDisplay", "ok", "외부 모니터에는 나와요")}${opt("extDisplay", "none", "둘 다 안 나와요")}${opt("extDisplay", "na", "연결할 모니터가 없어요")}</div><div class="err" id="err"></div>${nav}`;
      case "battery":
        return `<p class="sub">배터리 상태는 수리점에서 정확히 확인할 수 있어요.</p><div class="notice">배터리가 부풀어 뒷판이 들떠 있다면 충전을 멈추고 사용하지 마세요.</div>${nav}`;
      default:
        return `<div class="notice stop"><b style="font-weight:500">지금 바로 전원을 끄고 충전기를 빼 주세요.</b><br/>물기나 충격이 있었다면 켜 보지 말고 그대로 두는 게 가장 안전해요.</div>${nav}`;
    }
  }
  function checkValid() {
    const err = $("#err"); const say = (t) => { if (err) err.textContent = t; return false; };
    const needNums = ["storage", "slow"].includes(W.symptom);
    if (W.symptom === "slow" && (W.diskHigh === null || W.memHigh === null)) return say("디스크와 메모리 사용률을 골라 주세요.");
    if (needNums) {
      const t = +W.totalGB, f = +W.freeGB;
      if (!t || t <= 0) return say("전체 용량을 숫자로 입력해 주세요.");
      if (W.freeGB === "" || f < 0 || f > t) return say("남은 용량은 0부터 전체 용량 사이로 입력해 주세요.");
    }
    if (W.symptom === "power" && W.powerFixed === null) return say("점검 결과를 골라 주세요.");
    if (W.symptom === "display" && !W.extDisplay) return say("점검 결과를 골라 주세요.");
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
    const input = { symptom: W.symptom, totalGB: +W.totalGB || 0, freeGB: +W.freeGB || 0, diskHigh: W.diskHigh, memHigh: W.memHigh, powerFixed: W.powerFixed, extDisplay: W.extDisplay };
    const result = S.judge(input, m);
    if (result.grade === "A" && !W.photo) result.lowConfidence = true;
    if (result.requestModel && m) S.addRequest(m.name, W.code);
    const d = S.addDiagnosis({ symptom: W.symptom, modelId: W.modelId, code: W.code, input, result, photo: W.photo, name: W.name, contact: W.contact });
    location.hash = "#/diagnosis/" + d.id;
  }

  // ---------- Diagnosis card ----------
  const freeGuide = {
    storage: ["설정 › 시스템 › 저장소 › <b>임시 파일</b>에서 필요 없는 항목 지우기", "<b>저장소 센스</b> 켜서 휴지통·임시 파일 자동 정리", "다운로드 폴더에서 큰 파일 정리(크기순 정렬)", "설정 › 앱에서 쓰지 않는 앱 제거", "사진·영상은 클라우드나 외장 저장장치로 옮기기"],
    slow: ["작업 관리자 › <b>시작 앱</b>에서 필요 없는 항목 ‘사용 안 함’", "브라우저 탭과 확장 프로그램 줄이기", "Windows 업데이트 후 재부팅", "Windows 보안에서 빠른 검사 실행"],
    power: ["같은 증상이 다시 생기면 어댑터와 콘센트를 먼저 바꿔 보기", "전원 버튼 15초 길게 눌러 초기화하기"]
  };
  function DiagnosisCard(r) {
    const d = S.diagnosis(r.parts[1]);
    if (!d) return NotFound();
    const m = S.model(d.modelId), g = d.result.grade, review = d.status !== "approved";
    const guide = freeGuide[d.symptom] || freeGuide.storage;
    const p = S.prices();
    let action = "";
    if (review) action = `<div class="notice">사람이 사진과 답변을 확인하고 있어요. 영업일 24시간 안에 이 카드가 확정돼요. 확정 전에는 결제할 수 없어요.</div>`;
    else if (g === "A") action = `<a class="btn solid" href="#/model/${m.id}?code=${encodeURIComponent(d.code)}">이 노트북에 맞는 키트 보기</a>`;
    else if (g === "B") action = `<div class="eyebrow" style="margin:6px 0 12px">무료 해결 가이드</div><ol class="numlist">${guide.map((t, i) => `<li><span class="n">0${i + 1}</span><div class="t" style="letter-spacing:0;font-weight:300">${t}</div></li>`).join("")}</ol>`;
    else action = `<div class="notice ${d.result.urgent ? "stop" : ""}">지금은 부품을 사지 않으셔도 돼요. 이 카드를 제휴 수리점에 보여 주시면 점검비가 면제·할인되고, 같은 점검을 다시 받지 않아도 돼요.</div>
      <button class="btn solid" data-repair>제휴 수리점 연결 요청</button>`;
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
      box = `<div class="buybox"><div class="eyebrow">다음에 할 수 있는 일</div><p style="margin-top:12px">${esc(m.note)}</p><a class="btn block" href="#/diagnose?model=${m.id}&code=${encodeURIComponent(code)}">증상 진단 받아 보기</a></div>`;
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
          <div class="notice small">진단 때 확인한 코드: <b style="font-weight:500">${esc(code)}</b> — 미호환 발송을 막기 위해 한 번 더 입력해 주세요.</div>
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
          if (S.norm(typed) !== S.norm(code)) { $("#eCode").textContent = "진단 때 확인한 코드와 달라요. 노트북의 ‘시스템 모델’ 값을 다시 확인해 주세요."; ok = false; }
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
          <div class="eyebrow" style="margin:46px 0 14px">기다리는 동안</div>
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
          <div class="media"><span class="tag">영상 ${i + 1}장 · 약 ${s.min}분 · ${esc(m.name)}</span>${photo(PH.step[s.art], 1400)}</div>
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
    const os = S.s.orders;
    return {
      title: "내 주문",
      html: `<div class="wrap page-head"><div class="eyebrow">내 주문 · 지원 현황</div><h1>내 주문</h1><p class="small muted" style="margin-top:12px">이 브라우저에서 주문한 내역이 보여요.</p></div>
      <div class="wrap" style="padding-bottom:110px">
        ${os.length ? os.map((o) => { const m = S.model(o.modelId); const sup = S.s.support.filter((x) => x.orderId === o.id); return `
          <div style="border-top:1px solid var(--ink);padding:28px 0 40px">
            <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap"><div><div class="eyebrow">${esc(o.id)} · ${fmtDate(o.createdAt)}</div><div class="serif" style="font-size:21px;margin-top:6px">${esc(m ? m.name : "")} · ${o.kind === "pkg" ? "설치 패키지" : o.kind === "ssd2" ? "부품 포함 2TB" : "부품 포함 1TB"}</div></div><div class="serif" style="font-size:19px">${won(o.total)}</div></div>
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
      html: `<div class="wrap page-head"><div class="eyebrow">모델 전용 저장공간 추가 키트</div><h1>받자마자 시작할 수 있게</h1><p class="muted" style="margin-top:14px;max-width:640px">작은 크라프트 상자 하나에 필요한 것을 모두 담았어요. 모든 인쇄물에는 주문한 모델 코드와 주문번호가 찍혀 나가요.</p></div>
      <section class="sec tight"><div class="wrap"><div class="frame wide" style="max-height:440px;margin-bottom:60px">${photo(PH.kitBox, 1600)}</div>
        <ol class="numlist kitlist">${SEED.kit.map((k) => `<li><span class="n">${k.n}</span><div><div class="t">${esc(k.t)}</div><div class="d">${esc(k.d)}</div></div></li>`).join("")}</ol></div></section>
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
    const tabs = [["overview", "개요"], ["models", "호환성 DB"], ["diag", `진단 요청 (${s.diagnoses.filter((d) => d.status !== "approved").length})`], ["orders", "주문"], ["support", "지원 요청"], ["requests", "모델 요청"], ["interests", "관심 등록"], ["settings", "설정"]];
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
