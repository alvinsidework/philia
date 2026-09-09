import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { isSupabaseConfigured } from '../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export function AdminGate({ children }: { children: ReactNode }) {
  const { profile, loading } = useAuth()
  const state = !isSupabaseConfigured ? 'allowed' : loading ? 'loading' : profile?.role === 'admin' || profile?.role === 'staff' ? 'allowed' : 'denied'
  if (state === 'allowed') return children
  return <main className="admin-gate"><span>φ</span><p>{state === 'loading' ? '권한을 확인하고 있습니다…' : '관리자 계정 로그인이 필요합니다.'}</p>{state === 'denied' ? <Link to="/account">LOGIN — 로그인 →</Link> : null}</main>
}
