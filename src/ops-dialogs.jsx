// Shipping and bulk-reminder dialogs (sprint 1, ADR-008). Messages are copied, never sent.
import React, { useState } from 'react';
import { useOps, useUnsavedChanges } from './store';
import { Overlay, Button, Field, Callout, I, Badge } from './ui';
import { money, currencyOf, outstanding } from './money';
import { appBase } from './lib/repository';
import {
  COURIERS,
  canShip,
  shipBlocker,
  resiOptional,
  validResi,
  normaliseResi,
  orderMessage,
  trackingLink,
} from './lib/messages';
import { MoneyDialog, moneyDialogTypes } from './money-dialogs';
import { Frame } from './dialog-frame';

export const opsDialogTypes = ['ship', 'reminders', ...moneyDialogTypes];

export function OpsDialog() {
  const { dialog } = useOps();
  if (moneyDialogTypes.includes(dialog.type)) return <MoneyDialog />;
  return dialog.type === 'ship' ? (
    <ShipDialog ids={dialog.ids} />
  ) : (
    <RemindersDialog ids={dialog.ids} />
  );
}

function ShipDialog({ ids }) {
  const { data, setDialog, shipOrders, copy, messaging, pending } = useOps();
  const picked = data.orders.filter((o) => ids.includes(o.id));
  const ready = picked.filter(canShip),
    skipped = picked.filter((o) => !canShip(o));
  const [courier, setCourier] = useState(ready[0]?.courier || 'JNE'),
    [resi, setResi] = useState(() => Object.fromEntries(ready.map((o) => [o.id, o.resi || '']))),
    [error, setError] = useState(''),
    [done, setDone] = useState(false);
  const dirty = !done && Object.values(resi).some((v) => v.trim());
  useUnsavedChanges('ship-dialog', dirty);
  const close = () => setDialog(null);
  const optional = resiOptional(courier);
  async function submit(e) {
    e.preventDefault();
    const missing = ready.find((o) => !optional && !resi[o.id]?.trim());
    if (missing) return setError(`Enter the resi for ${missing.id}.`);
    const bad = ready.find((o) => resi[o.id]?.trim() && !validResi(resi[o.id]));
    if (bad) return setError(`Resi for ${bad.id} can use letters, numbers and dashes (4–40).`);
    setError('');
    const ok = await shipOrders(ready.map((o) => ({ id: o.id, courier, resi: resi[o.id] || '' })));
    if (ok) setDone(true);
  }
  if (done) {
    const shipped = data.orders.filter((o) => ready.some((r) => r.id === o.id));
    return (
      <Frame
        title={shipped.length === 1 ? 'Order shipped' : `${shipped.length} orders shipped`}
        onClose={close}
        foot={
          <>
            <span className="spacer" />
            <Button primary onClick={close}>
              Done
            </Button>
          </>
        }
      >
        <div className="modal-body">
          <p>Copy the shipped message for each buyer and paste it into their chat.</p>
          <ul className="ops-list">
            {shipped.map((o) => (
              <li key={o.id}>
                <div>
                  <strong>{o.name}</strong>
                  <small>
                    {o.id} · {o.courier}
                    {o.resi ? ' · ' + o.resi : ''}
                  </small>
                </div>
                <Button
                  icon="Copy"
                  onClick={() =>
                    copy(
                      orderMessage('shipped', o, {
                        messaging,
                        currency: currencyOf(o, data.trips),
                        trackingLink: trackingLink(appBase(), data.shop.slug, o),
                      }),
                      'Shipped message for ' + o.name.split(' ')[0],
                    )
                  }
                >
                  Copy message
                </Button>
              </li>
            ))}
          </ul>
        </div>
      </Frame>
    );
  }
  return (
    <Frame
      title={ready.length > 1 ? `Ship ${ready.length} orders` : 'Mark as shipped'}
      onClose={close}
      foot={
        <>
          <Button type="button" onClick={close}>
            Cancel
          </Button>
          <span className="spacer" />
          <Button primary type="submit" form="ship-form" disabled={!ready.length || pending}>
            {ready.length > 1 ? `Ship ${ready.length} orders` : 'Mark shipped'}
          </Button>
        </>
      }
    >
      <form id="ship-form" className="modal-body" onSubmit={submit}>
        {error && (
          <div className="form-error" role="alert">
            <I name="CircleAlert" size={14} />
            {error}
          </div>
        )}
        {ready.length > 0 ? (
          <>
            <Field
              label="Courier"
              hint={optional ? 'Resi is optional for pickup and same-day couriers.' : undefined}
            >
              <select value={courier} onChange={(e) => setCourier(e.target.value)}>
                {COURIERS.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </Field>
            <div className="ship-rows">
              {ready.map((o) => (
                <label className="ship-row" key={o.id}>
                  <span>
                    <strong>{o.name}</strong>
                    <small>
                      {o.id} · {o.qty} × {o.item}
                    </small>
                  </span>
                  <input
                    aria-label={`Resi for ${o.id}`}
                    placeholder={optional ? 'Resi (optional)' : 'Resi number'}
                    value={resi[o.id] || ''}
                    autoCapitalize="characters"
                    onChange={(e) => setResi((r) => ({ ...r, [o.id]: e.target.value }))}
                    onBlur={(e) =>
                      setResi((r) => ({ ...r, [o.id]: normaliseResi(e.target.value) }))
                    }
                  />
                </label>
              ))}
            </div>
            <p className="footnote">Buyers see the courier and resi on their tracking link.</p>
          </>
        ) : (
          <Callout>None of the selected orders can ship yet.</Callout>
        )}
        {skipped.length > 0 && (
          <div className="ship-skipped">
            <h3>
              {skipped.length} {skipped.length === 1 ? 'order' : 'orders'} skipped
            </h3>
            <ul>
              {skipped.map((o) => (
                <li key={o.id}>
                  <span>
                    {o.id} · {o.name}
                  </span>
                  <small>{shipBlocker(o)}</small>
                </li>
              ))}
            </ul>
          </div>
        )}
      </form>
    </Frame>
  );
}

function RemindersDialog({ ids }) {
  const { data, setDialog, copy, messaging } = useOps();
  const picked = data.orders.filter((o) => ids.includes(o.id));
  const due = picked.filter(
    (o) => !['Cancelled', 'Delivered'].includes(o.status) && outstanding(o) > 0,
  );
  const paid = picked.length - due.length;
  const [copied, setCopied] = useState([]);
  const close = () => setDialog(null);
  return (
    <Frame
      title={`Payment reminders (${due.length})`}
      onClose={close}
      foot={
        <>
          <span className="muted">
            {copied.length} of {due.length} copied
          </span>
          <span className="spacer" />
          <Button primary onClick={close}>
            Done
          </Button>
        </>
      }
    >
      <div className="modal-body">
        <p>
          One message per buyer, using your Payment reminder template. Copy, then paste it into
          their chat.
        </p>
        {paid > 0 && (
          <Callout>
            {paid} selected {paid === 1 ? 'order is' : 'orders are'} already paid or closed and left
            out.
          </Callout>
        )}
        <ul className="ops-list">
          {due.map((o) => {
            const cur = currencyOf(o, data.trips);
            return (
              <li key={o.id} className={copied.includes(o.id) ? 'copied' : ''}>
                <div>
                  <strong>{o.name}</strong>
                  <small>
                    {o.id} · {money(outstanding(o), false, cur)} to pay
                  </small>
                </div>
                <Badge status={o.status} />
                <Button
                  icon={copied.includes(o.id) ? 'Check' : 'Copy'}
                  onClick={() => {
                    copy(
                      orderMessage('reminder', o, {
                        messaging,
                        currency: cur,
                        trackingLink: trackingLink(appBase(), data.shop.slug, o),
                      }),
                      'Reminder for ' + o.name.split(' ')[0],
                    );
                    setCopied((c) => (c.includes(o.id) ? c : [...c, o.id]));
                  }}
                >
                  {copied.includes(o.id) ? 'Copied' : 'Copy'}
                </Button>
              </li>
            );
          })}
        </ul>
        {!due.length && <Callout>Everyone selected has paid in full.</Callout>}
      </div>
    </Frame>
  );
}
