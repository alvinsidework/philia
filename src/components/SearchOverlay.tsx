import { useDeferredValue, useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { formatWon } from "../data";
import { useAppStore } from "../store/AppStore";

export function SearchOverlay({ onClose }: { onClose: () => void }) {
  const { i18n } = useTranslation();
  const english = i18n.language === "en";
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const { products } = useAppStore();
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    inputRef.current?.focus();
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", close);
    return () => window.removeEventListener("keydown", close);
  }, [onClose]);
  const results = products.filter(
    (product) =>
      product.status === "active" &&
      (!deferredQuery ||
        `${product.name} ${product.nameKo} ${product.category}`
          .toLowerCase()
          .includes(deferredQuery)),
  );
  return (
    <motion.div
      className="search-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="상품 검색"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        className="search-backdrop"
        onClick={onClose}
        aria-label="검색 닫기"
      />
      <motion.section
        initial={{ y: -28 }}
        animate={{ y: 0 }}
        exit={{ y: -28 }}
        transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      >
        <header>
          <p>SEARCH · {english ? "PIECE SEARCH" : "상품 검색"}</p>
          <button onClick={onClose}>{english ? "CLOSE" : "닫기"} ×</button>
        </header>
        <div className="search-field">
          <span>⌕</span>
          <input
            ref={inputRef}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={
              english
                ? "Search by name or category"
                : "상품명 또는 카테고리 검색"
            }
          />
          <em>{results.length}</em>
        </div>
        <div className="search-results">
          {results.slice(0, 8).map((product) => (
            <Link
              to={`/shop/${product.slug}`}
              onClick={onClose}
              key={product.id}
            >
              <img src={product.image} alt="" />
              <span>
                <b>{english ? product.name : product.nameKo}</b>
                <small>
                  {english ? product.nameKo : product.name} · {product.category}
                </small>
              </span>
              <strong>{formatWon(product.price)}</strong>
            </Link>
          ))}
        </div>
      </motion.section>
    </motion.div>
  );
}
