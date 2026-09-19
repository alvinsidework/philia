import { useTranslation } from 'react-i18next'

type Language = 'ko' | 'en'
type PolicyKind = 'privacy' | 'refund'
type PolicyTable = { headers: string[]; rows: string[][] }
type PolicySection = { id: string; title: string; paragraphs?: string[]; bullets?: string[]; table?: PolicyTable }
type Policy = { eyebrow: string; title: string; intro: string; effective: string; sections: PolicySection[]; note?: string }

const contactEmail = 'alvinhan1707@gmail.com'

const policies: Record<Language, Record<PolicyKind, Policy>> = {
  ko: {
    privacy: {
      eyebrow: 'LEGAL · PRIVACY',
      title: '개인정보처리방침',
      intro: '필리아는 이용자의 개인정보를 필요한 범위에서 적법하고 투명하게 처리합니다.',
      effective: '2026. 09. 19.',
      sections: [
        {
          id: 'controller',
          title: '1. 개인정보처리자',
          paragraphs: ['상호: 필리아 · 대표자: 손제현 · 사업자등록번호: 808-06-03761', '주소: 서울특별시 중랑구 망우로 2, 1층 103호(망우동, 일흥교통(주))'],
        },
        {
          id: 'purpose',
          title: '2. 처리 목적과 항목',
          table: {
            headers: ['구분', '목적', '처리 항목'],
            rows: [
              ['회원', '가입, 이메일 인증, 로그인, 계정 관리', '이메일, 이름, 암호화된 인증정보, 회원 ID'],
              ['주문·결제', '주문 접수, 결제 승인, 취소·환불, 거래내역 관리', '이름, 이메일, 연락처, 주문·상품·결제 정보, 입금자명, 결제 거래키'],
              ['배송', '상품 배송과 반품 회수', '수령인 이름, 전화번호, 우편번호, 주소, 배송 메모'],
              ['고객지원', 'Q&A, 리뷰, 수선 접수, 분쟁 처리', '작성 내용, 상품·주문 정보, 업로드 이미지, 처리 이력'],
              ['선택 정보', '맞춤 회원정보와 소식 수신', '생년월일, 뉴스레터 수신 동의 여부'],
              ['서비스 이용', '보안, 오류 분석, 언어·장바구니 설정 유지', 'IP 주소, 접속 기록, 브라우저·기기 정보, 로컬 스토리지 설정'],
            ],
          },
          paragraphs: ['카드번호와 같은 원본 결제수단 정보는 필리아가 직접 저장하지 않고 토스페이먼츠가 처리합니다.'],
        },
        {
          id: 'retention',
          title: '3. 보유·이용 기간',
          bullets: [
            '회원정보: 회원 탈퇴 시까지. 다만 법령상 보존의무가 있는 정보는 해당 기간 분리 보관',
            '계약 또는 청약철회, 대금결제, 재화 공급 기록: 5년',
            '소비자 불만 또는 분쟁처리 기록: 3년',
            '표시·광고 기록: 6개월',
            '리뷰·문의·수선 자료: 삭제 요청, 회원 탈퇴 또는 처리 목적 달성 시까지. 단, 분쟁 처리중인 정보는 해결 시까지',
            '뉴스레터 동의: 동의 철회 또는 회원 탈퇴 시까지',
          ],
        },
        {
          id: 'sharing',
          title: '4. 제3자 제공',
          paragraphs: ['필리아는 이용자의 동의 없이 개인정보를 판매하거나 제3자에게 제공하지 않습니다. 다만 법령에 근거가 있거나 수사·감독기관의 적법한 요청이 있는 경우에는 제공할 수 있습니다.'],
        },
        {
          id: 'processors',
          title: '5. 처리위탁과 국외 이전',
          table: {
            headers: ['수탁사', '업무', '정보·이전'],
            rows: [
              ['Supabase, Inc.', '회원인증, DB, 이미지 저장', '싱가포르 리전으로 네트워크 전송 · 회원·주문·게시물 정보'],
              ['Vercel Inc.', '웹사이트 호스팅, CDN, 보안 로그', '국외 글로벌 인프라로 네트워크 전송 · IP, 기기·접속 정보'],
              ['토스페이먼츠(주)', '결제 처리, 취소, 환불', '국내 처리 · 이름, 이메일, 연락처, 주문명, 금액, 거래 정보'],
              ['Telegram FZ-LLC', '계좌이체 주문의 관리자 알림', '국외 서버로 즉시 전송 · 주문번호, 입금자명, 금액, 상품, 입금기한'],
            ],
          },
          paragraphs: ['국외 이전은 회원 가입, 사이트 이용 또는 계좌이체 주문 접수 시 암호화된 네트워크를 통해 일상적으로 발생합니다. 보유기간은 위탁 계약, 각 서비스 정책 및 본 방침의 보유기간을 따릅니다.'],
        },
        {
          id: 'rights',
          title: '6. 정보주체의 권리',
          paragraphs: ['이용자는 자신의 개인정보 열람, 정정, 삭제, 처리정지, 동의 철회를 요구할 수 있습니다. 회원정보는 My Account에서 직접 수정할 수 있고, 계정 삭제 및 기타 요청은 아래 이메일로 접수할 수 있습니다. 법령에 따라 보존해야 하는 정보는 해당 기간 삭제가 제한될 수 있습니다.'],
        },
        {
          id: 'destruction',
          title: '7. 파기 절차·방법',
          paragraphs: ['보유기간이 지나거나 목적이 달성된 개인정보는 복구하기 어려운 방법으로 삭제합니다. 전자파일은 안전한 삭제 방식으로 파기하고, 출력물은 파쇄하거나 소각합니다.'],
        },
        {
          id: 'security',
          title: '8. 안전성 확보조치',
          bullets: ['인증·관리자 권한의 최소화와 접근통제', 'HTTPS 암호화 통신과 비밀키의 서버 분리 보관', '데이터베이스 행 수준 보안정책과 비공개 저장소 적용', '보안 이상 발생 시 접속기록 확인과 필요한 조치'],
        },
        {
          id: 'local-storage',
          title: '9. 쿠키·로컬 스토리지',
          paragraphs: ['로그인 세션, 장바구니, 한·영 언어 선택을 유지하기 위해 브라우저 쿠키 또는 로컬 스토리지를 사용합니다. 브라우저 설정에서 저장을 삭제하거나 제한할 수 있으나, 그 경우 로그인과 장바구니 기능이 제한될 수 있습니다.'],
        },
        {
          id: 'contact',
          title: '10. 개인정보 보호책임자·권익침해 구제',
          paragraphs: [`개인정보 보호책임자: 손제현 · 문의: ${contactEmail}`, '개인정보 침해에 대한 신고·상담이 필요한 경우 개인정보침해신고센터(118), 개인정보분쟁조정위원회(1833-6972) 등 관계 기관에 도움을 요청할 수 있습니다.'],
        },
        {
          id: 'changes',
          title: '11. 방침 변경',
          paragraphs: ['본 방침이 변경되면 시행 최소 7일 전 사이트 공지사항을 통해 안내합니다. 이용자 권리에 중대한 변경은 30일 전 알립니다.'],
        },
      ],
    },
    refund: {
      eyebrow: 'LEGAL · RETURNS',
      title: '교환·반품·환불 정책',
      intro: '상품이 오래 머물 수 있도록 충분히 안내하고, 관계 법령에 따라 교환·반품·환불을 처리합니다.',
      effective: '2026. 09. 19.',
      sections: [
        {
          id: 'window',
          title: '1. 청약철회 기간',
          bullets: ['단순 변심, 사이즈·색상 교환: 상품을 받은 날로부터 7일 이내 접수', '상품이 표시·광고 내용과 다르거나 계약과 다르게 이행된 경우: 상품을 받은 날로부터 3개월 이내 또는 그 사실을 안 날로부터 30일 이내 중 빠른 날', '포장을 열어 상품을 확인한 것만으로는 반품이 제한되지 않습니다.'],
        },
        {
          id: 'exceptions',
          title: '2. 교환·반품이 제한되는 경우',
          bullets: ['이용자의 책임 있는 사유로 상품이 멸실·훼손된 경우', '착용, 세탁, 수선, 라벨·태그 제거, 화장품·향수·오염 등으로 상품 가치가 현저히 감소한 경우', '시간이 지나 재판매가 곤란할 정도로 가치가 현저히 감소한 경우', '이용자의 요청에 따라 개별 제작·수선된 상품으로서 주문 전 청약철회 제한을 별도로 고지하고 동의를 받은 경우'],
          paragraphs: ['다만 상품 하자, 오배송, 표시·광고와의 차이가 있는 경우에는 위 제한을 적용하지 않습니다.'],
        },
        {
          id: 'process',
          title: '3. 접수 방법',
          bullets: [`My Account → Q&A에서 '교환 · 반품'으로 접수하거나 ${contactEmail}로 주문번호와 사유를 보내주세요.`, '접수 후 안내받은 반품지와 배송방법을 이용해 주세요. 사전 접수 없이 사업장으로 발송한 상품은 확인이 지연될 수 있습니다.', '상품, 기본 포장, 라벨·태그, 사은품을 가능한 받은 상태로 동봉해 주세요.'],
        },
        {
          id: 'shipping',
          title: '4. 배송과 반품 비용',
          bullets: ['기본 배송은 결제 완료 후 영업일 기준 2일 이내 출고를 원칙으로 하며, 예약·제작 상품은 상품 페이지에 별도 안내합니다.', '단순 변심·사이즈·색상 교환의 왕복 배송비는 이용자가 부담합니다.', '상품 하자, 오배송, 계약 내용과 다른 이행으로 인한 비용은 필리아가 부담합니다.', '도서·산간 등 추가 운임과 국제배송 비용은 주문 전 별도 안내합니다.'],
        },
        {
          id: 'inspection',
          title: '5. 상품 검수·교환',
          paragraphs: ['반품 도착 후 상품 상태와 구성품을 확인합니다. 교환 상품의 재고가 있는 경우 검수 후 발송하며, 재고가 없으면 이용자의 선택에 따라 다른 상품 교환 또는 환불로 처리합니다.'],
        },
        {
          id: 'refund',
          title: '6. 환불 시점·방법',
          bullets: ['반품 상품을 회수하거나 반환 증빙을 확인한 날로부터 3영업일 이내에 환불하거나 환불에 필요한 조치를 합니다.', '카드 등 전자결제는 원결제 수단을 취소하고, 계좌이체는 본인 확인 후 안내된 계좌로 환불합니다.', '결제사·카드사의 처리 일정에 따라 실제 승인취소·입금 시점에 차이가 있을 수 있습니다.'],
        },
        {
          id: 'cancellation',
          title: '7. 출고 전 취소',
          paragraphs: ['출고 전에는 My Account의 Q&A 또는 이메일로 취소를 요청할 수 있습니다. 이미 출고된 주문은 반품 절차와 배송비 기준이 적용됩니다. 무통장입금 주문은 안내된 기한 내 입금하지 않으면 자동 취소될 수 있습니다.'],
        },
        {
          id: 'mending',
          title: '8. 수선 서비스와 소비자 권리',
          paragraphs: ['필리아의 기본 수선 서비스는 오래 입기 위한 별도의 서비스입니다. 무료 수선 제공은 상품 하자에 대한 교환·환불 등 법정 권리를 제한하지 않습니다.'],
        },
        {
          id: 'disputes',
          title: '9. 문의·분쟁 해결',
          paragraphs: [`고객지원: ${contactEmail}`, '협의가 어려운 경우 소비자24(1372) 등 전문기관의 분쟁조정 절차를 이용할 수 있습니다. 본 정책보다 관계 법령이 소비자에게 유리한 권리를 규정하는 경우 해당 법령이 우선합니다.'],
        },
      ],
    },
  },
  en: {
    privacy: {
      eyebrow: 'LEGAL · PRIVACY',
      title: 'Privacy Policy',
      intro: 'PHILIA processes personal information lawfully, transparently, and only to the extent necessary to provide the store and its services.',
      effective: '19 September 2026',
      sections: [
        { id: 'controller', title: '1. Data controller', paragraphs: ['Business: PHILIA · Representative: Son Jaehyun · Business registration no. 808-06-03761', 'Address: Unit 103, 1F, 2 Mangu-ro, Jungnang-gu, Seoul, Republic of Korea'] },
        {
          id: 'purpose', title: '2. Purposes and data processed', table: { headers: ['Area', 'Purpose', 'Data'], rows: [
            ['Membership', 'Registration, email verification, login and account administration', 'Email, name, encrypted authentication data and member ID'],
            ['Orders & payment', 'Order acceptance, payment approval, cancellation, refund and transaction records', 'Name, email, phone, order/product/payment data, depositor name and payment transaction key'],
            ['Delivery', 'Delivery and return collection', 'Recipient name, phone, postal code, address and delivery note'],
            ['Customer care', 'Q&A, reviews, mending requests and disputes', 'Submitted text, product/order information, uploaded images and handling history'],
            ['Optional profile', 'Personalised profile and brand updates', 'Date of birth and newsletter preference'],
            ['Service use', 'Security, diagnostics, language and bag persistence', 'IP address, access logs, browser/device information and local-storage settings'],
          ] }, paragraphs: ['PHILIA does not directly store raw card details. Payment credentials are processed by Toss Payments.'] },
        { id: 'retention', title: '3. Retention', bullets: ['Account data: until account deletion, except where a statutory retention period applies', 'Contract, withdrawal, payment and supply records: 5 years', 'Consumer complaints and dispute records: 3 years', 'Advertising records: 6 months', 'Reviews, enquiries and mending records: until deletion, account closure or fulfilment of purpose; unresolved disputes are retained until resolution', 'Newsletter preference: until withdrawal of consent or account closure'] },
        { id: 'sharing', title: '4. Third-party disclosure', paragraphs: ['PHILIA does not sell or disclose personal information to third parties without consent, except where required by law or in response to a lawful request from a competent authority.'] },
        { id: 'processors', title: '5. Processors and overseas transfers', table: { headers: ['Processor', 'Service', 'Data and transfer'], rows: [
          ['Supabase, Inc.', 'Authentication, database and image storage', 'Network transfer to the Singapore region · account, order and user-content data'],
          ['Vercel Inc.', 'Website hosting, CDN and security logs', 'Network transfer through global infrastructure · IP, device and access data'],
          ['Toss Payments Co., Ltd.', 'Payment, cancellation and refund processing', 'Processed in Korea · name, email, phone, order name, amount and transaction data'],
          ['Telegram FZ-LLC', 'Administrator alert for bank-transfer orders', 'Immediate transfer to overseas servers · order number, depositor name, amount, items and deadline'],
        ] }, paragraphs: ['Overseas transfers occur through encrypted networks when you register, use the site or submit a bank-transfer order. Retention follows the relevant processing agreement, provider policy and the periods stated in this policy.'] },
        { id: 'rights', title: '6. Your rights', paragraphs: [`You may request access, correction, deletion, restriction or withdrawal of consent. Profile details can be updated in My Account; account deletion and other requests may be sent to ${contactEmail}. Data required by law may be retained for the applicable statutory period.`] },
        { id: 'destruction', title: '7. Deletion', paragraphs: ['When a retention period expires or a purpose is fulfilled, electronic records are securely deleted in a manner designed to prevent recovery. Any paper records are shredded or destroyed.'] },
        { id: 'security', title: '8. Security measures', bullets: ['Least-privilege access and administrator controls', 'HTTPS encryption and server-side separation of secret keys', 'Row-level database security and private storage for sensitive images', 'Review of access records and appropriate response to security anomalies'] },
        { id: 'local-storage', title: '9. Cookies and local storage', paragraphs: ['Browser cookies or local storage are used to maintain login sessions, the shopping bag and language preference. You may delete or restrict them in your browser, but login and bag functionality may then be limited.'] },
        { id: 'contact', title: '10. Privacy contact and remedies', paragraphs: [`Privacy officer: Son Jaehyun · Email: ${contactEmail}`, 'For privacy complaints in Korea, you may also contact the Personal Information Infringement Report Center (118) or the Personal Information Dispute Mediation Committee (+82-1833-6972).'] },
        { id: 'changes', title: '11. Changes to this policy', paragraphs: ['Changes will normally be announced through the site at least 7 days before they take effect. Material changes affecting user rights will be announced at least 30 days in advance.'] },
      ],
      note: 'This English translation is provided for convenience. If it differs from the Korean policy, the Korean version governs to the extent permitted by applicable law.',
    },
    refund: {
      eyebrow: 'LEGAL · RETURNS',
      title: 'Returns & Refunds',
      intro: 'We provide clear return guidance and process exchanges, returns and refunds in accordance with applicable Korean consumer law.',
      effective: '19 September 2026',
      sections: [
        { id: 'window', title: '1. Withdrawal period', bullets: ['Change of mind, size or colour: request within 7 days after receiving the item', 'If an item differs from its description, advertising or contract: within 3 months after receipt or 30 days after discovering the issue, whichever comes first', 'Opening the package only to inspect the item does not by itself exclude a return.'] },
        { id: 'exceptions', title: '2. Return restrictions', bullets: ['Loss or damage attributable to the customer', 'Material loss of value caused by wear, washing, alteration, removal of labels or tags, cosmetics, fragrance, stains or contamination', 'Material loss of resale value due to the passage of time', 'Made-to-order or individually altered items where the restriction was clearly disclosed and separately accepted before purchase'], paragraphs: ['These restrictions do not apply where the item is defective, incorrectly delivered or materially different from its description or contract.'] },
        { id: 'process', title: '3. How to request a return', bullets: [`Submit an Exchange · Return enquiry through My Account → Q&A, or email ${contactEmail} with your order number and reason.`, 'Use the return address and delivery method provided after acceptance. Unannounced parcels sent to the registered business address may be delayed.', 'Include the item, original packaging, labels/tags and any gifts in substantially the condition received.'] },
        { id: 'shipping', title: '4. Shipping and return costs', bullets: ['Orders normally begin shipping within 2 business days after payment. Pre-order or made-to-order timing is stated on the product page.', 'The customer pays round-trip shipping for a change of mind, size or colour.', 'PHILIA pays costs arising from defects, wrong delivery or non-conformity with the contract.', 'Remote-area surcharges and international delivery costs are disclosed separately before ordering.'] },
        { id: 'inspection', title: '5. Inspection and exchange', paragraphs: ['We inspect returned items and their components. If replacement stock is available, the exchange ships after inspection. If unavailable, you may choose another item or a refund.'] },
        { id: 'refund', title: '6. Refund timing and method', bullets: ['We refund or take the necessary refund action within 3 business days after receiving the returned item or evidence of its return.', 'Electronic payments are reversed to the original method. Bank transfers are refunded to an account verified as belonging to the customer.', 'The date funds appear may vary according to the payment provider or card issuer.'] },
        { id: 'cancellation', title: '7. Cancellation before dispatch', paragraphs: ['You may request cancellation through My Account Q&A or email before dispatch. Once dispatched, the return procedure and shipping-cost rules apply. Unpaid bank-transfer orders may be cancelled after the stated payment deadline.'] },
        { id: 'mending', title: '8. Mending and statutory rights', paragraphs: ['Complimentary essential mending is a separate service intended to extend the life of a garment. It does not limit statutory remedies for defective goods, including exchange or refund rights.'] },
        { id: 'disputes', title: '9. Contact and dispute resolution', paragraphs: [`Customer care: ${contactEmail}`, 'If we cannot resolve a matter together, customers in Korea may use Consumer24 or the 1372 Consumer Counseling Center. Mandatory consumer protections prevail where they provide more favourable rights than this policy.'] },
      ],
      note: 'This English translation is provided for convenience. If it differs from the Korean policy, the Korean version governs to the extent permitted by applicable law.',
    },
  },
}

function LegalPolicy({ kind }: { kind: PolicyKind }) {
  const { i18n, t } = useTranslation()
  const language: Language = i18n.resolvedLanguage?.startsWith('ko') ? 'ko' : 'en'
  const policy = policies[language][kind]

  return <main className="legal-page">
    <header className="legal-hero">
      <p>{policy.eyebrow}</p>
      <h1>{policy.title}</h1>
      <span>{policy.intro}</span>
      <small>{t('legal.effective')} {policy.effective}</small>
    </header>
    <div className="legal-layout">
      <nav className="legal-index" aria-label={String(t('legal.contents'))}>
        <p>{t('legal.contents')}</p>
        {policy.sections.map(section => <a href={`#${section.id}`} key={section.id}>{section.title}</a>)}
      </nav>
      <article className="legal-content">
        {policy.sections.map(section => <section id={section.id} key={section.id}>
          <h2>{section.title}</h2>
          {section.paragraphs?.map(paragraph => <p key={paragraph}>{paragraph}</p>)}
          {section.bullets ? <ul>{section.bullets.map(item => <li key={item}>{item}</li>)}</ul> : null}
          {section.table ? <div className="legal-table-wrap"><table><thead><tr>{section.table.headers.map(header => <th key={header}>{header}</th>)}</tr></thead><tbody>{section.table.rows.map(row => <tr key={row.join('-')}>{row.map((cell, index) => <td key={`${cell}-${index}`}>{cell}</td>)}</tr>)}</tbody></table></div> : null}
        </section>)}
        {policy.note ? <p className="legal-note">{policy.note}</p> : null}
      </article>
    </div>
  </main>
}

export function PrivacyPolicy() {
  return <LegalPolicy kind="privacy" />
}

export function RefundPolicy() {
  return <LegalPolicy kind="refund" />
}
