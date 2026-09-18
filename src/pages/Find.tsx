import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'

type FindStory = { id: string; number_label: string; title_ko: string; title_en: string; body_ko: string; body_en: string; image_url: string; product_label: string | null }

export function Find() {
  const { t, i18n } = useTranslation(); const english = i18n.language === 'en'; const [stories, setStories] = useState<FindStory[]>([])
  useEffect(() => { if (!supabase) return; void supabase.from('find_stories').select('id,number_label,title_ko,title_en,body_ko,body_en,image_url,product_label').eq('published', true).order('sort_order').then(({ data }) => setStories((data ?? []) as FindStory[])) }, [])
  return <main className="find-page"><section className="find-hero"><motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}><p>{t('find.eyebrow')}</p><h1>{String(t('find.title')).split('\n').map(line => <span key={line}>{line}</span>)}</h1><em>{t('find.intro')}</em></motion.div><img src="/images/detail-stitch.jpg" alt="PHILIA signature detail" /></section><section className="find-manifesto"><p>{t('find.archive')}</p><h2>{t('find.stories')}</h2><span>LOVE · PATIENCE · TOUCH · TIME · CARE · REPAIR</span></section><section className="find-stories">{stories.map((story, index) => <motion.article key={story.id} initial={{ opacity: 0, y: 25 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: .2 }}><div className="find-story-image"><img src={story.image_url} alt="" /><span>{story.number_label}</span></div><div><p>{story.product_label}</p><h2>{english ? story.title_en : story.title_ko}</h2><em>{english ? story.title_ko : story.title_en}</em><p className="story-body">{english ? story.body_en : story.body_ko}</p><span>{t('find.inspect')} →</span></div><b>{String(index + 1).padStart(2, '0')} / {String(stories.length).padStart(2, '0')}</b></motion.article>)}</section></main>
}
