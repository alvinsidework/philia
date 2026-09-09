import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Brand } from './Brand'

export function Footer() {
  const { t } = useTranslation()
  return <footer className="site-footer">
    <div className="footer-index"><p>COLLECTION 1</p><Link to="/shop">{t('nav.shop')}</Link><Link to="/shop/work-jacket">Work Jacket</Link><Link to="/shop/field-jacket">Field Jacket</Link><Link to="/shop/bag">Bag</Link></div>
    <div><p>HOUSE</p><Link to="/find">{t('footer.idea')}</Link><Link to="/find">{t('footer.signatures')}</Link><Link to="/mending">{t('nav.mending')}</Link></div>
    <div><p>CARE</p><Link to="/shop">{t('footer.fit')}</Link><Link to="/community">{t('footer.shipping')}</Link><Link to="/community">{t('footer.returns')}</Link></div>
    <div className="newsletter"><p>SIX LETTERS A YEAR</p><span>{t('footer.newsletter')}</span><form onSubmit={e => e.preventDefault()}><input aria-label="email" placeholder="name@address.com" type="email" /><button>{t('footer.join').toUpperCase()} →</button></form></div>
    <div className="footer-bottom"><Brand light /><span>SEOUL · MMXXVI</span><Link to="/admin">ADMIN</Link></div>
  </footer>
}
