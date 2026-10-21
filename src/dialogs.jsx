import React, { useState } from 'react';
import { useOps } from './store';
import { orderStatuses, planDetails } from './data';
import { recordId, today } from './lib/records';
import { placePublicOrder, trackPublicOrder, inviteMember, proofUrl } from './lib/repository';
import { rpc } from './lib/supabase';
import { ManualInvoice } from './live-workspaces';
import {
  money,
  margin,
  rates,
  allocate,
  orderProfit,
  isUnlimited,
  maxOrderQty,
  depositFor,
  depositLabel,
  paymentState,
  MAX_UNLIMITED_PER_ORDER,
} from './money';
import {
  I,
  Button,
  Badge,
  Avatar,
  Field,
  Empty,
  Overlay,
  Callout,
  ProductArt,
  SearchField,
  PayBadge,
  navIcons,
} from './ui';
async function compress(file) {
  if (!file.type.startsWith('image/')) throw Error('Choose an image file, like JPG or PNG.');
  if (file.size > 15 * 1024 * 1024) throw Error('Choose a photo smaller than 15 MB.');
  const image = await createImageBitmap(file);
  const c = document.createElement('canvas');
  const r = Math.min(1, 1000 / image.width, 1000 / image.height);
  c.width = Math.round(image.width * r);
  c.height = Math.round(image.height * r);
  c.getContext('2d').drawImage(image, 0, 0, c.width, c.height);
  image.close();
  return c.toDataURL('image/jpeg', 0.76);
}
export function DetailDrawer() {
  const {
    data,
    drawer,
    setDrawer,
    setDialog,
    updateOrder,
    role,
    copy,
    change,
    navigate,
    setSupport,
    support,
    demoMode,
    openSupport,
    announce,
  } = useOps();
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const o = data.orders.find((o) => o.id === drawer.id),
    m = data.merchants.find((m) => m.id === drawer.id),
    item = data.items.find((i) => i.id === o?.itemId);
  const close = () => setDrawer(null);
  // "Paid" is a payment state; jastipers may purchase before the customer pays in full.
  const fulfilment = ['Requested', 'Quoted', 'Confirmed', 'Purchased', 'Shipped', 'Delivered'],
    step = o ? fulfilment.indexOf(o.status === 'Paid' ? 'Confirmed' : o.status) : -1;
  return (
    <Overlay onClose={close} drawer label={o ? 'Order ' + o.id : 'Merchant profile'}>
      <div className="drawer-top">
        <span className="mono">{o?.id || m?.id}</span>
        <span className="spacer" />
        <Button icon="Copy" onClick={() => copy(o?.id || m?.id, 'Reference code')}>
          Copy code
        </Button>
        <button className="icon-btn" aria-label="Close detail" onClick={close}>
          <I name="X" />
        </button>
      </div>
      {o ? (
        <>
          <div className="drawer-heading">
            <div>
              <Avatar name={o.name} />
              <h2>{o.name}</h2>
              <p>
                {o.source} order · {o.date}
                {demoMode ? ' 2026' : ''}
              </p>
            </div>
            <Badge status={o.status} />
          </div>
          <section className="drawer-section">
            <h3>Order details</h3>
            <div className="order-product">
              <div className="order-thumbnail">
                <ProductArt item={item} />
              </div>
              <div>
                <strong>{o.item}</strong>
                <span>
                  {o.qty} × {money(o.total / o.qty)}
                </span>
                <small>{data.trips.find((t) => t.id === o.trip)?.name}</small>
              </div>
              <strong>{money(o.total)}</strong>
            </div>
            {o.note && (
              <div className="order-note">
                <I name="MessageSquare" size={14} />
                {o.note}
              </div>
            )}
          </section>
          <section className="drawer-section">
            <div className="section-title compact">
              <h3>Order status</h3>
              <select
                aria-label="Update order status"
                value={o.status}
                onChange={(e) => updateOrder(o.id, { status: e.target.value })}
              >
                {orderStatuses.map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="status-timeline">
              {fulfilment.map((s, k) => (
                <div
                  key={s}
                  className={`${k <= step && o.status !== 'Cancelled' ? 'passed' : ''} ${k === step ? 'current' : ''}`}
                >
                  <i>{k < step ? <I name="Check" size={10} /> : null}</i>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </section>
          <section className="drawer-section">
            <div className="section-title compact">
              <h3>
                Payment <PayBadge order={o} />
              </h3>
              <Button
                icon="Plus"
                disabled={o.paid >= o.total || ['Cancelled', 'Delivered'].includes(o.status)}
                onClick={() => setDialog({ type: 'payment', order: o })}
              >
                Record payment
              </Button>
            </div>
            <div className="payment-summary">
              <div>
                <span>Order total</span>
                <strong>{money(o.total)}</strong>
              </div>
              <div>
                <span>Amount paid</span>
                <strong>{money(o.paid)}</strong>
              </div>
              <div>
                <span>Outstanding</span>
                <strong className={o.paid < o.total ? 'amber' : ''}>
                  {money(Math.max(0, o.total - o.paid))}
                </strong>
              </div>
              {o.deposit > 0 && (
                <div>
                  <span>Down payment</span>
                  <strong className={o.paid < o.deposit ? 'amber' : ''}>
                    {money(o.deposit)}
                    {o.paid < o.deposit ? ' due' : ' paid'}
                  </strong>
                </div>
              )}
            </div>
            {o.proof && (
              <a
                className="proof-attached"
                href={o.proof.preview || '#'}
                onClick={async (e) => {
                  if (!demoMode) {
                    e.preventDefault();
                    try {
                      const url = await proofUrl(o.proof);
                      window.open(url, '_blank', 'noopener,noreferrer');
                    } catch (error) {
                      announce(error.message);
                    }
                  }
                }}
                download={o.proof.name}
              >
                <I name="Paperclip" size={13} />
                {o.proof.name}
              </a>
            )}
          </section>
          {role !== 'Helper' && (
            <section className="drawer-section">
              <h3>Margin insight</h3>
              <div className="margin-pair">
                <div>
                  <span>Estimated margin</span>
                  <strong>{money(orderProfit(o, false))}</strong>
                </div>
                <div>
                  <span>Actual margin</span>
                  <strong>
                    {o.actualCost != null ? money(orderProfit(o)) : 'Not purchased yet'}
                  </strong>
                </div>
              </div>
              <p className="footnote">Quoted costs and exchange rates are stored as snapshots.</p>
            </section>
          )}
          <section className="drawer-section">
            <h3>Delivery details</h3>
            <dl className="details-list">
              <dt>WhatsApp</dt>
              <dd>+{o.phone}</dd>
              <dt>Address</dt>
              <dd>{o.address}</dd>
              <dt>Delivery window</dt>
              <dd>
                {demoMode
                  ? '23–27 October 2026'
                  : data.trips.find((t) => t.id === o.trip)?.dates || 'Ask your merchant'}
              </dd>
            </dl>
          </section>
          <section className="drawer-section">
            <h3>Keep your customer in the loop</h3>
            <div className="message-actions">
              <Button
                icon="Copy"
                onClick={() =>
                  copy(
                    `Hi ${o.name.split(' ')[0]}, your quote for ${o.qty} × ${o.item} is ${money(o.total)}. Reply to confirm. Order ${o.id}.`,
                  )
                }
              >
                Copy quote
              </Button>
              <Button
                icon="Copy"
                onClick={() =>
                  copy(
                    `Hi ${o.name.split(' ')[0]}, a friendly reminder: ${money(Math.max(0, o.total - o.paid))} is outstanding for ${o.id}. Thank you.`,
                  )
                }
              >
                Payment reminder
              </Button>
              <Button
                icon="Copy"
                onClick={() =>
                  copy(
                    `Hi ${o.name.split(' ')[0]}, your order ${o.id} is now ${o.status.toLowerCase()}. We’ll keep you updated.`,
                  )
                }
              >
                Status update
              </Button>
            </div>
          </section>
          <div className="drawer-bottom">
            <small>Changes are saved automatically</small>
            <Button primary onClick={close}>
              Done
            </Button>
          </div>
        </>
      ) : m ? (
        <>
          <div className="drawer-heading">
            <div>
              <Avatar name={m.name} />
              <h2>{m.name}</h2>
              <p>
                {m.owner} · {m.email}
              </p>
            </div>
            <Badge status={m.status} />
          </div>
          <section className="drawer-section">
            <h3>Merchant lifecycle</h3>
            <Field label="Merchant status">
              <select
                value={m.status}
                onChange={(e) =>
                  change(
                    (d) => ({
                      ...d,
                      merchants: d.merchants.map((a) =>
                        a.id === m.id ? { ...a, status: e.target.value } : a,
                      ),
                    }),
                    `${m.name} status changed to ${e.target.value}.`,
                  )
                }
              >
                {['Invited', 'Trial', 'Active', 'Past due', 'Suspended', 'Closed'].map((s) => (
                  <option key={s}>{s}</option>
                ))}
              </select>
            </Field>
            <Field label="Assigned plan">
              <select
                value={m.plan}
                onChange={(e) =>
                  change(
                    (d) => ({
                      ...d,
                      merchants: d.merchants.map((a) =>
                        a.id === m.id
                          ? {
                              ...a,
                              plan: e.target.value,
                              revenue: planDetails.find((p) => p.name === e.target.value).price,
                            }
                          : a,
                      ),
                    }),
                    `${m.name} plan changed to ${e.target.value}.`,
                  )
                }
              >
                {planDetails.map((p) => (
                  <option key={p.name}>{p.name}</option>
                ))}
              </select>
            </Field>
            <Button
              icon="CalendarPlus"
              onClick={() =>
                change(
                  (d) => ({
                    ...d,
                    merchants: d.merchants.map((a) =>
                      a.id === m.id ? { ...a, trialDays: a.trialDays + 7 } : a,
                    ),
                  }),
                  `${m.name} trial extended by 7 days.`,
                )
              }
            >
              Extend trial by 7 days
            </Button>
          </section>
          <section className="drawer-section">
            <h3>Workspace usage</h3>
            <dl className="details-list">
              <dt>Active items</dt>
              <dd>{m.items}</dd>
              <dt>Monthly orders</dt>
              <dd>{m.orders}</dd>
              <dt>Monthly revenue</dt>
              <dd>{money(m.revenue)}</dd>
              <dt>Trial allowance</dt>
              <dd>{m.trialDays} days</dd>
            </dl>
          </section>
          <section className="drawer-section">
            <h3>Support access</h3>
            <p className="muted">
              Read-only access to this merchant’s workspace. Support actions are audited.
            </p>
            <Button icon="Eye" onClick={() => openSupport(m)}>
              Open read-only support view
            </Button>
          </section>
          <section className="drawer-section">
            <h3>Billing actions</h3>
            {invoiceOpen && <ManualInvoice merchant={m} onDone={() => setInvoiceOpen(false)} />}
            <div className="message-actions">
              {!demoMode && (
                <Button onClick={() => setInvoiceOpen((v) => !v)}>Record manual invoice</Button>
              )}
              {demoMode && (
                <Button
                  icon="RotateCw"
                  onClick={() =>
                    change(
                      (d) => ({
                        ...d,
                        notes: [
                          { type: 'retry', merchant: m.id, date: new Date().toISOString() },
                          ...d.notes,
                        ],
                      }),
                      `Payment retry recorded for ${m.name} in this demo.`,
                    )
                  }
                >
                  Retry payment
                </Button>
              )}
              <Button icon="FileText" onClick={() => setDialog({ type: 'refund', merchant: m })}>
                Add refund note
              </Button>
            </div>
          </section>
          <section className="drawer-section">
            <h3>Moderation</h3>
            <Button
              className="danger"
              icon="ShieldAlert"
              onClick={() => setDialog({ type: 'suspend', merchant: m })}
            >
              Suspend merchant
            </Button>
          </section>
        </>
      ) : (
        <Empty />
      )}
    </Overlay>
  );
}
export function Dialog() {
  const {
    dialog: original,
    setDialog,
    data,
    change,
    setData,
    announce,
    navigate,
    copy,
    updateOrder,
    support,
    role,
    demoMode,
    pending,
    reload,
    selectWorkspace,
  } = useOps();
  const [step, setStep] = useState(original.type),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [tracking, setTracking] = useState(null),
    [gallery, setGallery] = useState(0);
  const initial = original.item,
    order = original.order,
    priced = initial || data.items.find((i) => i.id === order?.itemId),
    initialTrip =
      original.trip ||
      data.trips.find(
        (t) => t.id === (priced?.trip || order?.trip || sessionStorage.getItem('jo-trip')),
      ) ||
      data.trips[0];
  const [photos, setPhotos] = useState(initial?.photos || []),
    [proof, setProof] = useState(null);
  const [f, setF] = useState({
    name: initial?.name || order?.item || '',
    price: priced?.price || (demoMode ? 3000 : ''),
    currency: priced?.currency || initialTrip?.currency || 'JPY',
    markup: priced?.markup || 20,
    markupMode: priced?.markupMode || 'percent',
    trip: initialTrip?.id || '',
    qty: original.type === 'item' ? (initial ? (initial.qty ?? 1) : 1) : order?.qty || 1,
    unlimited: original.type === 'item' ? isUnlimited(initial) : false,
    depositMode: (original.type === 'item' ? initial : priced)?.depositMode || 'none',
    depositValue: (original.type === 'item' ? initial : priced)?.depositValue || '',
    status: initial?.status || 'Available',
    store: initial?.store || '',
    category: initial?.category || 'Beauty',
    note: original.type === 'item' ? initial?.note || '' : '',
    deadline: initial?.deadline || '',
    customer: '',
    phone: '',
    address: '',
    source: 'WhatsApp',
    itemId: data.items.find((i) => i.status !== 'Draft')?.id,
    amount: order ? Math.max(0, order.total - order.paid) : 0,
    paymentMethod: 'Bank transfer',
    link: '',
    actualPrice: order?.quotedCost || 0,
    actualCurrency: 'IDR',
    categoryBudget: original.budget?.category || 'Hotel',
    description: original.budget?.description || '',
    planned: original.budget?.planned || 0,
    actual: original.budget?.actual || 0,
    expenseCurrency: 'IDR',
    city: '',
    hub: 'Jakarta',
    start: demoMode ? '2026-11-02' : today(),
    end: demoMode ? '2026-11-08' : today(),
    budget: demoMode ? 6500000 : 0,
    units: 100,
    consent: false,
    code: '',
    memberRole: 'Helper',
  });
  const set = (k, v) => setF((prev) => ({ ...prev, [k]: v }));
  const t = data.trips.find((t) => t.id === f.trip) ||
      data.trips[0] || {
        id: '',
        currency: 'JPY',
        rate: 105,
        actual: 0,
        units: 0,
        allocation: 'none',
      },
    qty = Math.max(1, Number(f.qty)),
    rate = f.currency === t.currency ? t.rate : rates[f.currency],
    allocation = allocate(t, data.items, {
      qty,
      cost: Math.round(f.price * rate),
      id: initial?.id,
    }),
    calc = margin({
      price: f.price,
      currency: f.currency,
      rate,
      markup: f.markup,
      mode: f.markupMode,
      allocation,
    });
  const depositSetting = { depositMode: f.depositMode, depositValue: f.depositValue },
    quoteDeposit = order ? depositFor(depositSetting, calc.selling * order.qty, order.qty) : 0,
    depositInvalid =
      f.depositMode !== 'none' &&
      (!(Number(f.depositValue) > 0) ||
        (f.depositMode === 'percent' && Number(f.depositValue) > 100));
  const close = () => setDialog(null);
  const uploads = async (e) => {
    const files = [...e.target.files];
    if (files.length + photos.length > 6) {
      setError('Choose up to 6 photos per item.');
      return;
    }
    setBusy(true);
    try {
      const next = await Promise.all(files.map(compress));
      setPhotos((p) => [...p, ...next]);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const receipt = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setBusy(true);
    try {
      setProof({ name: file.name, preview: await compress(file) });
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const titles = {
    item: initial ? 'Edit item' : 'Add an item',
    quote: 'Prepare a quote',
    product: initial?.name,
    order: 'Place your order',
    'manual-order': 'Add order',
    payment: 'Record payment',
    purchase: 'Record actual purchase',
    trip: 'Create a trip',
    budget: original.budget ? 'Edit expense' : 'Add trip expense',
    request: 'Add a custom request',
    'buyer-request': 'Request an item',
    track: 'Track your order',
    workspace: 'Your workspace',
    help: 'A little help for the journey',
    reset: 'Reset demo workspace',
    plan: 'Choose ' + original.plan,
    customer: 'Add customer',
    invite: 'Invite a team member',
    'invite-merchant': 'Invite merchant',
    suspend: 'Suspend merchant',
    refund: 'Add refund note',
    report: 'Report this storefront',
    message: 'Copy your message',
    confirmation: 'Your order is in',
    'request-confirmation': 'Your request is in',
  };
  const requireSaved = async (promise) => {
    if (!(await promise))
      throw Error('The change was not saved. Please review the error and try again.');
    return true;
  };
  const createOrder = async (custom, buyer) => {
    const i = initial || data.items.find((i) => i.id === f.itemId);
    if (!custom && !i) {
      setError('Choose an item first.');
      return;
    }
    if (!custom && (i.status === 'Draft' || (!isUnlimited(i) && qty > i.qty))) {
      setError(`Only ${i.qty} available. Choose a smaller quantity.`);
      return;
    }
    if (buyer && !custom && qty > maxOrderQty(i)) {
      setError(`You can order up to ${maxOrderQty(i)} of this item at a time.`);
      return;
    }
    if (buyer && !demoMode) {
      const result = await placePublicOrder(data.shop.slug, {
        name: f.customer,
        phone: f.phone,
        address: f.address,
        qty,
        itemId: custom ? null : i.id,
        expectedPrice: custom ? null : i.selling,
        item: custom ? f.name : i.name,
        trip: custom ? f.trip : i.trip,
        budget: Number(f.amount),
        note: f.note,
        link: f.link,
        photos,
        consent: f.consent,
      });
      setTracking({ ...result, name: f.customer });
      setStep(custom ? 'request-confirmation' : 'confirmation');
      return;
    }
    const id = demoMode
      ? 'JO-' + (Math.max(1048, ...data.orders.map((o) => Number(o.id.split('-')[1]) || 0)) + 1)
      : recordId('JO-');
    const o = {
      id,
      name: f.customer,
      phone: f.phone.replace(/\D/g, ''),
      address: f.address,
      item: custom ? f.name : i.name,
      itemId: custom ? null : i.id,
      trip: custom ? f.trip : i.trip,
      total: custom ? 0 : i.selling * qty,
      budget: custom ? Number(f.amount) : null,
      qty,
      paid: 0,
      status: 'Requested',
      source: buyer ? 'Storefront' : f.source,
      date: demoMode ? '10 Oct' : today(),
      createdAt: new Date().toISOString(),
      note: f.note,
      link: f.link,
      photos: custom ? photos : [],
      quotedCost: custom ? 0 : i.cost,
      allocation: custom ? 0 : i.allocation,
      fxRate: custom ? null : i.rate,
      deposit: custom ? 0 : depositFor(i, i.selling * qty, qty),
    };
    const saved = await requireSaved(
      change(
        (d) => ({
          ...d,
          orders: [o, ...d.orders],
          items:
            buyer && !custom && !isUnlimited(i)
              ? d.items.map((x) => (x.id === i.id ? { ...x, qty: x.qty - qty } : x))
              : d.items,
        }),
        `${id} added for ${f.customer}.`,
        { publicAction: buyer },
      ),
    );
    if (saved) {
      if (buyer) {
        setTracking(o);
        setStep(custom ? 'request-confirmation' : 'confirmation');
      } else close();
    }
  };
  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (!demoMode && original.baseRevision != null && original.baseRevision !== data.revision) {
        throw Error(
          'This workspace changed while the form was open. Reopen the form to use the latest values.',
        );
      }
      if (support && !['order', 'buyer-request', 'report', 'track'].includes(step)) {
        setError('This support session is read-only. Exit support view to edit.');
        return;
      }
      if (step === 'item') {
        if (t.status === 'Closed') {
          setError('Choose an open trip. Closed trips are read-only.');
          return;
        }
        if (depositInvalid) {
          setError('Enter a down payment above zero (up to 100%).');
          return;
        }
        const i = {
          ...initial,
          id: initial?.id || recordId('IT-'),
          name: f.name,
          trip: t.id,
          price: Number(f.price),
          currency: f.currency,
          rate,
          markup: Number(f.markup),
          markupMode: f.markupMode,
          selling: calc.selling,
          cost: calc.purchase,
          allocation,
          qty: f.unlimited ? 0 : Number(f.qty),
          unlimited: !!f.unlimited,
          depositMode: f.depositMode,
          depositValue: f.depositMode === 'none' ? null : Number(f.depositValue),
          status: f.status,
          store: f.store,
          category: f.category,
          note: f.note,
          deadline: f.deadline,
          photos,
          image: initial?.image || (demoMode ? 'lotion' : 'none'),
        };
        if (
          await requireSaved(
            change(
              (d) => ({
                ...d,
                items: initial ? d.items.map((x) => (x.id === i.id ? i : x)) : [i, ...d.items],
              }),
              `${i.name} ${initial ? 'updated' : f.status === 'Draft' ? 'saved as a draft' : 'posted to ' + t.name}.`,
            ),
          )
        )
          close();
      } else if (step === 'quote') {
        if (depositInvalid) {
          setError('Enter a down payment above zero (up to 100%).');
          return;
        }
        await requireSaved(
          updateOrder(order.id, {
            total: calc.selling * order.qty,
            quotedCost: calc.purchase,
            allocation,
            fxRate: rate,
            deposit: quoteDeposit,
            status: 'Quoted',
          }),
        );
        close();
        await copy(
          `Hi ${order.name.split(' ')[0]}, your quote for ${order.qty} × ${order.item} is ${money(calc.selling * order.qty)}${quoteDeposit ? `, with a ${money(quoteDeposit)} down payment to confirm` : ''}. Reply to confirm. Order ${order.id}.`,
        );
      } else if (step === 'payment') {
        const o = data.orders.find((o) => o.id === order.id);
        if (Number(f.amount) <= 0 || Number(f.amount) > o.total - o.paid) {
          setError('Enter an amount above zero and no more than the outstanding balance.');
          return;
        }
        const paid = o.paid + Number(f.amount);
        await requireSaved(
          updateOrder(o.id, {
            paid,
            status:
              paid >= o.total && ['Requested', 'Quoted', 'Confirmed'].includes(o.status)
                ? 'Paid'
                : o.status,
            proof: proof || o.proof,
            payments: [
              ...(o.payments || []),
              {
                amount: Number(f.amount),
                method: f.paymentMethod,
                date: demoMode ? '10 Oct 2026' : today(),
                proof,
              },
            ],
          }),
        );
        close();
      } else if (step === 'purchase') {
        const actualRate =
          f.actualCurrency === 'IDR'
            ? 1
            : f.actualCurrency === t.currency
              ? t.rate
              : rates[f.actualCurrency];
        await requireSaved(
          updateOrder(order.id, {
            status: 'Purchased',
            actualCost: Math.round(f.actualPrice * actualRate),
            purchaseFxRate: actualRate,
          }),
        );
        close();
      } else if (step === 'trip') {
        const tr = {
          id: recordId('TR-'),
          name: f.name,
          city: f.city,
          hub: f.hub,
          start: f.start,
          end: f.end,
          dates: `${new Date(f.start + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}–${new Date(f.end + 'T12:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}`,
          currency: f.currency,
          rate: rates[f.currency],
          budget: Number(f.budget),
          actual: 0,
          units: Number(f.units),
          allocation: 'even',
          status: 'Planning',
        };
        await requireSaved(
          change((d) => ({ ...d, trips: [...d.trips, tr] }), `${tr.name} created.`),
        );
        sessionStorage.setItem('jo-trip', tr.id);
        close();
      } else if (step === 'budget') {
        const tr = original.trip;
        if (tr.status === 'Closed') {
          setError('Closed trips are read-only.');
          return;
        }
        const fx =
          f.expenseCurrency === 'IDR'
            ? 1
            : f.expenseCurrency === tr.currency
              ? tr.rate
              : rates[f.expenseCurrency];
        const b = {
          id: original.budget?.id || recordId('EX-'),
          trip: tr.id,
          category: f.categoryBudget,
          description: f.description,
          planned: Math.round(f.planned * fx),
          actual: Math.round(f.actual * fx),
          currency: f.expenseCurrency,
          rate: fx,
          receipt: proof,
        };
        await requireSaved(
          change(
            (d) => ({
              ...d,
              budgets: original.budget
                ? d.budgets.map((x) => (x.id === b.id ? b : x))
                : [...d.budgets, b],
              trips: d.trips.map((x) =>
                x.id === tr.id
                  ? {
                      ...x,
                      budget: x.budget + b.planned - (original.budget?.planned || 0),
                      actual: x.actual + b.actual - (original.budget?.actual || 0),
                    }
                  : x,
              ),
            }),
            `${b.category} expense saved.`,
          ),
        );
        close();
      } else if (step === 'order' || step === 'manual-order')
        await createOrder(false, step === 'order');
      else if (step === 'request' || step === 'buyer-request')
        await createOrder(true, step === 'buyer-request');
      else if (step === 'track' && !demoMode) {
        setTracking(await trackPublicOrder(f.code.trim()));
      } else if (step === 'track') {
        const o = data.orders.find((o) => o.id.toLowerCase() === f.code.trim().toLowerCase());
        if (o) setTracking(o);
        else setError('We couldn’t find that order. Check the code, like JO-1048.');
      } else if (step === 'plan' && !demoMode) {
        const saved = await change(
          (d) => ({
            ...d,
            notes: [
              { id: recordId(), type: 'plan-request', plan: original.plan, date: today() },
              ...d.notes,
            ],
          }),
          `Requested ${original.plan} plan. The platform owner will review it.`,
        );
        if (saved) close();
      } else if (step === 'plan') {
        await requireSaved(
          change(
            (d) => ({ ...d, plan: original.plan }),
            `${original.plan} plan activated in this demo.`,
          ),
        );
        close();
      } else if (step === 'customer') {
        await requireSaved(
          change(
            (d) => ({
              ...d,
              customers: [
                ...d.customers,
                { name: f.customer, phone: f.phone.replace(/\D/g, ''), address: f.address },
              ],
            }),
            `${f.customer} added to the address book.`,
          ),
        );
        close();
      } else if (step === 'invite' && !demoMode) {
        const link = await inviteMember(data.workspaceId, f.phone, f.memberRole);
        await reload();
        close();
        await copy(link, 'Invitation link');
      } else if (step === 'invite') {
        await requireSaved(
          change(
            (d) => ({
              ...d,
              members: [...d.members, { email: f.phone, role: f.memberRole, status: 'Invited' }],
            }),
            `Invitation for ${f.phone} saved in this demo.`,
          ),
        );
        close();
      } else if (step === 'invite-merchant') {
        await requireSaved(
          change(
            (d) => ({
              ...d,
              merchants: [
                ...d.merchants,
                {
                  id: recordId('M-'),
                  name: f.name,
                  owner: f.customer,
                  email: f.phone,
                  plan: 'Pro',
                  status: 'Invited',
                  items: 0,
                  orders: 0,
                  revenue: 0,
                  trialDays: 14,
                },
              ],
            }),
            `${f.name} invitation added to the demo directory.`,
          ),
        );
        close();
      } else if (step === 'suspend') {
        await requireSaved(
          change(
            (d) => ({
              ...d,
              merchants: d.merchants.map((m) =>
                m.id === original.merchant.id ? { ...m, status: 'Suspended', reason: f.note } : m,
              ),
            }),
            `${original.merchant.name} suspended. Reason: ${f.note}`,
          ),
        );
        close();
      } else if (step === 'report' && !demoMode) {
        await rpc('jastip_report_store', { p_slug: data.shop.slug, p_note: f.note });
        announce('Report submitted for review.');
        close();
      } else if (step === 'refund' || step === 'report') {
        await requireSaved(
          change(
            (d) => ({
              ...d,
              notes: [
                {
                  type: step,
                  note: f.note,
                  merchant: original.merchant?.id || 'M-001',
                  date: demoMode ? '10 Oct 2026' : today(),
                },
                ...d.notes,
              ],
            }),
            step === 'refund' ? 'Refund note saved.' : 'Storefront report submitted in this demo.',
            { publicAction: step === 'report' },
          ),
        );
        close();
      } else if (step === 'reset' && !demoMode) {
        throw Error('Reset is available only in demo mode.');
      } else if (step === 'reset') {
        if (import.meta.env.VITE_ENABLE_DEMO === 'true')
          setData(structuredClone((await import('./demo/fixtures')).seed));
        close();
        announce('Demo workspace reset.');
        navigate('Overview');
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  const tripSelect = (
    <Field label="Trip">
      <select
        value={f.trip}
        onChange={(e) => {
          const tr = data.trips.find((t) => t.id === e.target.value);
          setF((p) => ({ ...p, trip: tr.id, currency: tr.currency }));
        }}
      >
        {data.trips
          .filter((t) => t.status !== 'Closed')
          .map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
      </select>
    </Field>
  );
  const customerFields = (
    <>
      <Field label="Your name">
        <input
          required
          autoComplete="name"
          value={f.customer}
          onChange={(e) => set('customer', e.target.value)}
          placeholder="Full name"
        />
      </Field>
      <Field
        label="WhatsApp number"
        hint="Include the country code, for example +62 812 3456 7890."
      >
        <input
          type="tel"
          autoComplete="tel"
          pattern="[+0-9 ()-]{8,20}"
          required
          value={f.phone}
          onChange={(e) => set('phone', e.target.value)}
          placeholder="+62"
        />
      </Field>
      <Field label="Delivery address">
        <textarea
          required
          autoComplete="street-address"
          value={f.address}
          onChange={(e) => set('address', e.target.value)}
          placeholder="Street, city, province, postal code"
        />
      </Field>
    </>
  );
  const pricing = (
    <>
      <div className="form-grid">
        <Field label="Purchase price">
          <div className="input-combo">
            <input
              type="number"
              min="1"
              step="any"
              required
              value={f.price}
              onChange={(e) => set('price', e.target.value)}
            />
            <select
              aria-label="Purchase currency"
              value={f.currency}
              onChange={(e) => set('currency', e.target.value)}
            >
              {Object.keys(rates).map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        </Field>
        <Field label="Markup" hint="Markup is on cost; margin is on selling price.">
          <div className="input-combo">
            <input
              type="number"
              min="0"
              required
              value={f.markup}
              onChange={(e) => set('markup', e.target.value)}
            />
            <select
              aria-label="Markup type"
              value={f.markupMode}
              onChange={(e) => set('markupMode', e.target.value)}
            >
              <option value="percent">%</option>
              <option value="amount">IDR</option>
            </select>
          </div>
        </Field>
      </div>
      <div className="margin-block">
        {role !== 'Helper' && (
          <div className="margin-heading">
            <span>Live margin estimate</span>
            <span
              className={`margin-signal ${calc.profit < 0 ? 'red' : calc.percent < 10 ? 'amber' : ''}`}
            >
              <I name={calc.profit < 0 ? 'CircleAlert' : 'CircleCheck'} size={13} />
              {calc.profit < 0 ? 'Below cost' : calc.percent < 10 ? 'Low margin' : 'Healthy margin'}
            </span>
          </div>
        )}
        <div>
          <span>
            Product cost
            <small>
              1 {f.currency} = {money(rate)}
            </small>
          </span>
          <strong>{money(calc.purchase)}</strong>
        </div>
        <div>
          <span>Allocated trip cost / item</span>
          <strong>{money(allocation)}</strong>
        </div>
        <div>
          <span>Landed cost</span>
          <strong>{money(calc.landed)}</strong>
        </div>
        <div className="selling-row">
          <span>
            Selling price<small>Rounded to Rp 1.000</small>
          </span>
          <strong>{money(calc.selling)}</strong>
        </div>
        {role !== 'Helper' && (
          <div
            className={`profit-row ${calc.profit < 0 ? 'red' : calc.percent < 10 ? 'amber' : ''}`}
          >
            <span>Estimated margin</span>
            <strong>
              {money(calc.profit)}
              <small>{calc.percent.toFixed(1)}%</small>
            </strong>
          </div>
        )}
      </div>
    </>
  );
  const depositExample =
    step === 'quote' && order ? quoteDeposit : depositFor(depositSetting, calc.selling, 1);
  const depositFields = (
    <Field
      label="Down payment"
      hint={
        f.depositMode === 'none'
          ? 'Ask for a DP on pricey finds or custom requests.'
          : `${money(depositExample)} due ${step === 'quote' ? 'on this order' : 'per item'} before you purchase.`
      }
    >
      <div className="input-combo dp-combo">
        <select
          aria-label="Down payment type"
          value={f.depositMode}
          onChange={(e) => set('depositMode', e.target.value)}
        >
          <option value="none">No DP</option>
          <option value="percent">% of total</option>
          <option value="amount">IDR per item</option>
        </select>
        {f.depositMode !== 'none' && (
          <input
            type="number"
            min="1"
            max={f.depositMode === 'percent' ? 100 : undefined}
            required
            aria-label="Down payment value"
            value={f.depositValue}
            onChange={(e) => set('depositValue', e.target.value)}
          />
        )}
      </div>
    </Field>
  );
  return (
    <Overlay onClose={close} title="dialog-title">
      <div className={`dialog-content ${step === 'item' ? 'capture-dialog' : ''}`}>
        <div className="modal-head">
          <div>
            <h2 id="dialog-title">{titles[step]}</h2>
            {step === 'item' && <p>A photo, a price, and a margin you can trust.</p>}
          </div>
          <button className="icon-btn" aria-label="Close dialog" onClick={close}>
            <I name="X" size={18} />
          </button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body">
            {error && (
              <div className="form-error" role="alert">
                <I name="CircleAlert" size={14} />
                {error}
              </div>
            )}
            {['item', 'quote'].includes(step) && (
              <div className={`capture-grid ${step === 'quote' ? 'quote-grid' : ''}`}>
                {step === 'item' && (
                  <div className="capture-photos">
                    <label className="photo-upload">
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        multiple
                        aria-label="Product photos"
                        onChange={uploads}
                      />
                      {photos.length ? (
                        <img src={photos[0]} alt="Uploaded product" />
                      ) : (
                        <>
                          <I name="Camera" size={28} />
                          <strong>Add a product photo</strong>
                          <span>Take a photo or choose from gallery</span>
                          <small>Up to 6 photos · JPG, PNG</small>
                        </>
                      )}
                    </label>
                    {photos.length > 0 && (
                      <div className="photo-thumbs">
                        {photos.map((p, k) => (
                          <button
                            type="button"
                            key={k}
                            aria-label={'Remove photo ' + (k + 1)}
                            onClick={() => setPhotos((p) => p.filter((_, j) => j !== k))}
                          >
                            <img src={p} alt={'Product photo ' + (k + 1)} />
                            <I name="X" size={12} />
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="capture-tip">
                      <I name="Lightbulb" size={15} />
                      <p>Good light and a clear label help your customers choose.</p>
                    </div>
                    {initial && !photos.length && <ProductArt item={initial} />}
                  </div>
                )}
                {step === 'quote' && order?.photos?.length > 0 && (
                  <div className="reference-photos">
                    {order.photos.map((photo, index) => (
                      <img key={index} src={photo} alt={'Buyer reference ' + (index + 1)} />
                    ))}
                  </div>
                )}
                <div className="capture-fields">
                  <Field label={step === 'quote' ? 'Requested item' : 'Item name'}>
                    <input
                      required
                      value={f.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="What did you find?"
                    />
                  </Field>
                  {tripSelect}
                  {pricing}
                  {step === 'quote' && depositFields}
                  {step === 'item' && (
                    <>
                      <div className="form-grid">
                        <Field label="Availability">
                          <select value={f.status} onChange={(e) => set('status', e.target.value)}>
                            <option>Available</option>
                            <option>Pre-order</option>
                            <option>Draft</option>
                          </select>
                        </Field>
                        <Field
                          label="Quantity"
                          hint={
                            f.unlimited
                              ? `Buyers can order up to ${MAX_UNLIMITED_PER_ORDER} at a time.`
                              : undefined
                          }
                        >
                          {f.unlimited ? (
                            <input value="No limit" disabled aria-label="Quantity" />
                          ) : (
                            <input
                              type="number"
                              min="0"
                              max="10000"
                              required
                              value={f.qty}
                              onChange={(e) => set('qty', e.target.value)}
                            />
                          )}
                        </Field>
                      </div>
                      <label className="check-row">
                        <input
                          type="checkbox"
                          checked={f.unlimited}
                          onChange={(e) => set('unlimited', e.target.checked)}
                        />
                        <span>
                          No quantity limit
                          <small>For finds you can buy as many as customers order.</small>
                        </span>
                      </label>
                      {depositFields}
                      <div className="form-grid">
                        <Field label="Store name">
                          <input
                            value={f.store}
                            onChange={(e) => set('store', e.target.value)}
                            placeholder="Where you found it"
                          />
                        </Field>
                        <Field label="Category">
                          <select
                            value={f.category}
                            onChange={(e) => set('category', e.target.value)}
                          >
                            {['Beauty', 'Fashion', 'Food & drink', 'Home', 'Other'].map((s) => (
                              <option key={s}>{s}</option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <Field label="Description or note">
                        <textarea
                          value={f.note}
                          onChange={(e) => set('note', e.target.value)}
                          placeholder="Sizes, colors, or the little details"
                        />
                      </Field>
                      <Field label="Order deadline (optional)">
                        <input
                          type="date"
                          value={f.deadline}
                          onChange={(e) => set('deadline', e.target.value)}
                        />
                      </Field>
                    </>
                  )}
                </div>
              </div>
            )}
            {step === 'product' && (
              <>
                <div className="product-detail-grid">
                  <div className="detail-gallery">
                    <ProductArt item={initial} photo={gallery} />
                    {initial.photos?.length > 1 && (
                      <div className="gallery-nav">
                        {initial.photos.map((p, k) => (
                          <button
                            type="button"
                            key={k}
                            className={gallery === k ? 'active' : ''}
                            aria-label={'View photo ' + (k + 1)}
                            onClick={() => setGallery(k)}
                          >
                            <img src={p} alt="" />
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Badge status={initial.status} />
                    <div className="detail-price">{money(initial.selling)}</div>
                    <p>{initial.note}</p>
                    <dl className="details-list">
                      <dt>Trip</dt>
                      <dd>{data.trips.find((t) => t.id === initial.trip)?.name}</dd>
                      <dt>Available</dt>
                      <dd>
                        {isUnlimited(initial)
                          ? `Ready to order · up to ${MAX_UNLIMITED_PER_ORDER} per order`
                          : `${initial.qty} items`}
                      </dd>
                      {depositLabel(initial) && (
                        <>
                          <dt>Down payment</dt>
                          <dd>
                            {money(depositFor(initial, initial.selling * qty, qty))} to confirm your
                            order
                          </dd>
                        </>
                      )}
                      <dt>Delivery</dt>
                      <dd>
                        {demoMode
                          ? '23–27 October 2026'
                          : data.trips.find((t) => t.id === (order?.trip || initial?.trip))
                              ?.dates || 'Ask your merchant'}
                      </dd>
                      <dt>Order by</dt>
                      <dd>{initial.deadline || 'Ask your merchant'}</dd>
                    </dl>
                    <Field label="Quantity">
                      <input
                        type="number"
                        min="1"
                        max={maxOrderQty(initial)}
                        value={f.qty}
                        onChange={(e) => set('qty', e.target.value)}
                      />
                    </Field>
                  </div>
                </div>
                <Callout icon="Package">Local delivery fees are confirmed with your order.</Callout>
              </>
            )}
            {['order', 'manual-order'].includes(step) && (
              <>
                {step === 'order' ? (
                  <div className="checkout-summary">
                    <strong>{initial.name}</strong>
                    <span>
                      {qty} × {money(initial.selling)}
                    </span>
                    <strong>{money(initial.selling * qty)}</strong>
                    {depositFor(initial, initial.selling * qty, qty) > 0 && (
                      <small>
                        Down payment {money(depositFor(initial, initial.selling * qty, qty))}
                      </small>
                    )}
                  </div>
                ) : (
                  <>
                    <Field label="Item">
                      <select value={f.itemId} onChange={(e) => set('itemId', e.target.value)}>
                        {data.items
                          .filter((i) => i.status !== 'Draft')
                          .map((i) => (
                            <option key={i.id} value={i.id}>
                              {i.name} · {money(i.selling)}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <div className="form-grid">
                      <Field label="Quantity">
                        <input
                          type="number"
                          required
                          min="1"
                          value={f.qty}
                          onChange={(e) => set('qty', e.target.value)}
                        />
                      </Field>
                      <Field label="Source">
                        <select value={f.source} onChange={(e) => set('source', e.target.value)}>
                          <option>WhatsApp</option>
                          <option>Instagram</option>
                          <option>Manual</option>
                        </select>
                      </Field>
                    </div>
                  </>
                )}
                {customerFields}
                <Field label="Note (optional)">
                  <textarea
                    value={f.note}
                    onChange={(e) => set('note', e.target.value)}
                    placeholder="Size, color, or anything we should know"
                  />
                </Field>
                {step === 'order' && (
                  <label className="consent">
                    <input
                      required
                      type="checkbox"
                      checked={f.consent}
                      onChange={(e) => set('consent', e.target.checked)}
                    />
                    <span>
                      I agree to share my details with this merchant to fulfill my order. I can
                      request data export or deletion.
                    </span>
                  </label>
                )}
              </>
            )}
            {['request', 'buyer-request'].includes(step) && (
              <>
                <Field label="What are you looking for?">
                  <input
                    required
                    value={f.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Item name or a little description"
                  />
                </Field>
                <Field label="Reference link (optional)">
                  <input
                    type="url"
                    value={f.link}
                    onChange={(e) => set('link', e.target.value)}
                    placeholder="https://…"
                  />
                </Field>
                <Field label="Reference photo (optional)">
                  <input type="file" accept="image/*" onChange={uploads} />
                </Field>
                {tripSelect}
                <div className="form-grid">
                  <Field label="Budget (IDR)">
                    <input
                      type="number"
                      min="0"
                      value={f.amount}
                      onChange={(e) => set('amount', e.target.value)}
                    />
                  </Field>
                  <Field label="Quantity">
                    <input
                      type="number"
                      min="1"
                      value={f.qty}
                      onChange={(e) => set('qty', e.target.value)}
                    />
                  </Field>
                </div>
                {customerFields}
                <Field label="Note (optional)">
                  <textarea value={f.note} onChange={(e) => set('note', e.target.value)} />
                </Field>
                {step === 'buyer-request' && (
                  <label className="consent">
                    <input
                      type="checkbox"
                      required
                      checked={f.consent}
                      onChange={(e) => set('consent', e.target.checked)}
                    />
                    <span>I agree to share these details with the merchant for this request.</span>
                  </label>
                )}
              </>
            )}
            {step === 'payment' && (
              <>
                <div className="checkout-summary">
                  <span>Outstanding for {order.id}</span>
                  <strong>{money(order.total - order.paid)}</strong>
                </div>
                <Field label="Payment amount (IDR)">
                  <input
                    type="number"
                    required
                    min="1"
                    max={order.total - order.paid}
                    value={f.amount}
                    onChange={(e) => set('amount', e.target.value)}
                  />
                </Field>
                <Field label="Payment method">
                  <select
                    value={f.paymentMethod}
                    onChange={(e) => set('paymentMethod', e.target.value)}
                  >
                    <option>Bank transfer</option>
                    <option>QRIS</option>
                    <option>Cash</option>
                    <option>Other</option>
                  </select>
                </Field>
                <Field label="Payment proof (optional)">
                  <input type="file" accept="image/*" onChange={receipt} />
                </Field>
                {order.deposit > 0 && order.paid < order.deposit && (
                  <Callout icon="Info">
                    Down payment due: {money(order.deposit - order.paid)} before purchasing.
                  </Callout>
                )}
                <p className="footnote">
                  Partial payments are welcome. Confirmed orders that are fully paid move to Paid;
                  purchased orders keep their status.
                </p>
              </>
            )}
            {step === 'purchase' && (
              <>
                <p>
                  {order.qty} × {order.item}
                </p>
                <div className="form-grid">
                  <Field label="Actual purchase cost per item">
                    <input
                      type="number"
                      min="0"
                      required
                      value={f.actualPrice}
                      onChange={(e) => set('actualPrice', e.target.value)}
                    />
                  </Field>
                  <Field label="Actual purchase currency">
                    <select
                      value={f.actualCurrency}
                      onChange={(e) => set('actualCurrency', e.target.value)}
                    >
                      {Object.keys(rates).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                </div>
                <div className="margin-block">
                  <div>
                    <span>Estimated product cost</span>
                    <strong>{money(order.quotedCost)}</strong>
                  </div>
                  {role !== 'Helper' && (
                    <div className="profit-row">
                      <span>Actual margin after trip cost</span>
                      <strong>
                        {money(
                          order.total -
                            (Math.round(
                              f.actualPrice *
                                (f.actualCurrency === 'IDR'
                                  ? 1
                                  : f.actualCurrency === t.currency
                                    ? t.rate
                                    : rates[f.actualCurrency]),
                            ) +
                              order.allocation) *
                              order.qty,
                        )}
                      </strong>
                    </div>
                  )}
                </div>
              </>
            )}
            {step === 'trip' && (
              <>
                <Field label="Trip name">
                  <input
                    required
                    value={f.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Tokyo autumn trip"
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Shopping destination">
                    <input
                      required
                      value={f.city}
                      onChange={(e) => set('city', e.target.value)}
                      placeholder="City, country"
                    />
                  </Field>
                  <Field label="Delivery hub">
                    <input required value={f.hub} onChange={(e) => set('hub', e.target.value)} />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Start date">
                    <input
                      required
                      type="date"
                      value={f.start}
                      onChange={(e) => set('start', e.target.value)}
                    />
                  </Field>
                  <Field label="End date">
                    <input
                      required
                      type="date"
                      min={f.start}
                      value={f.end}
                      onChange={(e) => set('end', e.target.value)}
                    />
                  </Field>
                </div>
                <div className="form-grid">
                  <Field label="Purchase currency">
                    <select value={f.currency} onChange={(e) => set('currency', e.target.value)}>
                      {Object.keys(rates).map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Estimated total item units"
                    hint="Used to divide trip expenses evenly across items."
                  >
                    <input
                      required
                      type="number"
                      min="1"
                      max="1000000"
                      value={f.units}
                      onChange={(e) => set('units', e.target.value)}
                    />
                  </Field>
                  <Field label="Planned budget (IDR)">
                    <input
                      required
                      type="number"
                      min="0"
                      value={f.budget}
                      onChange={(e) => set('budget', e.target.value)}
                    />
                  </Field>
                </div>
                <Callout>Base currency is IDR. Your trip starts in Planning.</Callout>
              </>
            )}
            {step === 'budget' && (
              <>
                <Field label="Category">
                  <select
                    value={f.categoryBudget}
                    onChange={(e) => set('categoryBudget', e.target.value)}
                  >
                    {[
                      'Hotel',
                      'Flight',
                      'Ride hailing',
                      'Local transport',
                      'Meals',
                      'Baggage fee',
                      'Other',
                    ].map((s) => (
                      <option key={s}>{s}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Description">
                  <input
                    required
                    value={f.description}
                    onChange={(e) => set('description', e.target.value)}
                  />
                </Field>
                <div className="form-grid">
                  <Field label="Planned amount">
                    <input
                      required
                      type="number"
                      min="1"
                      value={f.planned}
                      onChange={(e) => set('planned', e.target.value)}
                    />
                  </Field>
                  <Field label="Actual amount">
                    <input
                      required
                      type="number"
                      min="0"
                      value={f.actual}
                      onChange={(e) => set('actual', e.target.value)}
                    />
                  </Field>
                </div>
                <Field label="Expense currency">
                  <select
                    value={f.expenseCurrency}
                    onChange={(e) => set('expenseCurrency', e.target.value)}
                  >
                    {Object.keys(rates).map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                {original.budget?.receipt && (
                  <Button
                    type="button"
                    icon="Download"
                    onClick={async () => {
                      try {
                        const url = await proofUrl(original.budget.receipt);
                        await copy(url, 'Receipt link (expires in one minute)');
                      } catch (e) {
                        setError(e.message);
                      }
                    }}
                  >
                    Copy receipt download link
                  </Button>
                )}
                <Field label="Receipt (optional)">
                  <input type="file" accept="image/*" onChange={receipt} />
                </Field>
              </>
            )}
            {step === 'track' && (
              <>
                {tracking ? (
                  <div className="tracking">
                    <span className="mono">{tracking.id}</span>
                    <h3>Your order is {tracking.status.toLowerCase()}</h3>
                    <Badge status={tracking.status} />
                    <p>Contact the merchant for delivery details or changes.</p>
                    <button type="button" className="text-btn" onClick={() => setTracking(null)}>
                      Look up another order
                    </button>
                  </div>
                ) : (
                  <>
                    <p>
                      {demoMode
                        ? 'Enter the short code from your order confirmation.'
                        : 'Enter the private tracking token from your confirmation.'}
                    </p>
                    <Field label="Order code">
                      <input
                        required
                        value={f.code}
                        onChange={(e) => set('code', e.target.value)}
                        placeholder="JO-1048"
                      />
                    </Field>
                  </>
                )}
              </>
            )}
            {['confirmation', 'request-confirmation'].includes(step) && (
              <div className="confirmation">
                <span className="confirmation-icon">
                  <I name="Check" size={24} />
                </span>
                <h3>
                  {step === 'confirmation'
                    ? `Thanks, ${tracking.name.split(' ')[0]}. Your find is reserved.`
                    : 'Your merchant will take a look on the next trip.'}
                </h3>
                {step === 'confirmation' && Number(tracking.deposit) > 0 && (
                  <Callout icon="Wallet">
                    Down payment: {money(tracking.deposit)} to confirm this order.
                  </Callout>
                )}
                <p>
                  {step === 'confirmation'
                    ? 'Your merchant will reach out on WhatsApp to confirm availability and payment.'
                    : 'You’ll receive a quote on WhatsApp when the item is found.'}
                </p>
                <div className="tracking-code private-token">
                  <small>{demoMode ? 'Your order code' : 'Private tracking token'}</small>
                  <strong className="mono">
                    {demoMode ? tracking.id : tracking.trackingToken}
                  </strong>
                  <button
                    type="button"
                    className="text-btn"
                    onClick={() =>
                      copy(demoMode ? tracking.id : tracking.trackingToken, 'Tracking token')
                    }
                  >
                    <I name="Copy" size={14} />
                    Copy code
                  </button>
                </div>
                <p className="footnote">
                  Keep your private tracking token safe. No account needed.
                </p>
              </div>
            )}
            {step === 'workspace' && (
              <div className="workspace-menu">
                {!demoMode &&
                  data.workspaceChoices?.length > 1 &&
                  data.workspaceChoices.map((workspace) => (
                    <button
                      key={workspace.id}
                      type="button"
                      onClick={() => selectWorkspace(workspace.id)}
                    >
                      <I name="Store" />
                      <div>
                        <strong>{workspace.name}</strong>
                        <small>{workspace.role} workspace</small>
                      </div>
                    </button>
                  ))}
                {[
                  ['Overview', data.shop.name, 'Seller workspace · ' + role, 'Store'],
                  [
                    'Storefront',
                    'Public storefront',
                    'Explore the buyer experience',
                    'ShoppingBag',
                  ],
                  [
                    'Merchants',
                    'Platform console',
                    'Manage merchants & subscriptions',
                    'ShieldCheck',
                  ],
                  ['Welcome', 'Start the walkthrough', 'Workspace → trip → first item', 'Compass'],
                ]
                  .filter(([p]) => demoMode || p !== 'Merchants' || data.isAdmin)
                  .map(([p, title, desc, icon]) => (
                    <button
                      type="button"
                      key={p}
                      onClick={() => {
                        navigate(p);
                        close();
                      }}
                    >
                      <span className="trip-glyph">
                        <I name={icon} />
                      </span>
                      <div>
                        <strong>{title}</strong>
                        <small>{desc}</small>
                      </div>
                      <I name="ArrowRight" />
                    </button>
                  ))}
              </div>
            )}
            {step === 'help' && (
              <>
                <p>
                  A calm workspace for the whole journey: plan a trip, post your finds, collect
                  orders, record payments, and shop with a checklist.
                </p>
                <div className="shortcuts">
                  <span>
                    Search & navigate<kbd>⌘ / Ctrl K</kbd>
                  </span>
                  <span>
                    Add an item<kbd>N</kbd>
                  </span>
                  <span>
                    Go to Orders / Trips<kbd>g o / g t</kbd>
                  </span>
                  <span>
                    Close the top dialog<kbd>Esc</kbd>
                  </span>
                </div>
                <Callout>
                  This is an interactive mockup. Data stays in this browser; messages and payments
                  are simulated.
                </Callout>
              </>
            )}
            {step === 'reset' && (
              <p>
                This restores the original demo trips, items, orders, customers, and merchants in
                this browser.
              </p>
            )}
            {step === 'plan' && (
              <>
                <Callout icon="CreditCard">
                  {demoMode
                    ? 'Demo checkout. No money will be charged.'
                    : 'Request this plan from the platform owner. Payment and activation are handled manually.'}
                </Callout>
                <Field label="Payment method">
                  <select>
                    <option>QRIS</option>
                    <option>Virtual account</option>
                    <option>Card</option>
                  </select>
                </Field>
                <div className="checkout-summary">
                  <span>{original.plan} · Monthly</span>
                  <strong>{money(planDetails.find((p) => p.name === original.plan).price)}</strong>
                </div>
              </>
            )}
            {step === 'customer' && customerFields}
            {step === 'invite' && (
              <>
                <Field label="Email address">
                  <input
                    required
                    type="email"
                    value={f.phone}
                    onChange={(e) => set('phone', e.target.value)}
                    placeholder="name@example.com"
                  />
                </Field>
                <Field label="Role">
                  <select value={f.memberRole} onChange={(e) => set('memberRole', e.target.value)}>
                    <option>Manager</option>
                    <option>Helper</option>
                  </select>
                </Field>
                <p className="footnote">
                  Helpers cannot see margins or reports. Share the invitation link with the invited
                  email address.
                </p>
              </>
            )}
            {step === 'invite-merchant' && (
              <>
                <Field label="Merchant name">
                  <input required value={f.name} onChange={(e) => set('name', e.target.value)} />
                </Field>
                <Field label="Owner name">
                  <input
                    required
                    value={f.customer}
                    onChange={(e) => set('customer', e.target.value)}
                  />
                </Field>
                <Field label="Email address">
                  <input
                    required
                    type="email"
                    value={f.phone}
                    onChange={(e) => set('phone', e.target.value)}
                  />
                </Field>
                <p className="footnote">Starts with a 14-day Pro trial after activation.</p>
              </>
            )}
            {['suspend', 'refund', 'report'].includes(step) && (
              <>
                <p>
                  {step === 'suspend'
                    ? `Suspend ${original.merchant.name} while you review this merchant. Their data will be preserved.`
                    : step === 'report'
                      ? 'Tell us what needs review. Reports help keep storefronts trustworthy.'
                      : 'Record the amount and reason. This creates a note, not a real refund.'}
                </p>
                <Field label="Reason or note">
                  <textarea required value={f.note} onChange={(e) => set('note', e.target.value)} />
                </Field>
              </>
            )}
            {step === 'message' && (
              <textarea
                readOnly
                rows="6"
                value={original.text}
                onFocus={(e) => e.target.select()}
              />
            )}
          </div>
          <div className="modal-foot">
            {!['workspace', 'help', 'message', 'confirmation', 'request-confirmation'].includes(
              step,
            ) && (
              <Button type="button" onClick={close}>
                {step === 'product' ? 'Keep browsing' : 'Cancel'}
              </Button>
            )}
            <span className="spacer" />
            {step === 'product' ? (
              <Button
                primary
                type="button"
                icon="ShoppingBag"
                onClick={() => {
                  if (qty > maxOrderQty(initial) || Number(f.qty) < 1) {
                    setError(`Choose between 1 and ${maxOrderQty(initial)} items.`);
                    return;
                  }
                  setStep('order');
                }}
              >
                Order this item
              </Button>
            ) : ['workspace', 'help', 'message', 'confirmation', 'request-confirmation'].includes(
                step,
              ) ? (
              <Button primary type="button" onClick={close}>
                {step.includes('confirmation') ? 'Keep browsing' : 'Done'}
              </Button>
            ) : step === 'track' && tracking ? null : (
              <Button
                primary
                type="submit"
                disabled={busy || pending}
                icon={step === 'quote' ? 'Copy' : step === 'item' ? 'ArrowUpRight' : undefined}
              >
                {busy
                  ? 'Reading photo…'
                  : step === 'item'
                    ? initial
                      ? 'Save item'
                      : f.status === 'Draft'
                        ? 'Save draft'
                        : 'Post item'
                    : step === 'quote'
                      ? 'Save & copy quote'
                      : step === 'order'
                        ? 'Place order'
                        : step === 'payment'
                          ? 'Record payment'
                          : step === 'purchase'
                            ? 'Mark as purchased'
                            : step === 'trip'
                              ? 'Create trip'
                              : step === 'track'
                                ? 'Track order'
                                : step === 'plan'
                                  ? demoMode
                                    ? 'Activate demo plan'
                                    : 'Request plan'
                                  : step === 'reset'
                                    ? 'Reset demo'
                                    : step === 'suspend'
                                      ? 'Suspend merchant'
                                      : ['request', 'buyer-request'].includes(step)
                                        ? 'Send request'
                                        : ['invite', 'invite-merchant'].includes(step)
                                          ? 'Save invitation'
                                          : 'Save'}
              </Button>
            )}
          </div>
        </form>
      </div>
    </Overlay>
  );
}
export function CommandPalette() {
  const { setPalette, navigate, data, setDialog, setDrawer } = useOps();
  const [q, setQ] = useState('');
  const pages = [
    'Overview',
    'Orders',
    'Requests',
    'Items',
    'Trips',
    'Purchasing',
    'Customers',
    'Reports',
    'Settings',
    'Billing',
    'Welcome',
    'Storefront',
    'Merchants',
  ];
  return (
    <Overlay onClose={() => setPalette(false)} label="Search and navigate">
      <div className="command-palette">
        <div className="command-input">
          <I name="Search" size={18} />
          <input
            data-autofocus
            aria-label="Search and navigate"
            placeholder="Search orders or jump to a page…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
          <button className="icon-btn" aria-label="Close search" onClick={() => setPalette(false)}>
            <kbd>Esc</kbd>
          </button>
        </div>
        <div className="command-results">
          <div className="nav-label">PAGES & ACTIONS</div>
          {!q && (
            <button
              onClick={() => {
                setPalette(false);
                setDialog({ type: 'item' });
              }}
            >
              <I name="Plus" />
              Add a new item<kbd>N</kbd>
            </button>
          )}
          {pages
            .filter((p) => p.toLowerCase().includes(q.toLowerCase()))
            .map((p) => (
              <button
                key={p}
                onClick={() => {
                  navigate(p);
                  setPalette(false);
                }}
              >
                <I name={navIcons[p]} />
                {p}
                <I name="CornerDownLeft" size={12} />
              </button>
            ))}
          {q &&
            data.orders
              .filter((o) => `${o.name} ${o.id} ${o.item}`.toLowerCase().includes(q.toLowerCase()))
              .map((o) => (
                <button
                  key={o.id}
                  onClick={() => {
                    navigate('Orders');
                    setPalette(false);
                    setDrawer({ type: 'order', id: o.id });
                  }}
                >
                  <I name="Inbox" />
                  {o.name}
                  <small className="mono">{o.id}</small>
                </button>
              ))}
        </div>
        <div className="command-foot">
          A place for everything.
          <span>
            <kbd>Tab</kbd> to navigate · <kbd>Enter</kbd> to open
          </span>
        </div>
      </div>
    </Overlay>
  );
}
