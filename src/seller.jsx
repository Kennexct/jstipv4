import React, { useEffect, useState } from 'react';
import { useOps } from './store';
import { NeedsToday } from './needs-today';
import {
  money,
  orderProfit,
  stockLabel,
  currencyOf,
  moneyTotals,
  outstanding,
  marginHit,
  owed,
} from './money';
import { tripStatuses, planDetails } from './data';
import { walkthroughDone } from './lib/records';
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
  PayBadge,
  CurrencySwitch,
} from './ui';
// Selling currencies in use, most-used first; the choice is remembered for the session.
export function useViewCurrency() {
  const {
    data: { trips, orders },
  } = useOps();
  const count = (c) => orders.filter((o) => currencyOf(o, trips) === c).length;
  const options = [...new Set(trips.map((t) => t.baseCurrency || 'IDR'))].sort(
    (a, b) => count(b) - count(a),
  );
  const [pick, setPick] = useState(() => {
    try {
      return sessionStorage.getItem('jo-view-currency');
    } catch {
      return null;
    }
  });
  const currency = options.includes(pick) ? pick : options[0] || 'IDR';
  const set = (c) => {
    setPick(c);
    try {
      sessionStorage.setItem('jo-view-currency', c);
    } catch {}
  };
  return [currency, set, options.length ? options : ['IDR']];
}
export function OrdersTable({ orders, compact = false, selected = [], onSelect }) {
  const { setDrawer, demoMode, data } = useOps();
  return (
    <div className="table-wrap orders-table">
      <table>
        <thead>
          <tr>
            {onSelect && (
              <th>
                <input
                  type="checkbox"
                  aria-label="Select all orders"
                  checked={orders.length > 0 && orders.every((o) => selected.includes(o.id))}
                  onChange={(e) => onSelect(e.target.checked ? orders.map((o) => o.id) : [])}
                />
              </th>
            )}
            <th>Order / Customer</th>
            <th>Item</th>
            <th>Status</th>
            {!compact && <th>Source</th>}
            <th className="num">Amount</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr
              key={o.id}
              tabIndex="0"
              onClick={() => setDrawer({ type: 'order', id: o.id })}
              onKeyDown={(e) => e.key === 'Enter' && setDrawer({ type: 'order', id: o.id })}
            >
              {onSelect && (
                <td className="o-check" onClick={(e) => e.stopPropagation()}>
                  <input
                    type="checkbox"
                    aria-label={'Select ' + o.id}
                    checked={selected.includes(o.id)}
                    onChange={(e) =>
                      onSelect(
                        e.target.checked
                          ? [...selected, o.id]
                          : selected.filter((id) => id !== o.id),
                      )
                    }
                  />
                </td>
              )}
              <td className="o-cust">
                <div className="customer-cell">
                  <Avatar name={o.name} small />
                  <div>
                    <span>{o.name}</span>
                    <small className="mono">{o.id}</small>
                  </div>
                </div>
              </td>
              <td className="o-item">
                <span className="item-title">{o.item}</span>
                <small>
                  {o.qty} {o.qty === 1 ? 'item' : 'items'} · {o.date}
                </small>
              </td>
              <td className="o-status">
                <Badge status={o.status} />
              </td>
              {!compact && <td className="muted o-source">{o.source}</td>}
              <td className="num o-amount">
                {money(owed(o), false, currencyOf(o, data.trips))}
                <small className={outstanding(o) > 0 ? 'amber' : ''}>
                  {o.status === 'Cancelled'
                    ? 'Cancelled'
                    : outstanding(o) <= 0
                      ? 'Fully paid'
                      : o.paid
                        ? money(o.paid, false, currencyOf(o, data.trips)) + ' paid'
                        : 'Awaiting payment'}
                </small>
              </td>
              <td className="o-go">
                <I name="ChevronRight" size={14} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!orders.length && <Empty />}
    </div>
  );
}
export function Overview() {
  const { data, navigate, setDialog, demoMode, role } = useOps();
  const { orders, trips, items } = data;
  const [currency, setCurrency, currencies] = useViewCurrency();
  const live = orders.filter((o) => o.status !== 'Cancelled' && currencyOf(o, trips) === currency),
    revenue = live.reduce((a, o) => a + o.total, 0),
    profit = live.reduce((a, o) => a + orderProfit(o), 0),
    open = live.filter((o) => o.status !== 'Delivered'),
    pending = live.filter((o) => o.status === 'Requested'),
    unpaid = live.reduce((a, o) => a + outstanding(o), 0);
  return (
    <>
      <Header
        title={demoMode ? 'Good afternoon, Rina' : 'Your workspace at a glance'}
        description={
          new Date().toLocaleDateString('en-GB', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
            year: 'numeric',
          }) + ' · Here’s how your business is doing.'
        }
      >
        <CurrencySwitch value={currency} options={currencies} onChange={setCurrency} />
        <Button icon="ExternalLink" onClick={() => navigate('Storefront')}>
          View storefront
        </Button>
        <Button primary icon="Plus" onClick={() => setDialog({ type: 'item' })}>
          Add item
        </Button>
      </Header>
      <NeedsToday />
      <Stats
        stats={[
          {
            label: 'Total revenue',
            value: money(revenue, true, currency),
            caption: demoMode ? '+18.6% · illustrative comparison' : 'Non-cancelled orders',
            tone: 'green',
            icon: 'Wallet',
          },
          {
            label: 'Estimated profit',
            value: money(profit, true, currency),
            caption: 'After product & trip costs',
            icon: 'TrendingUp',
          },
          {
            label: 'Average margin',
            value: (revenue ? (profit / revenue) * 100 : 0).toFixed(1) + '%',
            caption: 'Based on saved order snapshots',
            icon: 'ChartNoAxesCombined',
          },
          {
            label: 'Open orders',
            value: String(open.length).padStart(2, '0'),
            caption: `${pending.length} requests to review`,
            tone: 'amber',
            icon: 'Inbox',
          },
        ]}
      />
      {!walkthroughDone(data) && role === 'Owner' ? (
        <div className="attention">
          <I name="Sparkles" />
          <div>
            <strong>Start your workspace walkthrough</strong>
            <span>
              Set your shop details, plan your first shopping trip, and add your first find.
            </span>
          </div>
          <Button primary icon="ArrowRight" onClick={() => navigate('Welcome')}>
            Start walkthrough
          </Button>
        </div>
      ) : (
        <div className="attention">
          <I name="CircleAlert" />
          <div>
            <strong>A little attention goes a long way</strong>
            <span>
              {pending.length} new requests and {money(unpaid, false, currency)} in outstanding
              payments.
            </span>
          </div>
          <Button icon="ArrowRight" onClick={() => navigate('Orders')}>
            Review orders
          </Button>
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel revenue-panel">
          <div className="panel-head">
            <h2>Revenue overview</h2>
            <span className="micro muted">
              {demoMode ? 'October · Sample trend' : 'Saved order totals'}
            </span>
          </div>
          <div className="chart-summary">
            <strong>{money(revenue, false, currency)}</strong>
            <span className="muted">
              {demoMode ? '18.6% vs. last month · sample' : 'Non-cancelled orders · all time'}
            </span>
          </div>
          <RevenueChart currency={currency} />
        </section>
        <section className="panel active-trips">
          <div className="panel-head">
            <h2>
              Active trips{' '}
              <span className="count">{trips.filter((t) => t.status !== 'Closed').length}</span>
            </h2>
            <button className="text-btn" onClick={() => navigate('Trips')}>
              View all <I name="ArrowUpRight" size={13} />
            </button>
          </div>
          {trips
            .filter((t) => t.status !== 'Closed')
            .map((t) => (
              <button
                key={t.id}
                className="trip-summary"
                onClick={() => {
                  sessionStorage.setItem('jo-trip', t.id);
                  navigate('Trips');
                }}
              >
                <div className="trip-top">
                  <span className="trip-glyph">
                    <I name="Plane" size={17} />
                  </span>
                  <Badge status={t.status} />
                </div>
                <strong>{t.name}</strong>
                <span className="muted">
                  {t.city} <I name="ArrowRight" size={12} /> {t.hub}
                </span>
                <div className="trip-meta">
                  <span>
                    <I name="Calendar" size={12} />
                    {t.dates}
                  </span>
                  <span>{items.filter((i) => i.trip === t.id).length} items</span>
                </div>
                <Progress value={t.budget ? (t.actual / t.budget) * 100 : 0} />
                <div className="trip-budget">
                  <span>Budget used</span>
                  <span>{Math.round(t.budget ? (t.actual / t.budget) * 100 : 0)}%</span>
                </div>
              </button>
            ))}
        </section>
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>
            Recent orders <span className="count">{orders.length}</span>
          </h2>
          <button className="text-btn" onClick={() => navigate('Orders')}>
            View all orders <I name="ArrowRight" size={13} />
          </button>
        </div>
        <OrdersTable orders={orders.slice(0, 5)} compact />
        <div className="panel-foot">
          <span>
            <i className="sync-dot" />
            All orders are up to date
          </span>
          <span>Updated just now</span>
        </div>
      </section>
      <div className="dashboard-bottom">
        <div>
          <I name="Globe" size={16} />
          <span>1 JPY = Rp 105</span>
          <small>Exchange rates are set per trip</small>
          <button className="text-btn" onClick={() => navigate('Settings')}>
            Manage rates <I name="ArrowUpRight" size={12} />
          </button>
        </div>
        <span className="muted">
          <I name="Sparkles" size={14} /> A calmer way to run your jastip.
        </span>
      </div>
    </>
  );
}
export function Orders() {
  const {
    data: { orders, trips },
    setDialog,
    change,
    exportCsv,
    announce,
  } = useOps();
  const [status, setStatus] = useState('All'),
    [q, setQ] = useState(''),
    [trip, setTrip] = useState('all'),
    [selected, setSelected] = useState([]);
  const list = orders.filter(
    (o) =>
      (status === 'All' ||
        (status === 'Unpaid' && outstanding(o) > 0 && o.status !== 'Cancelled') ||
        o.status === status) &&
      (trip === 'all' || o.trip === trip) &&
      `${o.name} ${o.id} ${o.item}`.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Header title="Orders" description="Every order, from first request to their front door.">
        <Button icon="Download" onClick={() => exportCsv(list, 'orders')}>
          Export
        </Button>
        <Button primary icon="Plus" onClick={() => setDialog({ type: 'manual-order' })}>
          Add order
        </Button>
      </Header>
      <Tabs
        options={[
          'All',
          'Requested',
          'Quoted',
          'Confirmed',
          'Paid',
          'Purchased',
          'Shipped',
          'Delivered',
          'Unpaid',
        ]}
        value={status}
        onChange={setStatus}
      />
      <div className="toolbar">
        <SearchField value={q} onChange={setQ} placeholder="Search orders…" />
        <TripFilter trips={trips} value={trip} onChange={setTrip} />
        <span className="spacer" />
        <span className="muted">{list.length} orders</span>
      </div>
      {selected.length > 0 && (
        <div className="selection-bar">
          {selected.length} selected
          <Button
            onClick={() => {
              const eligible = orders.filter(
                (o) => selected.includes(o.id) && ['Requested', 'Quoted'].includes(o.status),
              ).length;
              if (!eligible) {
                announce('Only requested or quoted orders can be confirmed.');
                return;
              }
              change(
                (d) => ({
                  ...d,
                  orders: d.orders.map((o) =>
                    selected.includes(o.id) && ['Requested', 'Quoted'].includes(o.status)
                      ? { ...o, status: 'Confirmed' }
                      : o,
                  ),
                }),
                `${eligible} ${eligible === 1 ? 'order' : 'orders'} confirmed.`,
              );
              setSelected([]);
            }}
          >
            Confirm orders
          </Button>
          <Button icon="Copy" onClick={() => setDialog({ type: 'reminders', ids: selected })}>
            Copy reminders
          </Button>
          <Button icon="Send" onClick={() => setDialog({ type: 'ship', ids: selected })}>
            Mark shipped
          </Button>
          <Button
            icon="Download"
            onClick={() =>
              exportCsv(
                orders.filter((o) => selected.includes(o.id)),
                'orders-selected',
              )
            }
          >
            Export
          </Button>
          <Button onClick={() => setSelected([])}>Clear</Button>
        </div>
      )}
      <section className="panel">
        <OrdersTable orders={list} selected={selected} onSelect={setSelected} />
      </section>
    </>
  );
}
export function Items() {
  const {
    data: { items, trips },
    setDialog,
    navigate,
    change,
    role,
  } = useOps();
  const [status, setStatus] = useState('All'),
    [q, setQ] = useState(''),
    [trip, setTrip] = useState('all');
  const list = items.filter(
    (i) =>
      (status === 'All' || i.status === status) &&
      (trip === 'all' || i.trip === trip) &&
      i.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Header title="Items" description="Your finds, priced with confidence and ready to share.">
        <Button icon="ExternalLink" onClick={() => navigate('Storefront')}>
          View storefront
        </Button>
        <Button primary icon="Plus" onClick={() => setDialog({ type: 'item' })}>
          Add item
        </Button>
      </Header>
      <Tabs
        options={['All', 'Available', 'Pre-order', 'Draft']}
        value={status}
        onChange={setStatus}
      />
      <div className="toolbar">
        <SearchField value={q} onChange={setQ} placeholder="Search items…" />
        <TripFilter trips={trips} value={trip} onChange={setTrip} />
        <span className="spacer" />
        <span className="muted">{list.length} items</span>
      </div>
      <div className="items-grid">
        {list.map((i) => (
          <article key={i.id} className="item-card">
            <button
              className="product-open"
              aria-label={'Edit ' + i.name}
              onClick={() => setDialog({ type: 'item', item: i })}
            >
              <ProductArt item={i} />
            </button>
            <div className="item-content">
              <div className="item-category">
                <span>{i.category}</span>
                <Badge status={i.status} />
              </div>
              <button className="item-name" onClick={() => setDialog({ type: 'item', item: i })}>
                {i.name}
              </button>
              <span className="muted">{trips.find((t) => t.id === i.trip)?.name}</span>
              <div className="item-price">
                <strong>{money(i.selling, false, currencyOf(i, trips))}</strong>
                <small>{stockLabel(i)}</small>
              </div>
              {role !== 'Helper' && (
                <div className="item-margin">
                  <span>Estimated margin</span>
                  <span className={i.selling - i.cost - i.allocation < 0 ? 'red' : ''}>
                    {(((i.selling - i.cost - i.allocation) / i.selling) * 100).toFixed(1)}%
                  </span>
                </div>
              )}
              <div className="item-actions">
                <button className="text-btn" onClick={() => setDialog({ type: 'item', item: i })}>
                  <I name="Pencil" size={13} />
                  Edit item
                </button>
                <button
                  className="icon-btn"
                  aria-label={'Duplicate ' + i.name}
                  onClick={() =>
                    change(
                      (d) => ({
                        ...d,
                        items: [
                          {
                            ...i,
                            id: 'IT-' + Date.now(),
                            name: i.name + ' (copy)',
                            status: 'Draft',
                          },
                          ...d.items,
                        ],
                      }),
                      `${i.name} duplicated as a draft.`,
                    )
                  }
                >
                  <I name="Copy" size={14} />
                </button>
              </div>
            </div>
          </article>
        ))}
      </div>
      {!list.length && (
        <Empty title="No items found">
          <Button primary onClick={() => setDialog({ type: 'item' })}>
            Add item
          </Button>
        </Empty>
      )}
    </>
  );
}
export function Requests() {
  const {
    data: { orders },
    setDialog,
  } = useOps();
  const pending = orders.filter((o) => o.status === 'Requested');
  return (
    <>
      <Header
        title="Custom requests"
        description="Find something special. Quote it with a clear margin."
      >
        <Button primary icon="Plus" onClick={() => setDialog({ type: 'request' })}>
          Add request
        </Button>
      </Header>
      <Callout icon="MessageSquare">
        Requests from your storefront arrive here. Use the shared margin calculator to prepare a
        quote.
      </Callout>
      <section className="panel">
        <div className="panel-head">
          <h2>Needs a quote</h2>
          <span className="count">{pending.length}</span>
        </div>
        {pending.map((o) => (
          <div className="request-row" key={o.id}>
            <Avatar name={o.name} />
            <div className="request-info">
              <strong>{o.item}</strong>
              <span>
                {o.name} · {o.qty} items · {o.source}
              </span>
              {o.note && <p>“{o.note}”</p>}
              {o.photos?.length > 0 && (
                <div className="reference-photos">
                  {o.photos.map((photo, index) => (
                    <img key={index} src={photo} alt={'Buyer reference ' + (index + 1)} />
                  ))}
                </div>
              )}
              {o.link && (
                <a href={o.link} target="_blank" rel="noreferrer">
                  Reference link
                </a>
              )}
            </div>
            <Badge status={o.status} />
            <Button icon="ArrowUpRight" onClick={() => setDialog({ type: 'quote', order: o })}>
              Prepare quote
            </Button>
          </div>
        ))}
        {!pending.length && (
          <Empty
            title="All requests are quoted"
            text="New requests will appear here when customers submit them."
          />
        )}
      </section>
    </>
  );
}
export function Trips() {
  const {
    data: { trips, budgets, orders },
    change,
    setDialog,
    role,
    support,
  } = useOps();
  const [id, setId] = useState(() => sessionStorage.getItem('jo-trip') || trips[0]?.id || ''),
    [view, setView] = useState('All');
  // A newly created trip becomes the selected one.
  useEffect(() => {
    const created = sessionStorage.getItem('jo-trip');
    if (created && trips.some((t) => t.id === created)) setId(created);
  }, [trips.length]);
  if (!trips.length)
    return (
      <>
        <Header title="Trips" description="Create a trip before adding items and orders.">
          <Button primary onClick={() => setDialog({ type: 'trip' })}>
            New trip
          </Button>
        </Header>
        <Empty
          title="Plan your first trip"
          text="Add your destination, dates and budget to get started."
        />
      </>
    );
  // Active trips first (in workflow order), closed trips last.
  const order = ['Shopping', 'Open for orders', 'Delivering', 'Planning', 'Closed'],
    sorted = [...trips].sort(
      (a, b) =>
        order.indexOf(a.status) - order.indexOf(b.status) ||
        String(b.start || '').localeCompare(String(a.start || '')),
    ),
    filters = [
      ['All', () => true],
      ['Active', (tr) => tr.status !== 'Closed'],
      ['Planning', (tr) => tr.status === 'Planning'],
      ['Open for orders', (tr) => tr.status === 'Open for orders'],
      ['Closed', (tr) => tr.status === 'Closed'],
    ],
    visible = sorted.filter(filters.find(([name]) => name === view)[1]);
  const t = trips.find((t) => t.id === id) || visible[0] || sorted[0],
    lines = budgets.filter((b) => b.trip === t.id),
    os = orders.filter((o) => o.trip === t.id && o.status !== 'Cancelled'),
    revenue = os.reduce((a, o) => a + o.total, 0),
    cost = os.reduce((a, o) => a + (o.actualCost ?? o.quotedCost) * o.qty, 0),
    result = revenue - cost - t.actual,
    tcur = t.baseCurrency || 'IDR';
  return (
    <>
      <Header title="Trips" description="A clear plan for where you’re going and what you’ll earn.">
        <Button primary icon="Plus" onClick={() => setDialog({ type: 'trip' })}>
          New trip
        </Button>
      </Header>
      <div className="trip-filters" role="group" aria-label="Filter trips by status">
        {filters.map(([name, test]) => (
          <button
            key={name}
            className={`chip ${view === name ? 'active' : ''}`}
            aria-pressed={view === name}
            onClick={() => {
              setView(name);
              const first = sorted.find(test);
              if (first && !test(t)) {
                setId(first.id);
                sessionStorage.setItem('jo-trip', first.id);
              }
            }}
          >
            {name} <span className="chip-count">{trips.filter(test).length}</span>
          </button>
        ))}
      </div>
      <div className="trip-selector">
        {visible.map((tr) => (
          <button
            key={tr.id}
            className={`${t.id === tr.id ? 'selected' : ''} ${tr.status === 'Closed' ? 'closed' : ''}`}
            aria-pressed={t.id === tr.id}
            onClick={() => {
              setId(tr.id);
              sessionStorage.setItem('jo-trip', tr.id);
            }}
          >
            <I name={tr.status === 'Closed' ? 'LockKeyhole' : 'Plane'} />
            <div>
              <strong>{tr.name}</strong>
              <small>{tr.dates}</small>
              <Badge status={tr.status} />
            </div>
          </button>
        ))}
        {!visible.length && (
          <p className="muted trip-filter-empty">No {view.toLowerCase()} trips yet.</p>
        )}
      </div>
      <section className="panel trip-detail">
        <div className="panel-head">
          <div>
            <h2>{t.name}</h2>
            <p>
              {t.city} → {t.hub} · {t.dates} · Buy in {t.currency} · Sell in {tcur}
            </p>
          </div>
          <select
            aria-label="Trip status"
            disabled={t.status === 'Closed' || support}
            value={t.status}
            onChange={(e) =>
              change(
                (d) => ({
                  ...d,
                  trips: d.trips.map((tr) =>
                    tr.id === t.id ? { ...tr, status: e.target.value } : tr,
                  ),
                }),
                `${t.name} moved to ${e.target.value}.`,
              )
            }
          >
            {tripStatuses.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        <Stats
          stats={[
            {
              label: 'Order revenue',
              value: money(revenue, true, tcur),
              caption: `${os.length} recorded orders`,
            },
            {
              label: 'Planned budget',
              value: money(t.budget, true, tcur),
              caption: `${lines.length} expense categories`,
            },
            {
              label: 'Actual spend',
              value: money(t.actual, true, tcur),
              caption: `${t.budget ? Math.round(t.budget ? (t.actual / t.budget) * 100 : 0) : 0}% of planned budget`,
            },
            {
              label: 'Allocation / item',
              value: money(
                t.allocation === 'none' ? 0 : Math.round(t.actual / t.units),
                false,
                tcur,
              ),
              caption:
                t.allocation === 'none' ? 'No trip cost allocation' : 'Based on expected units',
            },
          ]}
        />
      </section>
      <div className="section-title">
        <div>
          <h2>Trip budget</h2>
          <p>Record real costs to keep your margin honest.</p>
        </div>
        <Button
          icon="Plus"
          disabled={t.status === 'Closed'}
          onClick={() => setDialog({ type: 'budget', trip: t })}
        >
          Add expense
        </Button>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table className="budget-table">
            <thead>
              <tr>
                <th>Category</th>
                <th>Description</th>
                <th className="num">Planned</th>
                <th className="num">Actual</th>
                <th>Budget used</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {lines.map((b) => (
                <tr key={b.id}>
                  <td>
                    <span className="category-icon">
                      <I
                        name={
                          b.category === 'Flight'
                            ? 'Plane'
                            : b.category === 'Hotel'
                              ? 'BedDouble'
                              : b.category === 'Meals'
                                ? 'Utensils'
                                : 'Wallet'
                        }
                        size={14}
                      />
                      {b.category}
                    </span>
                  </td>
                  <td className="muted">{b.description}</td>
                  <td className="num">{money(b.planned, false, tcur)}</td>
                  <td className="num">{money(b.actual, false, tcur)}</td>
                  <td>
                    <div className="budget-progress">
                      <Progress value={b.planned ? (b.actual / b.planned) * 100 : 0} />
                      <small>{b.planned ? Math.round((b.actual / b.planned) * 100) : 0}%</small>
                    </div>
                  </td>
                  <td>
                    <button
                      className="icon-btn"
                      aria-label={'Edit ' + b.category}
                      disabled={t.status === 'Closed'}
                      onClick={() => setDialog({ type: 'budget', budget: b, trip: t })}
                    >
                      <I name="Pencil" size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan="2">Total</td>
                <td className="num">{money(t.budget, false, tcur)}</td>
                <td className="num">{money(t.actual, false, tcur)}</td>
                <td colSpan="2" className={t.actual > t.budget ? 'red' : 'green'}>
                  {t.actual > t.budget ? 'Over budget' : 'Within budget'}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
        {!lines.length && (
          <Empty
            title="No expenses recorded"
            text="Add planned and actual expenses to build your trip budget."
          />
        )}
      </section>
      <div className="allocation-panel">
        <div>
          <h3>Cost allocation</h3>
          <p>How travel expenses contribute to each item’s landed cost.</p>
        </div>
        <select
          aria-label="Cost allocation"
          disabled={t.status === 'Closed' || support}
          value={t.allocation}
          onChange={(e) =>
            change(
              (d) => ({
                ...d,
                trips: d.trips.map((tr) =>
                  tr.id === t.id ? { ...tr, allocation: e.target.value } : tr,
                ),
              }),
              'Trip cost allocation updated.',
            )
          }
        >
          <option value="none">No allocation</option>
          <option value="even">Split evenly per item</option>
          <option value="value">By purchase value</option>
        </select>
      </div>
      {role !== 'Helper' && (
        <section className="panel trip-results">
          <div className="panel-head">
            <h2>Trip result so far</h2>
            <small>Recorded orders · full trip expenses</small>
          </div>
          <dl className="details-list">
            <dt>Product cost</dt>
            <dd>{money(cost, false, tcur)}</dd>
            <dt>Net result</dt>
            <dd className={result < 0 ? 'red' : 'green'}>
              {money(result, false, tcur)} ·{' '}
              {revenue ? ((result / revenue) * 100).toFixed(1) + '%' : '—'}
            </dd>
          </dl>
        </section>
      )}
      {t.status === 'Closed' && (
        <Callout icon="LockKeyhole">
          This trip is closed. Its financial records are read-only.
        </Callout>
      )}
    </>
  );
}
export function Purchasing() {
  const {
    data: { orders, items, trips },
    setDialog,
    updateOrder,
    exportCsv,
    role,
    demoMode,
  } = useOps();
  const [trip, setTrip] = useState('all'),
    [view, setView] = useState('Checklist'),
    [currency, setCurrency, currencies] = useViewCurrency();
  // Confirmed orders can be bought before the customer pays in full; only the DP must be in.
  const list = orders.filter(
    (o) =>
      ['Confirmed', 'Paid', 'Purchased'].includes(o.status) &&
      currencyOf(o, trips) === currency &&
      (trip === 'all' || o.trip === trip),
  );
  const toBuy = list.filter((o) => o.status !== 'Purchased'),
    bought = list.filter((o) => o.status === 'Purchased'),
    toCollect = list.reduce((sum, o) => sum + outstanding(o), 0),
    dpDue = toBuy.filter((o) => (o.deposit || 0) > o.paid);
  const store = (o) => items.find((i) => i.id === o.itemId)?.store || 'Other';
  const stores = [...new Set(list.map(store))];
  const recap = Object.values(
    list.reduce((acc, o) => {
      const key = o.itemId || 'request:' + o.item;
      const row = (acc[key] ||= {
        item: o.item,
        store: store(o),
        units: 0,
        bought: 0,
        orders: 0,
        estimate: 0,
        outstanding: 0,
      });
      row.units += o.qty;
      row.bought += o.status === 'Purchased' ? o.qty : 0;
      row.orders += 1;
      row.estimate += (o.quotedCost || 0) * o.qty;
      row.outstanding += outstanding(o);
      return acc;
    }, {}),
  ).sort((x, y) => y.units - y.bought - (x.units - x.bought));
  const canPurchase = (o) => role !== 'Helper' && o.status !== 'Purchased';
  return (
    <>
      <Header
        title="Purchase checklist"
        description="Everything confirmed for this trip, ready for your shopping day and your end-of-trip recap."
      >
        <CurrencySwitch value={currency} options={currencies} onChange={setCurrency} />
        {list.length > 0 && (
          <Button
            icon="Download"
            onClick={() =>
              exportCsv(
                recap.map((r) => ({
                  Item: r.item,
                  Store: r.store,
                  'Units ordered': r.units,
                  'Units purchased': r.bought,
                  Orders: r.orders,
                  ...(role === 'Helper' ? {} : { 'Estimated cost': r.estimate }),
                  Outstanding: r.outstanding,
                })),
                'purchase-recap',
              )
            }
          >
            Export recap
          </Button>
        )}
      </Header>
      <Stats
        stats={[
          {
            label: 'To buy',
            value: toBuy.length,
            caption: `${toBuy.reduce((n, o) => n + o.qty, 0)} units`,
            icon: 'ShoppingBag',
          },
          {
            label: 'Purchased',
            value: bought.length,
            caption: `${bought.reduce((n, o) => n + o.qty, 0)} units`,
            icon: 'Check',
          },
          {
            label: 'Still to collect',
            value: money(toCollect, false, currency),
            caption: toCollect ? 'Remind before shipping' : 'All paid',
            tone: toCollect ? 'amber' : '',
            icon: 'Wallet',
          },
          {
            label: 'DP due',
            value: dpDue.length,
            caption: dpDue.length ? 'Collect before buying' : 'None waiting',
            tone: dpDue.length ? 'amber' : '',
            icon: 'CircleAlert',
          },
        ]}
      />
      <div className="toolbar purchase-toolbar">
        <TripFilter trips={trips} value={trip} onChange={setTrip} />
        <Tabs options={['Checklist', 'Recap by item']} value={view} onChange={setView} />
        <span className="spacer" />
        <span className="muted">
          {bought.length} of {list.length} purchased
        </span>
      </div>
      {view === 'Recap by item' && list.length > 0 && (
        <section className="panel">
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Item</th>
                  <th>Store</th>
                  <th>Units</th>
                  <th>Purchased</th>
                  <th>Orders</th>
                  {role !== 'Helper' && <th>Estimated cost</th>}
                  <th>Outstanding</th>
                </tr>
              </thead>
              <tbody>
                {recap.map((r) => (
                  <tr key={r.item + r.store}>
                    <td>
                      <strong>{r.item}</strong>
                    </td>
                    <td>{r.store}</td>
                    <td className="mono">{r.units}</td>
                    <td className="mono">
                      {r.bought} / {r.units}
                    </td>
                    <td className="mono">{r.orders}</td>
                    {role !== 'Helper' && (
                      <td className="mono">{money(r.estimate, false, currency)}</td>
                    )}
                    <td className={`mono ${r.outstanding ? 'amber' : ''}`}>
                      {money(r.outstanding, false, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
      {view === 'Checklist' &&
        stores.map((s) => (
          <section className="panel purchase-store" key={s}>
            <div className="panel-head">
              <h2>
                <I name="Store" size={15} />
                {s}
              </h2>
              <small>{list.filter((o) => store(o) === s).length} orders</small>
            </div>
            {list
              .filter((o) => store(o) === s)
              .map((o) => (
                <div className="purchase-row" key={o.id}>
                  <input
                    type="checkbox"
                    aria-label={'Mark ' + o.item + ' purchased'}
                    disabled={!demoMode && !canPurchase(o)}
                    checked={o.status === 'Purchased'}
                    onChange={(e) =>
                      e.target.checked
                        ? (o.deposit || 0) > o.paid
                          ? updateOrder(o.id, { status: 'Purchased' })
                          : setDialog({ type: 'purchase', order: o })
                        : demoMode &&
                          updateOrder(o.id, {
                            status: o.paid >= o.total ? 'Paid' : 'Confirmed',
                            actualCost: null,
                          })
                    }
                  />
                  <div>
                    <strong className={o.status === 'Purchased' ? 'completed' : ''}>
                      {o.item}
                    </strong>
                    <small>
                      Qty {o.qty} · {o.name} · {o.id}
                    </small>
                  </div>
                  <span className="muted">
                    {role === 'Helper'
                      ? 'Manager records purchase cost'
                      : money(o.quotedCost * o.qty, false, currency) + ' estimated'}
                  </span>
                  <span className="purchase-badges">
                    <PayBadge order={o} />
                    <Badge status={o.status} />
                  </span>
                  {role !== 'Helper' && ['Confirmed', 'Paid'].includes(o.status) && (
                    <button
                      className="text-btn cant-buy"
                      onClick={() => setDialog({ type: 'unavailable', id: o.id })}
                    >
                      Can’t buy
                    </button>
                  )}
                </div>
              ))}
          </section>
        ))}
      {!list.length && (
        <Empty
          title="Nothing to buy yet"
          text="Confirmed orders appear here, paid or not, ready for your next shopping day."
        />
      )}
    </>
  );
}
export function Reports() {
  const {
    data: { orders, trips, items },
    exportCsv,
  } = useOps();
  const [trip, setTrip] = useState('all'),
    [period, setPeriod] = useState('All time'),
    [group, setGroup] = useState('By trip'),
    [currency, setCurrency, currencies] = useViewCurrency();
  const list = orders.filter(
    (o) =>
      o.status !== 'Cancelled' &&
      currencyOf(o, trips) === currency &&
      (trip === 'all' || o.trip === trip) &&
      (period === 'All time' ||
        (period === 'This month' &&
          (o.createdAt || o.date).startsWith(new Date().toISOString().slice(0, 7))) ||
        (period === 'Previous month' &&
          (o.createdAt || o.date).startsWith(
            new Date(new Date().getFullYear(), new Date().getMonth() - 1, 15)
              .toISOString()
              .slice(0, 7),
          ))),
  );
  const revenue = list.reduce((a, o) => a + o.total, 0),
    cost = list.reduce((a, o) => a + (o.actualCost ?? o.quotedCost) * o.qty, 0),
    net = list.reduce((a, o) => a + orderProfit(o), 0),
    unpaid = list.reduce((a, o) => a + outstanding(o), 0),
    hits = list.filter((o) => marginHit(o) > 0);
  const entities =
    group === 'By trip'
      ? trips
          .filter((t) => (t.baseCurrency || 'IDR') === currency)
          .map((t) => ({ name: t.name, match: (o) => o.trip === t.id }))
      : group === 'By product'
        ? items.map((i) => ({ name: i.name, match: (o) => o.itemId === i.id }))
        : [
            ...new Map(
              list.map((o) => [o.phone, { name: o.name, match: (a) => a.phone === o.phone }]),
            ).values(),
          ];
  const rows = entities
    .map((e) => {
      const os = list.filter(e.match),
        r = os.reduce((a, o) => a + o.total, 0),
        p = os.reduce((a, o) => a + orderProfit(o), 0);
      return {
        name: e.name,
        orders: os.length,
        revenue: r,
        profit: p,
        margin: r ? ((p / r) * 100).toFixed(1) + '%' : '—',
      };
    })
    .filter((r) => r.orders);
  return (
    <>
      <Header title="Reports" description="Understand what made money, and what you can improve.">
        <CurrencySwitch value={currency} options={currencies} onChange={setCurrency} />
        <Button icon="Download" onClick={() => exportCsv(rows, 'sales-report')}>
          Export CSV
        </Button>
      </Header>
      <div className="toolbar">
        <select
          aria-label="Report period"
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
        >
          <option>This month</option>
          <option>Previous month</option>
          <option>All time</option>
        </select>
        <TripFilter trips={trips} value={trip} onChange={setTrip} />
      </div>
      <Stats
        stats={[
          {
            label: 'Revenue',
            value: money(revenue, true, currency),
            caption: 'Across selected orders',
          },
          {
            label: 'Product cost',
            value: money(cost, true, currency),
            caption: 'Stored purchase estimates',
          },
          {
            label: 'Net profit',
            value: money(net, true, currency),
            caption: hits.length
              ? `${hits.length} ${hits.length === 1 ? 'order' : 'orders'} cost more in store (−${money(
                  hits.reduce((a, o) => a + marginHit(o), 0),
                  true,
                  currency,
                )})`
              : 'After allocated trip costs',
          },
          {
            label: 'Outstanding',
            value: money(unpaid, true, currency),
            caption: 'Follow up with customers',
            tone: 'amber',
          },
        ]}
      />
      <div className="dashboard-grid">
        <section className="panel revenue-panel">
          <div className="panel-head">
            <h2>Revenue trend</h2>
            <small>Illustrative · {period}</small>
          </div>
          <RevenueChart currency={currency} />
        </section>
        <section className="panel margin-report">
          <div className="panel-head">
            <h2>Estimated vs. actual margin</h2>
          </div>
          {list.slice(0, 4).map((o) => (
            <div className="margin-compare" key={o.id}>
              <span>{o.item}</span>
              <div>
                <span>
                  {o.total ? ((orderProfit(o, false) / o.total) * 100).toFixed(1) : 0}%{' '}
                  <small>estimated</small>
                </span>
                <span>
                  {o.actualCost != null ? ((orderProfit(o) / o.total) * 100).toFixed(1) + '%' : '—'}{' '}
                  <small>actual</small>
                </span>
              </div>
              <Progress value={o.total ? (orderProfit(o, false) / o.total) * 100 : 0} />
            </div>
          ))}
          {!list.length && <Empty title="No orders in this period" />}
        </section>
      </div>
      <Tabs options={['By trip', 'By product', 'By customer']} value={group} onChange={setGroup} />
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>{group.replace('By ', '')}</th>
                <th className="num">Orders</th>
                <th className="num">Revenue</th>
                <th className="num">Profit</th>
                <th className="num">Margin</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.name}>
                  <td>{r.name}</td>
                  <td className="num">{r.orders}</td>
                  <td className="num">{money(r.revenue, false, currency)}</td>
                  <td className="num">{money(r.profit, false, currency)}</td>
                  <td className="num">{r.margin}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!rows.length && (
          <Empty
            title="No sales in this period"
            text="Choose another period or trip to see its results."
          />
        )}
      </section>
      <p className="footnote">
        Trend charts are illustrative. Revenue and profit derive from saved order snapshots.
      </p>
    </>
  );
}
export function Customers() {
  const {
    data: { orders, customers, trips },
    setDialog,
    setDrawer,
    exportCsv,
    creditFor,
  } = useOps();
  const [q, setQ] = useState('');
  const list = [...new Map([...orders, ...customers].map((c) => [c.phone, c])).values()].filter(
    (c) => c.name.toLowerCase().includes(q.toLowerCase()),
  );
  return (
    <>
      <Header title="Customers" description="The people who trust you to bring something home.">
        <Button
          icon="Download"
          onClick={() =>
            exportCsv(
              list.map((c) => ({ name: c.name, phone: c.phone, address: c.address })),
              'customers',
            )
          }
        >
          Export
        </Button>
        <Button primary icon="Plus" onClick={() => setDialog({ type: 'customer' })}>
          Add customer
        </Button>
      </Header>
      <div className="toolbar">
        <SearchField value={q} onChange={setQ} placeholder="Search customers…" />
        <span className="spacer" />
        <small>{list.length} customers</small>
      </div>
      <section className="panel">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>WhatsApp</th>
                <th>Delivery address</th>
                <th className="num">Total spent</th>
                <th className="num">Credit</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr
                  key={c.phone}
                  tabIndex="0"
                  onClick={() => c.id && setDrawer({ type: 'order', id: c.id })}
                  onKeyDown={(e) =>
                    e.key === 'Enter' && c.id && setDrawer({ type: 'order', id: c.id })
                  }
                >
                  <td>
                    <div className="customer-cell">
                      <Avatar name={c.name} />
                      <span>{c.name}</span>
                    </div>
                  </td>
                  <td className="muted">+{c.phone}</td>
                  <td className="muted">{c.address}</td>
                  <td className="num">
                    {moneyTotals(
                      orders.filter((o) => o.phone === c.phone && o.status !== 'Cancelled'),
                      trips,
                      (o) => o.total,
                    )}
                  </td>
                  <td className="num">
                    {creditFor(c.phone) ? (
                      <span className="credit-pill">{money(creditFor(c.phone))}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
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
