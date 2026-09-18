import { motion } from "motion/react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { useSitePage, type SitePage } from "../hooks/useSitePage";

const fallback: SitePage = {
  id: "about",
  slug: "about",
  eyebrow_ko: "ABOUT PHILIA",
  eyebrow_en: "ABOUT PHILIA",
  title_ko: "시간이 쌓일수록 가까워지는 것들.",
  title_en: "For what stays.",
  body_ko:
    "PHILIA는 사람과 물건, 그리고 매일의 작은 의식 속에서 시간이 지날수록 자라나는 애착을 이야기합니다. 유행보다 오래 남는 균형과 촉감, 반복해서 손이 가는 편안함을 옷에 담습니다.",
  body_en:
    "PHILIA is the attachment that grows over time through the people, pieces, and rituals we keep close. Refined clothing with warmth, permanence, and quiet everyday ease.",
  secondary_ko: "애착 · 지속성 · 일상의 의식 · 따뜻한 절제",
  secondary_en: "ATTACHMENT · LONGEVITY · EVERYDAY RITUAL · WARM RESTRAINT",
  image_url: "/images/field-jacket.jpg",
  published: true,
};

const pillars = [
  {
    no: "01",
    title: "ATTACHMENT",
    ko: "시간이 지나며 익숙하고 개인적인 것이 되는 옷",
    en: "Pieces that become familiar and personal with time.",
  },
  {
    no: "02",
    title: "LONGEVITY",
    ko: "오래 견디는 품질과 균형 잡힌 핏, 소재",
    en: "Enduring quality, balanced fits, and considered materials.",
  },
  {
    no: "03",
    title: "EVERYDAY RITUAL",
    ko: "자주 손이 가는 편안함과 반복되는 일상",
    en: "Ease that becomes part of the rituals of every day.",
  },
  {
    no: "04",
    title: "WARM RESTRAINT",
    ko: "감정의 깊이를 지닌 절제된 아름다움",
    en: "Restrained beauty with emotional depth and warmth.",
  },
];

export function About() {
  const { i18n } = useTranslation();
  const english = i18n.language === "en";
  const page = useSitePage("about", fallback);
  return (
    <main className="about-page">
      <section className="about-intro">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <p>{english ? page.eyebrow_en : page.eyebrow_ko}</p>
          <h1>{english ? page.title_en : page.title_ko}</h1>
          <span>For What Stays.</span>
        </motion.div>
        <motion.img
          src={page.image_url ?? "/images/field-jacket.jpg"}
          alt="PHILIA garment detail"
          initial={{ opacity: 0, scale: 1.03 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1 }}
        />
      </section>
      <section className="about-statement">
        <p>01 · BRAND ESSENCE</p>
        <h2>{english ? page.body_en : page.body_ko}</h2>
        <span>{english ? page.secondary_en : page.secondary_ko}</span>
      </section>
      <section className="about-pillars">
        <header>
          <p>02</p>
          <h2>Brand Pillars</h2>
        </header>
        <div>
          {pillars.map((pillar) => (
            <article key={pillar.no}>
              <span>{pillar.no}</span>
              <h3>{pillar.title}</h3>
              <i />
              <p>{english ? pillar.en : pillar.ko}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="about-closing">
        <p>PHILIA · PEOPLE AND OBJECTS</p>
        <h2>
          {english ? (
            <>
              Quiet pieces,
              <br />
              kept close.
            </>
          ) : (
            <>
              조용히 곁에,
              <br />
              오래 남는 옷.
            </>
          )}
        </h2>
        <Link to="/shop">{english ? "SHOP COLLECTION" : "컬렉션 보기"} →</Link>
      </section>
    </main>
  );
}
