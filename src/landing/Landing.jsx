// Public landing page (ADR-007). Lazy-loaded: none of this ships in the dashboard chunk.
// In-page links scroll with buttons, never with #anchors, because the app routes on the hash.
import React, { useEffect, useState } from 'react';
import '@fontsource/space-grotesk/latin-600.css';
import '@fontsource/space-grotesk/latin-700.css';
import {
  ArrowRight,
  Check,
  CircleCheck,
  Circle,
  MessageSquareText,
  NotebookPen,
  Sheet,
  Plane,
  Package,
  Inbox,
  ListChecks,
  Store,
  Users,
  ShieldCheck,
  Coins,
  Receipt,
  Truck,
  Menu,
  X,
} from 'lucide-react';
import { BrandLockup, BrandMark, Badge, PayBadge, ProductArt } from '../ui';
import { money } from '../money';
import { planDetails } from '../data';
import {
  sampleTrip,
  tripCostTotal,
  costShare,
  sampleItems,
  heroItem,
  sampleOrders,
  sampleShopping,
} from './sample';
import { ChatWidget } from './ChatWidget';
import './landing.css';

const go = (hash) => {
  location.hash = hash;
};
const scrollTo = (id) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
const sections = [
  ['how', 'How it works'],
  ['features', 'Features'],
  ['pricing', 'Pricing'],
  ['faq', 'FAQ'],
];
const icon = { size: 18, strokeWidth: 1.65, 'aria-hidden': true };

export default function Landing() {
  const [menu, setMenu] = useState(false);
  useEffect(() => {
    const previous = document.title;
    document.title = 'Bawa · Your jastip business, in order';
    window.scrollTo(0, 0);
    return () => {
      document.title = previous;
    };
  }, []);
  const jump = (id) => {
    setMenu(false);
    scrollTo(id);
  };
  return (
    <div className="lp">
      <header className="lp-nav">
        <div className="lp-wrap lp-nav-row">
          <button
            className="lp-logo"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          >
            <BrandLockup height={24} />
          </button>
          <nav className={`lp-links ${menu ? 'open' : ''}`} aria-label="Page sections">
            {sections.map(([id, label]) => (
              <button key={id} onClick={() => jump(id)}>
                {label}
              </button>
            ))}
            <button className="lp-only-menu" onClick={() => go('SignIn')}>
              Sign in
            </button>
          </nav>
          <div className="lp-nav-actions">
            <button className="lp-btn ghost lp-hide-sm" onClick={() => go('SignIn')}>
              Sign in
            </button>
            <button className="lp-btn primary" onClick={() => go('SignUp')}>
              Get started
            </button>
            <button
              className="lp-menu-toggle"
              aria-label={menu ? 'Close menu' : 'Open menu'}
              aria-expanded={menu}
              onClick={() => setMenu(!menu)}
            >
              {menu ? <X {...icon} /> : <Menu {...icon} />}
            </button>
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <Hero onHow={() => scrollTo('how')} />
        <Problem />
        <HowItWorks />
        <Features />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <Footer jump={jump} />
      <ChatWidget />
    </div>
  );
}

function Hero({ onHow }) {
  const i = heroItem;
  return (
    <section className="lp-hero">
      <div className="lp-wrap lp-hero-grid">
        <div className="lp-hero-copy">
          <p className="lp-kicker">
            <span className="lp-dot" /> Found there. Brought home.
          </p>
          <h1>Your jastip business, in order.</h1>
          <p className="lp-lede">
            Bawa turns a photo and a price into a listing with an honest margin, then carries every
            order from request to doorstep: payments, shopping list and delivery included.
          </p>
          <div className="lp-cta-row">
            <button className="lp-btn lime lg" onClick={() => go('SignUp')}>
              Get started <ArrowRight {...icon} size={16} />
            </button>
            <button className="lp-btn on-dark lg" onClick={onHow}>
              See how it works
            </button>
          </div>
          <p className="lp-fine">
            Plans from {money(planDetails[0].price)} a month, billed by invoice. No card needed.
          </p>
        </div>
        <figure className="lp-calc" aria-label="Example margin calculation">
          <div className="lp-calc-head">
            <div className="lp-calc-art">
              <ProductArt item={i} type={i.image} />
            </div>
            <div>
              <small>
                {sampleTrip.name} · {sampleTrip.dates}
              </small>
              <strong>{i.name}</strong>
              <Badge status="Available" />
            </div>
          </div>
          <dl className="lp-calc-rows">
            <div>
              <dt>Shelf price</dt>
              <dd>{money(i.price, false, 'JPY')}</dd>
            </div>
            <div>
              <dt>
                At your trip rate <span className="mono">× {sampleTrip.rate}</span>
              </dt>
              <dd>{money(i.purchase)}</dd>
            </div>
            <div>
              <dt>Share of flights, hotel and baggage</dt>
              <dd>+ {money(costShare)}</dd>
            </div>
            <div>
              <dt>Your markup · {i.markup}%</dt>
              <dd>+ {money(i.selling - i.purchase)}</dd>
            </div>
            <div className="total">
              <dt>Buyer pays</dt>
              <dd>{money(i.selling)}</dd>
            </div>
          </dl>
          <div className="lp-calc-margin">
            <span>Real margin after trip costs</span>
            <strong>
              {money(i.profit)} <em>{i.percent.toFixed(1)}%</em>
            </strong>
          </div>
          <figcaption>Example data</figcaption>
        </figure>
      </div>
    </section>
  );
}

function Problem() {
  const rows = [
    {
      before: 'Orders scattered across chats',
      beforeIcon: MessageSquareText,
      after: 'Every request, quote and payment in one list per trip',
    },
    {
      before: 'Margins guessed in a notes app',
      beforeIcon: NotebookPen,
      after: 'Prices worked out from the real rate and real trip costs',
    },
    {
      before: 'Spreadsheets nobody updates',
      beforeIcon: Sheet,
      after: 'A shopping list by store and a report when you land',
    },
  ];
  return (
    <section className="lp-section lp-problem" aria-labelledby="problem-title">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Why Bawa</p>
        <h2 id="problem-title">Jastip is a real business. Run it like one.</h2>
        <p className="lp-sub">
          Most sellers run trips on WhatsApp, notes and memory. It works until the third trip, the
          fortieth order or the first refund.
        </p>
        <ul className="lp-compare">
          {rows.map(({ before, beforeIcon: B, after }) => (
            <li key={before}>
              <div className="before">
                <B {...icon} />
                <span>{before}</span>
              </div>
              <ArrowRight className="lp-compare-arrow" {...icon} />
              <div className="after">
                <CircleCheck {...icon} />
                <span>{after}</span>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

const steps = [
  {
    icon: Plane,
    title: 'Plan the trip',
    text: 'Set dates, currency and rate. Add flights, hotel and baggage as you book them.',
  },
  {
    icon: Package,
    title: 'Post items',
    text: 'Snap a photo, type the shelf price. Bawa suggests a selling price with your margin.',
  },
  {
    icon: Inbox,
    title: 'Take orders',
    text: 'Buyers order from your storefront without an account. You confirm, quote and log DP.',
  },
  {
    icon: Truck,
    title: 'Buy and deliver',
    text: 'Shop from a list grouped by store, then mark shipped and delivered with tracking.',
  },
];

function HowItWorks() {
  return (
    <section id="how" className="lp-section" aria-labelledby="how-title">
      <div className="lp-wrap">
        <p className="lp-eyebrow">How it works</p>
        <h2 id="how-title">From a photo and a price to a delivered order.</h2>
        <ol className="lp-steps">
          {steps.map(({ icon: S, title, text }, n) => (
            <li key={title}>
              <span className="lp-step-n">{String(n + 1).padStart(2, '0')}</span>
              <S {...icon} />
              <h3>{title}</h3>
              <p>{text}</p>
            </li>
          ))}
        </ol>
        <ProductPreview />
      </div>
    </section>
  );
}

const views = [
  {
    id: 'Items',
    icon: Package,
    caption: 'Every item shows what it really earns after trip costs.',
  },
  {
    id: 'Orders',
    icon: Inbox,
    caption: 'Status and payment at a glance: DP due, paid in full, shipped.',
  },
  {
    id: 'Purchasing',
    icon: ListChecks,
    caption: 'Your shopping list, grouped by store, ticked off as you buy.',
  },
  {
    id: 'Storefront',
    icon: Store,
    caption: 'What buyers see: your items, your colours, no account needed.',
  },
];

function ProductPreview() {
  const [view, setView] = useState('Items');
  const current = views.find((v) => v.id === view);
  return (
    <div className="lp-preview">
      <div className="lp-preview-bar">
        <div className="lp-preview-tabs" role="tablist" aria-label="Product preview">
          {views.map(({ id, icon: V }) => (
            <button
              key={id}
              role="tab"
              id={'tab-' + id}
              aria-selected={view === id}
              aria-controls="lp-preview-panel"
              className={view === id ? 'active' : ''}
              onClick={() => setView(id)}
            >
              <V {...icon} size={15} />
              {id}
            </button>
          ))}
        </div>
        <span className="lp-sample-tag">Example data</span>
      </div>
      <div
        className="lp-preview-body"
        role="tabpanel"
        id="lp-preview-panel"
        aria-labelledby={'tab-' + view}
      >
        <div className="lp-preview-head">
          <div>
            <strong>{view === 'Storefront' ? 'Rina’s Tokyo picks' : view}</strong>
            <small>
              {sampleTrip.name} · {sampleTrip.dates} · ¥1 = Rp {sampleTrip.rate}
            </small>
          </div>
        </div>
        {view === 'Items' && <ItemsView />}
        {view === 'Orders' && <OrdersView />}
        {view === 'Purchasing' && <PurchasingView />}
        {view === 'Storefront' && <StoreView />}
      </div>
      <p className="lp-preview-caption">{current.caption}</p>
    </div>
  );
}

function ItemsView() {
  return (
    <>
      <div className="lp-stats">
        <div>
          <small>Trip costs</small>
          <strong>{money(tripCostTotal)}</strong>
          <span>
            Split over {sampleTrip.units} units · {money(costShare)} each
          </span>
        </div>
        <div>
          <small>Expected profit</small>
          <strong className="good">
            {money(sampleItems.reduce((s, i) => s + i.profit * i.sold, 0))}
          </strong>
          <span>On {sampleItems.reduce((s, i) => s + i.sold, 0)} units sold so far</span>
        </div>
        <div className="lp-hide-sm">
          <small>Items live</small>
          <strong>{sampleItems.length}</strong>
          <span>{sampleItems.reduce((s, i) => s + i.qty - i.sold, 0)} units left</span>
        </div>
      </div>
      <div className="lp-table" role="table" aria-label="Example items">
        <div className="lp-tr head" role="row">
          <span role="columnheader">Item</span>
          <span role="columnheader">Shelf</span>
          <span role="columnheader" className="lp-hide-sm">
            Landed cost
          </span>
          <span role="columnheader">Sells at</span>
          <span role="columnheader">Margin</span>
        </div>
        {sampleItems.map((i) => (
          <div className="lp-tr" role="row" key={i.id}>
            <span role="cell" className="lp-item-cell">
              <span className="lp-thumb">
                <ProductArt item={i} type={i.image} />
              </span>
              <span>
                {i.name}
                <small>
                  {i.sold}/{i.qty} sold
                </small>
              </span>
            </span>
            <span role="cell" className="num">
              {money(i.price, false, 'JPY')}
            </span>
            <span role="cell" className="num lp-hide-sm">
              {money(i.landed)}
            </span>
            <span role="cell" className="num">
              {money(i.selling)}
            </span>
            <span role="cell" className={`num ${i.percent < 8 ? 'thin' : 'good'}`}>
              {i.percent.toFixed(1)}%
            </span>
          </div>
        ))}
      </div>
      <p className="lp-note">
        The banana cakes earn only 5.7% once their share of the trip is counted. Bawa shows that
        before you post, not after you land.
      </p>
    </>
  );
}

function OrdersView() {
  return (
    <div className="lp-table orders" role="table" aria-label="Example orders">
      <div className="lp-tr head" role="row">
        <span role="columnheader">Order</span>
        <span role="columnheader" className="lp-hide-sm">
          Item
        </span>
        <span role="columnheader">Total</span>
        <span role="columnheader">Payment</span>
        <span role="columnheader">Status</span>
      </div>
      {sampleOrders.map((o) => (
        <div className="lp-tr" role="row" key={o.id}>
          <span role="cell">
            <span className="mono">{o.id}</span>
            <small>{o.buyer}</small>
          </span>
          <span role="cell" className="lp-hide-sm">
            {o.item}
            <small>Qty {o.qty}</small>
          </span>
          <span role="cell" className="num">
            {money(o.total)}
          </span>
          <span role="cell">
            <PayBadge order={o} />
          </span>
          <span role="cell">
            <Badge status={o.status} />
          </span>
        </div>
      ))}
    </div>
  );
}

function PurchasingView() {
  return (
    <div className="lp-shop">
      {sampleShopping.map((s) => (
        <section key={s.store}>
          <h4>{s.store}</h4>
          {s.lines.map((l) => (
            <div className={`lp-shop-line ${l.done ? 'done' : ''}`} key={l.name}>
              {l.done ? <CircleCheck {...icon} size={17} /> : <Circle {...icon} size={17} />}
              <span>{l.name}</span>
              <span className="mono">× {l.qty}</span>
            </div>
          ))}
        </section>
      ))}
      <p className="lp-note">
        Only confirmed orders land here, and Bawa won’t mark one as bought until its deposit is in.
      </p>
    </div>
  );
}

function StoreView() {
  return (
    <div className="lp-store">
      {sampleItems.slice(0, 3).map((i) => (
        <article key={i.id}>
          <div className="lp-store-art">
            <ProductArt item={i} type={i.image} />
          </div>
          <strong>{i.name}</strong>
          <span className="lp-store-price">{money(i.selling)}</span>
          <small>{i.qty - i.sold > 0 ? `${i.qty - i.sold} left` : 'Sold out'} · DP 30%</small>
          <span className={`lp-store-btn ${i.qty - i.sold > 0 ? '' : 'off'}`}>
            {i.qty - i.sold > 0 ? 'Order' : 'Sold out'}
          </span>
        </article>
      ))}
    </div>
  );
}

const features = [
  {
    icon: Coins,
    title: 'Honest margins',
    text: 'Rates per trip in JPY, KRW, SGD and more. Trip costs are spread across items, so every price covers the journey.',
  },
  {
    icon: Receipt,
    title: 'Payments that add up',
    text: 'Log DP and full payments with proof. Bawa blocks buying before a deposit and shipping before full payment.',
  },
  {
    icon: Store,
    title: 'A storefront in minutes',
    text: 'Share one link. Buyers order without an account and follow their order with a private tracking link.',
  },
  {
    icon: ListChecks,
    title: 'A shopping list that thinks',
    text: 'Confirmed orders roll up by store and item, so a busy day at the outlet takes one list.',
  },
  {
    icon: Users,
    title: 'Bring your team',
    text: 'Owners and managers see the money. Helpers see what to buy and pack, never your costs.',
  },
  {
    icon: ShieldCheck,
    title: 'Your data stays yours',
    text: 'Each workspace is isolated. Nothing is sent on your behalf; WhatsApp messages are copied for you to send.',
  },
];

function Features() {
  return (
    <section id="features" className="lp-section lp-tint" aria-labelledby="features-title">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Features</p>
        <h2 id="features-title">Built for how jastip actually works.</h2>
        <div className="lp-features">
          {features.map(({ icon: F, title, text }) => (
            <article key={title}>
              <span className="lp-feature-icon">
                <F {...icon} />
              </span>
              <h3>{title}</h3>
              <p>{text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

const planBlurb = {
  Starter: 'For your first trips on your own.',
  Pro: 'For regular trips and a helper or two.',
  Business: 'For teams running several trips at once.',
};

function Pricing() {
  return (
    <section id="pricing" className="lp-section" aria-labelledby="pricing-title">
      <div className="lp-wrap">
        <p className="lp-eyebrow">Pricing</p>
        <h2 id="pricing-title">Simple monthly plans in rupiah.</h2>
        <p className="lp-sub">
          Start on Starter and upgrade when your trips grow. Plans are billed by manual invoice: pay
          by bank transfer, no card needed.
        </p>
        <div className="lp-plans">
          {planDetails.map((p) => (
            <article key={p.name} className={p.name === 'Pro' ? 'featured' : ''}>
              {p.name === 'Pro' && <span className="lp-plan-flag">Recommended</span>}
              <h3>{p.name}</h3>
              <p className="lp-plan-blurb">{planBlurb[p.name]}</p>
              <p className="lp-price">
                <strong>{money(p.price)}</strong>
                <span>/ month</span>
              </p>
              <ul>
                {p.features.map((f) => (
                  <li key={f}>
                    <Check {...icon} size={15} />
                    {f}
                  </li>
                ))}
              </ul>
              <button
                className={`lp-btn ${p.name === 'Pro' ? 'primary' : 'outline'} block`}
                onClick={() => go('SignUp')}
              >
                {`Start with ${p.name}`}
              </button>
            </article>
          ))}
        </div>
        <p className="lp-fine center">
          Creating an account is free. You can change plans from Billing at any time.
        </p>
      </div>
    </section>
  );
}

const faqs = [
  [
    'Do my buyers need an account?',
    'No. Buyers order from your storefront link with their name, phone and address, and get a private link to follow their order.',
  ],
  [
    'Which currencies does Bawa support?',
    'Each trip has its own currency and exchange rate: JPY, KRW, SGD, MYR, THB, USD or EUR, selling in rupiah or another currency. You set the rate you actually got.',
  ],
  [
    'How are trip costs split?',
    'Evenly across the units you plan to bring, or by item value. You choose per trip, and every price and report uses the same numbers.',
  ],
  [
    'Does Bawa send messages or take payments for me?',
    'No. Bawa prepares WhatsApp messages for you to copy and send yourself. Buyers pay you directly, and you record the payment with its proof.',
  ],
  [
    'How does billing work?',
    'Pick a plan and we send a manual invoice. Pay by bank transfer and your plan is activated once the payment is verified.',
  ],
];

function Faq() {
  return (
    <section id="faq" className="lp-section lp-tint" aria-labelledby="faq-title">
      <div className="lp-wrap lp-faq-grid">
        <div>
          <p className="lp-eyebrow">FAQ</p>
          <h2 id="faq-title">Questions sellers ask first.</h2>
          <p className="lp-sub">
            Something else on your mind? Use the chat button in the corner and we will answer there.
          </p>
        </div>
        <div className="lp-faq">
          {faqs.map(([q, a]) => (
            <details key={q}>
              <summary>{q}</summary>
              <p>{a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="lp-final">
      <div className="lp-wrap lp-final-row">
        <div>
          <BrandMark size={34} tone="tile" label="" />
          <h2>Your next trip, in order from day one.</h2>
          <p>Create your workspace, add a trip and share your storefront link.</p>
        </div>
        <div className="lp-cta-row">
          <button className="lp-btn lime lg" onClick={() => go('SignUp')}>
            Get started <ArrowRight {...icon} size={16} />
          </button>
          <button className="lp-btn on-dark lg" onClick={() => go('SignIn')}>
            Sign in
          </button>
        </div>
      </div>
    </section>
  );
}

function Footer({ jump }) {
  return (
    <footer className="lp-footer">
      <div className="lp-wrap lp-footer-row">
        <div>
          <BrandLockup height={20} />
          <p>Found there. Brought home.</p>
        </div>
        <nav aria-label="Footer">
          {sections.map(([id, label]) => (
            <button key={id} onClick={() => jump(id)}>
              {label}
            </button>
          ))}
          <button onClick={() => go('SignIn')}>Sign in</button>
        </nav>
        <small>© {new Date().getFullYear()} Bawa</small>
      </div>
    </footer>
  );
}
