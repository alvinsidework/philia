# PHILIA Store

`Phileo clothing brand UI mockup.pdf`의 시각 언어와 `PHILIA_의류브랜드_간편_손익_재고_세금계산기.xlsx`의 계산 모델을 결합한 Vite + React 의류 스토어입니다.

## 실행

```bash
npm install
npm run dev
```

- Store: `http://localhost:5173`
- Shop: `http://localhost:5173/shop`
- Office: `http://localhost:5173/admin`

Supabase 키가 없는 동안 Office는 데모 모드로 열리며, 편집 데이터는 브라우저 `localStorage`에 보존됩니다.

## Supabase 연결

```bash
cp .env.example .env.local
supabase link --project-ref bmsgqkyunhockhxgpfsv
supabase db push
```

`.env.local`에 Project URL과 anon key를 입력합니다. 최초 관리자는 `alvinhan1707@gmail.com`으로 예약되어 있습니다. 이미 가입한 경우 즉시 admin으로 승격되며, 아직 가입 전이면 해당 이메일로 가입한 순간 역할이 적용됩니다. 이후 관리자는 `/admin`의 `사용자 관리`에서 가입 회원의 역할을 바꾸거나 이메일을 미리 등록합니다. 역할 변경은 admin 전용 데이터베이스 함수에서 검증되며 자기 자신과 마지막 관리자는 강등할 수 없습니다.

마이그레이션은 다음을 포함합니다.

- 이메일 인증 기반 프로필과 `customer / staff / admin` 역할
- 상품, 이미지, 컬러, 사이즈별 variant
- 옵션별 현재 재고와 입출고 이력
- 주문과 주문 상품
- 게시물과 공개 상태
- 매입가, 배송비, 부자재, 수수료, 광고비, 판관비
- 영업이익, 부가세, 예상 종합소득세와 순이익 계산 view
- RLS 및 상품/게시물 이미지 Storage bucket

## 회원과 커뮤니티

- 로그인 성공 시 홈으로 이동하며 전역 세션에 따라 헤더가 `LOGIN / LOGOUT`으로 전환됩니다.
- `/account`에서 회원정보, 주소, 주문, 적립금, 작성 리뷰와 Q&A를 관리합니다.
- `/community?view=reviews`에서 이미지 리뷰, 도움돼요, 댓글을 사용합니다.
- `/community?view=qna`, `/community?view=notice`에서 공개 문의와 공지를 확인합니다.
- 가입 인증 메일을 숫자 OTP 방식으로 바꾸는 HTML과 적용법은 `supabase/templates/README.md`에 있습니다.

## The Find · Mending · 계좌이체

- `/find`의 한/영문 스토리는 `find_stories`에서 불러오며 Office의 `발견 · 수선` 메뉴에서 편집합니다.
- `/mending` 접수 내용과 비공개 이미지는 `mending_requests`, `mending-images`에 저장되고 같은 Office 메뉴에서 상태를 변경합니다.
- `/checkout`은 서버 RPC가 상품 가격을 다시 계산한 뒤 입금자명, 입금 기한, 계좌 스냅샷을 `bank_transfer_orders`에 보존합니다.
- Office의 `입금 관리`에서 계좌 정보와 입금 기한을 바꾸고, 입금 대기 주문을 확인 처리합니다.

Telegram 주문 알림은 배포된 `notify-bank-order` Edge Function을 사용합니다. BotFather에서 발급한 토큰과 알림을 받을 채팅 ID를 프로젝트 시크릿으로 설정하면 즉시 활성화됩니다.

```bash
supabase secrets set TELEGRAM_BOT_TOKEN="발급받은_봇_토큰" TELEGRAM_CHAT_ID="채팅_ID"
supabase functions deploy notify-bank-order --use-api
```

봇에게 먼저 `/start` 메시지를 보낸 다음 `https://api.telegram.org/bot<토큰>/getUpdates`에서 `message.chat.id`를 확인합니다. 그룹 알림이라면 봇을 그룹에 추가하고 그룹에서 메시지를 한 번 보낸 뒤 같은 방식으로 확인합니다.

## Toss Payments 테스트 결제

`/checkout`에서 Toss Payments 테스트 카드 결제를 진행할 수 있습니다. 결제 요청 전 DB의 실제 상품 가격과 재고로 주문을 다시 계산하고, 성공 리다이렉트 후 `confirm-toss-payment` Edge Function이 금액을 검증한 뒤 승인 API를 호출합니다. 승인이 완료되면 주문, 재고, 판매 수량과 재고 이력이 한 트랜잭션으로 반영됩니다.

브라우저에 노출해도 되는 테스트 클라이언트 키는 Vercel에, 비밀키는 Supabase Secrets에만 설정합니다.

```bash
# Vercel 프론트엔드 환경변수
VITE_TOSS_CLIENT_KEY=test_ck_YOUR_TOSS_TEST_CLIENT_KEY

# Supabase 서버 시크릿
supabase secrets set TOSS_SECRET_KEY="test_sk_YOUR_TOSS_TEST_SECRET_KEY"
supabase functions deploy confirm-toss-payment
```

클라이언트 키와 비밀키는 반드시 같은 가맹점의 테스트 키 쌍을 사용해야 합니다. `TOSS_SECRET_KEY`를 `.env.local`, `VITE_*`, GitHub에 넣지 않습니다.

## 언어

헤더의 `KO / EN` 버튼으로 언어를 전환하며 선택값은 브라우저에 보존됩니다. Store, The Find, Mending, 상품, 장바구니, 결제, 계정, 커뮤니티와 Office 공통 내비게이션이 같은 i18n 인스턴스를 사용합니다. The Find 콘텐츠는 DB에 한국어/영어 필드를 함께 저장합니다.

## 검증

```bash
npm run typecheck
npm run build
```
