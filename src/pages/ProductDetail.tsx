import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'motion/react'
import { Link, Navigate, useParams } from 'react-router-dom'
import { formatWon } from '../data'
import { useAppStore } from '../store/AppStore'

export function ProductDetail() {
  const { t, i18n } = useTranslation(); const english = i18n.language === 'en'
  const { slug } = useParams()
  const { products, productsLoading, addToCart } = useAppStore()
  const product = products.find(item => item.slug === slug)
  const [color, setColor] = useState(product?.variants[0]?.color ?? '')
  const availableSizes = useMemo(() => product?.variants.filter(v => v.color === color) ?? [], [product, color])
  const [variantId, setVariantId] = useState(product?.variants[0]?.id ?? '')
  const [open, setOpen] = useState('signatures')
  useEffect(() => {
    const first = product?.variants.find(item => item.stock > 0) ?? product?.variants[0]
    if (!first) return
    setColor(first.color)
    setVariantId(first.id)
  }, [product?.id])
  if (productsLoading) return <main className="catalogue-loading">LOADING PIECE…</main>
  if (!product || product.status === 'draft' || product.status === 'archived') return <Navigate to="/shop" replace />
  const related = products.filter(item => item.id !== product.id && item.status === 'active').slice(0, 4)
  const colors = product.variants.filter((variant, index, list) => list.findIndex(v => v.color === variant.color) === index)
  const selectedVariant = product.variants.find(item => item.id === variantId)
  const selectColor = (next: string) => { setColor(next); const variants = product.variants.filter(v => v.color === next); const first = variants.find(v => v.stock > 0) ?? variants[0]; if (first) setVariantId(first.id) }
  return <main className="piece-page">
    <div className="breadcrumbs">COLLECTION 1 <i>/</i> SHOP <i>/</i> PIECE {String(product.piece).padStart(2, '0')} · {product.name.toUpperCase()}</div>
    <section className="piece-main">
      <motion.div className="piece-gallery" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: .7 }}>{(product.images.length ? product.images : [product.image]).map((image, index) => <img src={image} alt={index === 0 ? product.nameKo : `${product.nameKo} detail ${index}`} key={`${image}-${index}`} />)}</motion.div>
      <div className="piece-info">
        <div className="piece-label"><span>PIECE {String(product.piece).padStart(2, '0')} · {product.layer}</span><span>UNISEX · {new Set(product.variants.map(v => v.size)).size > 1 ? '1—2' : 'ONE'}</span></div>
        <h1>{english ? product.name : product.nameKo}</h1><p className="piece-ko">{english ? product.nameKo : product.name} — {color}</p>
        <div className="piece-price"><strong>{formatWon(product.price)}</strong><span>{t('product.vat').toUpperCase()} · {t('product.mended').toUpperCase()}</span></div>
        <p className="piece-copy">{english ? product.shortDescription : product.description}</p>
        <div className="choice"><label>{t('product.color').toUpperCase()} · {colors.length}</label><div className="swatches">{colors.map(item => <button className={color === item.color ? 'selected' : ''} key={item.color} onClick={() => selectColor(item.color)}><i style={{ background: item.colorHex }} /><span>{item.color}</span></button>)}</div></div>
        <div className="choice size-choice"><label>{t('product.size').toUpperCase()} · UNISEX 1—2 <a href="#measurements">{t('product.sizeGuide').toUpperCase()} →</a></label><div>{availableSizes.map(item => <button className={variantId === item.id ? 'selected' : ''} key={item.id} onClick={() => setVariantId(item.id)} disabled={item.stock === 0}>{item.size}<small>{item.stock < 4 ? ` ${item.stock} LEFT` : ''}</small></button>)}</div></div>
        <button className="add-button" disabled={!selectedVariant || selectedVariant.stock <= 0 || product.status === 'sold_out'} onClick={() => addToCart(product.id, variantId)}>{product.status === 'sold_out' || selectedVariant?.stock === 0 ? 'SOLD OUT' : t('product.add').toUpperCase()}</button>
        <div className="ship-note"><span>UNISEX · {t('product.shipping').toUpperCase()}</span><span>{t('product.mended').toUpperCase()}</span></div>
        {[['material', `${t('product.material').toUpperCase()} — ${product.material}`], ['signatures', t('product.signatures').toUpperCase()], ['care', t('product.care').toUpperCase()], ['measurements', `${t('product.measurements').toUpperCase()}, 1 & 2`]].map(([key, label]) => <div className={`accordion ${open === key ? 'open' : ''}`} id={key} key={key}>
          <button onClick={() => setOpen(open === key ? '' : key)}><span>{label}</span><b>{open === key ? '−' : '+'}</b></button>
          <div>{key === 'signatures' ? <ul>{product.signatures.map(item => <li key={item}>{item}</li>)}</ul> : <p>{t(`product.${key}Copy`)}</p>}</div>
        </div>)}
      </div>
    </section>
    <section className="related"><header><h2>{t('product.related')}</h2><span>TWO GROUNDS, ONE ACCENT</span></header><div>{related.map(item => <Link to={`/shop/${item.slug}`} key={item.id}><img src={item.image} alt="" /><div><span>{english ? item.name : item.nameKo}</span><b>{formatWon(item.price)}</b></div></Link>)}</div></section>
  </main>
}
