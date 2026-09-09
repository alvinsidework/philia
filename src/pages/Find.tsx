import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

type FindStory = { id: string; number_label: string; title_ko: string; title_en: string; body_ko: string; body_en: string; image_url: string; product_label: string | null }
const fallback: FindStory[] = [
  { id: '1', number_label: '01', title_ko: '러브 스티치', title_en: 'THE LOVE STITCH', body_ko: '뒷목 안쪽, 입는 사람에게 가장 가까운 곳에 놓인 한 땀입니다. 사랑은 보이는 곳보다 닿는 곳에 남는다고 믿습니다.', body_en: 'A single stitch at the inside back neck, closest to the wearer. Love remains where it touches, not where it shows.', image_url: '/images/detail-stitch.jpg', product_label: 'ALL PIECES' },
  { id: '2', number_label: '02', title_ko: '선명한 한 땀', title_en: 'ONE LOUD THREAD', body_ko: '차분한 옷 안에서 단 하나의 색이 목소리를 냅니다. 포켓이나 플래킷 끝에서 우연히 발견됩니다.', body_en: 'One colour speaks inside a quiet garment, discovered by chance at a pocket or the end of a placket.', image_url: '/images/detail-placket.jpg', product_label: 'JACKETS · TROUSERS' },
  { id: '3', number_label: '03', title_ko: '시간을 먹는 황동', title_en: 'UNLACQUERED BRASS', body_ko: '코팅하지 않은 황동은 손과 날씨를 기억하며 어두워집니다. 낡는 대신 함께 변합니다.', body_en: 'Unlacquered brass remembers hands and weather. It changes with you rather than simply wearing out.', image_url: '/images/detail-buckle.jpg', product_label: 'BAG · OUTER' },
  { id: '4', number_label: '04', title_ko: '안쪽의 테이프', title_en: 'THE INSIDE TAPE', body_ko: '겉에서는 보이지 않는 솔기와 포켓 안쪽까지 마감합니다. 오래 버티는 옷은 안쪽부터 다릅니다.', body_en: 'Seams and pocket bags are finished beyond view. A garment made to last begins on the inside.', image_url: '/images/detail-chevron.jpg', product_label: 'ALL PIECES' },
]

export function Find() {
  const { t, i18n } = useTranslation(); const english = i18n.language === 'en'; const [stories, setStories] = useState<FindStory[]>(fallback)
  useEffect(() => { if (!supabase) return; void supabase.from('find_stories').select('id,number_label,title_ko,title_en,body_ko,body_en,image_url,product_label').eq('published', true).order('sort_order').then(({ data }) => { if (data?.length) setStories(data as FindStory[]) }) }, [])
  return <main className="find-page"><section className="find-hero"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><p>{t('find.eyebrow')}</p><h1>{String(t('find.title')).split('\n').map(line => <span key={line}>{line}</span>)}</h1><em>{t('find.intro')}</em></motion.div><img src="/images/detail-stitch.jpg" alt="PHILIA signature detail" /></section><section className="find-manifesto"><p>{t('find.archive')}</p><h2>{t('find.stories')}</h2><span>LOVE · PATIENCE · TOUCH · TIME · CARE · REPAIR</span></section><section className="find-stories">{stories.map((story, index) => <motion.article key={story.id} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }}><div className="find-story-image"><img src={story.image_url} alt="" /><span>{story.number_label}</span></div><div><p>{story.product_label}</p><h2>{english ? story.title_en : story.title_ko}</h2><em>{english ? story.title_ko : story.title_en}</em><p className="story-body">{english ? story.body_en : story.body_ko}</p><span>{t('find.inspect')} →</span></div><b>{String(index + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</b></motion.article>)}</section></main>
}
