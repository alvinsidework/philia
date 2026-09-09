import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../../auth/AuthProvider'
import { supabase } from '../../lib/supabase'

type AppRole = 'customer' | 'staff' | 'admin'
type UserRow = { id: string; email: string | null; display_name: string | null; role: AppRole; created_at: string }
type GrantRow = { email: string; role: 'staff' | 'admin'; created_at: string }

export function UserManagement() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [users, setUsers] = useState<UserRow[]>([])
  const [grants, setGrants] = useState<GrantRow[]>([])
  const [email, setEmail] = useState('')
  const [grantRole, setGrantRole] = useState<'staff' | 'admin'>('admin')
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState('')
  const [message, setMessage] = useState('')

  const load = useCallback(async () => {
    if (!supabase) return
    setLoading(true)
    const [usersResult, grantsResult] = await Promise.all([
      supabase.from('profiles').select('id,email,display_name,role,created_at').order('created_at', { ascending: false }),
      supabase.from('role_grants').select('email,role,created_at').order('created_at', { ascending: false }),
    ])
    if (usersResult.error || grantsResult.error) setMessage(usersResult.error?.message ?? grantsResult.error?.message ?? '')
    setUsers((usersResult.data ?? []) as UserRow[])
    setGrants((grantsResult.data ?? []) as GrantRow[])
    setLoading(false)
  }, [])

  useEffect(() => { void load() }, [load])

  const registeredEmails = useMemo(() => new Set(users.map(item => item.email?.toLowerCase()).filter(Boolean)), [users])
  const pending = grants.filter(grant => !registeredEmails.has(grant.email))

  const changeRole = async (target: UserRow, role: AppRole) => {
    if (!supabase || role === target.role) return
    const question = String(t('adminUsers.confirmRole', { email: target.email, role: role.toUpperCase() }))
    if (!window.confirm(question)) return
    setBusyId(target.id); setMessage('')
    const { error } = await supabase.rpc('admin_set_user_role', { target_user_id: target.id, new_role: role })
    setBusyId('')
    if (error) { setMessage(error.message); return }
    setMessage(String(t('adminUsers.updated')))
    await load()
  }

  const addGrant = async (event: FormEvent) => {
    event.preventDefault(); if (!supabase) return
    setBusyId('grant'); setMessage('')
    const { data, error } = await supabase.rpc('admin_grant_role_by_email', { target_email: email, new_role: grantRole })
    setBusyId('')
    if (error) { setMessage(error.message); return }
    const result = data as { registered: boolean }
    setMessage(String(t(result.registered ? 'adminUsers.promoted' : 'adminUsers.reserved')))
    setEmail('')
    await load()
  }

  return <div className="admin-content user-management">
    <section className="admin-section-head"><div><p>ACCESS · USER MANAGEMENT</p><h2>{t('adminUsers.title')} <span>{users.length}</span></h2><span>{t('adminUsers.description')}</span></div><span className="admin-feedback" role="status">{message}</span></section>
    <section className="admin-card role-grant-card"><div><p>GRANT BY EMAIL</p><h3>{t('adminUsers.addTitle')}</h3><span>{t('adminUsers.addDescription')}</span></div><form onSubmit={addGrant}><label>{t('account.email')}<input type="email" value={email} onChange={event => setEmail(event.target.value)} placeholder="name@address.com" required /></label><label>{t('adminUsers.role')}<select value={grantRole} onChange={event => setGrantRole(event.target.value as 'staff' | 'admin')}><option value="admin">ADMIN</option><option value="staff">STAFF</option></select></label><button className="ink-button" disabled={busyId === 'grant'}>{busyId === 'grant' ? t('common.loading') : t('adminUsers.add')}</button></form></section>
    {pending.length ? <section className="pending-grants"><p>{t('adminUsers.pending')}</p>{pending.map(grant => <span key={grant.email}>{grant.email}<b>{grant.role.toUpperCase()}</b></span>)}</section> : null}
    <section className="admin-table users-table"><div className="table-head"><span>{t('adminUsers.member')}</span><span>{t('adminUsers.joined')}</span><span>{t('adminUsers.role')}</span></div>{loading ? <p className="user-loading">{t('common.loading')}</p> : users.map(row => <div className="table-row" key={row.id}><div><b>{row.display_name || '—'}</b><small>{row.email}</small>{row.id === user?.id ? <em>YOU</em> : null}</div><time>{new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium' }).format(new Date(row.created_at))}</time><select aria-label={`${row.email} ${t('adminUsers.role')}`} value={row.role} disabled={busyId === row.id || row.id === user?.id} onChange={event => void changeRole(row, event.target.value as AppRole)}><option value="customer">CUSTOMER</option><option value="staff">STAFF</option><option value="admin">ADMIN</option></select></div>)}</section>
  </div>
}
