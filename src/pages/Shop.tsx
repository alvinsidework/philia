import { useDeferredValue, useState } from 'react'
import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { formatWon } from '../data'
import { useAppStore } from '../store/AppStore'
import type { Category } from '../types'

type Filter = 'ALL' | Category

export function Shop() {
  const { products } = useAppStore()
  const { t, i18n } = useTranslation()
  const [filter, setFilter] = useState<Filter>('ALL')
  const [sortAsc, setSortAsc] = useState(true)
  const deferredFilter = useDeferredValue(filter)
  const filtered = [...products.filter(product => deferredFilter === 'ALL' || product.category === deferredFilter)].sort((a, b) => sortAsc ? a.name.localeCompare(b.name) : b.name.localeCompare(a.name))
  const categories: Filter[] = ['ALL', 'OUTER', 'KNIT', 'BOTTOM', 'BAG']
  return <main className="shop-page">
    <div className="page-kicker">SHOP · {t('nav.shop')}</div>
    <header className="shop-heading"><div><h1>{t('shop.title')}</h1><p>{t('shop.subtitle')}</p></div><span>06 / MMXXVI</span></header>
    <div className="filter-bar"><div>{categories.map(category => <button className={filter === category ? 'active' : ''} key={category} onClick={() => setFilter(category)}>{category === 'ALL' ? t('shop.all').toUpperCase() : category} <sup>{category === 'ALL' ? products.length : products.filter(p => p.category === category).length}</sup></button>)}</div><button onClick={() => setSortAsc(value => !value)}>A—Z {sortAsc ? '↓' : '↑'}</button></div>
    <motion.div className="product-grid" layout>{filtered.map(product => <motion.article layout key={product.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Link to={`/shop/${product.slug}`} className="product-image"><img src={product.image} alt={`${product.nameKo} ${product.name}`} loading="lazy" /><span>{t('shop.view').toUpperCase()} {String(product.piece).padStart(2, '0')} →</span></Link>
      <Link to={`/shop/${product.slug}`} className="product-meta"><div><h2>{i18n.language === 'en' ? product.name : product.nameKo}</h2><p>{i18n.language === 'en' ? product.nameKo : product.name}</p></div><strong>{formatWon(product.price)}</strong></Link>
    </motion.article>)}</motion.div>
    <div className="collection-end"><span>COLLECTION 1 · SIX PIECES</span><Link to="/shop/work-jacket">{t('shop.close').toUpperCase()} →</Link></div>
  </main>
}
