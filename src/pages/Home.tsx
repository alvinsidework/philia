import { motion } from 'motion/react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAppStore } from '../store/AppStore'

const details = [
  ['/images/detail-stitch.jpg', '01', 'COLLAR AND FLAPS', '스스로 서는 칼라와 두 개의 플랩 포켓. 러브 스티치는 뒷목 안쪽에 숨었습니다.'],
  ['/images/detail-placket.jpg', '02', 'THE PLACKET RUN', '네 개의 포켓과 곧게 이어지는 버튼. 마지막 바택 한 땀이 선명하게 남습니다.'],
  ['/images/detail-buckle.jpg', '03', 'FLAP AND BUCKLE', '하나의 플랩과 하나의 버클. 도장하지 않은 황동은 가죽과 함께 깊어집니다.'],
  ['/images/detail-chevron.jpg', '04', 'THE CHEVRON', '커프 위, 자기 색으로 놓인 스티치. 눈보다 손끝으로 먼저 발견됩니다.'],
]

export function Home() {
  const { t, i18n } = useTranslation()
  const { products } = useAppStore()
  return <main>
    <section className="hero">
      <motion.img src="/images/hero.jpg" alt="페이디드 인디고 워크 재킷" initial={{ scale: 1.06 }} animate={{ scale: 1 }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
      <motion.div className="hero-card" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: .22, duration: .8 }}>
        <p>{t('home.eyebrow')}</p>
        <h1>{String(t('home.title')).split('\n').map(line => <span className="title-line" key={line}>{line}</span>)}</h1>
        <span>{t('home.subtitle')}</span>
        <Link to="/shop">{t('home.shop').toUpperCase()} →</Link>
      </motion.div>
      <small>WORK JACKET · FADED INDIGO</small>
    </section>
    <section className="mobile-index">
      <p>{t('home.eyebrow')}</p><h1>{String(t('home.title')).split('\n').map(line => <span className="title-line" key={line}>{line}</span>)}</h1>
      <ol>{products.map(product => <li key={product.id}><Link to={`/shop/${product.slug}`}><span>{String(product.piece).padStart(2, '0')} {i18n.language === 'en' ? product.name : product.nameKo}</span><em>{i18n.language === 'en' ? product.nameKo : product.name} →</em></Link></li>)}</ol>
      <p className="ko-line">{t('home.subtitle')}</p>
    </section>
    <section className="find-section" id="find">
      <header><h2>{t('home.findTitle')} <em>THE FIND</em></h2><p>{t('home.findCopy')}<br />None of them on the outside.</p></header>
      <div className="detail-grid">{details.map(([image, no, title, copy]) => <motion.article key={no} whileHover={{ y: -5 }} transition={{ duration: .25 }}>
        <div className="detail-image"><img src={image} alt="" /><span>{no}</span></div><h3>{title}</h3><p>{copy}</p>
      </motion.article>)}</div>
    </section>
    <section className="mending-section" id="mending">
      <div><p>MENDING DESK · {t('nav.mending')}</p><h2>{String(t('home.mendingTitle')).split('\n').map(line => <span className="title-line" key={line}>{line}</span>)}</h2></div>
      <div><p>{t('home.mendingCopy')}</p><Link to="/mending">MENDING DESK →</Link></div>
    </section>
  </main>
}
