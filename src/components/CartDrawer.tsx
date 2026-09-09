import { AnimatePresence, motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatWon } from '../data'
import { useAppStore } from '../store/AppStore'

export function CartDrawer() {
  const { t, i18n } = useTranslation(); const english = i18n.language === 'en'
  const { cart, products, cartOpen, setCartOpen, removeFromCart, setQuantity } = useAppStore()
  const lines = cart.flatMap(item => {
    const product = products.find(p => p.id === item.productId)
    const variant = product?.variants.find(v => v.id === item.variantId)
    return product && variant ? [{ ...item, product, variant }] : []
  })
  const subtotal = lines.reduce((sum, line) => sum + line.product.price * line.quantity, 0)
  return <AnimatePresence>
    {cartOpen ? <>
      <motion.button className="drawer-backdrop" aria-label={t('common.close')} onClick={() => setCartOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} />
      <motion.aside className="cart-drawer" initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ duration: .42, ease: [0.22, 1, 0.36, 1] }}>
        <div className="drawer-head"><p>{t('nav.bag').toUpperCase()} <span>{lines.length}</span></p><button onClick={() => setCartOpen(false)}>{t('common.close').toUpperCase()} ×</button></div>
        <div className="cart-lines">
          {lines.length === 0 ? <div className="empty-cart"><span>φ</span><p>{t('cart.empty')}</p><Link to="/shop" onClick={() => setCartOpen(false)}>{t('home.shop').toUpperCase()} →</Link></div> : lines.map(line => <article className="cart-line" key={`${line.productId}-${line.variantId}`}>
            <img src={line.product.image} alt="" />
            <div><h3>{english ? line.product.name : line.product.nameKo}</h3><p>{line.variant.color} · {line.variant.size}</p><div className="qty"><button onClick={() => setQuantity(line.productId, line.variantId, line.quantity - 1)}>−</button><span>{line.quantity}</span><button onClick={() => setQuantity(line.productId, line.variantId, line.quantity + 1)}>+</button></div></div>
            <div className="line-price"><b>{formatWon(line.product.price * line.quantity)}</b><button onClick={() => removeFromCart(line.productId, line.variantId)}>{t('cart.remove').toUpperCase()}</button></div>
          </article>)}
        </div>
        {lines.length ? <div className="cart-summary"><div><span>{t('cart.subtotal').toUpperCase()}</span><strong>{formatWon(subtotal)}</strong></div><p>{t('cart.shipping')}</p><Link to="/checkout" className="ink-button" onClick={() => setCartOpen(false)}>{t('cart.checkout').toUpperCase()}</Link></div> : null}
      </motion.aside>
    </> : null}
  </AnimatePresence>
}
