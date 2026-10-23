// Order drawer additions for sprint 2 (ADR-009): ongkir, ledger lines, credit, money actions,
// substitution history and the margin-hit flag.
import React, { useEffect, useState } from 'react';
import { useOps } from './store';
import { Button, I } from './ui';
import { money, outstanding, ledgerLabel, marginHit, shippingFee } from './money';

export function OngkirRow({ o, cur }) {
  const { role, updateOrder, support } = useOps();
  const editable =
    role !== 'Helper' && !support && !['Shipped', 'Delivered', 'Cancelled'].includes(o.status);
  const [value, setValue] = useState(String(shippingFee(o) || ''));
  useEffect(() => setValue(String(shippingFee(o) || '')), [o.shippingFee]);
  const changed = Number(value || 0) !== shippingFee(o);
  return (
    <div className="ongkir-row">
      <span>Ongkir</span>
      {editable ? (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!(Number(value || 0) >= 0)) return;
            updateOrder(o.id, { shippingFee: Number(value || 0) });
          }}
        >
          <input
            aria-label="Ongkir"
            type="number"
            min="0"
            step="any"
            inputMode="numeric"
            placeholder="0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
          />
          {changed && (
            <Button type="submit" className="small">
              Save
            </Button>
          )}
        </form>
      ) : (
        <strong>{shippingFee(o) ? money(shippingFee(o), false, cur) : '—'}</strong>
      )}
    </div>
  );
}

export function PaymentLedger({ o, cur }) {
  const lines = o.payments || [];
  if (!lines.length) return null;
  return (
    <ul className="ledger" aria-label="Payment history">
      {lines.map((p, k) => (
        <li key={k} className={Number(p.amount) < 0 ? 'minus' : ''}>
          <span>
            {ledgerLabel(p)}
            {p.note ? <small> · {p.note}</small> : null}
            {p.compensation ? <small> · compensation</small> : null}
          </span>
          <small>{p.date}</small>
          <strong>
            {Number(p.amount) < 0 ? '−' : ''}
            {money(Math.abs(Number(p.amount) || 0), false, cur)}
          </strong>
        </li>
      ))}
    </ul>
  );
}

export function CreditNote({ o, cur }) {
  const { creditFor, setDialog } = useOps();
  const balance = creditFor(o.phone);
  if (!balance) return null;
  const usable = outstanding(o) > 0 && !['Cancelled', 'Delivered', 'Requested'].includes(o.status);
  return (
    <div className="credit-note">
      <I name="Wallet" size={14} />
      <span>
        {o.name.split(' ')[0]} has <strong>{money(balance, false, cur)}</strong> credit
      </span>
      {usable && (
        <Button className="small" onClick={() => setDialog({ type: 'use-credit', id: o.id })}>
          Use credit
        </Button>
      )}
    </div>
  );
}

export function OrderActions({ o }) {
  const { role, setDialog, support } = useOps();
  if (role === 'Helper' || support) return null;
  const paid = Number(o.paid) || 0;
  const actions = [
    ['Requested', 'Quoted', 'Confirmed', 'Paid'].includes(o.status) && [
      'unavailable',
      'Item unavailable',
      'PackageX',
    ],
    ['Confirmed', 'Paid'].includes(o.status) && ['substitute', 'Offer a substitute', 'Replace'],
    paid > 0 &&
      !['Paid', 'Shipped', 'Cancelled'].includes(o.status) && [
        'refund',
        'Refund or credit',
        'Undo2',
      ],
  ].filter(Boolean);
  if (!actions.length) return null;
  return (
    <section className="drawer-section">
      <h3>Something changed?</h3>
      <div className="message-actions">
        {actions.map(([type, label, icon]) => (
          <Button key={type} icon={icon} onClick={() => setDialog({ type, id: o.id })}>
            {label}
          </Button>
        ))}
      </div>
    </section>
  );
}

export function SubstitutionHistory({ o, cur }) {
  if (!o.substitutions?.length && !o.unavailable) return null;
  return (
    <section className="drawer-section">
      <h3>History</h3>
      <ul className="history-list">
        {(o.substitutions || []).map((s, k) => (
          <li key={k}>
            <strong>Substituted</strong> {s.fromQty} × {s.fromItem} (
            {money(s.fromTotal, false, cur)}) → {s.toQty} × {s.toItem} (
            {money(s.toTotal, false, cur)}){s.note ? ` · ${s.note}` : ''}
            <small>{new Date(s.date).toLocaleDateString('en-GB')}</small>
          </li>
        ))}
        {o.unavailable && (
          <li>
            <strong>Item unavailable</strong>{' '}
            {o.unavailable.mode === 'credit' ? 'kept as credit' : 'refunded'}
            {o.unavailable.note ? ` · ${o.unavailable.note}` : ''}
            <small>{new Date(o.unavailable.date).toLocaleDateString('en-GB')}</small>
          </li>
        )}
      </ul>
    </section>
  );
}

export function MarginHit({ o, cur }) {
  const hit = marginHit(o);
  if (!hit) return null;
  return (
    <p className="margin-hit">
      <I name="TrendingDown" size={14} />
      Shelf price was higher than quoted: margin down {money(hit, false, cur)}.
    </p>
  );
}
