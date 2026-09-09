import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react'
import { initialProducts } from '../data'
import type { CartItem, Product } from '../types'

type AppStoreValue = {
  products: Product[]
  cart: CartItem[]
  cartOpen: boolean
  setCartOpen: (open: boolean) => void
  addToCart: (productId: string, variantId: string) => void
  removeFromCart: (productId: string, variantId: string) => void
  setQuantity: (productId: string, variantId: string, quantity: number) => void
  clearCart: () => void
  updateProduct: (product: Product) => void
  addProduct: (product: Product) => void
  resetDemo: () => void
}

const PRODUCTS_KEY = 'philia-products-v1'
const CART_KEY = 'philia-cart-v1'

const readStored = <T,>(key: string, fallback: T): T => {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch { return fallback }
}

const AppStoreContext = createContext<AppStoreValue | null>(null)

export function AppStoreProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>(() => readStored(PRODUCTS_KEY, initialProducts))
  const [cart, setCart] = useState<CartItem[]>(() => readStored(CART_KEY, []))
  const [cartOpen, setCartOpen] = useState(false)

  const persistProducts = useCallback((next: Product[]) => {
    setProducts(next)
    localStorage.setItem(PRODUCTS_KEY, JSON.stringify(next))
  }, [])
  const persistCart = useCallback((next: CartItem[]) => {
    setCart(next)
    localStorage.setItem(CART_KEY, JSON.stringify(next))
  }, [])
  const addToCart = useCallback((productId: string, variantId: string) => {
    setCart(current => {
      const found = current.find(item => item.productId === productId && item.variantId === variantId)
      const next = found
        ? current.map(item => item === found ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { productId, variantId, quantity: 1 }]
      localStorage.setItem(CART_KEY, JSON.stringify(next))
      return next
    })
    setCartOpen(true)
  }, [])
  const removeFromCart = useCallback((productId: string, variantId: string) => {
    persistCart(cart.filter(item => item.productId !== productId || item.variantId !== variantId))
  }, [cart, persistCart])
  const setQuantity = useCallback((productId: string, variantId: string, quantity: number) => {
    persistCart(cart.map(item => item.productId === productId && item.variantId === variantId ? { ...item, quantity: Math.max(1, quantity) } : item))
  }, [cart, persistCart])
  const clearCart = useCallback(() => persistCart([]), [persistCart])
  const updateProduct = useCallback((product: Product) => persistProducts(products.map(item => item.id === product.id ? product : item)), [products, persistProducts])
  const addProduct = useCallback((product: Product) => persistProducts([...products, product]), [products, persistProducts])
  const resetDemo = useCallback(() => { persistProducts(initialProducts); persistCart([]) }, [persistCart, persistProducts])

  const value = useMemo(() => ({ products, cart, cartOpen, setCartOpen, addToCart, removeFromCart, setQuantity, clearCart, updateProduct, addProduct, resetDemo }), [products, cart, cartOpen, addToCart, removeFromCart, setQuantity, clearCart, updateProduct, addProduct, resetDemo])
  return <AppStoreContext.Provider value={value}>{children}</AppStoreContext.Provider>
}

export function useAppStore() {
  const value = useContext(AppStoreContext)
  if (!value) throw new Error('useAppStore must be used inside AppStoreProvider')
  return value
}
