// "Needs you today" (sprint 2): one list of the orders that are waiting on the seller,
// each with a single action. Built for the phone; sits at the top of Overview.
import React from 'react';
import { useOps } from './store';
import { Button, I } from './ui';
import { money, currencyOf, outstanding } from './money';
import { canShip, orderMessage, trackingLink } from './lib/messages';
import { appBase } from './lib/repository';

const DAY = 864e5;
// Days since an order was placed (createdAt live; demo dates are "10 Oct" in 2026).
export function ageDays(o, demo = false, now = Date.now()) {
  const t = Date.parse(o.createdAt || (demo && o.date ? `${o.date} 2026` : o.date));
  return Number.isNaN(t) ? 0 : Math.floor((now - t) / DAY);
}
export function needsToday(orders, { demo = false, now = Date.now() } = {}) {
  const open = orders.filter((o) => !['Cancelled', 'Delivered'].includes(o.status));
  return {
    quote: open.filter((o) => o.status === 'Requested'),
    dp: open.filter(
      (o) =>
        ['Quoted', 'Confirmed'].includes(o.status) &&
        Number(o.deposit) > 0 &&
        Number(o.paid) < Number(o.deposit) &&
        ageDays(o, demo, now) > 2,
    ),
    buy: open.filter(
      (o) =>
        ['Confirmed', 'Paid'].includes(o.status) &&
        Number(o.paid) >= (Number(o.deposit) || 0) &&
        Number(o.total) > 0,
    ),
    ship: open.filter((o) => o.status === 'Purchased' && canShip(o)),
    late: open.filter(
      (o) => o.status === 'Shipped' && o.shippedAt && (now - Date.parse(o.shippedAt)) / DAY > 7,
    ),
  };
}

export function NeedsToday() {
  const { data, demoMode, setDialog, setDrawer, navigate, copy, messaging, role } = useOps();
  const q = needsToday(data.orders, { demo: demoMode });
  const cur = (o) => currencyOf(o, data.trips);
  const reminder = (o) =>
    copy(
      orderMessage('reminder', o, {
        messaging,
        currency: cur(o),
        trackingLink: trackingLink(appBase(), data.shop.slug, o),
      }),
      'Reminder for ' + o.name.split(' ')[0],
    );
  const groups = [
    {
      key: 'quote',
      title: 'Requests to quote',
      icon: 'MessageSquare',
      list: q.quote,
      row: (o) =>
        role !== 'Helper' && (
          <Button className="small" onClick={() => setDialog({ type: 'quote', order: o })}>
            Quote
          </Button>
        ),
    },
    {
      key: 'dp',
      title: 'Down payment overdue',
      hint: 'More than 2 days since the order',
      icon: 'Clock',
      list: q.dp,
      row: (o) => (
        <Button className="small" icon="Copy" onClick={() => reminder(o)}>
          Reminder
        </Button>
      ),
    },
    {
      key: 'buy',
      title: 'Ready to buy',
      icon: 'ShoppingBag',
      list: q.buy,
      all: (
        <Button className="small" onClick={() => navigate('Purchasing')}>
          Open checklist
        </Button>
      ),
    },
    {
      key: 'ship',
      title: 'Ready to ship',
      icon: 'Send',
      list: q.ship,
      all: (
        <Button
          className="small"
          onClick={() => setDialog({ type: 'ship', ids: q.ship.map((o) => o.id) })}
        >
          Mark shipped
        </Button>
      ),
    },
    {
      key: 'late',
      title: 'Shipped over a week ago',
      hint: 'Check with the buyer, then mark delivered',
      icon: 'Truck',
      list: q.late,
      row: (o) => (
        <Button className="small" onClick={() => setDrawer({ type: 'order', id: o.id })}>
          Check
        </Button>
      ),
    },
  ].filter((g) => g.list.length);
  return (
    <section className="panel needs-today" aria-labelledby="needs-today-title">
      <div className="panel-head">
        <h2 id="needs-today-title">Needs you today</h2>
        <small>
          {groups.length
            ? `${groups.reduce((n, g) => n + g.list.length, 0)} orders waiting`
            : 'All clear'}
        </small>
      </div>
      {!groups.length && <p className="needs-empty">Nothing is waiting on you right now. Nice.</p>}
      {groups.map((g) => (
        <div className="needs-group" key={g.key}>
          <div className="needs-group-head">
            <I name={g.icon} size={15} />
            <strong>{g.title}</strong>
            <span className="nav-count">{g.list.length}</span>
            {g.hint && <small>{g.hint}</small>}
            <span className="spacer" />
            {g.all}
          </div>
          <ul>
            {g.list.slice(0, 4).map((o) => (
              <li key={o.id}>
                <button
                  className="needs-order"
                  onClick={() => setDrawer({ type: 'order', id: o.id })}
                >
                  <strong>{o.name}</strong>
                  <small>
                    {o.id} · {o.qty} × {o.item}
                    {g.key === 'dp'
                      ? ` · ${money(Number(o.deposit) - Number(o.paid), false, cur(o))} DP due`
                      : g.key === 'quote'
                        ? ''
                        : outstanding(o) > 0
                          ? ` · ${money(outstanding(o), false, cur(o))} to pay`
                          : ''}
                  </small>
                </button>
                {g.row?.(o)}
              </li>
            ))}
            {g.list.length > 4 && <li className="needs-more">+{g.list.length - 4} more</li>}
          </ul>
        </div>
      ))}
    </section>
  );
}
