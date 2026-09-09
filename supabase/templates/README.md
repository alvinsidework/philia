# PHILIA Supabase 이메일 템플릿

호스팅된 Supabase 프로젝트에서는 Dashboard → Authentication → Email Templates에서 변경합니다.

## 가입 인증번호

1. `Confirm signup` 템플릿을 엽니다.
2. 제목을 `[PHILIA] 이메일 인증번호 {{ .Token }}`로 설정합니다.
3. `confirmation.html`의 전체 HTML을 붙여 넣습니다.

템플릿에 `{{ .Token }}`이 있어야 앱의 인증번호 입력 화면에서 `verifyOtp`로 검증할 수 있습니다. 링크인 `{{ .ConfirmationURL }}`로 바꾸지 마세요.

## 비밀번호 재설정

1. `Reset password` 템플릿을 엽니다.
2. 제목을 `[PHILIA] 비밀번호 재설정 인증번호 {{ .Token }}`로 설정합니다.
3. `recovery.html`의 전체 HTML을 붙여 넣습니다.

개발용 로컬 Supabase에는 `supabase/config.toml`의 template 설정이 적용됩니다. 호스팅 프로젝트는 Dashboard에서 별도로 저장해야 합니다.
