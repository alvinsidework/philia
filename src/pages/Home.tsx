import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatWon } from "../data";
import { useSitePage, type SitePage } from "../hooks/useSitePage";
import { useAppStore } from "../store/AppStore";

const fallback: SitePage = {
  id: "home",
  slug: "home",
  eyebrow_ko: "필리아 · 오래 머무르는 옷",
  eyebrow_en: "PHILIA · FOR WHAT STAYS.",
  title_ko: "따뜻한 사랑처럼, 오래 머무르는 옷.",
  title_en: "Clothes that stay, the way love stays.",
  body_ko:
    "자주 입고, 오래 간직하며, 시간이 지날수록 더 가까워지는 옷을 만듭니다.",
  body_en:
    "Quiet pieces designed to be worn often, kept longer, and made more personal with time.",
  secondary_ko: "COLLECTION 01",
  secondary_en: "COLLECTION 01",
  image_url: "/images/hero.jpg",
  published: true,
};

export function Home() {
  const { i18n } = useTranslation();
  const english = i18n.language === "en";
  const { products, productsLoading } = useAppStore();
  const page = useSitePage("home", fallback);
  const activeProducts = products.filter(
    (product) => product.status === "active",
  );
  return (
    <main className="home-page">
      <section className="home-hero">
        <motion.img
          src={page.image_url ?? "/images/hero.jpg"}
          alt="PHILIA Collection"
          loading="eager"
          fetchPriority="high"
          initial={{ scale: 1.025, opacity: 0.8 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 1.25, ease: [0.22, 1, 0.36, 1] }}
        />
        <div className="home-hero-shade" />
        <motion.div
          className="home-hero-copy"
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.18, duration: 0.75 }}
        >
          <p>{english ? page.eyebrow_en : page.eyebrow_ko}</p>
          <h1>{english ? page.title_en : page.title_ko}</h1>
          <span>{english ? page.body_en : page.body_ko}</span>
          <Link to="/shop">SHOP COLLECTION →</Link>
        </motion.div>
        <small>
          {english ? page.secondary_en : page.secondary_ko} · SEOUL MMXXVI
        </small>
      </section>
      <section className="home-arrivals">
        <header>
          <div>
            <p>NEW ARRIVALS · COLLECTION 01</p>
            <h2>{english ? "Made to stay." : "오래 머물도록."}</h2>
          </div>
          <Link to="/shop">{english ? "VIEW ALL" : "전체 보기"} →</Link>
        </header>
        {productsLoading ? (
          <p className="catalogue-loading">LOADING COLLECTION…</p>
        ) : (
          <div>
            {activeProducts.slice(0, 4).map((product) => (
              <article key={product.id}>
                <Link to={`/shop/${product.slug}`}>
                  <img
                    src={product.image}
                    alt={product.nameKo}
                    loading="lazy"
                  />
                  <span>
                    {product.featured
                      ? "FEATURED"
                      : `PIECE ${String(product.piece).padStart(2, "0")}`}
                  </span>
                </Link>
                <div>
                  <h3>{english ? product.name : product.nameKo}</h3>
                  <p>{english ? product.nameKo : product.name}</p>
                  <strong>{formatWon(product.price)}</strong>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
      <section className="home-edit">
        <div>
          <p>THE EDIT · 01</p>
          <h2>
            {english ? (
              <>
                Attachment grows
                <br />
                with time.
              </>
            ) : (
              <>
                시간이 쌓일수록
                <br />
                깊어지는 애착.
              </>
            )}
          </h2>
          <Link to="/the-edit">
            {english ? "READ THE EDIT" : "이야기 읽기"} →
          </Link>
        </div>
        <img src="/images/detail-stitch.jpg" alt="PHILIA signature stitch" />
        <blockquote>
          {english ? (
            <>
              “Wear often.
              <br />
              Wash gently.
              <br />
              Keep close.”
            </>
          ) : (
            <>
              “자주 입고,
              <br />
              다정히 돌보며,
              <br />
              곁에 오래.”
            </>
          )}
        </blockquote>
      </section>
      <section className="home-values">
        <p>PHILIA · FOR WHAT STAYS.</p>
        <h2>
          {english
            ? "Refined clothing with warmth and permanence."
            : "따뜻함과 지속성을 담은, 절제된 옷."}
        </h2>
        <span>
          {english
            ? "ATTACHMENT / LONGEVITY / EVERYDAY RITUAL / WARM RESTRAINT"
            : "애착 / 지속성 / 일상의 의식 / 따뜻한 절제"}
        </span>
      </section>
    </main>
  );
}
