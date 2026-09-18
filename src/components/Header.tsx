import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/AppStore'
import { useAuth } from '../auth/AuthProvider'
import { setLanguage } from '../i18n'
import { Brand } from './Brand'
import { SearchOverlay } from './SearchOverlay'

export function Header({ variant = 'default' }: { variant?: 'default' | 'landing' }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [utilityOpen, setUtilityOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const { cart, setCartOpen } = useAppStore()
  const { user, profile, signOut } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const logout = async () => { await signOut(); setUtilityOpen(false); navigate('/') }
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const closeUtility = () => setUtilityOpen(false)
  return <>
    <header className={`site-header ${variant === 'landing' ? 'landing-header' : ''}`}>
      <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기"><i /><i /></button>
      <Brand />
      <nav className="main-nav" aria-label="주요 메뉴">
        <NavLink to="/shop">Shop</NavLink>
        <NavLink to="/the-edit">The Edit</NavLink>
        <NavLink to="/about">About</NavLink>
        <button onClick={() => setSearchOpen(true)}>Search</button>
      </nav>
      <div className="header-actions">
        <button className="language-switch" onClick={() => void setLanguage(i18n.language === 'ko' ? 'en' : 'ko')}>{i18n.language === 'ko' ? 'EN' : 'KO'}</button>
        {user ? <button className="session-action" onClick={logout}>{t('nav.logout').toUpperCase()}</button> : <Link to="/account">{t('nav.login').toUpperCase()}</Link>}
        <button className={`utility-trigger ${utilityOpen ? 'open' : ''}`} onClick={() => setUtilityOpen(value => !value)} aria-label="계정 메뉴" aria-expanded={utilityOpen}><i /><i /><i /></button>
        <button onClick={() => setCartOpen(true)}>{t('nav.bag').toUpperCase()} ({count})</button>
        <AnimatePresence>{utilityOpen ? <motion.div className="utility-dropdown" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          <header><span>{user ? 'MEMBER · 회원' : 'PHILIA MENU'}</span>{user ? <strong>{profile?.display_name || user.email?.split('@')[0]}</strong> : <strong>For what stays.</strong>}</header>
          <nav>
            {user ? <>
              <Link to="/account" onClick={closeUtility}><span>01</span>{t('nav.account')} <em>PROFILE →</em></Link>
              <Link to="/account?tab=orders" onClick={closeUtility}><span>02</span>{t('nav.orders')} <em>ORDERS →</em></Link>
              <Link to="/account?tab=points" onClick={closeUtility}><span>03</span>{t('nav.points')} <em>POINTS →</em></Link>
              <Link to="/account?tab=reviews" onClick={closeUtility}><span>04</span>{t('nav.reviews')} <em>REVIEWS →</em></Link>
              <Link to="/account?tab=inquiries" onClick={closeUtility}><span>05</span>{t('nav.inquiries')} <em>Q&amp;A →</em></Link>
            </> : <Link to="/account" onClick={closeUtility}><span>01</span>{t('nav.login')} <em>LOGIN →</em></Link>}
            <Link to="/mending" onClick={closeUtility}><span>06</span>{t('nav.mending')} <em>CARE →</em></Link>
            <Link to="/community?view=qna" onClick={closeUtility}><span>07</span>{t('nav.inquiries')} <em>ASK →</em></Link>
            <Link to="/community?view=notice" onClick={closeUtility}><span>08</span>{t('nav.notice')} <em>NOTICE →</em></Link>
            {profile?.role === 'admin' || profile?.role === 'staff' ? <Link to="/admin" onClick={closeUtility}><span>09</span>{t('nav.admin')} <em>ADMIN →</em></Link> : null}
          </nav>
          {user ? <button className="dropdown-logout" onClick={logout}>LOGOUT — {t('nav.logout')}</button> : null}
        </motion.div> : null}</AnimatePresence>
      </div>
    </header>
    <AnimatePresence>{searchOpen ? <SearchOverlay onClose={closeSearch} /> : null}</AnimatePresence>
    <AnimatePresence>
      {menuOpen ? <motion.div className="mobile-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mobile-menu-head"><Brand light /><button onClick={() => setMenuOpen(false)}>CLOSE ×</button></div>
        <nav>
          <Link to="/shop" onClick={() => setMenuOpen(false)}><span>01</span> Shop <em>{t('nav.shop')}</em></Link>
          <Link to="/the-edit" onClick={() => setMenuOpen(false)}><span>02</span> The Edit <em>{t('nav.find')}</em></Link>
          <Link to="/about" onClick={() => setMenuOpen(false)}><span>03</span> About <em>PHILIA</em></Link>
          <button onClick={() => { setMenuOpen(false); setSearchOpen(true) }}><span>04</span> Search <em>제품 검색</em></button>
          <Link to="/account" onClick={() => setMenuOpen(false)}><span>05</span> Account <em>{t('nav.account')}</em></Link>
        </nav>
        <p>PHILIA · For what stays.<br />따뜻한 사랑처럼, 오래 머무르는 옷.</p>
      </motion.div> : null}
    </AnimatePresence>
  </>
}
