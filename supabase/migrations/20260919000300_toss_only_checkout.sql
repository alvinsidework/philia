-- Retire new bank-transfer checkout while preserving historical transfer orders.
drop function if exists public.create_bank_transfer_order(text,jsonb,jsonb);

update public.payment_settings
set active = false, updated_at = now()
where active;
