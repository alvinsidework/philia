import { motion } from 'motion/react'
import { CartDrawer } from '../components/CartDrawer'
import { Header } from '../components/Header'
import { useSitePage, type SitePage } from '../hooks/useSitePage'

const fallback: SitePage = {
  id: 'landing',
  slug: 'landing',
  eyebrow_ko: '',
  eyebrow_en: '',
  title_ko: '',
  title_en: '',
  body_ko: '',
  body_en: '',
  secondary_ko: '',
  secondary_en: '',
  image_url: '/images/hero.jpg',
  published: true,
}

export function Landing() {
  const page = useSitePage('landing', fallback)

  return <div className="landing-page">
    <Header variant="landing" />
    <main className="landing-visual">
      <motion.img
        src={page.image_url ?? fallback.image_url ?? '/images/hero.jpg'}
        alt="PHILIA"
        loading="eager"
        fetchPriority="high"
        initial={{ opacity: 0, scale: 1.015 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </main>
    <CartDrawer />
  </div>
}
