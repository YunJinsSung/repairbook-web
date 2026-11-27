// 데이터 계층. 지금은 브라우저(localStorage)에 저장하고,
// Supabase를 연결할 때는 이 파일의 load/save/insert 부분만 바꾸면 됨 (supabase/schema.sql 참고).
(function () {
  const KEY = "repairbook_v1";
  const clone = (o) => JSON.parse(JSON.stringify(o));
  let mem = null;

  function fresh() {
    const s = clone(window.RB_SEED);
    return { version: s.version, settings: s.settings, models: s.models, diagnoses: [], upgrades: [], orders: [], repairs: [], partners: [], requests: [], interests: [], support: [], progress: {} };
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
      const st = Object.assign({}, window.RB_SEED.settings, load().settings);
      const sale = (c) => Math.round((c * (1 + st.ssdMarginPct / 100)) / 100) * 100;
      return {
        pkg: st.packagePrice,
        ssd1: sale(st.ssdCost1tb),
        ssd2: sale(st.ssdCost2tb),
        install: st.installService,
        care: st.carePlan,
        remote: st.remoteDiag,
        date: st.priceDate,
        swapPkg: st.swapPackage,
        ramPkg: st.ramPackage,
        ram16: sale(st.ramCost16),
        grease: st.greaseKit
      };
    },

    // 키트: 모델이 받을 수 있는지
    up(model) { return model && (window.RB_UPGRADE || {})[model.id]; },
    canKit(kit, model) {
      const u = this.up(model); if (!model) return false;
      if (kit === "ssd-add") return this.verdict(model) === "ok";
      if (!u || !model.verified) return false;
      if (kit === "ssd-swap") return u.ssd === "replace";
      if (kit === "ram") return u.ram === true;
      if (kit === "grease") return u.grease >= 1;
      return false;
    },
    kitOptions(kit, model) {
      const p = this.prices();
      if (kit === "ssd-swap") return [
        ["swap1", "교체용 SSD 1TB", "공구·복제 어댑터·가이드 포함", [["SSD 교체 패키지", p.swapPkg], [`교체용 SSD 1TB (${p.date} 시세)`, p.ssd1]]],
        ["swap2", "교체용 SSD 2TB", "용량당 가격이 가장 낮아요", [["SSD 교체 패키지", p.swapPkg], [`교체용 SSD 2TB (${p.date} 시세)`, p.ssd2]]]
      ];
      if (kit === "ram") return [
        ["ram16", "16GB 1개 추가", "빈 슬롯 1개에 추가 · 기존 모듈과 같은 규격", [["RAM 설치 패키지", p.ramPkg], ["DDR5 SO-DIMM 16GB", p.ram16]]],
        ["ram32", "16GB × 2개 (32GB)", "두 슬롯을 같은 모듈로 맞춰 교체", [["RAM 설치 패키지", p.ramPkg], ["DDR5 SO-DIMM 16GB × 2", p.ram16 * 2]]]
      ];
      if (kit === "grease") return [["grease", "재도포 키트", "구리스·알코올 패드·도포 도구·공구 포함", [["서멀 구리스 재도포 키트", p.grease]]]];
      return [];
    },
    kitsOf(rec) { return rec.kits || (rec.result && (rec.result.kits || (rec.result.grade === "A" ? ["ssd-add"] : []))) || []; },
    kitGate(kit, modelId) {
      const m = this.model(modelId);
      if (!this.canKit(kit, m)) return { ok: false, reason: "model" };
      const s = load();
      const recs = s.diagnoses.filter((x) => x.modelId === modelId && this.kitsOf(x).includes(kit))
        .concat(s.upgrades.filter((x) => x.modelId === modelId && this.kitsOf(x).includes(kit)));
      if (!recs.length) return { ok: false, reason: "nodiag" };
      const ok = recs.find((x) => x.status === "approved");
      if (!ok) return { ok: false, reason: "review", d: recs[0] };
      return { ok: true, d: ok };
    },
    addUpgrade(u) {
      const s = load();
      u.id = "RB-U-" + stamp() + "-" + rid();
      u.createdAt = new Date().toISOString();
      u.status = "approved";
      s.upgrades.unshift(u); save();
      return u;
    },

    // 사업계획서 2-3 판정 규칙
    judge(input, model) {
      const v = this.verdict(model);
      const free = input.totalGB > 0 ? (input.freeGB / input.totalGB) * 100 : null;
      const freeTxt = free == null ? "" : `내장 저장공간 여유가 ${free.toFixed(0)}%예요.`;
      const low = free != null && free < 15;
      const notes = [];
      const r = (grade, why, next, extra = {}) => Object.assign({ grade, why, next, freePct: free, notes }, extra);
      const up = this.up(model) || {};
      const swapOk = this.canKit("ssd-swap", model);
      const modelFail = () => swapOk
        ? r("A", `${freeTxt} 이 노트북은 빈 자리가 없어서, 지금 SSD를 더 큰 것으로 교체하면 해결돼요. 데이터는 그대로 옮겨요.`, "SSD 교체 키트를 확인하세요.", { kits: ["ssd-swap"], recTB: (input.need === "2000" || input.totalGB >= 1000) ? 2 : 1 })
        : v === "no"
        ? r("B", `${freeTxt} 다만 이 노트북은 부품을 추가로 꽂을 빈 자리가 없어요.`, "외장 저장장치 사용과 파일 정리 가이드를 보내 드려요. 교체가 필요하면 수리점을 연결해 드려요.")
        : r("B", `${freeTxt} 이 모델은 아직 검수 중이라 키트를 판매하지 않아요.`, "무료 정리 가이드를 먼저 써 보세요. 모델 추가를 요청해 두면 준비되는 대로 알려 드려요.", { requestModel: true });

      // 공통 사용 환경
      if (input.recent === "liquid" && input.symptom !== "damage")
        return r("C", "증상 직전에 액체가 닿았어요. 겉으로 멀쩡해도 내부 부식이 진행될 수 있어요.", "전원을 끄고 사용을 멈춘 뒤 수리점 점검을 먼저 받아 주세요. 진단 카드를 보여 주시면 돼요.", { urgent: true });
      if (input.recent === "drop") notes.push("충격 이력이 있어요. 분해할 때 뒷판 걸쇠나 케이블이 상했는지 함께 살펴보세요.");
      if (input.recent === "update" && ["slow", "display", "power"].includes(input.symptom)) notes.push("업데이트 직후라면 하루 정도 백그라운드 작업이 이어질 수 있어요. 재부팅 후 다시 확인해 보세요.");
      if (input.age === "old" && input.symptom !== "battery") notes.push("3년 이상 쓰셨다면 배터리 상태와 내부 먼지도 함께 점검받아 보세요.");

      switch (input.symptom) {
        case "storage": {
          if (free == null) return r("B", "저장공간 숫자를 확인하지 못했어요.", "정밀 원격 진단(20분)을 받아 보세요.", { lowConfidence: true });
          if (input.hog === "media") notes.push("사진·영상은 새로 추가한 저장공간(D:)으로 옮기기 가장 좋은 파일이에요.");
          if (input.hog === "games") notes.push("게임은 런처 설정에서 설치 위치를 새 드라이브로 바꿀 수 있어요.");
          if (!low) {
            if (free < 25 && input.cleaned === false) return r("B", `${freeTxt} 정리만으로도 충분히 여유를 만들 수 있어요.`, "임시 파일·다운로드 폴더 정리 가이드를 먼저 따라 해 보세요. 그래도 부족하면 다시 진단해 주세요.");
            return r("B", `${freeTxt} 아직 여유가 있어서 부품을 살 필요는 없어요.`, "큰 파일 찾기·임시 파일 정리 가이드를 따라 해 보세요.");
          }
          if (input.cleaned === false) notes.push("장착 전에 임시 파일 정리를 해 두면 옮길 파일이 줄어 작업이 쉬워져요.");
          if (v !== "ok") return modelFail();
          const want = input.need === "2000" ? 2 : input.need === "500" ? 1 : (input.need === "1000" ? 1 : (input.totalGB >= 1000 ? 2 : 1));
          const recTB = Math.min(want, model.maxTB || 1);
          if (want > recTB) notes.push(`이 모델은 제조사 테스트 기준 ${model.maxTB}TB까지만 판매해요. 더 필요하면 외장 저장장치를 함께 쓰세요.`);
          return r("A", `${freeTxt} 이 노트북은 빈 자리에 저장공간 부품을 하나 더 꽂을 수 있어요.`, "이 노트북에 맞는 키트를 확인하세요.", { recTB, kits: ["ssd-add"] });
        }
        case "slow":
          if (input.heat) notes.push("발열과 팬 소음이 커졌다면 내부 먼지 청소가 필요할 수 있어요(수리점 권장).");
          if (input.when === "app" && !input.diskHigh) notes.push("특정 프로그램에서만 느리다면 그 프로그램의 권장 사양을 확인해 보세요.");
          if (input.memHigh && !input.diskHigh) {
            if (up.ram === true && model.verified) return r("A", "메모리가 부족해서 느린 경우예요. 이 노트북은 메모리 슬롯이 있어 늘릴 수 있어요.", "RAM 업그레이드 키트를 확인하세요.", { kits: ["ram"] });
            return r("B", "메모리가 부족해서 느린 경우예요. 이 노트북의 메모리는 교체할 수 없게 붙어 있어요(온보드).", "시작 프로그램 줄이기·브라우저 탭 정리 가이드를 보내 드려요.");
          }
          if (input.diskHigh && low) { if (v !== "ok") return modelFail(); return r("A", `디스크 사용률이 오래 90% 안팎이고, ${freeTxt}`, "저장공간을 추가하면 해결돼요. 맞는 키트를 확인하세요.", { recTB: 1, kits: ["ssd-add"] }); }
          if (input.diskHigh) return r("B", `디스크 사용률은 높지만 공간 여유는 있어요. ${freeTxt}`, "업데이트·백그라운드 작업 점검 가이드를 따라 해 보세요.", { lowConfidence: true });
          if (input.heat) {
            if (this.canKit("grease", model)) {
              if (up.grease >= 5) notes.push("이 모델은 CPU·GPU 두 곳을 발라야 해서 ‘대신 장착’ 선택을 권해요.");
              return r("A", "디스크·메모리는 여유가 있는데 발열이 심해요. 굳은 서멀 구리스와 먼지가 원인일 가능성이 커요.", "서멀 구리스 재도포 키트로 해결할 수 있어요. 팬 먼지도 함께 청소해요.", { kits: ["grease"] });
            }
            return r("C", "디스크·메모리는 여유가 있는데 발열이 심해요. 냉각 계통(팬·먼지) 문제로 보여요.", "부품을 사지 않으셔도 돼요. 수리점에서 내부 청소를 받아 보세요.");
          }
          return r("B", "디스크와 메모리 모두 여유가 있어요.", "재부팅·업데이트·악성 프로그램 점검 가이드를 따라 해 보세요.");
        case "power":
          if (input.before === "liquid") return r("C", "물·충격 뒤에 꺼졌어요. 다시 켜면 손상이 커질 수 있어요.", "전원을 켜지 말고 수리점 점검을 받아 주세요.", { urgent: true });
          if (input.powerFixed) {
            if (input.before === "battery") notes.push("배터리가 완전히 방전돼 있었던 것으로 보여요. 30분 이상 충전한 뒤 쓰세요.");
            return r("B", "기본 점검으로 다시 켜졌어요.", "같은 증상이 반복되면 다시 진단을 요청해 주세요.");
          }
          if (input.lamp === "off") return r("C", "충전 램프도 켜지지 않아요. 어댑터 또는 노트북 전원부 고장이 의심돼요.", "다른 어댑터가 있다면 먼저 바꿔 보세요. 그래도 안 되면 진단 카드를 수리점에 보여 주세요.");
          return r("C", "충전은 되는데 켜지지 않아요. 메인보드 전원 계통 고장이 의심돼요.", "지금은 부품을 사지 않으셔도 돼요. 진단 카드를 제휴 수리점에 보여 주시면 점검비가 면제·할인돼요.");
        case "display":
          if (input.look === "dim") return r("C", "화면이 아주 어둡게 보여요. 화면 뒤 조명(백라이트)이나 그 전원 문제로 보여요.", "부품을 사지 않으셔도 돼요. 진단 카드를 수리점에 보여 주세요.");
          if (input.look === "flicker") return r("C", "각도에 따라 깜빡여요. 화면 연결 케이블이 헐거워졌을 가능성이 커요.", "수리점에서 케이블 점검을 받아 보세요. 비교적 간단한 수리일 수 있어요.");
          if (input.look === "lines") return r("C", "줄이나 깨짐이 보여요. 화면 패널 손상으로 보여요.", "패널 교체가 필요해요. 진단 카드를 수리점에 보여 주세요.");
          if (input.extDisplay === "ok") return r("C", "외부 모니터에는 화면이 나와요. 노트북 화면 계통 문제로 보여요.", "부품을 사지 않으셔도 돼요. 진단 카드를 수리점에 보여 주세요.");
          if (input.extDisplay === "na") return r("C", "외부 모니터로 확인하지 못했어요. 화면 또는 메인보드 계통이 의심돼요.", "수리점에서 외부 출력부터 확인받아 보세요.", { lowConfidence: true });
          return r("C", "외부 모니터에서도 화면이 나오지 않아요. 메인보드 계통이 의심돼요.", "부품을 사지 않으셔도 돼요. 진단 카드를 수리점에 보여 주세요.");
        case "battery":
          if (input.swell) return r("C", "배터리가 부풀어 뒷판이 들뜬 것으로 보여요. 화재 위험이 있어요.", "지금 충전을 멈추고 사용하지 마세요. 수리점에서 바로 교체받아 주세요.", { urgent: true });
          if (input.hours === "gt4") return r("B", "4시간 이상 쓸 수 있다면 아직 정상 범위예요.", "설정 › 시스템 › 전원 및 배터리에서 ‘배터리 절약 모드’와 화면 밝기를 조정해 보세요.");
          return r("C", `완충 후 ${input.hours === "lt2" ? "2시간도" : "4시간을"} 못 버텨요. 배터리 수명이 줄어든 것으로 보여요. 배터리 키트는 아직 준비 중이에요.`, "제휴 수리점에서 교체를 안내해 드려요.");
        default: {
          const urgentNow = input.what === "liquid" && input.since === "today";
          if (input.what === "liquid") notes.push("드라이기로 말리거나 쌀에 넣지 마세요. 그대로 두고 수리점으로 가져가는 게 가장 안전해요.");
          if (input.what === "noise") notes.push("딸깍·긁히는 소리는 팬 고장일 수 있어요. 중요한 파일은 먼저 백업해 두세요.");
          return r("C", urgentNow ? "오늘 액체가 닿았어요. 빨리 점검할수록 살릴 가능성이 커요." : "물·충격·소음·발열은 내부 손상 가능성이 있어요.", "지금 바로 전원을 끄고 사용을 멈춰 주세요. 수리점을 연결해 드려요.", { urgent: true });
        }
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
    gate(modelId) { return this.kitGate("ssd-add", modelId); },
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
    REPAIR_STEPS: ["요청 접수", "수리점 확인", "방문·입고", "점검·견적", "수리 완료"],
    repairTag: { power: "전원·메인보드", display: "화면", battery: "배터리", damage: "침수·충격", slow: "발열·구리스", storage: "키트 장착" },
    addRepair(x) {
      const s = load();
      x.id = "RB-R-" + stamp() + "-" + rid();
      x.createdAt = new Date().toISOString();
      x.status = 0;
      s.repairs.unshift(x); save();
      return x;
    },
    repair(id) { return load().repairs.find((x) => x.id === id); },
    addPartner(x) { const s = load(); x.at = new Date().toISOString(); s.partners.unshift(x); save(); },
    addInterest(i) { const s = load(); i.at = new Date().toISOString(); s.interests.unshift(i); save(); },
    addSupport(x) { const s = load(); x.at = new Date().toISOString(); x.id = "S-" + rid(); s.support.unshift(x); save(); return x; }
  };
  window.Store = Store;
})();
