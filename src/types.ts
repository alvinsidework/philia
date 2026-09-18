export type Category = 'OUTER' | 'KNIT' | 'BOTTOM' | 'BAG'

export type Variant = {
  id: string
  variantSku: string
  color: string
  colorHex: string
  size: string
  stock: number
  openingStock: number
  received: number
  sold: number
}

export type CostProfile = {
  purchaseCost: number
  inboundShipping: number
  supplies: number
  outboundShipping: number
  paymentFeeRate: number
  advertising: number
  overhead: number
  vatRate: number
  incomeTaxRate: number
}

export type Product = {
  id: string
  piece: number
  sku: string
  slug: string
  name: string
  nameKo: string
  category: Category
  layer: string
  price: number
  description: string
  shortDescription: string
  material: string
  image: string
  images: string[]
  status: 'active' | 'draft' | 'sold_out' | 'archived'
  featured: boolean
  signatures: string[]
  variants: Variant[]
  costs: CostProfile
}

export type CartItem = { productId: string; variantId: string; quantity: number }
