import { Link } from 'react-router-dom'

export function Seal({ light = false, priority = false }: { light?: boolean; priority?: boolean }) {
  const theme = light ? 'light' : 'dark'
  return <picture className="seal" aria-hidden="true">
    <source srcSet={`/logos/philia-${theme}-32.webp 1x, /logos/philia-${theme}-64.webp 2x`} type="image/webp" />
    <img src={`/logos/philia-${theme}-32.png`} srcSet={`/logos/philia-${theme}-32.png 1x, /logos/philia-${theme}-64.png 2x`} width="32" height="32" alt="" loading={priority ? 'eager' : 'lazy'} fetchPriority={priority ? 'high' : 'auto'} decoding="async" />
  </picture>
}

export function Brand({ light = false, priority = false }: { light?: boolean; priority?: boolean }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="PHILIA 홈"><Seal light={light} priority={priority} /><span>PHILIA</span></Link>
}
