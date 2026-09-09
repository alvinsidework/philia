import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

export type MemberProfile = {
  id: string
  email: string | null
  display_name: string | null
  phone: string | null
  role: 'customer' | 'staff' | 'admin'
  birth_date?: string | null
  postal_code?: string | null
  address_line1?: string | null
  address_line2?: string | null
  newsletter?: boolean
}

type AuthValue = {
  session: Session | null
  user: User | null
  profile: MemberProfile | null
  loading: boolean
  refreshProfile: () => Promise<void>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<MemberProfile | null>(null)
  const [loading, setLoading] = useState(true)

  const loadProfile = useCallback(async (user: User | null) => {
    if (!supabase || !user) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).maybeSingle()
    setProfile(data as MemberProfile | null)
  }, [])

  const refreshProfile = useCallback(async () => { await loadProfile(session?.user ?? null) }, [loadProfile, session?.user])

  useEffect(() => {
    if (!supabase) { setLoading(false); return }
    const client = supabase
    void client.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user ?? null)
      setLoading(false)
    })
    const { data: listener } = client.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession)
      void loadProfile(nextSession?.user ?? null)
      setLoading(false)
    })
    return () => listener.subscription.unsubscribe()
  }, [loadProfile])

  const signOut = useCallback(async () => {
    if (supabase) await supabase.auth.signOut()
    setSession(null)
    setProfile(null)
  }, [])

  const value = useMemo(() => ({ session, user: session?.user ?? null, profile, loading, refreshProfile, signOut }), [session, profile, loading, refreshProfile, signOut])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error('useAuth must be used inside AuthProvider')
  return value
}
