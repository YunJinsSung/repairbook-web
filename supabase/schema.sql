-- 리페어북 Supabase 스키마 (SQL Editor에 붙여 넣어 실행)
-- 웹사이트 assets/store.js 의 데이터 구조와 같음. 지금은 브라우저 저장소를 쓰고,
-- 이 표들을 만든 뒤 store.js 의 저장 부분을 Supabase 호출로 바꾸면 모든 방문자 데이터가 한곳에 모임.

create table laptop_models (
  id text primary key,                 -- 예: galaxy-book4-pro
  brand text not null,
  name text not null,
  codes text[] not null,               -- 모델 코드 접두어 (예: {NT940XGK,NT960XGK})
  total_slots int not null default 1,
  empty_slots int not null default 0,
  ssd_spec text,
  max_tb int default 1,
  ram text,
  difficulty int check (difficulty between 1 and 5),
  minutes int,
  verified boolean not null default false,   -- 전문가 검수 완료
  source text, warranty text, note text,
  updated_at timestamptz default now()
);
-- 판정은 저장하지 않고 계산: 빈 슬롯 1개 이상 + 검수 완료 = 가능
create view model_verdicts as
  select *, case when verified and empty_slots >= 1 then 'ok'
                 when verified and empty_slots = 0 then 'no'
                 else 'pending' end as verdict
  from laptop_models;

create table diagnoses (
  id text primary key,                 -- RB-D-YYMMDD-XXXX
  user_id uuid references auth.users(id),
  symptom text not null,               -- storage | slow | power | display | battery | damage
  model_id text references laptop_models(id),
  model_code text,
  input jsonb not null,                -- 점검 답변 (용량, 사용률 등)
  grade text check (grade in ('A','B','C')),
  reason text, next_action text,
  photo_path text,                     -- 비공개 버킷 diagnosis-photos 경로
  contact text,
  status text not null default 'review' check (status in ('review','approved')),
  created_at timestamptz default now(), approved_at timestamptz
);

create table orders (
  id text primary key,                 -- RB-YYMMDD-XXXX
  user_id uuid references auth.users(id),
  model_id text references laptop_models(id) not null,
  model_code text not null,
  diagnosis_id text references diagnoses(id) not null,   -- 결제 게이트
  kind text check (kind in ('pkg','ssd1','ssd2')),
  install_service boolean default false,
  care_plan boolean default false,
  lines jsonb not null, total int not null,
  ship_name text, ship_phone text, ship_addr text,
  status int not null default 0,       -- 0 결제 완료 … 5 장착 완료
  created_at timestamptz default now(), completed_at timestamptz
);

create table support_requests (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id),
  type text,                           -- remote | repair | remote-diag
  order_id text references orders(id), diagnosis_id text references diagnoses(id),
  model_id text, step int, message text,
  created_at timestamptz default now()
);

create table model_requests (
  key text primary key, name text, code text, count int default 1,
  created_at timestamptz default now()
);

create table interests (
  id bigint generated always as identity primary key,
  name text, email text not null, source text,
  created_at timestamptz default now()
);

create table settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null                  -- 가격·시세 기준월·카카오 채널 주소 등
);

-- 보안(RLS): 호환성 DB와 가격은 누구나 읽기, 쓰기는 운영자만
alter table laptop_models enable row level security;
alter table settings enable row level security;
alter table diagnoses enable row level security;
alter table orders enable row level security;
alter table support_requests enable row level security;
alter table model_requests enable row level security;
alter table interests enable row level security;

create policy "누구나 조회" on laptop_models for select using (true);
create policy "누구나 조회" on settings for select using (true);

-- 로그인한 고객은 본인 진단·주문·지원 요청만
create policy "내 진단" on diagnoses for select using (auth.uid() = user_id);
create policy "진단 등록" on diagnoses for insert with check (auth.uid() = user_id and status = 'review');
create policy "내 주문" on orders for select using (auth.uid() = user_id);
create policy "내 지원" on support_requests for select using (auth.uid() = user_id);
create policy "지원 등록" on support_requests for insert with check (auth.uid() = user_id);

-- 누구나 남길 수 있는 것(읽기는 운영자만)
create policy "관심 등록" on interests for insert with check (true);

-- 주문 생성·진단 승인·모델 요청 집계·운영자 쓰기는 Edge Function(비밀 키)에서 처리:
--   결제 위젯 승인 확인 → 게이트(A 판정 + 승인 + 모델 가능) 재검사 → orders insert
