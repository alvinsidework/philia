-- Do not accept transfers until the owner replaces the placeholder account.
update public.payment_settings
set active = false
where account_number = 'ADMIN에서 계좌번호를 입력하세요';
