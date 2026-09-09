import { Link } from 'react-router-dom'

export function Seal({ light = false }: { light?: boolean }) {
  return <span className={`seal ${light ? 'seal-light' : ''}`} aria-hidden="true"><span>φ</span></span>
}

export function Brand({ light = false }: { light?: boolean }) {
  return <Link to="/" className={`brand ${light ? 'brand-light' : ''}`} aria-label="PHILIA 홈"><Seal light={light} /><span>PHILIA</span></Link>
}
