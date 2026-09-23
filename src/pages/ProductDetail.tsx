import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom'
import { formatWon } from '../data'
import { useAppStore } from '../store/AppStore'

type DetailSection = 'details' | 'size' | 'shipping' | 'care'

const parseSizeGuide = (value: string) => {
  const [tableBlock = '', ...noteBlocks] = value.trim().split(/\n\s*\n/)
  const tableLines = tableBlock.split('\n').map(line => line.split(/\t|\s*\|\s*/).map(cell => cell.trim())).filter(row => row.some(Boolean))
  return { headers: tableLines[0] ?? [], rows: tableLines.slice(1), notes: noteBlocks.join('\n\n').trim() }
}

function TextContent({ value }: { value: string }) {
  return <div className="product-rich-text">{value.split(/\n\s*\n/).filter(Boolean).map((block, index) => <p key={`${block.slice(0, 24)}-${index}`}>{block}</p>)}</div>
}

function SizeGuide({ value }: { value: string }) {
  const guide = parseSizeGuide(value)
  return <div className="size-guide-content">
    {guide.headers.length ? <div className="size-guide-table-wrap"><table><thead><tr>{guide.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{guide.rows.map((row, rowIndex) => <tr key={`${row.join('-')}-${rowIndex}`}>{guide.headers.map((_, cellIndex) => <td key={`${rowIndex}-${cellIndex}`}>{row[cellIndex] ?? ''}</td>)}</tr>)}</tbody></table></div> : null}
    {guide.notes ? <TextContent value={guide.notes} /> : null}
  </div>
}

export function ProductDetail() {
  const { t, i18n } = useTranslation()
  const english = i18n.language === 'en'
  const { slug } = useParams()
  const navigate = useNavigate()
  const { products, productsLoading, addToCart, setCartOpen } = useAppStore()
  const product = products.find(item => item.slug === slug)
  const galleryRef = useRef<HTMLDivElement>(null)
  const dragRef = useRef({ active: false, startY: 0, startTop: 0 })
  const [dragging, setDragging] = useState(false)
  const [color, setColor] = useState(product?.variants[0]?.color ?? '')
  const availableSizes = useMemo(() => product?.variants.filter(v => v.color === color) ?? [], [product, color])
  const [variantId, setVariantId] = useState(product?.variants[0]?.id ?? '')
  const [quantity, setQuantity] = useState(1)
  const [open, setOpen] = useState<DetailSection | ''>('details')

  useEffect(() => {
    const first = product?.variants.find(item => item.stock > 0) ?? product?.variants[0]
    if (!first) return
    setColor(first.color)
    setVariantId(first.id)
    setQuantity(1)
  }, [product?.id])

  if (productsLoading) return <main className="catalogue-loading">LOADING PIECE…</main>
  if (!product || product.status === 'draft' || product.status === 'archived') return <Navigate to="/shop" replace />

  const images = product.images.length ? product.images : [product.image]
  const related = products.filter(item => item.id !== product.id && item.status === 'active').slice(0, 4)
  const colors = product.variants.filter((variant, index, list) => list.findIndex(v => v.color === variant.color) === index)
  const selectedVariant = product.variants.find(item => item.id === variantId)
  const maxQuantity = Math.max(1, selectedVariant?.stock ?? 1)
  const content = {
    details: english ? product.detailsEn : product.detailsKo,
    size: english ? product.sizeGuideEn : product.sizeGuideKo,
    shipping: english ? product.shippingEn : product.shippingKo,
    care: english ? product.careEn : product.careKo,
  }
  const labels = english
    ? { details: 'Details', shipping: 'Shipping', gallery: 'Product gallery', image: 'Image', buyNow: 'Buy now' }
    : { details: '디테일', shipping: '배송', gallery: '상품 이미지', image: '이미지', buyNow: '바로 구매' }
  const sections: { key: DetailSection; label: string }[] = [
    { key: 'details', label: labels.details.toUpperCase() },
    { key: 'size', label: t('product.sizeGuide').toUpperCase() },
    { key: 'shipping', label: labels.shipping.toUpperCase() },
    { key: 'care', label: t('product.care').toUpperCase() },
  ]

  const selectColor = (next: string) => {
    setColor(next)
    const variants = product.variants.filter(v => v.color === next)
    const first = variants.find(v => v.stock > 0) ?? variants[0]
    if (first) setVariantId(first.id)
    setQuantity(1)
  }
  const add = () => addToCart(product.id, variantId, quantity)
  const buyNow = () => {
    addToCart(product.id, variantId, quantity)
    setCartOpen(false)
    navigate('/checkout')
  }
  const startDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.pointerType !== 'mouse' || event.button !== 0 || (event.target as HTMLElement).closest('button')) return
    dragRef.current = { active: true, startY: event.clientY, startTop: event.currentTarget.scrollTop }
    event.currentTarget.setPointerCapture(event.pointerId)
    setDragging(true)
  }
  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    event.currentTarget.scrollTop = dragRef.current.startTop - (event.clientY - dragRef.current.startY)
  }
  const endDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return
    dragRef.current.active = false
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
    setDragging(false)
  }
  const scrollToImage = (index: number) => {
    const gallery = galleryRef.current
    const figure = gallery?.querySelector<HTMLElement>(`[data-gallery-index="${index}"]`)
    if (gallery && figure) gallery.scrollTo({ top: figure.offsetTop, behavior: 'smooth' })
  }

  return <main className="piece-page">
    <div className="breadcrumbs">COLLECTION 1 <i>/</i> SHOP <i>/</i> PIECE {String(product.piece).padStart(2, '0')} · {product.name.toUpperCase()}</div>
    <section className="piece-main">
      <div ref={galleryRef} className={`piece-gallery ${dragging ? 'dragging' : ''}`} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={endDrag} onPointerCancel={endDrag}>
        <div className="piece-gallery-images">{images.map((image, index) => <figure data-gallery-index={index} key={`${image}-${index}`}><img src={image} alt={index === 0 ? (english ? product.name : product.nameKo) : `${english ? product.name : product.nameKo} detail ${index + 1}`} loading={index < 2 ? 'eager' : 'lazy'} draggable={false} /></figure>)}</div>
        {images.length > 1 ? <nav className="piece-thumbnails" aria-label={labels.gallery}>{images.map((image, index) => <button type="button" onClick={() => scrollToImage(index)} key={`${image}-thumb`} aria-label={`${labels.image} ${index + 1}`}><img src={image} alt="" draggable={false} /></button>)}</nav> : null}
      </div>
      <div className="piece-info">
        <div className="piece-label"><span>PIECE {String(product.piece).padStart(2, '0')} · {product.layer}</span><span>UNISEX · {new Set(product.variants.map(v => v.size)).size > 1 ? '1—2' : 'ONE'}</span></div>
        <h1>{english ? product.name : product.nameKo}</h1><p className="piece-ko">{english ? product.nameKo : product.name} — {color}</p>
        <div className="piece-price"><strong>{formatWon(product.price)}</strong><span>{t('product.vat').toUpperCase()} · {t('product.mended').toUpperCase()}</span></div>
        <p className="piece-copy">{english ? product.shortDescription : product.description}</p>
        <div className="choice"><label>{t('product.color').toUpperCase()} · {colors.length}</label><div className="swatches">{colors.map(item => <button type="button" className={color === item.color ? 'selected' : ''} key={item.color} onClick={() => selectColor(item.color)}><i style={{ background: item.colorHex }} /><span>{item.color}</span></button>)}</div></div>
        <div className="choice size-choice"><label>{t('product.size').toUpperCase()} · UNISEX 1—2 <button type="button" onClick={() => setOpen('size')}>{t('product.sizeGuide').toUpperCase()} →</button></label><div>{availableSizes.map(item => <button type="button" className={variantId === item.id ? 'selected' : ''} key={item.id} onClick={() => { setVariantId(item.id); setQuantity(1) }} disabled={item.stock === 0}>{item.size}<small>{item.stock < 4 ? ` ${item.stock} LEFT` : ''}</small></button>)}</div></div>
        <div className="purchase-line"><span>{english ? product.name : product.nameKo}</span><div><button type="button" onClick={() => setQuantity(value => Math.max(1, value - 1))}>−</button><b>{quantity}</b><button type="button" onClick={() => setQuantity(value => Math.min(maxQuantity, value + 1))}>+</button></div><strong>{formatWon(product.price * quantity)}</strong></div>
        <div className="purchase-actions"><button type="button" disabled={!selectedVariant || selectedVariant.stock <= 0 || product.status === 'sold_out'} onClick={add}>{product.status === 'sold_out' || selectedVariant?.stock === 0 ? 'SOLD OUT' : t('product.add').toUpperCase()}</button><button type="button" disabled={!selectedVariant || selectedVariant.stock <= 0 || product.status === 'sold_out'} onClick={buyNow}>{labels.buyNow.toUpperCase()}</button></div>
        <div className="product-accordions">{sections.map(section => <section className={`product-accordion ${open === section.key ? 'open' : ''}`} key={section.key}><button type="button" aria-expanded={open === section.key} onClick={() => setOpen(current => current === section.key ? '' : section.key)}><span>{section.label}</span><b>{open === section.key ? '−' : '+'}</b></button><div className="product-accordion-body">{section.key === 'size' ? <SizeGuide value={content.size} /> : <><TextContent value={content[section.key]} />{section.key === 'details' ? <dl className="product-specs"><div><dt>{t('product.material').toUpperCase()}</dt><dd>{product.material}</dd></div><div><dt>{t('product.color').toUpperCase()}</dt><dd>{color}</dd></div></dl> : null}</>}</div></section>)}</div>
      </div>
    </section>
    <section className="related"><header><h2>{t('product.related')}</h2><span>TWO GROUNDS, ONE ACCENT</span></header><div>{related.map(item => <Link to={`/shop/${item.slug}`} key={item.id}><img src={item.image} alt="" /><div><span>{english ? item.name : item.nameKo}</span><b>{formatWon(item.price)}</b></div></Link>)}</div></section>
  </main>
}
