# 테니스 클럽 랭킹

복식(2:2) 경기 결과를 입력하면 Elo 레이팅으로 자동 계산되어 누구나 웹에서 랭킹을 볼 수 있는
앱입니다. 결과 입력은 로그인 없이 누구나 할 수 있습니다.

- `/` — 랭킹 (레이팅 순 선수 목록)
- `/matches` — 경기 기록 (수정/삭제 가능)
- `/members` — 멤버 관리 (멤버 추가)
- `/record` — 경기 결과 입력 (등록된 멤버 중 4명 선택)

## 업데이트: 복식 지원 (이미 Supabase를 설정하셨다면)

`supabase/schema.sql`이 단식 → 복식 구조로 바뀌었습니다. Supabase **SQL Editor**에서 이 파일
내용을 전체 복사해서 다시 실행해주세요. 기존 경기 기록(matches 테이블)은 구조가 달라져 초기화되고
선수 레이팅도 1200으로 리셋되지만, 멤버(players) 목록 자체는 그대로 유지됩니다.

## 1. Supabase 프로젝트 만들기 (무료)

1. [supabase.com](https://supabase.com) 에서 계정을 만들고 로그인합니다.
2. "New project"로 새 프로젝트를 생성합니다 (리전은 Seoul 추천, DB 비밀번호는 아무 곳에도 안 쓰이니 아무거나 설정해도 됩니다).
3. 프로젝트가 생성되면 좌측 메뉴 **SQL Editor** 로 들어가서 "New query"를 열고,
   이 저장소의 [`supabase/schema.sql`](supabase/schema.sql) 파일 내용을 전부 붙여넣은 뒤 **Run** 을 누릅니다.
   - `players`, `matches` 테이블과 Elo 계산을 담당하는 `record_match` 함수가 생성됩니다.
4. 좌측 메뉴 **Project Settings > API** 에서 다음 두 값을 복사해둡니다.
   - `Project URL`
   - `anon public` API key

## 2. 로컬 환경변수 설정

프로젝트 루트에 `.env.local` 파일을 만들고 (`.env.local.example` 참고) 위에서 복사한 값을 넣습니다.

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## 3. 로컬 실행

```bash
npm install
npm run dev
```

[http://localhost:3000](http://localhost:3000) 에서 확인합니다. `.env.local` 이 없으면 각 페이지에
Supabase 설정 안내 메시지가 표시됩니다.

## 4. Vercel에 배포하기 (무료)

1. 이 프로젝트를 GitHub 저장소로 올립니다.
2. [vercel.com](https://vercel.com) 에서 GitHub 계정으로 로그인 후 "Add New… > Project"로 해당 저장소를 가져옵니다.
3. 환경변수 설정 화면에서 위 2단계와 동일하게
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` 를 등록합니다.
4. Deploy를 누르면 몇 분 안에 `https://프로젝트명.vercel.app` 주소로 클럽원 누구나 접속할 수 있습니다.

## 랭킹 계산 방식 (Elo, 복식)

- 모든 선수는 처음 1200점에서 시작합니다.
- 두 팀의 "평균 레이팅"으로 승리 기댓값을 계산하고, 이긴 팀 두 명은 같은 만큼 오르고 진 팀 두 명은
  같은 만큼 내려갑니다 (K=32).
- 실력 차가 큰 팀을 이기면 더 많이 오르고, 이미 압도적으로 강한 팀에게 이겨도 조금만 오릅니다.
- 레이팅 갱신과 경기 기록 저장은 데이터베이스 함수 안에서 하나의 트랜잭션으로 처리되어, 둘 중
  하나만 반영되는 상황이 생기지 않습니다.

## 경기 기록 수정 / 삭제

`/matches`에서 각 경기에 "수정"과 "삭제" 버튼이 있습니다. 어떤 경기든 수정하거나 삭제하면, 그 뒤에
있는 모든 경기를 시간순으로 처음부터 다시 재생하며 모든 선수의 레이팅을 다시 계산합니다. 그래서
예전 경기를 고치거나 지워도 랭킹이 항상 정확하게 맞습니다. 가장 최근 경기를 삭제하면 "실행 취소"
효과가 됩니다.

## 참고: 입력 권한에 대해

현재는 요청하신 대로 로그인 없이 누구나 결과를 입력할 수 있습니다. 다만 선수의 `rating`은
데이터베이스 정책(RLS)상 브라우저에서 직접 수정할 수 없고, 오직 `record_match` 함수를 통해서만
바뀌도록 막아두어 값을 임의로 바꿔치기하기는 어렵게 되어 있습니다. 나중에 특정 사람만 입력하게
하고 싶으면 말씀해주세요 — 간단한 비밀번호 게이트 정도는 쉽게 추가할 수 있습니다.
