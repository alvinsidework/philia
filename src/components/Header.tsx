import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/AppStore'
import { useAuth } from '../auth/AuthProvider'
import { setLanguage } from '../i18n'
import { Brand } from './Brand'

export function Header() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [utilityOpen, setUtilityOpen] = useState(false)
  const { cart, setCartOpen } = useAppStore()
  const { user, profile, signOut } = useAuth()
  const { t, i18n } = useTranslation()
  const navigate = useNavigate()
  const count = cart.reduce((sum, item) => sum + item.quantity, 0)
  const logout = async () => { await signOut(); setUtilityOpen(false); navigate('/') }
  const closeUtility = () => setUtilityOpen(false)
  return <>
    <header className="site-header">
      <button className="menu-trigger" onClick={() => setMenuOpen(true)} aria-label="메뉴 열기">≡</button>
      <Brand priority />
      <nav className="main-nav" aria-label="주요 메뉴">
        <NavLink to="/shop">SHOP <em>{t('nav.shop')}</em></NavLink>
        <NavLink to="/find">THE FIND <em>{t('nav.find')}</em></NavLink>
        <NavLink to="/mending">MENDING <em>{t('nav.mending')}</em></NavLink>
      </nav>
      <div className="header-actions">
        <button className="language-switch" onClick={() => void setLanguage(i18n.language === 'ko' ? 'en' : 'ko')}>{i18n.language === 'ko' ? 'EN' : 'KO'}</button>
        {user ? <button className="session-action" onClick={logout}>{t('nav.logout').toUpperCase()}</button> : <Link to="/account">{t('nav.login').toUpperCase()}</Link>}
        <button className={`utility-trigger ${utilityOpen ? 'open' : ''}`} onClick={() => setUtilityOpen(value => !value)} aria-label="계정 메뉴" aria-expanded={utilityOpen}><i /><i /><i /></button>
        <button onClick={() => setCartOpen(true)}>{t('nav.bag').toUpperCase()} ({count})</button>
        <AnimatePresence>{utilityOpen ? <motion.div className="utility-dropdown" initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: .2 }}>
          <header><span>{user ? 'MEMBER · 회원' : 'PHILIA MENU'}</span>{user ? <strong>{profile?.display_name || user.email?.split('@')[0]}</strong> : <strong>Clothes that stay.</strong>}</header>
          <nav>
            {user ? <>
              <Link to="/account" onClick={closeUtility}><span>01</span>{t('nav.account')} <em>PROFILE →</em></Link>
              <Link to="/account?tab=orders" onClick={closeUtility}><span>02</span>{t('nav.orders')} <em>ORDERS →</em></Link>
              <Link to="/account?tab=points" onClick={closeUtility}><span>03</span>{t('nav.points')} <em>POINTS →</em></Link>
              <Link to="/account?tab=reviews" onClick={closeUtility}><span>04</span>{t('nav.reviews')} <em>REVIEWS →</em></Link>
              <Link to="/account?tab=inquiries" onClick={closeUtility}><span>05</span>{t('nav.inquiries')} <em>Q&amp;A →</em></Link>
            </> : <><Link to="/account" onClick={closeUtility}><span>01</span>{t('nav.login')} <em>LOGIN →</em></Link></>}
            <Link to="/community?view=reviews" onClick={closeUtility}><span>06</span>{t('nav.reviews')} <em>REVIEW →</em></Link>
            <Link to="/community?view=qna" onClick={closeUtility}><span>07</span>{t('nav.inquiries')} <em>ASK →</em></Link>
            <Link to="/community?view=notice" onClick={closeUtility}><span>08</span>{t('nav.notice')} <em>NOTICE →</em></Link>
            {profile?.role === 'admin' || profile?.role === 'staff' ? <Link to="/admin" onClick={closeUtility}><span>09</span>{t('nav.admin')} <em>ADMIN →</em></Link> : null}
          </nav>
          {user ? <button className="dropdown-logout" onClick={logout}>LOGOUT — {t('nav.logout')}</button> : null}
        </motion.div> : null}</AnimatePresence>
      </div>
    </header>
    <AnimatePresence>
      {menuOpen ? <motion.div className="mobile-menu" initial={{ x: '-100%' }} animate={{ x: 0 }} exit={{ x: '-100%' }} transition={{ duration: .38, ease: [0.22, 1, 0.36, 1] }}>
        <div className="mobile-menu-head"><Brand light /><button onClick={() => setMenuOpen(false)}>CLOSE ×</button></div>
        <nav>
          <Link to="/shop" onClick={() => setMenuOpen(false)}><span>01</span> Shop <em>{t('nav.shop')}</em></Link>
          <Link to="/find" onClick={() => setMenuOpen(false)}><span>02</span> The find <em>{t('nav.find')}</em></Link>
          <Link to="/mending" onClick={() => setMenuOpen(false)}><span>03</span> Mending <em>{t('nav.mending')}</em></Link>
          <Link to="/account" onClick={() => setMenuOpen(false)}><span>04</span> Account <em>{t('nav.account')}</em></Link>
        </nav>
        <p>ΦΙΛΊΑ · 따뜻한 사랑처럼,<br />옷장에 오래 머무는 옷.</p>
      </motion.div> : null}
    </AnimatePresence>
  </>
}
