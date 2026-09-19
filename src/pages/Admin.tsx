import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import { calculateFinance, formatWon } from "../data";
import { useAppStore } from "../store/AppStore";
import type { CostProfile, Product, Variant } from "../types";
import { Brand, ProfileMark } from "../components/Brand";
import { supabase } from "../lib/supabase";
import { setLanguage } from "../i18n";
import { UserManagement } from "../components/admin/UserManagement";
import { ProductManagement } from "../components/admin/ProductManagement";
import { ContentManagement } from "../components/admin/ContentManagement";

type AdminView =
  | "dashboard"
  | "products"
  | "inventory"
  | "finance"
  | "orders"
  | "editorial"
  | "content"
  | "users"
  | "settings";

const nav: [AdminView, string, string][] = [
  ["dashboard", "overview", "01"],
  ["products", "products", "02"],
  ["inventory", "inventory", "03"],
  ["finance", "finance", "04"],
  ["orders", "orders", "05"],
  ["editorial", "editorial", "06"],
  ["content", "content", "07"],
  ["users", "users", "08"],
  ["settings", "settings", "09"],
];

const soldOf = (product: Product) =>
  product.variants.reduce((sum, v) => sum + v.sold, 0);
const stockOf = (product: Product) =>
  product.variants.reduce((sum, v) => sum + v.stock, 0);

export function Admin() {
  const { t, i18n } = useTranslation();
  const {
    products,
    productsLoading,
    productsError,
    saveProduct,
    adjustInventory,
  } = useAppStore();
  const [view, setView] = useState<AdminView>("dashboard");
  const [mobileNav, setMobileNav] = useState(false);
  const stats = useMemo(() => {
    let sales = 0,
      operating = 0,
      net = 0,
      stock = 0;
    products.forEach((product) => {
      const sold = soldOf(product);
      const finance = calculateFinance(product);
      sales += product.price * sold;
      operating += finance.operatingProfit * sold;
      net += finance.netProfit * sold;
      stock += stockOf(product);
    });
    return { sales, operating, net, stock };
  }, [products]);
  const titleKey = nav.find((item) => item[0] === view)?.[1] ?? "overview";
  return (
    <div className="admin-shell">
      <aside className={`admin-side ${mobileNav ? "open" : ""}`}>
        <div className="admin-brand">
          <Brand light />
          <button onClick={() => setMobileNav(false)}>×</button>
        </div>
        <p className="admin-label">STORE OFFICE · {t("common.manage")}</p>
        <nav>
          {nav.map(([key, label, no]) => (
            <button
              className={view === key ? "active" : ""}
              key={key}
              onClick={() => {
                setView(key);
                setMobileNav(false);
              }}
            >
              <span>{no}</span>
              {t(`admin.${label}`)}
              <b>→</b>
            </button>
          ))}
        </nav>
        <div className="admin-side-foot">
          <span>
            <i /> LIVE WORKSPACE
          </span>
          <Link to="/">← STORE</Link>
        </div>
      </aside>
      <main className="admin-main">
        <header className="admin-top">
          <button className="admin-menu" onClick={() => setMobileNav(true)}>
            ≡
          </button>
          <div>
            <p>PHILIA / OFFICE</p>
            <h1>{t(`admin.${titleKey}`)}</h1>
          </div>
          <div className="admin-user">
            <button
              className="admin-language"
              onClick={() =>
                void setLanguage(i18n.language === "en" ? "ko" : "en")
              }
            >
              {i18n.language === "en" ? "KO" : "EN"}
            </button>
            <ProfileMark />
            <div>
              <b>PHILIA ADMIN</b>
              <small>OWNER</small>
            </div>
          </div>
        </header>
        {view === "dashboard" ? (
          <Dashboard products={products} stats={stats} setView={setView} />
        ) : null}
        {view === "products" ? (
          <ProductManagement
            products={products}
            loading={productsLoading}
            error={productsError}
            onSave={saveProduct}
          />
        ) : null}
        {view === "inventory" ? (
          <Inventory products={products} onAdjust={adjustInventory} />
        ) : null}
        {view === "finance" ? (
          <Finance products={products} onUpdate={saveProduct} />
        ) : null}
        {view === "orders" ? <Orders /> : null}
        {view === "editorial" ? <EditorialAdmin /> : null}
        {view === "content" ? <ContentManagement /> : null}
        {view === "users" ? <UserManagement /> : null}
        {view === "settings" ? <Settings /> : null}
      </main>
    </div>
  );
}

function Dashboard({
  products,
  stats,
  setView,
}: {
  products: Product[];
  stats: { sales: number; operating: number; net: number; stock: number };
  setView: (view: AdminView) => void;
}) {
  const lowStock = products.flatMap((p) =>
    p.variants.filter((v) => v.stock <= 4).map((v) => ({ p, v })),
  );
  const maxSales = Math.max(...products.map((p) => p.price * soldOf(p)), 1);
  return (
    <div className="admin-content">
      <section className="admin-welcome">
        <div>
          <p>WEDNESDAY, 09 SEPTEMBER</p>
          <h2>
            좋은 아침입니다.
            <br />
            Collection 1의 오늘을 확인하세요.
          </h2>
        </div>
        <button onClick={() => setView("products")}>+ 새 상품 등록</button>
      </section>
      <section className="metric-grid">
        <Metric
          label="총 매출"
          value={formatWon(stats.sales)}
          note="판매 수량 기준"
          tone="blue"
        />
        <Metric
          label="총 영업이익"
          value={formatWon(stats.operating)}
          note={`${stats.sales ? ((stats.operating / stats.sales) * 100).toFixed(1) : 0}% 이익률`}
          tone="blue"
        />
        <Metric
          label="예상 순이익"
          value={formatWon(stats.net)}
          note="부가세 · 종소세 반영"
          tone="red"
        />
        <Metric
          label="현재 재고"
          value={`${stats.stock} PCS`}
          note={`${lowStock.length}개 옵션 확인 필요`}
          tone="ink"
        />
      </section>
      <div className="dashboard-grid">
        <section className="admin-card sales-card">
          <header>
            <div>
              <p>SALES BY PIECE</p>
              <h3>상품별 매출</h3>
            </div>
            <button onClick={() => setView("finance")}>손익 보기 →</button>
          </header>
          <div className="bars">
            {products.map((p) => {
              const value = p.price * soldOf(p);
              return (
                <div key={p.id}>
                  <span>{String(p.piece).padStart(2, "0")}</span>
                  <div>
                    <i style={{ width: `${(value / maxSales) * 100}%` }} />
                  </div>
                  <b>{p.name}</b>
                  <em>{formatWon(value)}</em>
                </div>
              );
            })}
          </div>
        </section>
        <section className="admin-card stock-card">
          <header>
            <div>
              <p>STOCK SIGNAL</p>
              <h3>재고 알림</h3>
            </div>
            <button onClick={() => setView("inventory")}>전체 재고 →</button>
          </header>
          {lowStock.length ? (
            lowStock.slice(0, 5).map(({ p, v }) => (
              <div className="stock-alert" key={v.id}>
                <img src={p.image} alt="" />
                <div>
                  <b>{p.name}</b>
                  <span>
                    {v.color} · {v.size}
                  </span>
                </div>
                <strong>
                  {v.stock} <small>LEFT</small>
                </strong>
              </div>
            ))
          ) : (
            <p className="all-good">모든 옵션의 재고가 안정적입니다.</p>
          )}
        </section>
      </div>
      <section className="admin-card quick">
        <p>QUICK ACTIONS</p>
        <div>
          <button onClick={() => setView("products")}>
            <span>＋</span>
            <b>상품 등록</b>
            <em>새 컬렉션과 옵션 추가</em>
          </button>
          <button onClick={() => setView("inventory")}>
            <span>↕</span>
            <b>입고 기록</b>
            <em>색상 · 사이즈별 수량</em>
          </button>
          <button onClick={() => setView("finance")}>
            <span>₩</span>
            <b>손익 계산</b>
            <em>원가와 세금 시뮬레이션</em>
          </button>
          <button onClick={() => setView("content")}>
            <span>¶</span>
            <b>게시물 작성</b>
            <em>발견과 수선 이야기</em>
          </button>
        </div>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  tone,
}: {
  label: string;
  value: string;
  note: string;
  tone: string;
}) {
  return (
    <article className={`metric ${tone}`}>
      <p>{label}</p>
      <strong>{value}</strong>
      <span>{note}</span>
    </article>
  );
}

function Inventory({
  products,
  onAdjust,
}: {
  products: Product[];
  onAdjust: (variantId: string, delta: number) => Promise<boolean>;
}) {
  const [selected, setSelected] = useState(products[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const product = products.find((p) => p.id === selected) ?? products[0];
  const adjust = async (variant: Variant, amount: number) => {
    setMessage("저장 중…");
    try {
      await onAdjust(variant.id, amount);
      setMessage("재고 이동을 기록했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "재고를 변경하지 못했습니다.",
      );
    }
  };
  if (!product)
    return (
      <div className="admin-content">
        <p className="admin-list-message">등록된 상품이 없습니다.</p>
      </div>
    );
  return (
    <div className="admin-content">
      <section className="admin-section-head">
        <div>
          <p>INVENTORY · 재고</p>
          <h2>옵션별 재고</h2>
          <span>{message}</span>
        </div>
        <div className="legend">
          <span>
            <i className="safe" /> 안정
          </span>
          <span>
            <i className="low" /> 부족
          </span>
        </div>
      </section>
      <div className="inventory-layout">
        <aside className="product-select">
          {products.map((p) => (
            <button
              className={p.id === selected ? "active" : ""}
              key={p.id}
              onClick={() => setSelected(p.id)}
            >
              <img src={p.image} alt="" />
              <div>
                <b>{p.name}</b>
                <span>{p.sku}</span>
              </div>
              <strong>{stockOf(p)}</strong>
            </button>
          ))}
        </aside>
        <section className="variant-panel">
          <header>
            <div>
              <p>{product.sku}</p>
              <h3>
                {product.name} <em>{product.nameKo}</em>
              </h3>
            </div>
            <strong>
              {stockOf(product)} <small>PCS</small>
            </strong>
          </header>
          <div className="variant-table">
            <div>
              <span>컬러</span>
              <span>사이즈</span>
              <span>기초</span>
              <span>입고</span>
              <span>판매</span>
              <span>현재</span>
              <span>빠른 조정</span>
            </div>
            {product.variants.map((v) => (
              <div key={v.id}>
                <span className="variant-color">
                  <i style={{ background: v.colorHex }} />
                  {v.color}
                </span>
                <span>{v.size}</span>
                <span>{v.openingStock}</span>
                <span>+{v.received}</span>
                <span>−{v.sold}</span>
                <strong className={v.stock <= 4 ? "low-number" : ""}>
                  {v.stock}
                </strong>
                <span className="adjust">
                  <button
                    disabled={v.stock <= 0}
                    onClick={() => void adjust(v, -1)}
                  >
                    −
                  </button>
                  <button onClick={() => void adjust(v, 1)}>+</button>
                </span>
              </div>
            ))}
          </div>
          <p className="formula-note">
            현재재고 = 기초재고 + 추가입고 − 판매수량 · 모든 조정은 Supabase
            재고 이동 기록에 저장됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}

function Finance({
  products,
  onUpdate,
}: {
  products: Product[];
  onUpdate: (p: Product) => Promise<string | null>;
}) {
  const [selected, setSelected] = useState(products[0]?.id ?? "");
  const [draft, setDraft] = useState<Product | null>(null);
  const [message, setMessage] = useState("");
  useEffect(() => {
    const source = products.find((p) => p.id === selected) ?? products[0];
    if (!source) return;
    if (!selected) setSelected(source.id);
    setDraft(structuredClone(source));
  }, [products, selected]);
  const product = draft;
  if (!product)
    return (
      <div className="admin-content">
        <p className="admin-list-message">
          손익을 계산할 상품을 먼저 등록해 주세요.
        </p>
      </div>
    );
  const f = calculateFinance(product);
  const sold = soldOf(product);
  const updateCost = (key: keyof CostProfile, value: number) =>
    setDraft({ ...product, costs: { ...product.costs, [key]: value } });
  const save = async () => {
    setMessage("저장 중…");
    try {
      await onUpdate(product);
      setMessage("손익 설정을 저장했습니다.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "저장하지 못했습니다.",
      );
    }
  };
  const moneyFields: [keyof CostProfile, string][] = [
    ["purchaseCost", "매입가"],
    ["inboundShipping", "매입 배송비"],
    ["supplies", "부자재"],
    ["outboundShipping", "판매 배송비"],
    ["advertising", "광고비"],
    ["overhead", "기타 판관비"],
  ];
  return (
    <div className="admin-content">
      <section className="admin-section-head">
        <div>
          <p>PROFIT · STOCK · TAX</p>
          <h2>간편 손익 · 재고 · 세금 계산기</h2>
          <span>제공된 PHILIA 엑셀의 계산식을 상품 데이터와 연결했습니다.</span>
        </div>
        <div className="finance-actions">
          <span>{message}</span>
          <select
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
          >
            {products.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name} · {p.sku}
              </option>
            ))}
          </select>
          <button className="ink-button" onClick={() => void save()}>
            변경사항 저장
          </button>
        </div>
      </section>
      <div className="finance-summary">
        <Metric
          label="판매가"
          value={formatWon(product.price)}
          note="VAT 포함"
          tone="ink"
        />
        <Metric
          label="영업이익 / 개"
          value={formatWon(f.operatingProfit)}
          note={`${(f.operatingMargin * 100).toFixed(1)}% 영업이익률`}
          tone="blue"
        />
        <Metric
          label="순이익 / 개"
          value={formatWon(f.netProfit)}
          note={`${(f.netMargin * 100).toFixed(1)}% 순이익률`}
          tone="blue"
        />
        <Metric
          label="총 순이익"
          value={formatWon(f.netProfit * sold)}
          note={`판매 ${sold}개 기준`}
          tone="red"
        />
      </div>
      <div className="finance-layout">
        <section className="admin-card calculator">
          <header>
            <div>
              <p>INPUTS · 직접 입력</p>
              <h3>상품 원가와 비용</h3>
            </div>
            <span className="cream-key">크림색 영역을 수정하세요</span>
          </header>
          <div className="cost-form">
            <label>
              SKU
              <input value={product.sku} readOnly />
            </label>
            <label>
              상품명
              <input value={product.name} readOnly />
            </label>
            <label>
              판매가
              <input
                type="number"
                value={product.price}
                onChange={(e) =>
                  setDraft({ ...product, price: Number(e.target.value) })
                }
              />
            </label>
            {moneyFields.map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  type="number"
                  value={product.costs[key]}
                  onChange={(e) => updateCost(key, Number(e.target.value))}
                />
              </label>
            ))}
            <label>
              결제 수수료율
              <input
                type="number"
                step="0.001"
                value={product.costs.paymentFeeRate * 100}
                onChange={(e) =>
                  updateCost("paymentFeeRate", Number(e.target.value) / 100)
                }
              />
              <i>%</i>
            </label>
          </div>
        </section>
        <section className="admin-card result-sheet">
          <header>
            <div>
              <p>OPERATING PROFIT</p>
              <h3>상품 손익</h3>
            </div>
            <span>자동 계산</span>
          </header>
          <dl>
            <div>
              <dt>원가 합계</dt>
              <dd className="out">− {formatWon(f.unitCost)}</dd>
            </div>
            <div>
              <dt>판매가</dt>
              <dd className="in">+ {formatWon(product.price)}</dd>
            </div>
            <div>
              <dt>결제 수수료</dt>
              <dd className="out">− {formatWon(f.paymentFee)}</dd>
            </div>
            <div>
              <dt>배송 · 광고 · 판관비</dt>
              <dd className="out">
                −{" "}
                {formatWon(
                  product.costs.outboundShipping +
                    product.costs.advertising +
                    product.costs.overhead,
                )}
              </dd>
            </div>
            <div className="result">
              <dt>영업이익 / 개</dt>
              <dd>{formatWon(f.operatingProfit)}</dd>
            </div>
          </dl>
        </section>
      </div>
      <section className="admin-card tax-sheet">
        <header>
          <div>
            <p>TAX SIMULATION</p>
            <h3>세금 계산</h3>
          </div>
          <span>판매가는 부가세 포함 · 종소세율은 예상 유효세율</span>
        </header>
        <div className="tax-grid">
          <label>
            부가세율
            <input
              type="number"
              value={product.costs.vatRate * 100}
              onChange={(e) =>
                updateCost("vatRate", Number(e.target.value) / 100)
              }
            />
            <i>%</i>
          </label>
          <div>
            <span>부가세 / 개</span>
            <strong>{formatWon(f.vat)}</strong>
          </div>
          <label>
            예상 종소세율
            <input
              type="number"
              value={product.costs.incomeTaxRate * 100}
              onChange={(e) =>
                updateCost("incomeTaxRate", Number(e.target.value) / 100)
              }
            />
            <i>%</i>
          </label>
          <div>
            <span>종소세 / 개</span>
            <strong>{formatWon(f.incomeTax)}</strong>
          </div>
          <div className="net">
            <span>순이익 / 개</span>
            <strong>{formatWon(f.netProfit)}</strong>
            <em>{(f.netMargin * 100).toFixed(1)}%</em>
          </div>
        </div>
      </section>
    </div>
  );
}

type AdminOrderRow = {
  id: string;
  orderNo: string;
  customer: string;
  email: string;
  amount: number;
  subtotal: number;
  shippingFee: number;
  status: string;
  createdAt: string;
  paidAt: string | null;
  method: string;
  paymentReference: string | null;
  receiptUrl: string | null;
  items: string[];
  shipping: ShippingAddress | null;
};

type ShippingAddress = {
  recipient_name?: string;
  phone?: string;
  postal_code?: string;
  address_line1?: string;
  address_line2?: string;
  delivery_message?: string;
};

function Orders() {
  const [orders, setOrders] = useState<AdminOrderRow[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const load = async () => {
    if (!supabase) return;
    setLoading(true);
    const { data, error } = await supabase.from("orders")
      .select("id,order_no,email,customer_name,subtotal,shipping_fee,total,shipping_address,status,payment_provider,payment_method,payment_reference,payment_receipt_url,paid_at,created_at,order_items(product_name,option_label,quantity)")
      .eq("payment_provider", "toss")
      .order("created_at", { ascending: false });
    setOrders((data ?? []).map((order) => ({
      id: order.id,
      orderNo: order.order_no,
      customer: order.customer_name,
      email: order.email,
      amount: order.total,
      subtotal: order.subtotal,
      shippingFee: order.shipping_fee,
      status: order.status,
      createdAt: order.created_at,
      paidAt: order.paid_at,
      method: `TOSS ${order.payment_method ?? "READY"}`,
      paymentReference: order.payment_reference,
      receiptUrl: order.payment_receipt_url,
      items: (order.order_items ?? []).map((item) => `${item.product_name} / ${item.option_label} × ${item.quantity}`),
      shipping: order.shipping_address as ShippingAddress | null,
    })));
    setMessage(error?.message ?? "");
    setLoading(false);
  };
  useEffect(() => {
    void load();
  }, []);
  const paidOrders = orders.filter((order) => order.status === "paid" || ["preparing", "shipped", "completed"].includes(order.status));
  const pendingOrders = orders.filter((order) => order.status === "pending");
  const exportCsv = () => {
    const rows = [
      ["ORDER", "CUSTOMER", "EMAIL", "RECIPIENT", "PHONE", "POSTAL CODE", "ADDRESS", "DELIVERY NOTE", "ITEMS", "SUBTOTAL", "SHIPPING", "METHOD", "PAYMENT KEY", "AMOUNT", "STATUS", "PAID", "CREATED"],
      ...orders.map((order) => [
        order.orderNo,
        order.customer,
        order.email,
        order.shipping?.recipient_name ?? "",
        order.shipping?.phone ?? "",
        order.shipping?.postal_code ?? "",
        [order.shipping?.address_line1, order.shipping?.address_line2].filter(Boolean).join(" "),
        order.shipping?.delivery_message ?? "",
        order.items.join(" | "),
        String(order.subtotal),
        String(order.shippingFee),
        order.method,
        order.paymentReference ?? "",
        String(order.amount),
        order.status,
        order.paidAt ?? "",
        order.createdAt,
      ]),
    ];
    const blob = new Blob(
      [
        rows
          .map((row) =>
            row.map((value) => `"${value.replaceAll('"', '""')}"`).join(","),
          )
          .join("\n"),
      ],
      { type: "text/csv;charset=utf-8" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `philia-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };
  return (
    <div className="admin-content">
      <section className="admin-section-head">
        <div>
          <p>TOSS PAYMENTS · 주문</p>
          <h2>
            결제 주문 관리 <span>{orders.length}</span>
          </h2>
          <span>{message}</span>
        </div>
        <div className="toss-admin-actions"><span>승인 {paidOrders.length} · 결제대기 {pendingOrders.length}</span><button onClick={() => void load()} disabled={loading}>{loading ? "불러오는 중…" : "새로고침"}</button><button onClick={exportCsv}>주문 내보내기 ↓</button></div>
      </section>
      <div className="admin-table orders-table">
        <div className="table-head">
          <span>주문번호</span>
          <span>주문자 · 결제</span>
          <span>배송지</span>
          <span>상품</span>
          <span>결제금액</span>
          <span>상태</span>
        </div>
        {orders.length ? (
          orders.map((order) => (
            <div className="table-row" key={order.id}>
              <span>{order.orderNo}</span>
              <span className="order-customer">{order.customer}<small>{order.email}</small><small>{order.method}</small>{order.paymentReference ? <code title={order.paymentReference}>{order.paymentReference.slice(0, 12)}…</code> : <small>승인 대기</small>}</span>
              <span className="order-shipping">{order.shipping ? <><b>{order.shipping.recipient_name || order.customer} · {order.shipping.phone}</b><small>({order.shipping.postal_code}) {order.shipping.address_line1} {order.shipping.address_line2}</small>{order.shipping.delivery_message ? <em>“{order.shipping.delivery_message}”</em> : null}</> : <small>기존 주문 · 배송지 미기록</small>}</span>
              <span>
                {order.items.join(", ")}
              </span>
              <span className="order-amount">{formatWon(order.amount)}<small>상품 {formatWon(order.subtotal)} · 배송 {order.shippingFee ? formatWon(order.shippingFee) : "무료"}</small></span>
              <span className="toss-order-status"><b className={`status ${order.status}`}>{order.status}</b><small>{order.paidAt ? new Date(order.paidAt).toLocaleString("ko-KR") : new Date(order.createdAt).toLocaleString("ko-KR")}</small>{order.receiptUrl ? <a href={order.receiptUrl} target="_blank" rel="noreferrer">영수증 확인 ↗</a> : null}</span>
            </div>
          ))
        ) : (
          <p className="admin-list-message">접수된 주문이 없습니다.</p>
        )}
      </div>
    </div>
  );
}

type FindStoryAdmin = {
  id: string;
  number_label: string;
  title_ko: string;
  title_en: string;
  body_ko: string;
  body_en: string;
  image_url: string;
  product_label: string | null;
  sort_order: number;
  published: boolean;
};
type MendingAdminRow = {
  id: string;
  product_name: string;
  description: string;
  status: string;
  admin_note: string | null;
  created_at: string;
};

function EditorialAdmin() {
  const { t } = useTranslation();
  const [stories, setStories] = useState<FindStoryAdmin[]>([]);
  const [requests, setRequests] = useState<MendingAdminRow[]>([]);
  const [selected, setSelected] = useState<FindStoryAdmin | null>(null);
  const [message, setMessage] = useState("");
  const load = async () => {
    if (!supabase) return;
    const [{ data: storyData }, { data: requestData }] = await Promise.all([
      supabase.from("find_stories").select("*").order("sort_order"),
      supabase
        .from("mending_requests")
        .select("*")
        .order("created_at", { ascending: false }),
    ]);
    const nextStories = (storyData ?? []) as FindStoryAdmin[];
    setStories(nextStories);
    setSelected((current) => current ?? nextStories[0] ?? null);
    setRequests((requestData ?? []) as MendingAdminRow[]);
  };
  useEffect(() => {
    void load();
  }, []);
  const saveStory = async (event: FormEvent) => {
    event.preventDefault();
    if (!supabase || !selected) return;
    const { error } = await supabase.from("find_stories").upsert(selected);
    setMessage(error?.message ?? "The Edit에 반영했습니다.");
    if (!error) void load();
  };
  const addStory = () =>
    setSelected({
      id: crypto.randomUUID(),
      number_label: String(stories.length + 1).padStart(2, "0"),
      title_ko: "새 이야기",
      title_en: "NEW STORY",
      body_ko: "",
      body_en: "",
      image_url: "/images/detail-stitch.jpg",
      product_label: "ALL PIECES",
      sort_order: stories.length + 1,
      published: false,
    });
  const removeStory = async () => {
    if (
      !supabase ||
      !selected ||
      !stories.some((story) => story.id === selected.id)
    )
      return;
    const { error } = await supabase
      .from("find_stories")
      .delete()
      .eq("id", selected.id);
    setMessage(error?.message ?? "이야기를 삭제했습니다.");
    if (!error) {
      setSelected(null);
      void load();
    }
  };
  const updateMending = async (id: string, status: string) => {
    if (!supabase) return;
    const { error } = await supabase
      .from("mending_requests")
      .update({ status })
      .eq("id", id);
    setMessage(error?.message ?? "OK");
    if (!error) void load();
  };
  return (
    <div className="admin-content">
      <section className="admin-section-head">
        <div>
          <p>THE EDIT · MENDING DESK</p>
          <h2>{t("admin.editorial")}</h2>
        </div>
        <div className="admin-head-actions">
          <span>{message}</span>
          <button onClick={addStory}>+ 새 이야기</button>
        </div>
      </section>
      <div className="editorial-admin">
        <section className="admin-card story-manager">
          <header>
            <h3>THE EDIT</h3>
            <span>{stories.length} STORIES</span>
          </header>
          <div className="story-tabs">
            {stories.map((story) => (
              <button
                className={selected?.id === story.id ? "active" : ""}
                onClick={() => setSelected(story)}
                key={story.id}
              >
                {story.number_label} · {story.title_en}
              </button>
            ))}
          </div>
          {selected ? (
            <form onSubmit={saveStory}>
              <div className="form-two">
                <label>
                  번호
                  <input
                    value={selected.number_label}
                    onChange={(e) =>
                      setSelected({ ...selected, number_label: e.target.value })
                    }
                  />
                </label>
                <label>
                  정렬
                  <input
                    type="number"
                    value={selected.sort_order}
                    onChange={(e) =>
                      setSelected({
                        ...selected,
                        sort_order: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  한국어 제목
                  <input
                    value={selected.title_ko}
                    onChange={(e) =>
                      setSelected({ ...selected, title_ko: e.target.value })
                    }
                  />
                </label>
                <label>
                  English title
                  <input
                    value={selected.title_en}
                    onChange={(e) =>
                      setSelected({ ...selected, title_en: e.target.value })
                    }
                  />
                </label>
              </div>
              <label>
                한국어 본문
                <textarea
                  value={selected.body_ko}
                  onChange={(e) =>
                    setSelected({ ...selected, body_ko: e.target.value })
                  }
                />
              </label>
              <label>
                English body
                <textarea
                  value={selected.body_en}
                  onChange={(e) =>
                    setSelected({ ...selected, body_en: e.target.value })
                  }
                />
              </label>
              <label>
                Image URL
                <input
                  value={selected.image_url}
                  onChange={(e) =>
                    setSelected({ ...selected, image_url: e.target.value })
                  }
                />
              </label>
              <label>
                상품 라벨
                <input
                  value={selected.product_label ?? ""}
                  onChange={(e) =>
                    setSelected({ ...selected, product_label: e.target.value })
                  }
                />
              </label>
              <label className="check-line">
                <input
                  type="checkbox"
                  checked={selected.published}
                  onChange={(e) =>
                    setSelected({ ...selected, published: e.target.checked })
                  }
                />{" "}
                PUBLISHED
              </label>
              <div className="editor-actions">
                <button type="button" onClick={() => void removeStory()}>
                  삭제
                </button>
                <button className="ink-button">{t("common.save")}</button>
              </div>
            </form>
          ) : null}
        </section>
        <section className="mending-admin">
          <header>
            <p>MENDING REQUESTS</p>
            <h3>{requests.length} REQUESTS</h3>
          </header>
          {requests.length ? (
            requests.map((request) => (
              <article className="admin-card" key={request.id}>
                <time>{new Date(request.created_at).toLocaleDateString()}</time>
                <h3>{request.product_name}</h3>
                <p>{request.description}</p>
                <select
                  value={request.status}
                  onChange={(e) =>
                    void updateMending(request.id, e.target.value)
                  }
                >
                  <option value="received">RECEIVED</option>
                  <option value="reviewing">REVIEWING</option>
                  <option value="accepted">ACCEPTED</option>
                  <option value="shipping">SHIPPING</option>
                  <option value="completed">COMPLETED</option>
                  <option value="declined">DECLINED</option>
                </select>
              </article>
            ))
          ) : (
            <p>{t("common.empty")}</p>
          )}
        </section>
      </div>
    </div>
  );
}

function Settings() {
  return (
    <div className="admin-content">
      <section className="admin-section-head">
        <div>
          <p>SETTINGS · 설정</p>
          <h2>스토어 설정</h2>
        </div>
      </section>
      <div className="settings-grid">
        <section className="admin-card">
          <h3>브랜드 운영</h3>
          <p>
            홈과 About 문구 및 이미지는 콘텐츠 메뉴에서, 상품 공개 상태와 가격은
            상품 메뉴에서 관리합니다.
          </p>
          <span className="connection">
            <i /> LIVE DATA
          </span>
        </section>
        <section className="admin-card">
          <h3>Supabase 연결</h3>
          <p>Authentication · Database · Storage</p>
          <span className="connection">
            <i /> 운영 데이터 연결
          </span>
          <code>bmsgqkyunhockhxgpfsv</code>
          <p className="muted">
            상품, 재고, 콘텐츠 변경사항은 모든 방문자에게 동일하게 반영됩니다.
          </p>
        </section>
      </div>
    </div>
  );
}
