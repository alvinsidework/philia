import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type SitePage = {
  id: string
  slug: string
  eyebrow_ko: string
  eyebrow_en: string
  title_ko: string
  title_en: string
  body_ko: string
  body_en: string
  secondary_ko: string
  secondary_en: string
  image_url: string | null
  published: boolean
}

export function useSitePage(slug: string, fallback: SitePage) {
  const [page, setPage] = useState(fallback)
  useEffect(() => {
    if (!supabase) return
    void supabase.from('site_pages').select('*').eq('slug', slug).maybeSingle().then(({ data }) => {
      if (data) setPage(data as SitePage)
    })
  }, [slug])
  return page
}
