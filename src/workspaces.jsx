import React, { useState } from 'react';
import { useOps } from './store';
import { money } from './money';
import { planDetails } from './data';
import { LiveBilling, LiveAdminSummary } from './live-workspaces';
import { rpc } from './lib/supabase';
import {
  I,
  Button,
  Badge,
  Avatar,
  Field,
  Header,
  Stats,
  Empty,
  Progress,
  SearchField,
  TripFilter,
  Tabs,
  Callout,
  RevenueChart,
  ProductArt,
} from './ui';
export function Billing() {
  const { data, exportCsv, setDialog, demoMode } = useOps();
  if (!demoMode) return <LiveBilling />;
  const plan = planDetails.find((p) => p.name === data.plan);
  return (
    <>
      <Header title="Plan & billing" description="A little structure for a growing business." />
      <section className="panel current-plan">
        <div>
          <span className="eyebrow">Your current plan</span>
          <h2>
            {plan.name}
            <Badge status="Active" />
          </h2>
          <p>Next invoice on 1 November 2026 · Monthly billing</p>
        </div>
        <div>
          <strong>
            {money(plan.price)}
            <small> / month</small>
          </strong>
          <Button
            icon="Download"
            onClick={() =>
              exportCsv([{ invoice: 'INV-2026-10', amount: plan.price, status: 'Paid' }], 'invoice')
            }
          >
            Last invoice
          </Button>
        </div>
      </section>
      <div className="plans">
        {planDetails.map((p) => (
          <section className={`panel plan ${p.name === plan.name ? 'current' : ''}`} key={p.name}>
            <div className="plan-head">
              <h2>{p.name}</h2>
              {p.name === plan.name && <span className="chip">Current plan</span>}
            </div>
            <strong>
              {money(p.price)}
              <small> / month</small>
            </strong>
            <ul>
              {p.features.map((f) => (
                <li key={f}>
                  <I name="Check" size={14} />
                  {f}
                </li>
              ))}
            </ul>
            <Button
              disabled={p.name === plan.name}
              onClick={() => setDialog({ type: 'plan', plan: p.name })}
            >
              {p.name === plan.name ? 'Your current plan' : 'Choose ' + p.name}
            </Button>
          </section>
        ))}
      </div>
      <p className="footnote">
        Indicative PRD prices. Checkout simulates QRIS, virtual account, and card payment.
      </p>
      <section className="panel usage-panel">
        <div className="panel-head">
          <h2>Usage this month</h2>
          <small>Resets 1 November</small>
        </div>
        <div className="usage-grid">
          {[
            ['Active items', data.items.filter((i) => i.status !== 'Draft').length, plan.items],
            ['Orders', data.orders.length, plan.orders],
            ['Team members', data.members.length, plan.members],
          ].map(([name, v, max]) => (
            <div key={name}>
              <span>
                {name}
                <strong>
                  {v} / {max === 100000 ? 'Unlimited' : max}
                </strong>
              </span>
              <Progress value={(v / max) * 100} />
            </div>
          ))}
        </div>
      </section>
      <section className="panel invoice-panel">
        <div className="panel-head">
          <h2>Invoice history</h2>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Invoice</th>
                <th>Date</th>
                <th>Status</th>
                <th className="num">Amount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {['October', 'September', 'August'].map((m, k) => (
                <tr key={m}>
                  <td className="mono">INV-2026-{10 - k}</td>
                  <td>1 {m} 2026</td>
                  <td>
                    <Badge status="Paid" />
                  </td>
                  <td className="num">{money(149000)}</td>
                  <td>
                    <Button
                      icon="Download"
                      onClick={() =>
                        exportCsv(
                          [
                            {
                              invoice: `INV-2026-${10 - k}`,
                              date: `1 ${m} 2026`,
                              amount: 149000,
                              status: 'Paid',
                            },
                          ],
                          'invoice',
                        )
                      }
                    >
                      Download
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
export function Settings() {
  const {
    data,
    change,
    setData,
    role,
    setRole,
    setDialog,
    navigate,
    setScreenState,
    support,
    demoMode,
    reload,
    announce,
    pending,
  } = useOps();
  const [tab, setTab] = useState('Appearance');
  const p = data.preferences;
  const preference = (k, v) =>
    setData((d) => ({ ...d, preferences: { ...d.preferences, [k]: v } }));
  return (
    <>
      <Header title="Settings" description="Make this workspace feel like yours." />
      <Tabs
        options={['Appearance', 'Workspace', 'Team & roles', 'Currency', 'Storefront']}
        value={tab}
        onChange={setTab}
      />
      {tab === 'Appearance' ? (
        <section className="panel settings-panel">
          <div className="settings-row">
            <div>
              <h3>Theme</h3>
              <p>Warm paper by day, warm charcoal by night.</p>
            </div>
            <div className="segmented">
              {['light', 'dark', 'system'].map((t) => (
                <button
                  className={p.theme === t ? 'active' : ''}
                  key={t}
                  onClick={() => preference('theme', t)}
                >
                  <I name={t === 'light' ? 'Sun' : t === 'dark' ? 'Moon' : 'Monitor'} size={14} />
                  {t[0].toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <div>
              <h3>Accent color</h3>
              <p>One accent, used with purpose.</p>
            </div>
            <div className="accent-options">
              {['indigo', 'blue', 'violet', 'teal', 'rose', 'graphite'].map((c) => (
                <button
                  key={c}
                  data-color={c}
                  className={p.accent === c ? 'selected' : ''}
                  aria-label={c + ' accent'}
                  onClick={() => preference('accent', c)}
                >
                  {p.accent === c && <I name="Check" size={14} />}
                </button>
              ))}
            </div>
          </div>
          <div className="settings-row">
            <div>
              <h3>Density</h3>
              <p>A little more room, or a little more information.</p>
            </div>
            <select
              aria-label="Density"
              value={p.density}
              onChange={(e) => preference('density', e.target.value)}
            >
              <option value="comfortable">Comfortable</option>
              <option value="compact">Compact</option>
            </select>
          </div>
          <div className="settings-row">
            <div>
              <h3>Reduce motion</h3>
              <p>Keep transitions simple and quiet.</p>
            </div>
            <button
              className={`toggle ${p.motion === 'reduce' ? 'on' : ''}`}
              role="switch"
              aria-checked={p.motion === 'reduce'}
              aria-label="Reduce motion"
              onClick={() => preference('motion', p.motion === 'reduce' ? 'full' : 'reduce')}
            >
              <i />
            </button>
          </div>
          <div className="settings-row">
            <div>
              <h3>Screen states</h3>
              <p>Preview the loading, empty, and error designs.</p>
            </div>
            <select
              aria-label="Preview screen state"
              defaultValue="ready"
              onChange={(e) => {
                const state = e.target.value;
                navigate('Overview');
                setScreenState(state);
              }}
            >
              <option value="ready">Ready</option>
              <option value="loading">Loading</option>
              <option value="empty">Empty</option>
              <option value="error">Error</option>
            </select>
          </div>
        </section>
      ) : tab === 'Team & roles' ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Workspace members</h2>
            <Button icon="Plus" onClick={() => setDialog({ type: 'invite' })}>
              Invite member
            </Button>
          </div>
          {data.members.map((m, k) => (
            <div className="member-row" key={k}>
              <Avatar name={m.name || m.email} />
              <div>
                <strong>{m.name || m.email}</strong>
                <small>{m.email}</small>
              </div>
              {!demoMode && role === 'Owner' && m.role !== 'Owner' ? (
                <select
                  aria-label={'Role for ' + (m.name || m.email)}
                  value={m.role}
                  disabled={pending || support}
                  onChange={async (e) => {
                    try {
                      await rpc('jastip_set_member_role', {
                        p_workspace: data.workspaceId,
                        p_member: m.id,
                        p_role: e.target.value,
                      });
                      await reload();
                      announce('Team role updated.');
                    } catch (error) {
                      announce(error.message);
                    }
                  }}
                >
                  <option>Manager</option>
                  <option>Helper</option>
                </select>
              ) : (
                <Badge status={m.status || m.role} />
              )}
            </div>
          ))}
          <div className="settings-row padded">
            <div>
              <h3>{demoMode ? 'Preview a role' : 'Your role'}</h3>
              <p>Helpers manage orders but cannot see margin or reports.</p>
            </div>
            <select
              aria-label="Preview role"
              value={role}
              disabled={!demoMode}
              onChange={(e) => setRole(e.target.value)}
            >
              <option>Owner</option>
              <option>Manager</option>
              <option>Helper</option>
            </select>
          </div>
        </section>
      ) : tab === 'Currency' ? (
        <section className="panel">
          <div className="panel-head">
            <h2>Exchange rates</h2>
            <small>Base currency: IDR</small>
          </div>
          {data.trips
            .filter((t) => t.status !== 'Closed')
            .map((t) => (
              <div className="settings-row padded" key={t.id}>
                <div>
                  <h3>{t.currency} → IDR</h3>
                  <p>{t.name} · Existing order snapshots stay unchanged</p>
                </div>
                <div className="rate-input">
                  <span>1 {t.currency} = Rp</span>
                  <input
                    type="number"
                    min="0.001"
                    step="0.001"
                    disabled={support}
                    aria-label={t.currency + ' exchange rate'}
                    value={t.rate}
                    onChange={(e) =>
                      change((d) => ({
                        ...d,
                        trips: d.trips.map((tr) =>
                          tr.id === t.id ? { ...tr, rate: Number(e.target.value) } : tr,
                        ),
                      }))
                    }
                  />
                </div>
              </div>
            ))}
        </section>
      ) : (
        <form
          key={tab}
          className="panel settings-form"
          onSubmit={(e) => {
            e.preventDefault();
            const fields = Object.fromEntries(new FormData(e.target));
            change((d) => ({ ...d, shop: { ...d.shop, ...fields } }), `${tab} settings saved.`);
          }}
        >
          <Field label={tab === 'Storefront' ? 'Storefront name' : 'Workspace name'}>
            <input name="name" required defaultValue={data.shop.name} />
          </Field>
          <Field label="Storefront slug">
            <input name="slug" required pattern="[a-z0-9-]+" defaultValue={data.shop.slug} />
          </Field>
          <Field
            label="WhatsApp contact (optional)"
            hint="Include the country code. Buyers use this to contact you."
          >
            <input
              name="contact"
              type="tel"
              pattern="[+0-9 ()-]{8,20}"
              defaultValue={data.shop.contact || ''}
            />
          </Field>
          <Field label="About your shop">
            <textarea name="bio" defaultValue={data.shop.bio} />
          </Field>
          <Button primary type="submit">
            Save changes
          </Button>
        </form>
      )}
      <div className="settings-footer">
        {demoMode && (
          <Button icon="RotateCcw" onClick={() => setDialog({ type: 'reset' })}>
            Reset demo data
          </Button>
        )}
        <span className="muted">
          {demoMode
            ? 'Your changes are saved in this browser.'
            : 'Business data is saved to Supabase. Appearance preferences stay on this device.'}
        </span>
      </div>
    </>
  );
}
export function Welcome() {
  const { data, change, navigate, setDialog, demoMode } = useOps();
  const [stage, setStage] = useState(0),
    [name, setName] = useState(data.shop.name);
  return (
    <>
      <Header
        title="Welcome to Jastip Ops"
        description="From first find to first order, in a few small steps."
      />
      <section className="panel onboarding">
        <div className="onboarding-steps">
          {['Your workspace', 'Your first trip', 'Your first find'].map((s, k) => (
            <button key={s} className={stage === k ? 'active' : ''} onClick={() => setStage(k)}>
              <span>{stage > k ? <I name="Check" size={12} /> : k + 1}</span>
              {s}
            </button>
          ))}
        </div>
        {stage === 0 ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (
                await change(
                  (d) => ({ ...d, shop: { ...d.shop, name } }),
                  'Your workspace is ready.',
                )
              )
                setStage(1);
            }}
          >
            <span className="trip-glyph">
              <I name="Store" size={20} />
            </span>
            <h2>A little home for your business</h2>
            <p>Give your workspace a name. You can change it any time.</p>
            <Field label="Workspace name">
              <input required value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="Base currency">
              <select>
                <option>IDR · Indonesian rupiah</option>
              </select>
            </Field>
            <Callout>
              {demoMode
                ? 'Explore with sample data.'
                : 'Add a trip, then publish your first item to open your storefront.'}
            </Callout>
            <Button primary type="submit" icon="ArrowRight">
              Continue
            </Button>
          </form>
        ) : stage === 1 ? (
          <div>
            <span className="trip-glyph">
              <I name="Plane" size={20} />
            </span>
            <h2>Where are you shopping next?</h2>
            <p>A trip brings together your finds, orders, and travel costs.</p>
            <div className="onboarding-options">
              {data.trips
                .filter((t) => t.status !== 'Closed')
                .map((t) => (
                  <div key={t.id}>
                    <strong>{t.name}</strong>
                    <small>
                      {t.city} · {t.dates}
                    </small>
                    <Badge status={t.status} />
                  </div>
                ))}
            </div>
            <div className="message-actions">
              <Button icon="Plus" onClick={() => setDialog({ type: 'trip' })}>
                Create a trip
              </Button>
              <Button primary icon="ArrowRight" onClick={() => setStage(2)}>
                Continue with a trip
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <span className="trip-glyph">
              <I name="Package" size={20} />
            </span>
            <h2>Turn a find into your first listing</h2>
            <p>Add a photo and a price. We’ll work out your margin before you post.</p>
            <div className="onboarding-example">
              <span>Purchase price</span>
              <strong>¥3,000</strong>
              <span>20% markup</span>
              <strong>Rp 378.000 selling price</strong>
              <span>After Rp 20.000 trip allocation</span>
              <strong>Rp 43.000 margin · 11.4%</strong>
            </div>
            <div className="message-actions">
              <Button primary icon="Plus" onClick={() => setDialog({ type: 'item' })}>
                Add your first item
              </Button>
              <Button icon="ExternalLink" onClick={() => navigate('Storefront')}>
                Explore your storefront
              </Button>
            </div>
          </div>
        )}
      </section>
      <div className="onboarding-footer">
        <I name="CheckCircle2" size={14} />
        No customer account needed. Orders arrive in your inbox.
        <button className="text-btn" onClick={() => navigate('Overview')}>
          Go to overview <I name="ArrowRight" size={14} />
        </button>
      </div>
    </>
  );
}
export function Storefront() {
  const {
    data: { items, trips, shop },
    navigate,
    setDialog,
    copy,
    demoMode,
  } = useOps();
  const [q, setQ] = useState(''),
    [trip, setTrip] = useState('all'),
    [category, setCategory] = useState('All'),
    [availability, setAvailability] = useState('All availability');
  const list = items.filter(
    (i) =>
      i.status !== 'Draft' &&
      i.qty > 0 &&
      (trip === 'all' || i.trip === trip) &&
      (category === 'All' || i.category === category) &&
      (availability === 'All availability' || i.status === availability) &&
      i.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <div className="storefront">
      <div className="store-demo-bar">
        <span>
          <I name="Store" size={14} />
          Public storefront
        </span>
        <span>{shop.slug}</span>
        <Button icon="ArrowLeft" onClick={() => navigate('Overview')}>
          Back to workspace
        </Button>
      </div>
      <div className="store-shell">
        <header className="store-header">
          <div className="store-brand">
            <span className="store-monogram">{shop.name.slice(0, 1).toLowerCase()}.</span>
            <div>
              <h2>{shop.name}</h2>
              <span>Thoughtfully found. Happily brought home.</span>
            </div>
          </div>
          <div>
            <button className="text-btn" onClick={() => setDialog({ type: 'track' })}>
              <I name="PackageSearch" size={15} />
              Track order
            </button>
            <button
              className="text-btn"
              disabled={!shop.contact}
              onClick={() =>
                window.open(
                  'https://wa.me/' +
                    shop.contact.replace(/\D/g, '') +
                    '?text=' +
                    encodeURIComponent(
                      `Hi ${shop.name}, I have a question about your travel finds.`,
                    ),
                  '_blank',
                  'noopener,noreferrer',
                )
              }
            >
              <I name="MessageCircle" size={15} />
              Contact
            </button>
          </div>
        </header>
        <section className="store-intro">
          <span className="eyebrow">From there, with care</span>
          <h1>A little closer to your favorite finds.</h1>
          <p>
            {shop.bio}
            <br />
            Browse the trip, find your thing, and we’ll bring it home.
          </p>
          <div className="store-trust">
            <span>
              <I name="Plane" size={14} />
              Next delivery · {trips[0]?.dates || 'Ask your merchant'}
            </span>
            <span>
              <I name="MapPin" size={14} />
              Shipping from {trips[0]?.hub || 'your merchant'}
            </span>
            <span>
              <I name="BadgeCheck" size={14} />
              Personal shopping, personal care
            </span>
          </div>
        </section>
        <div className="store-toolbar">
          <SearchField value={q} onChange={setQ} placeholder="Find something you love…" />
          <TripFilter trips={trips} value={trip} onChange={setTrip} />
          <select
            aria-label="Filter availability"
            value={availability}
            onChange={(e) => setAvailability(e.target.value)}
          >
            <option>All availability</option>
            <option>Available</option>
            <option>Pre-order</option>
          </select>
        </div>
        <div className="store-tabs">
          {['All', 'Beauty', 'Fashion', 'Food & drink'].map((c) => (
            <button
              key={c}
              className={category === c ? 'active' : ''}
              onClick={() => setCategory(c)}
            >
              {c === 'All' ? 'All finds' : c}
            </button>
          ))}
          <span className="spacer" />
          <small>{list.length} finds</small>
        </div>
        <div className="store-grid">
          {list.map((i) => (
            <button
              className="store-product"
              key={i.id}
              onClick={() => setDialog({ type: 'product', item: i })}
            >
              <div className="store-image">
                <ProductArt item={i} />
                <Badge status={i.status} />
              </div>
              <small>{i.category}</small>
              <h3>{i.name}</h3>
              <strong>{money(i.selling)}</strong>
              <span>
                {trips.find((t) => t.id === i.trip)?.name} · {i.qty} left
              </span>
            </button>
          ))}
        </div>
        {!list.length && (
          <Empty
            title="This trip has no items yet"
            text="Follow along for updates, or request something you have in mind."
          />
        )}
        <div className="request-banner">
          <span className="trip-glyph">
            <I name="MessageSquare" size={20} />
          </span>
          <div>
            <h3>Have something in mind?</h3>
            <p>Send a link or a wish. We’ll look for it on our next trip.</p>
          </div>
          <Button icon="ArrowUpRight" onClick={() => setDialog({ type: 'buyer-request' })}>
            Request an item
          </Button>
        </div>
        <footer className="store-footer">
          <span>{shop.name}</span>
          <span>Personal shopping from Japan & Korea</span>
          <button className="text-btn" onClick={() => setDialog({ type: 'report' })}>
            Report storefront
          </button>
          <span>
            Powered by <strong>jastip ops</strong>
          </span>
        </footer>
      </div>
    </div>
  );
}
export function Admin() {
  const {
    data: { merchants, audit },
    page,
    navigate,
    setDialog,
    setDrawer,
    exportCsv,
    demoMode,
    copy,
  } = useOps();
  const [q, setQ] = useState(''),
    [status, setStatus] = useState('All'),
    [plan, setPlan] = useState('All plans');
  const list = merchants.filter(
    (m) =>
      (status === 'All' || m.status === status) &&
      (plan === 'All plans' || m.plan === plan) &&
      `${m.name} ${m.owner}`.toLowerCase().includes(q.toLowerCase()),
  );
  if (!demoMode && ['Metrics', 'Moderation'].includes(page)) return <LiveAdminSummary />;
  if (page === 'Metrics')
    return (
      <>
        <Header
          title="Platform overview"
          description="A clear view of merchants building their businesses."
        />
        <Stats
          stats={[
            {
              label: 'Monthly recurring revenue',
              value: 'Rp 24.8M',
              caption: '+12.8% · illustrative',
              tone: 'green',
            },
            {
              label: 'Active merchants',
              value: demoMode ? '186' : merchants.filter((m) => m.status === 'Active').length,
              caption: '24 joined this month · sample',
            },
            {
              label: 'Activation rate',
              value: '62.4%',
              caption: 'First item within 24 hours · sample',
            },
            {
              label: 'Monthly churn',
              value: '4.2%',
              caption: 'Target: under 6% · sample',
              tone: 'green',
            },
          ]}
        />
        <section className="panel revenue-panel">
          <div className="panel-head">
            <h2>Platform growth</h2>
            <small>Illustrative metrics</small>
          </div>
          <RevenueChart />
        </section>
        <div className="section-title">
          <h2>Merchants needing attention</h2>
          <Button onClick={() => navigate('Merchants')}>View directory</Button>
        </div>
        <section className="panel">
          {merchants
            .filter((m) => ['Trial', 'Past due', 'Suspended'].includes(m.status))
            .map((m) => (
              <button
                key={m.id}
                className="merchant-attention"
                onClick={() => setDrawer({ type: 'merchant', id: m.id })}
              >
                <Avatar name={m.name} />
                <div>
                  <strong>{m.name}</strong>
                  <small>{m.owner}</small>
                </div>
                <Badge status={m.status} />
                <I name="ChevronRight" size={14} />
              </button>
            ))}
        </section>
      </>
    );
  if (page === 'Moderation')
    return (
      <>
        <Header title="Moderation" description="Review reports and keep storefronts trustworthy." />
        <section className="panel">
          <div className="panel-head">
            <h2>Reported listings</h2>
            <span className="count">1</span>
          </div>
          <div className="request-row">
            <span className="trip-glyph">
              <I name="ShieldAlert" />
            </span>
            <div className="request-info">
              <strong>Global luxury hub · Luxury handbag</strong>
              <span>Potentially counterfeit products · 9 Oct 2026</span>
              <p>Seller has been temporarily suspended pending review.</p>
            </div>
            <Badge status={merchants.find((m) => m.id === 'M-006')?.status || 'Suspended'} />
            <Button onClick={() => setDrawer({ type: 'merchant', id: 'M-006' })}>
              Review merchant
            </Button>
          </div>
        </section>
      </>
    );
  if (page === 'Audit')
    return (
      <>
        <Header
          title="Audit log"
          description="Changes recorded with the person and reason attached."
        />
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Merchant</th>
                  <th>Actor</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {audit.map((a) => (
                  <tr key={a.id}>
                    <td>{a.event}</td>
                    <td>{a.merchant}</td>
                    <td>{a.actor}</td>
                    <td>{a.date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!audit.length && (
            <Empty
              title="No changes recorded yet"
              text="Merchant edits, trial extensions, and support sessions will appear here."
            />
          )}
        </section>
      </>
    );
  return (
    <>
      <Header
        title="Merchants"
        description="Manage workspaces, subscriptions, and merchant support."
      >
        <Button icon="Download" onClick={() => exportCsv(list, 'merchants')}>
          Export
        </Button>
        <Button
          primary
          icon="Plus"
          onClick={() =>
            demoMode
              ? setDialog({ type: 'invite-merchant' })
              : copy(location.origin + location.pathname + '#SignUp', 'Merchant sign-up link')
          }
        >
          {demoMode ? 'Invite merchant' : 'Copy merchant sign-up link'}
        </Button>
      </Header>
      <Stats
        stats={[
          {
            label: 'Total merchants',
            value: merchants.length,
            caption: demoMode ? 'Demo directory' : 'Registered workspaces',
          },
          {
            label: 'Active',
            value: merchants.filter((m) => m.status === 'Active').length,
            caption: 'Paid & operating',
            tone: 'green',
          },
          {
            label: 'On trial',
            value: merchants.filter((m) => m.status === 'Trial').length,
            caption: '14-day Pro trial',
          },
          {
            label: 'Needs attention',
            value: merchants.filter((m) => ['Past due', 'Suspended'].includes(m.status)).length,
            caption: 'Billing or moderation',
            tone: 'amber',
          },
        ]}
      />
      <Tabs
        options={['All', 'Active', 'Trial', 'Past due', 'Suspended']}
        value={status}
        onChange={setStatus}
      />
      <div className="toolbar">
        <SearchField value={q} onChange={setQ} placeholder="Search merchants…" />
        <select aria-label="Filter plan" value={plan} onChange={(e) => setPlan(e.target.value)}>
          {['All plans', 'Starter', 'Pro', 'Business'].map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <span className="spacer" />
        <small>{list.length} merchants</small>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Merchant</th>
                <th>Plan</th>
                <th>Status</th>
                <th className="num">Items</th>
                <th className="num">Orders</th>
                <th className="num">MRR</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr
                  key={m.id}
                  tabIndex="0"
                  onClick={() => setDrawer({ type: 'merchant', id: m.id })}
                  onKeyDown={(e) => e.key === 'Enter' && setDrawer({ type: 'merchant', id: m.id })}
                >
                  <td>
                    <div className="customer-cell">
                      <Avatar name={m.name} />
                      <div>
                        <span>{m.name}</span>
                        <small>{m.owner}</small>
                      </div>
                    </div>
                  </td>
                  <td>{m.plan}</td>
                  <td>
                    <Badge status={m.status} />
                  </td>
                  <td className="num">{m.items}</td>
                  <td className="num">{m.orders}</td>
                  <td className="num">{money(m.revenue)}</td>
                  <td>
                    <I name="ChevronRight" size={14} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!list.length && <Empty />}
      </section>
    </>
  );
}
