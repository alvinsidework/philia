import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Brand } from './Brand'

export function Footer() {
  const { t } = useTranslation()
  return <footer className="site-footer">
    <div className="footer-index"><p>COLLECTION 1</p><Link to="/shop">{t('nav.shop')}</Link><Link to="/shop/work-jacket">Work Jacket</Link><Link to="/shop/field-jacket">Field Jacket</Link><Link to="/shop/bag">Bag</Link></div>
    <div><p>HOUSE</p><Link to="/the-edit">THE EDIT</Link><Link to="/about">ABOUT PHILIA</Link><Link to="/mending">{t('nav.mending')}</Link></div>
    <div><p>CARE</p><Link to="/shop">{t('footer.fit')}</Link><Link to="/refund-policy">{t('footer.shipping')}</Link><Link to="/refund-policy">{t('footer.returns')}</Link></div>
    <div className="newsletter"><p>SIX LETTERS A YEAR</p><span>{t('footer.newsletter')}</span><form onSubmit={e => e.preventDefault()}><input aria-label="email" placeholder="name@address.com" type="email" /><button>{t('footer.join').toUpperCase()} →</button></form></div>
    <div className="footer-business"><p>PHILIA · BUSINESS INFORMATION</p><div><span>{t('legal.business')}: 필리아</span><span>{t('legal.representative')}: 손제현</span><span>{t('legal.registration')}: 808-06-03761</span><span>{t('legal.businessType')}: {t('legal.businessTypeValue')}</span><span>{t('legal.hosting')}: Vercel Inc.</span></div><address>{t('legal.address')}: {t('legal.addressValue')}</address><a href="mailto:alvinhan1707@gmail.com">{t('legal.contact')}: alvinhan1707@gmail.com</a></div>
    <div className="footer-bottom"><Brand light /><span>SEOUL · MMXXVI</span><nav aria-label={String(t('legal.links'))}><Link to="/privacy-policy">{t('legal.privacy')}</Link><Link to="/refund-policy">{t('legal.refund')}</Link><Link to="/admin">ADMIN</Link></nav></div>
  </footer>
}
