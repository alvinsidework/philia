import type { Product } from './types'

const costs = (purchaseCost: number, advertising: number) => ({
  purchaseCost,
  inboundShipping: 3000,
  supplies: 2500,
  outboundShipping: 3500,
  paymentFeeRate: 0.038,
  advertising,
  overhead: 2000,
  vatRate: 0.1,
  incomeTaxRate: 0.15,
})

const variants = (slug: string, colors: [string, string][], sizes = ['1 · S—M', '2 · L—XL']) =>
  colors.flatMap(([color, colorHex], ci) => sizes.map((size, si) => ({
    id: `${slug}-${ci}-${si}`,
    color,
    colorHex,
    size,
    openingStock: 8 + ci * 3 + si * 2,
    received: ci === 0 ? 4 : 0,
    sold: 2 + si,
    stock: 10 + ci * 3 + si,
  })))

export const initialProducts: Product[] = [
  {
    id: 'p1', piece: 1, sku: 'PH26FW-OT01', slug: 'work-jacket', name: 'Work Jacket', nameKo: '워크자켓', category: 'OUTER', layer: 'LAYER 3', price: 420000,
    description: '10온스 데님을 두 번 워싱한 포켓 재킷. 가슴 품을 넉넉하게 잡아 2월에도 플리스 위에 자연스럽게 겹쳐 입을 수 있습니다.',
    shortDescription: 'Four-pocket chore jacket in twice-washed denim.', material: '10 OZ DENIM, TWICE WASHED', image: '/images/work-jacket.jpg', status: '판매중', featured: true,
    signatures: ['뒷목 안쪽의 러브 스티치', '플래킷 끝의 선명한 한 땀', '왼쪽 포켓 안쪽 테이프'], variants: variants('work', [['FADED', '#9bb1bd'], ['RAW', '#283c51'], ['ECRU', '#d8d0bf']]), costs: costs(178000, 22000),
  },
  {
    id: 'p2', piece: 2, sku: 'PH26FW-OT02', slug: 'field-jacket', name: 'Field Jacket', nameKo: '필드자켓', category: 'OUTER', layer: 'LAYER 3', price: 480000,
    description: '마른 촉감의 코튼 캔버스로 만든 네 개의 포켓 필드 재킷. 허리 드로코드와 곧은 센터 플래킷, 플리스를 덮는 긴 기장이 특징입니다.',
    shortDescription: 'Dry cotton field jacket with a straight placket.', material: 'DRY COTTON CANVAS, 8 OZ', image: '/images/field-jacket.jpg', status: '판매중', featured: false,
    signatures: ['뒷목 안쪽의 러브 스티치', '바크 체크 포켓 안감', '목 잠금의 무도장 황동'], variants: variants('field', [['NAVY', '#273746'], ['OLIVE', '#63634d'], ['KHAKI', '#a69470']]), costs: costs(210000, 26000),
  },
  {
    id: 'p3', piece: 3, sku: 'PH26FW-OT03', slug: 'leather-jacket', name: 'Leather Jacket', nameKo: '레더자켓', category: 'OUTER', layer: 'LAYER 3', price: 1180000,
    description: '매트한 몰스킨 소재의 짧은 블루종. 입을수록 생기는 흔적까지 옷의 일부가 되며, 필리아의 수선 데스크가 오래 함께합니다.',
    shortDescription: 'Short blouson in matte cotton moleskin.', material: 'COTTON MOLESKIN, UNLINED BODY', image: '/images/leather-jacket.jpg', status: '판매중', featured: false,
    signatures: ['뒷목 안쪽의 러브 스티치', '포켓 바택의 선명한 한 땀', '지퍼 풀러의 무도장 황동'], variants: variants('leather', [['STONE', '#d5d0c4'], ['COCOA', '#6c5142'], ['INK', '#1c2024']]), costs: costs(560000, 42000),
  },
  {
    id: 'p4', piece: 4, sku: 'PH26FW-KN01', slug: 'fleece', name: 'Fleece', nameKo: '후리스', category: 'KNIT', layer: 'LAYER 2', price: 290000,
    description: '깊은 파일감의 쿼터 집 플리스. 세 가지 재킷 아래에서 어깨가 당기지 않도록 간결하게 재단했습니다.',
    shortDescription: 'Quarter-zip in deep pile fleece.', material: 'DEEP PILE FLEECE, COTTON-BACKED', image: '/images/fleece.jpg', status: '판매중', featured: false,
    signatures: ['뒷목 안쪽의 러브 스티치', '왼쪽 커프의 컬러 바', '왼쪽 솔기 안쪽 테이프'], variants: variants('fleece', [['ASH', '#777875'], ['INK', '#1b1d1e'], ['TOBACCO', '#8b5e3c']]), costs: costs(112000, 18000),
  },
  {
    id: 'p5', piece: 5, sku: 'PH26FW-BT01', slug: 'trousers', name: 'Trousers', nameKo: '바지', category: 'BOTTOM', layer: 'LAYER 1', price: 240000,
    description: '원 워시 데님으로 만든 와이드 플랫 프런트 트라우저. 자연스러운 허리선과 부츠 위 한 번의 브레이크를 기준으로 설계했습니다.',
    shortDescription: 'Wide flat-front trousers in one-wash denim.', material: 'ONE-WASH DENIM, 12 OZ', image: '/images/trousers.jpg', status: '판매중', featured: false,
    signatures: ['코인 포켓의 선명한 한 땀', '바크 체크 포켓 안감', '왼쪽 포켓 안쪽 테이프'], variants: variants('trousers', [['MID INDIGO', '#536b7e'], ['INK', '#202429'], ['OLIVE', '#696b54']]), costs: costs(92000, 14000),
  },
  {
    id: 'p6', piece: 6, sku: 'PH26FW-BG01', slug: 'bag', name: 'Bag', nameKo: '가방', category: 'BAG', layer: 'ONE SIZE', price: 760000,
    description: '베지터블 태닝 가죽의 부드러운 숄더백. 구조를 덜어내 담는 것의 모양을 기억하도록 만들었습니다.',
    shortDescription: 'Soft shoulder bag in vegetable-tanned leather.', material: 'VEG-TAN LEATHER, UNLINED', image: '/images/bag.jpg', status: '판매중', featured: false,
    signatures: ['플랩 아래의 러브 스티치', '버클의 무도장 황동', '솔기 안쪽 테이프'], variants: variants('bag', [['BLACK', '#161616'], ['COCOA', '#65483b']], ['ONE']), costs: costs(350000, 32000),
  },
]

export const formatWon = (value: number) => `₩${Math.round(value).toLocaleString('ko-KR')}`

export const calculateFinance = (product: Product) => {
  const c = product.costs
  const unitCost = c.purchaseCost + c.inboundShipping + c.supplies
  const paymentFee = product.price * c.paymentFeeRate
  const operatingProfit = product.price - unitCost - c.outboundShipping - paymentFee - c.advertising - c.overhead
  const vat = product.price * c.vatRate / (1 + c.vatRate)
  const incomeTax = Math.max(0, (operatingProfit - vat) * c.incomeTaxRate)
  const netProfit = operatingProfit - vat - incomeTax
  return { unitCost, paymentFee, operatingProfit, operatingMargin: operatingProfit / product.price, vat, incomeTax, netProfit, netMargin: netProfit / product.price }
}
