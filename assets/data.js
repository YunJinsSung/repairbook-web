// RepairBook seed data — 사업계획서 2-2(검증표), 2-3(진단 규칙), 2-4(Kit), 2-9(가격) 기준
// 실제 판매 전에는 실물 분해와 전문가 검수로 확정해야 함.
window.RB_SEED = {
  version: 1,
  settings: {
    ssdCost1tb: 330000,      // SSD 매입가(가정) 1TB
    ssdCost2tb: 594000,      // 2TB = 1TB × 1.8
    ssdMarginPct: 10,        // 매입가 + 10%
    packagePrice: 39000,     // 설치 패키지
    installService: 49000,   // 장착 대행
    carePlan: 29000,         // 케어 플랜(연)
    remoteDiag: 9900,        // 정밀 원격 진단
    priceDate: "2026-09",    // 시세 기준월(다나와)
    autoApprove: true,       // 데모: 진단 자동 승인(실제 운영은 사람이 판독)
    kakaoUrl: "",            // 카카오톡 채널 주소
    preorder: true           // 사전예약 기간(예약금 결제)
  },
  models: [
    { id: "gram-2024", brand: "LG", name: "LG 그램 (2024년형)", codes: ["14Z90S", "15Z90S", "16Z90S", "17Z90S"],
      totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 NVMe Gen4", maxTB: 1, ram: "온보드(교체 불가)",
      difficulty: 2, minutes: 30, verified: true, source: "LG전자 — 모든 그램 모델 확장 슬롯 1개 추가 지원",
      warranty: "LG전자는 서비스센터 유상 장착을 안내해요. 직접 장착하면 해당 부위의 무상 수리가 제한될 수 있어요.",
      note: "제조사 테스트 최대 용량이 1TB라서 1TB까지만 판매해요." },
    { id: "gram-2023", brand: "LG", name: "LG 그램 (2023년형)", codes: ["14Z90R", "15Z90R", "16Z90R", "17Z90R"],
      totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 NVMe Gen4", maxTB: 1, ram: "온보드(교체 불가)",
      difficulty: 2, minutes: 30, verified: true, source: "LG전자 — 모든 그램 모델 확장 슬롯 1개 추가 지원",
      warranty: "LG전자는 서비스센터 유상 장착을 안내해요. 직접 장착하면 해당 부위의 무상 수리가 제한될 수 있어요.",
      note: "제조사 테스트 최대 용량이 1TB라서 1TB까지만 판매해요." },
    { id: "grambook-ai-2026", brand: "LG", name: "LG 그램북 AI 2026", codes: ["GRAMBOOK-AI"],
      totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 NVMe", maxTB: 2, ram: "온보드(교체 불가)",
      difficulty: 2, minutes: 30, verified: false, source: "LG전자 — 기본 1 + 여분 1",
      warranty: "직접 장착하면 해당 부위의 무상 수리가 제한될 수 있어요.",
      note: "세부 모델 코드 확인과 실물 검수를 진행 중이에요. 검수가 끝나면 판매를 시작해요." },
    { id: "galaxy-book4", brand: "Samsung", name: "갤럭시 북4", codes: ["NT750XG"],
      totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 NVMe", maxTB: 2, ram: "온보드(교체 불가)",
      difficulty: 3, minutes: 35, verified: true, source: "삼성전자서비스 SSD·RAM 안내 — 2nd SSD 장착 가능",
      warranty: "직접 분해·장착으로 생긴 손상은 무상 수리 대상이 아닐 수 있어요.", note: "" },
    { id: "galaxy-book4-pro", brand: "Samsung", name: "갤럭시 북4 Pro", codes: ["NT940XGK", "NT960XGK"],
      totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 NVMe Gen4", maxTB: 2, ram: "온보드(교체 불가)",
      difficulty: 3, minutes: 35, verified: true, source: "삼성 제품 스펙 — SSD 슬롯 총 2개",
      warranty: "직접 분해·장착으로 생긴 손상은 무상 수리 대상이 아닐 수 있어요.", note: "" },
    { id: "galaxy-book4-ultra", brand: "Samsung", name: "갤럭시 북4 Ultra", codes: ["NT960XGL"],
      totalSlots: 2, emptySlots: 1, ssdSpec: "M.2 2280 PCIe Gen4 (SATA 미지원)", maxTB: 2, ram: "온보드(교체 불가)",
      difficulty: 3, minutes: 35, verified: true, source: "삼성 커뮤니티 공식 답변 — 2nd 슬롯 M.2 2280 PCIe Gen4",
      warranty: "직접 분해·장착으로 생긴 손상은 무상 수리 대상이 아닐 수 있어요.", note: "SATA 방식 SSD는 맞지 않아요. 키트에는 NVMe 제품만 들어가요." },
    { id: "galaxy-book4-pro360", brand: "Samsung", name: "갤럭시 북4 Pro 360", codes: ["NT960QGK"],
      totalSlots: 1, emptySlots: 0, ssdSpec: "M.2 (슬롯 1개)", maxTB: 0, ram: "온보드(교체 불가)",
      difficulty: 3, minutes: 0, verified: true, source: "삼성 SSD 안내 — 슬롯 1개뿐, 추가 불가",
      warranty: "", note: "빈 자리가 없어 저장공간 부품을 추가할 수 없어요. 외장 저장장치나 교체를 안내해 드려요." },
    { id: "thinkpad-t14-g5", brand: "Lenovo", name: "씽크패드 T14 Gen 5", codes: ["21ML", "21MM", "21MC", "21MD"],
      totalSlots: 1, emptySlots: 0, ssdSpec: "M.2 2280 (슬롯 1개, 교체만 가능)", maxTB: 0, ram: "SO-DIMM 2개(교체 가능)",
      difficulty: 2, minutes: 0, verified: true, source: "Notebookcheck",
      warranty: "", note: "저장공간 부품은 추가할 수 없어요. 메모리(RAM) 키트는 2차 품목으로 검토 중이에요." }
  ],
  // 증상 6종 (사업계획서 2-3 ①)
  symptoms: [
    { id: "storage", label: "저장공간이 부족해요", desc: "C드라이브가 빨갛게 표시돼요", icon: "disk" },
    { id: "slow", label: "느려요, 오래 걸려요", desc: "프로그램이 늦게 열리고 버벅여요", icon: "slow" },
    { id: "power", label: "전원이 안 켜져요", desc: "버튼을 눌러도 반응이 없어요", icon: "power" },
    { id: "display", label: "화면이 안 나와요", desc: "켜지는 소리는 나는데 까매요", icon: "screen" },
    { id: "battery", label: "배터리가 빨리 닳아요", desc: "충전해도 금방 꺼져요", icon: "battery" },
    { id: "damage", label: "물·충격·소음·발열", desc: "쏟았거나 떨어뜨렸거나 소리가 나요", icon: "drop" }
  ],
  kit: [
    { n: "①", t: "모델 전용 저장공간 부품(SSD)", d: "M.2 2280 NVMe Gen4 · SSD 포함형만" },
    { n: "②", t: "정밀 드라이버·비트 3종", d: "뒷판과 고정 나사용" },
    { n: "③", t: "분해 헤라·피크", d: "뒷판 걸쇠를 긁힘 없이" },
    { n: "④", t: "정전기 방지 손목 밴드", d: "부품 손상 예방" },
    { n: "⑤", t: "모델 전용 자석 나사 매트", d: "나사 번호대로 보관, 길이가 다르면 빨간 ★" },
    { n: "⑥", t: "예비 고정 나사 2개", d: "분실·마모 대비" },
    { n: "⑦", t: "QR 안내 카드", d: "찍으면 내 모델 가이드 1단계가 열려요" },
    { n: "⑧", t: "퀵 스타트 가이드", d: "앱·영상과 같은 7단계 번호" },
    { n: "⑨", t: "즉시 중단·지원 카드", d: "멈춰야 할 때와 지원 범위" }
  ],
  stopRules: [
    "배터리가 부풀어 있거나 뒷판이 들떠 있어요",
    "나사 머리가 닳아서 드라이버가 헛돌아요",
    "걸쇠나 케이블 모양이 가이드 사진과 달라요",
    "다시 조립했는데 켜지지 않거나 새 부품이 안 보여요"
  ],
  guide: [
    { t: "준비하고 증상 다시 확인하기", min: 5, art: "backup",
      body: "작업 전에 내 파일을 미리 복사해 두고, 진단 때 본 증상이 지금도 같은지 한 번 더 확인해요.",
      tasks: ["중요한 파일을 클라우드나 외장 저장장치에 복사했어요(백업)", "BitLocker(드라이브 암호화)를 쓰면 복구 키를 따로 적어 두었어요", "설정 › 시스템 › 저장소 화면이 진단 때와 같아요(다르면 멈추고 지원 요청)"] },
    { t: "완전히 끄고 준비물 펼치기", min: 3, art: "power",
      body: "Shift 키를 누른 채로 ‘시스템 종료’를 눌러 완전히 꺼요. 충전기를 빼고, 손목 밴드를 차고, 나사 매트를 노트북 옆에 펼쳐요.",
      tasks: ["Shift + 시스템 종료로 완전히 껐어요", "충전기와 연결된 선을 모두 뺐어요", "정전기 방지 손목 밴드를 찼어요"] },
    { t: "뒷판 나사 풀기", min: 5, art: "screws",
      body: "노트북을 뒤집어 부드러운 천 위에 놓아요. 나사 매트에 인쇄된 번호 순서대로 풀어서 같은 번호 자리에 올려 두세요. 빨간 ★ 나사는 길이가 달라요.",
      tasks: ["나사를 모두 풀어 매트의 같은 번호 자리에 두었어요", "고무발 아래 숨은 나사도 확인했어요(가이드 사진 참고)"] },
    { t: "뒷판 열기", min: 5, art: "pry",
      body: "헤라를 모서리 틈에 살짝 넣고 천천히 따라가며 걸쇠를 풀어요. 힘을 세게 주지 않아도 열려요. 잘 안 열리면 나사가 남아 있는지 다시 확인해요.",
      tasks: ["뒷판을 들어 올렸어요", "배터리 연결선을 가이드 사진 위치에서 분리했어요"] },
    { t: "저장공간 부품 꽂기", min: 5, art: "ssd",
      body: "비어 있는 자리(M.2 확장 슬롯)를 찾아 부품을 약 30도 기울여 끝까지 밀어 넣고, 살짝 눌러 예비 나사로 고정해요.",
      tasks: ["빈 자리에 부품을 끝까지 꽂았어요", "고정 나사를 조였어요(너무 세게 조이지 않기)"] },
    { t: "다시 닫기", min: 5, art: "close",
      body: "배터리 연결선을 다시 꽂고 뒷판을 덮어 가장자리를 눌러 걸쇠를 맞춰요. 나사는 매트 번호대로 제자리에 조여요.",
      tasks: ["배터리 연결선을 다시 꽂았어요", "뒷판을 덮고 나사를 번호대로 모두 조였어요"] },
    { t: "켜서 새 공간 확인하기", min: 5, art: "check",
      body: "노트북을 켜고 ‘디스크 관리’를 열어요. 새 디스크가 보이면 ‘초기화(GPT)’ → ‘새 단순 볼륨’을 눌러 D: 같은 새 드라이브를 만들어요.",
      tasks: ["시작 버튼 우클릭 › 디스크 관리에서 새 디스크가 보여요", "새 단순 볼륨을 만들어 내 PC에 새 드라이브가 생겼어요"] }
  ],
  faq: [
    { q: "노트북을 잘 몰라도 할 수 있나요?", a: "네. 증상만 고르면 리페어북이 먼저 판단해요. 키트로 해결되는 경우에만 판매하고, 작업은 7단계 영상·사진 가이드로 약 30분이면 끝나요. 막히면 원격 지원 버튼을 누르세요. 그래도 부담되면 ‘대신 장착해 주세요’를 고를 수 있어요." },
    { q: "기존 파일이나 윈도우가 지워지나요?", a: "아니요. 원래 있던 저장공간은 그대로 두고 빈 자리에 하나를 더 꽂는 방식이라 옮길 데이터가 없어요. 그래도 만일을 위해 작업 1단계에서 백업을 꼭 확인해요." },
    { q: "내 노트북에 맞는지 어떻게 확인하나요?", a: "모델 코드로 확인해요. 같은 ‘갤럭시 북4’라도 Pro 360처럼 빈 자리가 없는 모델이 있어요. 주문할 때 모델 코드를 한 번 더 입력해 미호환 발송을 막아요. 맞지 않는 부품이 가면 무료 교환이나 전액 환불해 드려요." },
    { q: "진단이 틀리면 어떻게 되나요?", a: "오진 안심 보장이 적용돼요. 장착 전에 오진이 밝혀지면 전액 환불, 장착 후 다른 부품 고장으로 밝혀지면 설치 패키지 전액 환불과 수리점 점검비(최대 11,000원)를 지원해요. 진단 카드를 수리점에 전달해 중복 점검비도 줄여 드려요." },
    { q: "SSD 가격은 왜 바뀌나요?", a: "저장공간 부품 시세가 크게 오르내리고 있어서 ‘설치 패키지(고정가) + 부품(시세 연동)’으로 나눠 팔아요. 가격은 결제 시점에 확정되고, 결제된 수량만 바로 발주해요. 부품을 이미 갖고 있다면 설치 패키지만 살 수도 있어요." },
    { q: "보증에 영향이 있나요?", a: "제조사마다 달라요. 모델별 결과 화면에 보증 영향을 미리 적어 두었고, 주문 전에 확인 동의를 받아요." },
    { q: "배송은 얼마나 걸리나요?", a: "결제 후 부품을 발주해 검수·포장까지 2~3영업일 안에 출고해요. 출고 전에 앱에서 백업 단계를 미리 볼 수 있어요." }
  ]
};

// 라인 일러스트 (stroke = currentColor)
window.RB_ART = {
  hero: `<svg viewBox="0 0 900 620" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round">
    <path d="M120 470 L520 560 L860 400 L460 330 Z" stroke-width="1.5"/>
    <path d="M120 470 L120 482 L520 572 L860 412 L860 400"/>
    <path d="M168 462 L505 538 L808 400 L470 342 Z" opacity=".5"/>
    <g opacity=".85"><path d="M520 452 L640 478 L700 450 L580 425 Z"/><path d="M548 452 L640 472" opacity=".6"/><path d="M560 444 L652 464" opacity=".6"/><path d="M572 437 L664 457" opacity=".6"/></g>
    <g stroke-dasharray="5 6"><path d="M330 440 L450 466 L506 440 L386 415 Z"/></g>
    <path d="M396 420 L470 330 L560 350 L486 440" stroke-width="1.6"/>
    <path d="M410 412 L478 336" opacity=".5"/><path d="M548 352 L478 438" opacity=".5"/>
    <g><circle cx="500" cy="352" r="2.4"/><circle cx="522" cy="357" r="2.4"/><circle cx="436" cy="400" r="1.6"/></g>
    <path d="M470 330 L470 250 M560 350 L560 260" stroke-dasharray="2 7" opacity=".55"/>
    <g opacity=".7"><circle cx="196" cy="468" r="4"/><circle cx="486" cy="540" r="4"/><circle cx="820" cy="404" r="4"/><circle cx="470" cy="346" r="4"/></g>
    <path d="M640 250 C700 230 740 260 760 300" opacity=".35"/>
  </svg>`,
  box: `<svg viewBox="0 0 300 300" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" stroke-linecap="round">
    <path d="M40 120 L150 80 L260 120 L150 160 Z"/><path d="M40 120 L40 210 L150 250 L150 160"/><path d="M260 120 L260 210 L150 250"/>
    <path d="M70 110 L178 70" opacity=".5"/><rect x="170" y="180" width="60" height="30" transform="skewY(-20) translate(0 64)" opacity=".7"/>
    <path d="M178 196 L222 180" opacity=".5"/><path d="M178 206 L210 194" opacity=".5"/>
  </svg>`,
  ssd: `<svg viewBox="0 0 300 160" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round">
    <rect x="20" y="50" width="240" height="60" rx="3"/><path d="M260 60 L280 60 L280 100 L260 100"/>
    <rect x="60" y="62" width="44" height="36"/><rect x="118" y="62" width="44" height="36"/><rect x="176" y="68" width="30" height="24"/>
    <path d="M20 60 L8 60 L8 100 L20 100" opacity=".6"/><circle cx="270" cy="80" r="5"/>
    <path d="M26 104 L52 104" opacity=".5"/><path d="M30 56 L40 56" opacity=".5"/>
  </svg>`,
  disk: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="4" y="8" width="24" height="16" rx="1.5"/><path d="M4 18h24"/><path d="M8 21h4"/><path d="M8 12h12" opacity=".6"/></svg>`,
  slow: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3"><circle cx="16" cy="17" r="11"/><path d="M16 17 L16 9"/><path d="M16 17 L21 20"/><path d="M12 3h8"/></svg>`,
  power: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M16 4v11"/><path d="M9.5 8.5a10 10 0 1 0 13 0"/></svg>`,
  screen: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="4" y="6" width="24" height="16" rx="1"/><path d="M2 26h28"/><path d="M10 11l12 7M22 11l-12 7" opacity=".5"/></svg>`,
  battery: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="3" y="10" width="23" height="12" rx="1.5"/><path d="M26 14h3v4h-3"/><rect x="6" y="13" width="4" height="6" fill="currentColor" stroke="none" opacity=".5"/></svg>`,
  drop: `<svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M16 4c5 7 8 11 8 15a8 8 0 0 1-16 0c0-4 3-8 8-15z"/></svg>`,
  diag: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="24" y="14" width="72" height="92" rx="2"/><path d="M38 34h44M38 46h30M38 58h38" opacity=".6"/><circle cx="60" cy="84" r="10"/><path d="M55 84l4 4 7-8"/></svg>`,
  guideArt: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><rect x="34" y="10" width="52" height="100" rx="6"/><path d="M52 18h16" opacity=".6"/><polygon points="54,48 74,60 54,72" /><path d="M44 92h32" opacity=".5"/></svg>`,
  support: `<svg viewBox="0 0 120 120" fill="none" stroke="currentColor" stroke-width="1.2"><path d="M20 30h60a6 6 0 0 1 6 6v30a6 6 0 0 1-6 6H44l-14 12V72H20a6 6 0 0 1-6-6V36a6 6 0 0 1 6-6z"/><path d="M92 50h8a6 6 0 0 1 6 6v24a6 6 0 0 1-6 6h-4v10l-12-10H68" opacity=".6"/><path d="M32 46h36M32 56h24" opacity=".6"/></svg>`,
  step: {
    backup: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="20" y="20" width="80" height="56" rx="2"/><path d="M10 84h100"/><rect x="140" y="40" width="40" height="56" rx="3"/><path d="M104 50 C120 50 124 60 136 64" stroke-dasharray="4 4"/><path d="M130 58l6 6-8 3"/></svg>`,
    power: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"><path d="M100 26v30"/><path d="M80 36a28 28 0 1 0 40 0"/><path d="M30 100 h40 M140 100 h30" opacity=".4"/></svg>`,
    screws: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="30" y="20" width="140" height="80" rx="4"/><g><circle cx="42" cy="32" r="4"/><circle cx="100" cy="30" r="4"/><circle cx="158" cy="32" r="4"/><circle cx="42" cy="88" r="4"/><circle cx="100" cy="90" r="4"/><circle cx="158" cy="88" r="4"/></g><text x="152" y="22" font-size="11" fill="currentColor" stroke="none">★</text></svg>`,
    pry: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3"><path d="M20 80 L180 80"/><path d="M20 72 L170 72 L180 80"/><path d="M40 72 L60 40 L74 44 L58 74" /><path d="M100 64 C110 56 120 56 130 64" opacity=".4"/></svg>`,
    ssd: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="20" y="70" width="30" height="16"/><path d="M50 74 L150 44 L156 62 L56 92 Z"/><circle cx="168" cy="40" r="4"/><path d="M150 50 L168 44" stroke-dasharray="3 3"/></svg>`,
    close: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="30" y="50" width="140" height="44" rx="3"/><path d="M30 40 L170 40" stroke-dasharray="5 5"/><path d="M100 20 v14 M94 28 l6 6 6-6"/></svg>`,
    check: `<svg viewBox="0 0 200 120" fill="none" stroke="currentColor" stroke-width="1.3"><rect x="36" y="16" width="128" height="80" rx="2"/><path d="M24 104h152"/><rect x="52" y="34" width="44" height="18"/><rect x="104" y="34" width="44" height="18" stroke-dasharray="3 3"/><path d="M116 66 l8 8 14-16"/></svg>`
  }
};

// 실사 사진 (Unsplash 무료 라이선스, 핫링크). 실물 촬영본이 생기면 이 표만 바꾸면 돼요.
window.RB_PHOTO = {
  hero:      ["1588872657578-7efd1f1555ed", "흰 책상 위에 놓인 윈도우 노트북"],
  diag:      ["1624571395775-253d9666612b", "무릎 위에서 윈도우 11 노트북을 쓰는 사람"],
  guideArt:  ["1721333084500-901c456ac225", "뒷판을 연 노트북 내부와 M.2 SSD"],
  support:   ["1593642634315-48f5414c3ad9", "노트북으로 상담하는 사람"],
  ssd:       ["1677086586945-ef95ab632232", "흰 바닥 위 M.2 SSD"],
  step: {
    backup:  ["1721333084639-0f64b0583875", "책상 위 외장 저장장치"],
    power:   ["1636015856875-00ce4b89433d", "노트북에 연결된 충전기"],
    screws:  ["1721333089351-353c85f2b34a", "드라이버로 노트북 나사를 푸는 손"],
    pry:     ["1750163565002-9de75c19f992", "뒷판을 연 노트북 내부"],
    ssd:     ["1721333089418-faead19e3654", "노트북 안의 M.2 SSD 자리"],
    close:   ["1727132526959-c13b1f65c597", "다시 닫은 윈도우 노트북"],
    check:   ["1648197395199-e7f8d3dd0a3c", "윈도우 11 화면이 켜진 노트북"]
  }
};

// 가이드 영상 (Pexels 무료 라이선스). 실제 분해 영상을 찍으면 이 표만 바꾸면 돼요.
window.RB_VIDEO = {
  power:  "https://videos.pexels.com/video-files/4820377/4820377-sd_960_540_30fps.mp4",
  screws: "https://videos.pexels.com/video-files/13576747/13576747-sd_960_540_25fps.mp4",
  ssd:    "https://videos.pexels.com/video-files/5211073/5211073-sd_960_540_30fps.mp4",
  close:  "https://videos.pexels.com/video-files/856232/856232-sd_960_540_30fps.mp4"
};
