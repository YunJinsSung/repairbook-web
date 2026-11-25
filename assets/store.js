// 데이터 계층. 지금은 브라우저(localStorage)에 저장하고,
// Supabase를 연결할 때는 이 파일의 load/save/insert 부분만 바꾸면 됨 (supabase/schema.sql 참고).
(function () {
  const KEY = "repairbook_v1";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let mem = null;

  function fresh() {
    const s = clone(window.RB_SEED);
    return { version: s.version, settings: s.settings, models: s.models, diagnoses: [], orders: [], requests: [], interests: [], support: [], progress: {} };
  }
  function load() {
    if (mem) return mem;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d && d.version === window.RB_SEED.version) { mem = Object.assign(fresh(), d); return mem; }
      }
    } catch (e) { /* storage unavailable */ }
    mem = fresh();
    return mem;
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch (e) { /* ignore */ } }

  const norm = (s) => String(s || "").toUpperCase().replace(/[\s\-_/().]/g, "");
  const pad = (n, l = 4) => String(n).padStart(l, "0");
  function stamp() { const d = new Date(); return String(d.getFullYear()).slice(2) + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2); }
  function rid() { return pad(Math.floor(Math.random() * 10000)); }

  const Store = {
    get s() { return load(); },
    save,
    reset() { mem = fresh(); save(); },
    norm,

    verdict(m) {
      if (!m) return "pending";
      if (m.verified && m.emptySlots >= 1) return "ok";
      if (m.verified && m.emptySlots === 0) return "no";
      return "pending";
    },
    verdictText(v) { return { ok: "추가할 수 있어요", no: "추가할 수 없어요", pending: "확인 중이에요" }[v]; },
    verdictShort(v) { return { ok: "가능", no: "불가", pending: "준비 중" }[v]; },
    model(id) { return load().models.find((m) => m.id === id); },

    // 모델 코드/이름 검색 — 가장 긴 코드 접두어가 맞는 모델 우선
    search(q) {
      const n = norm(q);
      if (n.length < 2) return [];
      const out = [];
      for (const m of load().models) {
        let best = 0, hit = "";
        for (const c of m.codes) {
          const cn = norm(c);
          const cands = [n, n.startsWith("NT") ? n : "NT" + n];
          for (const x of cands) {
            if (x.startsWith(cn) && cn.length > best) { best = cn.length + 100; hit = c; }
            else if (cn.startsWith(x) && x.length >= 3 && x.length > best) { best = x.length; hit = c; }
          }
        }
        if (!best && norm(m.name).includes(n)) { best = 1; hit = m.codes[0]; }
        if (best) out.push({ m, code: hit, score: best });
      }
      return out.sort((a, b) => b.score - a.score);
    },
    // 정확히 하나로 정해지는 모델(입력이 코드 접두어를 포함)
    resolve(code) {
      const r = this.search(code).filter((x) => x.score > 100);
      return r.length ? r[0].m : null;
    },

    prices() {
      const st = load().settings;
      const sale = (c) => Math.round((c * (1 + st.ssdMarginPct / 100)) / 100) * 100;
      return {
        pkg: st.packagePrice,
        ssd1: sale(st.ssdCost1tb),
        ssd2: sale(st.ssdCost2tb),
        install: st.installService,
        care: st.carePlan,
        remote: st.remoteDiag,
        date: st.priceDate
      };
    },

    // 사업계획서 2-3 판정 규칙
    judge(input, model) {
      const v = this.verdict(model);
      const free = input.totalGB > 0 ? (input.freeGB / input.totalGB) * 100 : null;
      const freeTxt = free == null ? "" : `내장 저장공간 여유가 ${free.toFixed(0)}%예요.`;
      const low = free != null && free < 15;
      const r = (grade, why, next, extra = {}) => Object.assign({ grade, why, next, freePct: free }, extra);
      const modelFail = () => v === "no"
        ? r("B", `${freeTxt} 다만 이 노트북은 부품을 추가로 꽂을 빈 자리가 없어요.`, "외장 저장장치 사용과 파일 정리 가이드를 보내 드려요. 교체가 필요하면 수리점을 연결해 드려요.")
        : r("B", `${freeTxt} 이 모델은 아직 검수 중이라 키트를 판매하지 않아요.`, "무료 정리 가이드를 먼저 써 보세요. 모델 추가를 요청해 두면 준비되는 대로 알려 드려요.", { requestModel: true });

      switch (input.symptom) {
        case "storage":
          if (free == null) return r("B", "저장공간 숫자를 확인하지 못했어요.", "정밀 원격 진단(20분)을 받아 보세요.", { lowConfidence: true });
          if (!low) return r("B", `${freeTxt} 아직 여유가 있어서 부품을 살 필요는 없어요.`, "큰 파일 찾기·임시 파일 정리 가이드를 따라 해 보세요.");
          if (v !== "ok") return modelFail();
          return r("A", `${freeTxt} 이 노트북은 빈 자리에 저장공간 부품을 하나 더 꽂을 수 있어요.`, "이 노트북에 맞는 키트를 확인하세요.");
        case "slow":
          if (input.memHigh && !input.diskHigh) return r("B", "메모리가 부족해서 느린 경우예요. 이 노트북의 메모리는 교체할 수 없게 붙어 있어요(온보드).", "시작 프로그램 줄이기·브라우저 탭 정리 가이드를 보내 드려요.");
          if (input.diskHigh && low) { if (v !== "ok") return modelFail(); return r("A", `디스크 사용률이 오래 90% 안팎이고, ${freeTxt}`, "저장공간을 추가하면 해결돼요. 맞는 키트를 확인하세요."); }
          if (input.diskHigh) return r("B", `디스크 사용률은 높지만 공간 여유는 있어요. ${freeTxt}`, "업데이트·백그라운드 작업 점검 가이드를 따라 해 보세요.", { lowConfidence: true });
          return r("B", "디스크와 메모리 모두 여유가 있어요.", "재부팅·업데이트·악성 프로그램 점검 가이드를 따라 해 보세요.");
        case "power":
          if (input.powerFixed) return r("B", "기본 점검으로 다시 켜졌어요.", "같은 증상이 반복되면 다시 진단을 요청해 주세요.");
          return r("C", "어댑터·전원 버튼 점검 후에도 켜지지 않아요. 전원 계통 고장이 의심돼요.", "지금은 부품을 사지 않으셔도 돼요. 진단 카드를 제휴 수리점에 보여 주시면 점검비가 면제·할인돼요.");
        case "display":
          if (input.extDisplay === "ok") return r("C", "외부 모니터에는 화면이 나와요. 노트북 화면 계통 문제로 보여요.", "부품을 사지 않으셔도 돼요. 진단 카드를 수리점에 보여 주세요.");
          return r("C", "외부 모니터에서도 화면이 나오지 않아요. 메인보드 계통이 의심돼요.", "부품을 사지 않으셔도 돼요. 진단 카드를 수리점에 보여 주세요.");
        case "battery":
          return r("C", "배터리 수명이 줄어든 것으로 보여요. 배터리 키트는 아직 준비 중이에요.", "제휴 수리점에서 교체를 안내해 드려요.");
        default:
          return r("C", "물·충격·소음·발열은 내부 손상 가능성이 있어요.", "지금 바로 전원을 끄고 사용을 멈춰 주세요. 수리점을 연결해 드려요.", { urgent: true });
      }
    },

    addDiagnosis(d) {
      const s = load();
      d.id = "RB-D-" + stamp() + "-" + rid();
      d.createdAt = new Date().toISOString();
      d.status = s.settings.autoApprove ? "approved" : "review";
      s.diagnoses.unshift(d); save();
      return d;
    },
    diagnosis(id) { return load().diagnoses.find((d) => d.id === id); },
    // 결제 게이트: A 판정 + 모델 가능 + 승인된 진단
    gate(modelId) {
      const m = this.model(modelId);
      if (this.verdict(m) !== "ok") return { ok: false, reason: "model" };
      const d = load().diagnoses.find((x) => x.modelId === modelId && x.result.grade === "A");
      if (!d) return { ok: false, reason: "nodiag" };
      if (d.status !== "approved") return { ok: false, reason: "review", d };
      return { ok: true, d };
    },
    addOrder(o) {
      const s = load();
      o.id = "RB-" + stamp() + "-" + rid();
      o.createdAt = new Date().toISOString();
      o.status = 0;
      s.orders.unshift(o); save();
      return o;
    },
    order(id) { return load().orders.find((o) => o.id === id); },
    ORDER_STEPS: ["결제 완료", "부품 발주", "입고·검수", "출고", "배송 완료", "장착 완료"],

    addRequest(name, code) {
      const s = load();
      const key = norm(code || name);
      let r = s.requests.find((x) => x.key === key);
      if (r) r.count++; else s.requests.push({ key, name: name || code, code: code || "", count: 1, at: new Date().toISOString() });
      save();
    },
    addInterest(i) { const s = load(); i.at = new Date().toISOString(); s.interests.unshift(i); save(); },
    addSupport(x) { const s = load(); x.at = new Date().toISOString(); x.id = "S-" + rid(); s.support.unshift(x); save(); return x; }
  };
  window.Store = Store;
})();
