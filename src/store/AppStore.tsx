import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { CartItem, CostProfile, Product, Variant } from '../types'

type ProductImageRow = { storage_path: string; sort_order: number }
type VariantRow = { id: string; size: string; variant_sku: string; stock: number; opening_stock?: number; received?: number; sold?: number; active: boolean }
type ColorRow = { id: string; name: string; hex: string; sort_order: number; product_variants: VariantRow[] }
type CostsRow = { purchase_cost: number; inbound_shipping: number; supplies: number; outbound_shipping: number; payment_fee_rate: number; advertising: number; overhead: number; vat_rate: number; income_tax_rate: number }
type CatalogueRow = {
  id: string; piece_no: number; sku: string; slug: string; name_en: string; name_ko: string
  category: Product['category']; layer_label: string | null; price: number; description_ko: string | null
  short_description_en: string | null; material: string | null; status: Product['status']; featured: boolean
  sort_order: number; signatures: string[] | null; product_images: ProductImageRow[]; product_colors: ColorRow[]
  product_costs: CostsRow | CostsRow[] | null
}

type AppStoreValue = {
  products: Product[]
  productsLoading: boolean
  productsError: string
  cart: CartItem[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (productId: string, variantId: string) => void
  removeFromCart: (productId: string, variantId: string) => void
  setQuantity: (productId: string, variantId: string, quantity: number) => void
  clearCart: () => void
  saveProduct: (product: Product) => Promise<string | null>
  adjustInventory: (variantId: string, delta: number) => Promise<boolean>
  refreshProducts: () => Promise<void>
}

const CART_KEY = 'philia-cart-v1'
const emptyCosts: CostProfile = { purchaseCost: 0, inboundShipping: 0, supplies: 0, outboundShipping: 0, paymentFeeRate: .038, advertising: 0, overhead: 0, vatRate: .1, incomeTaxRate: .15 }

const readCart = (): CartItem[] => {
  try { return JSON.parse(localStorage.getItem(CART_KEY) ?? '[]') as CartItem[] } catch { return [] }
}

const publicImageUrl = (path: string) => {
  if (!path || path.startsWith('/') || /^https?:\/\//.test(path) || !supabase) return path
  return supabase.storage.from('product-images').getPublicUrl(path).data.publicUrl
}

const mapProduct = (row: CatalogueRow): Product => {
  const images = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order).map(item => publicImageUrl(item.storage_path))
  const variants: Variant[] = [...(row.product_colors ?? [])].sort((a, b) => a.sort_order - b.sort_order).flatMap(color =>
    (color.product_variants ?? []).filter(variant => variant.active).map(variant => ({
      id: variant.id, variantSku: variant.variant_sku, color: color.name, colorHex: color.hex, size: variant.size,
      stock: variant.stock, openingStock: variant.opening_stock ?? variant.stock, received: variant.received ?? 0, sold: variant.sold ?? 0,
    })),
  )
  const rawCosts = Array.isArray(row.product_costs) ? row.product_costs[0] : row.product_costs
  const costs = rawCosts ? {
    purchaseCost: rawCosts.purchase_cost, inboundShipping: rawCosts.inbound_shipping, supplies: rawCosts.supplies,
    outboundShipping: rawCosts.outbound_shipping, paymentFeeRate: Number(rawCosts.payment_fee_rate), advertising: rawCosts.advertising,
    overhead: rawCosts.overhead, vatRate: Number(rawCosts.vat_rate), incomeTaxRate: Number(rawCosts.income_tax_rate),
  } : emptyCosts
  return {
    id: row.id, piece: row.piece_no, sku: row.sku, slug: row.slug, name: row.name_en, nameKo: row.name_ko,
    category: row.category, layer: row.layer_label ?? '', price: row.price, description: row.description_ko ?? '',
    shortDescription: row.short_description_en ?? '', material: row.material ?? '', image: images[0] ?? `/images/${row.slug}.jpg`, images: images.length ? images : [`/images/${row.slug}.jpg`],
    status: row.status, featured: row.featured, signatures: row.signatures ?? [], variants, costs,
  }
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [cart, setCart] = useState<CartItem[]>(readCart)
  const [cartOpen, setCartOpen] = useState(false)

  const refreshProducts = useCallback(async () => {
    if (!supabase) { setProducts([]); setProductsError('Supabase가 연결되지 않았습니다.'); setProductsLoading(false); return }
    setProductsLoading(true)
    let result = await supabase.from('products').select(`
      id,piece_no,sku,slug,name_en,name_ko,category,layer_label,price,description_ko,short_description_en,
      material,status,featured,sort_order,signatures,
      product_images(storage_path,sort_order),
      product_colors(id,name,hex,sort_order,product_variants(id,size,variant_sku,stock,opening_stock,received,sold,active)),
      product_costs(purchase_cost,inbound_shipping,supplies,outbound_shipping,payment_fee_rate,advertising,overhead,vat_rate,income_tax_rate)
    `).order('sort_order')
    if (result.error?.message.includes('opening_stock')) {
      result = await supabase.from('products').select(`
        id,piece_no,sku,slug,name_en,name_ko,category,layer_label,price,description_ko,short_description_en,
        material,status,featured,sort_order,signatures,
        product_images(storage_path,sort_order),
        product_colors(id,name,hex,sort_order,product_variants(id,size,variant_sku,stock,active)),
        product_costs(purchase_cost,inbound_shipping,supplies,outbound_shipping,payment_fee_rate,advertising,overhead,vat_rate,income_tax_rate)
      `).order('sort_order')
    }
    const { data, error } = result
    if (error) { setProductsError(error.message); setProducts([]) } else { setProducts((data as unknown as CatalogueRow[]).map(mapProduct)); setProductsError('') }
    setProductsLoading(false)
  }, [])

  useEffect(() => {
    void refreshProducts()
    if (!supabase) return
    const client = supabase
    const { data } = client.auth.onAuthStateChange(() => { void refreshProducts() })
    return () => data.subscription.unsubscribe()
  }, [refreshProducts])

  const persistCart = useCallback((updater: (current: CartItem[]) => CartItem[]) => {
    setCart(current => { const next = updater(current); localStorage.setItem(CART_KEY, JSON.stringify(next)); return next })
  }, [])
  const addToCart = useCallback((productId: string, variantId: string) => {
    const product = products.find(item => item.id === productId)
    const variant = product?.variants.find(item => item.id === variantId)
    if (!product || product.status !== 'active' || !variant || variant.stock <= 0) return
    persistCart(current => {
      const found = current.find(item => item.productId === productId && item.variantId === variantId)
      return found ? current.map(item => item === found ? { ...item, quantity: Math.min(variant.stock, item.quantity + 1) } : item) : [...current, { productId, variantId, quantity: 1 }]
    })
    setCartOpen(true)
  }, [persistCart, products])
  const removeFromCart = useCallback((productId: string, variantId: string) => persistCart(current => current.filter(item => item.productId !== productId || item.variantId !== variantId)), [persistCart])
  const setQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    const stock = products.find(item => item.id === productId)?.variants.find(item => item.id === variantId)?.stock ?? 1
    persistCart(current => current.map(item => item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.min(Math.max(1, stock), Math.max(1, quantity)) } : item))
  }, [persistCart, products])
  const clearCart = useCallback(() => persistCart(() => []), [persistCart])

  const saveProduct = useCallback(async (product: Product) => {
    if (!supabase) return null
    const payload = {
      product: {
        id: product.id, sku: product.sku, slug: product.slug, piece_no: product.piece, name_en: product.name,
        name_ko: product.nameKo, category: product.category, layer_label: product.layer, price: product.price,
        description_ko: product.description, short_description_en: product.shortDescription, material: product.material,
        status: product.status, featured: product.featured, sort_order: product.piece, signatures: product.signatures,
      },
      images: product.images.filter(Boolean).map((storage_path, sort_order) => ({ storage_path, sort_order })),
      variants: product.variants.map((variant, index) => ({
        color: variant.color, color_hex: variant.colorHex, color_order: index, size: variant.size,
        variant_sku: variant.variantSku, stock: variant.stock, opening_stock: variant.openingStock,
        received: variant.received, sold: variant.sold,
      })),
      costs: {
        purchase_cost: product.costs.purchaseCost, inbound_shipping: product.costs.inboundShipping,
        supplies: product.costs.supplies, outbound_shipping: product.costs.outboundShipping,
        payment_fee_rate: product.costs.paymentFeeRate, advertising: product.costs.advertising,
        overhead: product.costs.overhead, vat_rate: product.costs.vatRate, income_tax_rate: product.costs.incomeTaxRate,
      },
    }
    const { data, error } = await supabase.rpc('admin_save_product', { payload })
    if (error) throw error
    await refreshProducts()
    return data as string
  }, [refreshProducts])

  const adjustInventory = useCallback(async (variantId: string, delta: number) => {
    if (!supabase) return false
    const { error } = await supabase.rpc('admin_adjust_inventory', { target_variant_id: variantId, delta, movement_note: 'Office quick adjustment' })
    if (error) throw error
    await refreshProducts()
    return true
  }, [refreshProducts])

  const value = useMemo(() => ({ products, productsLoading, productsError, cart, cartOpen, setCartOpen, addToCart, removeFromCart, setQuantity, clearCart, saveProduct, adjustInventory, refreshProducts }), [products, productsLoading, productsError, cart, cartOpen, addToCart, removeFromCart, setQuantity, clearCart, saveProduct, adjustInventory, refreshProducts])
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider')
  return value
}
