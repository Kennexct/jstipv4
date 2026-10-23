// Money and stock actions on an order (sprint 2, ADR-009): item unavailable, substitute,
// refund or credit, and paying with credit. Live mode calls the RPCs; demo mode applies the
// same rules from lib/order-actions. Messages are copied for the seller to send.
import { MoneyInput } from './money-input';
import React, { useState } from 'react';
import { useOps, useUnsavedChanges } from './store';
import { Button, Field, Callout } from './ui';
import { Frame } from './dialog-frame';
import { money, currencyOf, outstanding, roundTo, decimalsFor } from './money';
import { orderMessage } from './lib/messages';
import { activeRegion } from './lib/region';
import {
  applyUnavailable,
  applyRefund,
  applyUseCredit,
  applySubstitute,
  applyReturnCredit,
  creditUsed,
  phoneKey,
} from './lib/order-actions';

export const moneyDialogTypes = [
  'unavailable',
  'refund',
  'substitute',
  'use-credit',
  'return-credit',
];

export function MoneyDialog() {
  const { dialog, data } = useOps();
  const order = data.orders.find((o) => o.id === dialog.id);
  if (!order) return null;
  const View = {
    unavailable: Unavailable,
    refund: Refund,
    substitute: Substitute,
    'use-credit': UseCredit,
    'return-credit': ReturnCredit,
  }[dialog.type];
  return <View order={order} />;
}

function ModeChoice({ value, onChange, canCredit, amountLabel }) {
  return (
    <fieldset className="mode-choice">
      <legend>What happens to {amountLabel}?</legend>
      <label>
        <input
          type="radio"
          name="mode"
          checked={value === 'refund'}
          onChange={() => onChange('refund')}
        />
        <span>
          <strong>Refund</strong>
          <small>You transfer it back; Bawa records it.</small>
        </span>
      </label>
      <label className={canCredit ? '' : 'disabled'}>
        <input
          type="radio"
          name="mode"
          disabled={!canCredit}
          checked={value === 'credit'}
          onChange={() => onChange('credit')}
        />
        <span>
          <strong>Keep as credit</strong>
          <small>
            {canCredit
              ? 'Saved under the buyer’s WhatsApp number for their next order.'
              : 'Needs the buyer’s WhatsApp number.'}
          </small>
        </span>
      </label>
    </fieldset>
  );
}

function Unavailable({ order: o }) {
  const { data, setDialog, orderAction, copy, messaging, pending } = useOps();
  const cur = currencyOf(o, data.trips),
    paid = Number(o.paid) || 0,
    canCredit = phoneKey(o.phone, activeRegion().callingCode).length >= 8;
  const [mode, setMode] = useState(paid > 0 && canCredit ? 'credit' : 'refund'),
    [note, setNote] = useState('');
  useUnsavedChanges('unavailable', !!note.trim());
  const close = () => setDialog(null);
  const settlement =
    paid <= 0
      ? ''
      : mode === 'credit'
        ? activeRegion().language === 'en'
          ? `We’ll keep ${money(paid, false, cur)} as credit for your next order.`
          : `Dana ${money(paid, false, cur)} kami simpan sebagai saldo untuk pesanan Kakak berikutnya.`
        : activeRegion().language === 'en'
          ? `We’ll refund ${money(paid, false, cur)} to your account.`
          : `Dana ${money(paid, false, cur)} akan kami kembalikan ke rekening Kakak.`;
  const submit = async () => {
    const ok = await orderAction(
      'jastip_order_unavailable',
      { p_order_id: o.id, p_mode: mode, p_note: note },
      (d) => applyUnavailable(d, o.id, mode, note),
      `${o.id} cancelled${paid > 0 ? (mode === 'credit' ? ' and kept as credit' : ' and refund recorded') : ''}.`,
    );
    if (ok) close();
  };
  return (
    <Frame
      title="Item unavailable"
      onClose={close}
      foot={
        <>
          <Button
            icon="Copy"
            onClick={() =>
              copy(
                orderMessage('unavailable', o, {
                  messaging,
                  currency: cur,
                  extra: { penyelesaian: settlement },
                }),
                'Apology message',
              )
            }
          >
            Copy message
          </Button>
          <span className="spacer" />
          <Button primary disabled={pending} onClick={submit}>
            Cancel order
          </Button>
        </>
      }
    >
      <div className="modal-body">
        <p>
          <strong>
            {o.qty} × {o.item}
          </strong>{' '}
          for {o.name} will be cancelled and its stock put back.
        </p>
        {paid > 0 ? (
          <ModeChoice
            value={mode}
            onChange={setMode}
            canCredit={canCredit}
            amountLabel={money(paid, false, cur) + ' already paid'}
          />
        ) : (
          <Callout>Nothing was paid yet, so the order is simply cancelled.</Callout>
        )}
        <Field label="Reason (optional)" hint="Shown in the order history.">
          <input
            value={note}
            maxLength={200}
            placeholder="Sold out in store"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </div>
    </Frame>
  );
}

function Refund({ order: o }) {
  const { data, setDialog, orderAction, pending } = useOps();
  const cur = currencyOf(o, data.trips),
    d = decimalsFor(cur),
    paid = Number(o.paid) || 0,
    canCredit = phoneKey(o.phone, activeRegion().callingCode).length >= 8;
  const [mode, setMode] = useState('refund'),
    [amount, setAmount] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState('');
  useUnsavedChanges('refund', !!(amount || note.trim()));
  const close = () => setDialog(null);
  const submit = async (e) => {
    e.preventDefault();
    const value = roundTo(amount, d);
    if (!(value > 0) || value > paid)
      return setError(`Enter an amount up to ${money(paid, false, cur)}.`);
    if (!note.trim()) return setError('Add a short reason.');
    setError('');
    const ok = await orderAction(
      'jastip_order_refund',
      { p_order_id: o.id, p_amount: value, p_mode: mode, p_note: note },
      (data) => applyRefund(data, o.id, value, mode, note),
      `${money(value, false, cur)} ${mode === 'credit' ? 'credit' : 'refund'} recorded on ${o.id}.`,
    );
    if (ok) close();
  };
  return (
    <Frame
      title="Refund or credit"
      onClose={close}
      foot={
        <>
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <span className="spacer" />
          <Button primary type="submit" form="refund-form" disabled={pending}>
            {mode === 'credit' ? 'Add credit' : 'Record refund'}
          </Button>
        </>
      }
    >
      <form id="refund-form" className="modal-body" onSubmit={submit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p>
          Paid so far: <strong>{money(paid, false, cur)}</strong>
        </p>
        {o.status === 'Delivered' && (
          <Callout>After delivery this is compensation, so it lowers this order’s profit.</Callout>
        )}
        <Field label={`Amount (${cur})`}>
          <MoneyInput
            currency={cur}
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        <ModeChoice
          value={mode}
          onChange={setMode}
          canCredit={canCredit}
          amountLabel="this amount"
        />
        <Field label="Reason">
          <input
            value={note}
            maxLength={200}
            placeholder="Box arrived dented"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
      </form>
    </Frame>
  );
}

function UseCredit({ order: o }) {
  const { data, setDialog, orderAction, creditFor, pending } = useOps();
  const cur = currencyOf(o, data.trips),
    balance = creditFor(o.phone),
    due = outstanding(o);
  const [amount, setAmount] = useState(String(Math.min(balance, due) || '')),
    [error, setError] = useState('');
  const close = () => setDialog(null);
  const submit = async (e) => {
    e.preventDefault();
    const value = Number(amount);
    if (!(value > 0) || value > Math.min(balance, due))
      return setError(`Use up to ${money(Math.min(balance, due), false, cur)}.`);
    const ok = await orderAction(
      'jastip_use_credit',
      { p_order_id: o.id, p_amount: value },
      (d) => applyUseCredit(d, o.id, value),
      `${money(value, false, cur)} credit used on ${o.id}.`,
    );
    if (ok) close();
  };
  return (
    <Frame
      title="Pay with credit"
      onClose={close}
      foot={
        <>
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <span className="spacer" />
          <Button primary type="submit" form="credit-form" disabled={pending || balance <= 0}>
            Use credit
          </Button>
        </>
      }
    >
      <form id="credit-form" className="modal-body" onSubmit={submit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <dl className="credit-summary">
          <dt>{o.name}’s credit</dt>
          <dd>{money(balance, false, cur)}</dd>
          <dt>Still due on {o.id}</dt>
          <dd>{money(due, false, cur)}</dd>
        </dl>
        <Field label={`Credit to use (${cur})`}>
          <MoneyInput
            currency={cur}
            min="0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
      </form>
    </Frame>
  );
}

// Put some or all of the credit used on an order back on the buyer's balance (feedback round 1).
function ReturnCredit({ order: o }) {
  const { data, setDialog, orderAction, creditFor, pending } = useOps();
  const cur = currencyOf(o, data.trips),
    used = creditUsed(o),
    paid = Number(o.paid) || 0;
  const [amount, setAmount] = useState(String(used || '')),
    [error, setError] = useState('');
  useUnsavedChanges('return-credit', Number(amount) !== used);
  const close = () => setDialog(null);
  const value = Number(amount) || 0,
    reopens = o.status === 'Paid' && paid - value < Number(o.total);
  const submit = async (e) => {
    e.preventDefault();
    if (!(value > 0) || value > used)
      return setError(`Enter an amount up to ${money(used, false, cur)}.`);
    const ok = await orderAction(
      'jastip_return_credit',
      { p_order_id: o.id, p_amount: value },
      (d) => applyReturnCredit(d, o.id, value),
      `${money(value, false, cur)} credit returned to ${o.name.split(' ')[0]}.`,
    );
    if (ok) close();
  };
  return (
    <Frame
      title="Return credit"
      onClose={close}
      foot={
        <>
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <span className="spacer" />
          <Button primary type="submit" form="return-credit-form" disabled={pending}>
            Return credit
          </Button>
        </>
      }
    >
      <form id="return-credit-form" className="modal-body" onSubmit={submit}>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <dl className="credit-summary">
          <dt>Credit used on {o.id}</dt>
          <dd>{money(used, false, cur)}</dd>
          <dt>{o.name}’s balance now</dt>
          <dd>{money(creditFor(o.phone), false, cur)}</dd>
        </dl>
        <Field
          label={`Amount to return (${cur})`}
          hint="Return all of it, or just part — the rest stays paid on this order."
        >
          <MoneyInput
            currency={cur}
            min="0"
            max={used}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </Field>
        {value > 0 && value <= used && (
          <Callout>
            {o.name.split(' ')[0]}’s balance goes up by {money(value, false, cur)} and this order
            will have {money(Math.max(0, outstanding(o) + value), false, cur)} to pay
            {reopens ? ', so it moves back to Confirmed' : ''}.
          </Callout>
        )}
      </form>
    </Frame>
  );
}

function Substitute({ order: o }) {
  const { data, setDialog, orderAction, copy, messaging, pending } = useOps();
  const cur = currencyOf(o, data.trips),
    d = decimalsFor(cur),
    paid = Number(o.paid) || 0,
    fee = Number(o.shippingFee) || 0,
    canCredit = phoneKey(o.phone, activeRegion().callingCode).length >= 8;
  const choices = data.items.filter(
    (i) => i.trip === o.trip && i.status !== 'Draft' && i.id !== o.itemId,
  );
  const [source, setSource] = useState(choices.length ? 'catalog' : 'custom'),
    [itemId, setItemId] = useState(choices[0]?.id || ''),
    [name, setName] = useState(''),
    [unitPrice, setUnitPrice] = useState(''),
    [unitCost, setUnitCost] = useState(String(o.quotedCost ?? '')),
    [qty, setQty] = useState(String(o.qty)),
    [mode, setMode] = useState(canCredit ? 'credit' : 'refund'),
    [note, setNote] = useState(''),
    [offered, setOffered] = useState(false),
    [error, setError] = useState('');
  useUnsavedChanges('substitute', offered || !!name.trim() || !!note.trim());
  const close = () => setDialog(null);
  const picked = choices.find((i) => i.id === itemId);
  const unit = source === 'catalog' ? Number(picked?.selling) || 0 : Number(unitPrice) || 0;
  const newName = source === 'catalog' ? picked?.name || '' : name.trim();
  const newTotal = roundTo(unit * (Number(qty) || 0), d);
  const excess = roundTo(paid - (newTotal + fee), d);
  const change =
    source === 'catalog'
      ? { itemId, qty: Number(qty) }
      : { item: newName, qty: Number(qty), unitPrice: Number(unitPrice), unitCost };
  const check = () => {
    if (!newName) return 'Choose or name the substitute item.';
    if (!(Number(qty) >= 1) || !Number.isInteger(Number(qty))) return 'Enter a whole quantity.';
    if (!(unit > 0)) return 'Enter the new price per item.';
    if (source === 'custom' && !(Number(unitCost) >= 0 && unitCost !== ''))
      return 'Enter the estimated cost per item.';
    return '';
  };
  const offer = () => {
    const problem = check();
    if (problem) return setError(problem);
    setError('');
    copy(
      orderMessage('substitute', o, {
        messaging,
        currency: cur,
        extra: {
          pengganti: newName,
          qty_baru: String(qty),
          total_baru: money(newTotal, false, cur),
        },
      }),
      'Substitute offer',
    );
    setOffered(true);
  };
  const apply = async () => {
    const problem = check();
    if (problem) return setError(problem);
    const ok = await orderAction(
      'jastip_substitute_order',
      {
        p_order_id: o.id,
        p_change: change,
        p_excess_mode: excess > 0 ? mode : null,
        p_note: note,
      },
      (data) => applySubstitute(data, o.id, change, excess > 0 ? mode : null, note),
      `${o.id} now ${qty} × ${newName}.`,
    );
    if (ok) close();
  };
  return (
    <Frame
      title="Offer a substitute"
      onClose={close}
      foot={
        <>
          <Button icon="Copy" onClick={offer}>
            {offered ? 'Copy offer again' : '1. Copy offer for buyer'}
          </Button>
          <span className="spacer" />
          <Button primary disabled={!offered || pending} onClick={apply}>
            2. Buyer agreed → apply
          </Button>
        </>
      }
    >
      <div className="modal-body">
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <p>
          Replacing{' '}
          <strong>
            {o.qty} × {o.item}
          </strong>{' '}
          ({money(o.total, false, cur)}) for {o.name}. The order code stays the same.
        </p>
        <div className="segmented" role="radiogroup" aria-label="Substitute source">
          <button
            type="button"
            role="radio"
            aria-checked={source === 'catalog'}
            disabled={!choices.length}
            onClick={() => setSource('catalog')}
          >
            From your items
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={source === 'custom'}
            onClick={() => setSource('custom')}
          >
            Something else
          </button>
        </div>
        {source === 'catalog' ? (
          <Field label="Substitute item">
            <select value={itemId} onChange={(e) => setItemId(e.target.value)}>
              {choices.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} · {money(i.selling, false, cur)}
                </option>
              ))}
            </select>
          </Field>
        ) : (
          <>
            <Field label="Substitute item">
              <input
                value={name}
                maxLength={200}
                placeholder="Running shoes, EU 41"
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <div className="field-pair">
              <Field label={`Price per item (${cur})`}>
                <MoneyInput
                  currency={cur}
                  min="0"
                  value={unitPrice}
                  onChange={(e) => setUnitPrice(e.target.value)}
                />
              </Field>
              <Field label={`Estimated cost per item (${cur})`}>
                <MoneyInput
                  currency={cur}
                  min="0"
                  value={unitCost}
                  onChange={(e) => setUnitCost(e.target.value)}
                />
              </Field>
            </div>
          </>
        )}
        <Field label="Quantity">
          <input
            type="number"
            min="1"
            step="1"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </Field>
        <div className="substitute-summary">
          <span>New total</span>
          <strong>{money(newTotal, false, cur)}</strong>
          <small>
            {excess > 0
              ? `${money(excess, false, cur)} already paid is more than the new total.`
              : newTotal + fee > paid
                ? `${money(newTotal + fee - paid, false, cur)} still to pay after this change.`
                : 'Already paid in full.'}
          </small>
        </div>
        {excess > 0 && (
          <ModeChoice
            value={mode}
            onChange={setMode}
            canCredit={canCredit}
            amountLabel={money(excess, false, cur) + ' extra'}
          />
        )}
        <Field label="Note (optional)">
          <input
            value={note}
            maxLength={200}
            placeholder="Size 40 sold out"
            onChange={(e) => setNote(e.target.value)}
          />
        </Field>
        <p className="footnote">Copy the offer first. Apply it only after the buyer says OK.</p>
      </div>
    </Frame>
  );
}
