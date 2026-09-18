import type { Product } from './types'

export const formatWon = (value: number) => `₩${Math.round(value).toLocaleString('ko-KR')}`

export const calculateFinance = (product: Product) => {
  const costs = product.costs
  const unitCost = costs.purchaseCost + costs.inboundShipping + costs.supplies
  const paymentFee = product.price * costs.paymentFeeRate
  const operatingProfit = product.price - unitCost - costs.outboundShipping - paymentFee - costs.advertising - costs.overhead
  const vat = product.price * costs.vatRate / (1 + costs.vatRate)
  const incomeTax = Math.max(0, (operatingProfit - vat) * costs.incomeTaxRate)
  const netProfit = operatingProfit - vat - incomeTax
  const operatingMargin = product.price ? operatingProfit / product.price : 0
  const netMargin = product.price ? netProfit / product.price : 0
  return { unitCost, paymentFee, operatingProfit, operatingMargin, vat, incomeTax, netProfit, netMargin }
}
