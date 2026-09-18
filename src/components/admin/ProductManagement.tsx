import { useState, type ChangeEvent, type FormEvent } from 'react'
import { formatWon } from '../../data'
import { supabase } from '../../lib/supabase'
import type { Product, Variant } from '../../types'

const statusLabel: Record<Product['status'], string> = { active: '판매중', draft: '초안', sold_out: '품절', archived: '내림' }
const emptyCosts = { purchaseCost: 0, inboundShipping: 0, supplies: 0, outboundShipping: 0, paymentFeeRate: .038, advertising: 0, overhead: 0, vatRate: .1, incomeTaxRate: .15 }

const newProduct = (piece: number): Product => ({
  id: crypto.randomUUID(), piece, sku: `PH-${String(piece).padStart(3, '0')}`, slug: `new-piece-${piece}`,
  name: 'New Piece', nameKo: '새 상품', category: 'OUTER', layer: 'LAYER 1', price: 0,
  description: '', shortDescription: '', material: '', image: '', images: [], status: 'draft', featured: false,
  signatures: [], costs: { ...emptyCosts }, variants: [{ id: crypto.randomUUID(), variantSku: `PH-${String(piece).padStart(3, '0')}-ONE`, color: 'BLACK', colorHex: '#1F1F1F', size: 'ONE', stock: 0, openingStock: 0, received: 0, sold: 0 }],
})

export function ProductManagement({ products, loading, error, onSave }: { products: Product[]; loading: boolean; error: string; onSave: (product: Product) => Promise<string | null> }) {
  const [query, setQuery] = useState('')
  const [editor, setEditor] = useState<Product | null>(null)
  const [message, setMessage] = useState('')
  const filtered = products.filter(product => `${product.name} ${product.nameKo} ${product.sku}`.toLowerCase().includes(query.toLowerCase()))
  const saveStatus = async (product: Product, status: Product['status']) => {
    setMessage('저장 중…')
    try { await onSave({ ...product, status }); setMessage('판매 상태를 변경했습니다.') } catch (saveError) { setMessage(saveError instanceof Error ? saveError.message : '저장하지 못했습니다.') }
  }
  return <div className="admin-content">
    <section className="admin-section-head"><div><p>CATALOGUE · 상품 관리</p><h2>Live Catalogue <span>{products.length}</span></h2></div><div className="admin-head-actions"><span>{message || error}</span><button onClick={() => setEditor(newProduct(Math.max(0, ...products.map(product => product.piece)) + 1))}>+ 상품 등록</button></div></section>
    <div className="table-tools"><input value={query} onChange={event => setQuery(event.target.value)} placeholder="상품명 또는 SKU 검색" /><span>초안 → 판매중으로 바꾸면 스토어에 즉시 공개됩니다.</span></div>
    <div className="admin-table product-table"><div className="table-head"><span>상품</span><span>카테고리</span><span>옵션</span><span>재고</span><span>판매가</span><span>상태</span><span /></div>
      {loading ? <p className="admin-list-message">상품을 불러오는 중입니다…</p> : filtered.map(product => <div className="table-row" key={product.id}><div className="table-product"><img src={product.image || '/images/detail-stitch.jpg'} alt="" /><div><b>{product.name}</b><small>{product.nameKo} · {product.sku}</small></div></div><span>{product.category}</span><span>{new Set(product.variants.map(variant => variant.color)).size}색 / {new Set(product.variants.map(variant => variant.size)).size}사이즈</span><strong>{product.variants.reduce((sum, variant) => sum + variant.stock, 0)}</strong><span>{formatWon(product.price)}</span><select className={`status ${product.status}`} value={product.status} onChange={event => void saveStatus(product, event.target.value as Product['status'])}><option value="draft">초안</option><option value="active">판매중</option><option value="sold_out">품절</option><option value="archived">내림</option></select><button onClick={() => setEditor(product)}>EDIT →</button></div>)}
    </div>
    {editor ? <ProductEditor product={editor} onClose={() => setEditor(null)} onSave={async product => { await onSave(product); setEditor(null); setMessage('상품 정보를 저장했습니다.') }} /> : null}
  </div>
}

function ProductEditor({ product, onClose, onSave }: { product: Product; onClose: () => void; onSave: (product: Product) => Promise<void> }) {
  const [draft, setDraft] = useState<Product>(() => structuredClone(product))
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const updateVariant = (id: string, patch: Partial<Variant>) => setDraft(current => ({ ...current, variants: current.variants.map(variant => variant.id === id ? { ...variant, ...patch } : variant) }))
  const addVariant = () => setDraft(current => ({ ...current, variants: [...current.variants, { id: crypto.randomUUID(), variantSku: `${current.sku}-NEW-${current.variants.length + 1}`, color: 'BLACK', colorHex: '#1F1F1F', size: 'ONE', stock: 0, openingStock: 0, received: 0, sold: 0 }] }))
  const uploadImages = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? [])
    if (!files.length || !supabase) return
    setBusy(true); setMessage('이미지 업로드 중…')
    const uploaded: string[] = []
    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '-')
      const path = `${draft.id}/${crypto.randomUUID()}-${safeName}`
      const { error } = await supabase.storage.from('product-images').upload(path, file, { cacheControl: '31536000' })
      if (error) { setMessage(error.message); setBusy(false); return }
      uploaded.push(supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl)
    }
    setDraft(current => ({ ...current, images: [...current.images, ...uploaded], image: current.image || uploaded[0] || '' }))
    setMessage(`${uploaded.length}개 이미지를 업로드했습니다.`); setBusy(false)
  }
  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.images.length) { setMessage('상품 이미지를 한 장 이상 등록해 주세요.'); return }
    if (!draft.variants.length) { setMessage('색상·사이즈 옵션을 한 개 이상 등록해 주세요.'); return }
    setBusy(true); setMessage('Supabase에 저장 중…')
    try { await onSave({ ...draft, image: draft.images[0] }); } catch (saveError) { setMessage(saveError instanceof Error ? saveError.message : '저장하지 못했습니다.'); setBusy(false) }
  }
  return <div className="editor-layer"><button className="editor-backdrop" onClick={onClose} aria-label="닫기" /><aside className="product-editor"><header><div><p>PRODUCT EDITOR · LIVE</p><h2>{draft.name}</h2></div><button onClick={onClose}>CLOSE ×</button></header><form onSubmit={submit}>
    <section className="product-image-editor"><div>{draft.images.length ? draft.images.map((image, index) => <figure key={`${image}-${index}`}><img src={image} alt="" /><button type="button" onClick={() => setDraft(current => ({ ...current, images: current.images.filter((_, imageIndex) => imageIndex !== index) }))}>REMOVE</button></figure>) : <p>NO IMAGE</p>}</div><label>+ 이미지 업로드<input type="file" accept="image/*" multiple onChange={uploadImages} disabled={busy} /></label></section>
    <div className="form-two"><label>영문 상품명<input value={draft.name} onChange={event => setDraft({ ...draft, name: event.target.value })} required /></label><label>한글 상품명<input value={draft.nameKo} onChange={event => setDraft({ ...draft, nameKo: event.target.value })} required /></label><label>SKU<input value={draft.sku} onChange={event => setDraft({ ...draft, sku: event.target.value })} required /></label><label>URL SLUG<input value={draft.slug} onChange={event => setDraft({ ...draft, slug: event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} required /></label><label>판매가<input type="number" min="0" value={draft.price} onChange={event => setDraft({ ...draft, price: Number(event.target.value) })} /></label><label>상품 번호<input type="number" min="1" value={draft.piece} onChange={event => setDraft({ ...draft, piece: Number(event.target.value) })} /></label><label>카테고리<select value={draft.category} onChange={event => setDraft({ ...draft, category: event.target.value as Product['category'] })}><option>OUTER</option><option>KNIT</option><option>BOTTOM</option><option>BAG</option></select></label><label>상태<select value={draft.status} onChange={event => setDraft({ ...draft, status: event.target.value as Product['status'] })}><option value="draft">초안</option><option value="active">판매중</option><option value="sold_out">품절</option><option value="archived">내림</option></select></label><label>레이어 표기<input value={draft.layer} onChange={event => setDraft({ ...draft, layer: event.target.value })} placeholder="LAYER 1" /></label><label className="editor-check"><input type="checkbox" checked={draft.featured} onChange={event => setDraft({ ...draft, featured: event.target.checked })} /> 메인 추천 상품</label></div>
    <label>한국어 상품 설명<textarea value={draft.description} onChange={event => setDraft({ ...draft, description: event.target.value })} /></label><label>English description<textarea value={draft.shortDescription} onChange={event => setDraft({ ...draft, shortDescription: event.target.value })} /></label><label>소재<input value={draft.material} onChange={event => setDraft({ ...draft, material: event.target.value })} /></label><label>시그니처 디테일 · 줄바꿈으로 구분<textarea value={draft.signatures.join('\n')} onChange={event => setDraft({ ...draft, signatures: event.target.value.split('\n').filter(Boolean) })} /></label>
    <section className="option-editor"><header><h3>색상 · 사이즈 옵션</h3><button type="button" onClick={addVariant}>+ 옵션 추가</button></header><div className="variant-editor-head"><span>컬러</span><span>HEX</span><span>사이즈</span><span>옵션 SKU</span><span>재고</span><span /></div>{draft.variants.map(variant => <div className="variant-editor-row" key={variant.id}><input value={variant.color} onChange={event => updateVariant(variant.id, { color: event.target.value.toUpperCase() })} /><input type="color" value={variant.colorHex} onChange={event => updateVariant(variant.id, { colorHex: event.target.value.toUpperCase() })} /><input value={variant.size} onChange={event => updateVariant(variant.id, { size: event.target.value })} /><input value={variant.variantSku} onChange={event => updateVariant(variant.id, { variantSku: event.target.value })} /><input type="number" min="0" value={variant.stock} onChange={event => updateVariant(variant.id, { stock: Number(event.target.value) })} /><button type="button" onClick={() => setDraft(current => ({ ...current, variants: current.variants.filter(item => item.id !== variant.id) }))}>×</button></div>)}</section>
    <div className="editor-save"><span>{message}</span><button type="button" onClick={onClose}>취소</button><button className="ink-button" disabled={busy}>{busy ? '저장 중…' : `변경사항 저장 · ${statusLabel[draft.status]}`}</button></div>
  </form></aside></div>
}
