import React, { useState } from 'react';
import { MoneyInput } from './money-input';
import { useOps } from './store';
import { Header, Button, Stats, Badge, Field, Empty, Callout } from './ui';
import { planDetails } from './data';
import { money } from './money';
import { adminAction } from './lib/repository';
import { rpc } from './lib/supabase';
export function LiveBilling() {
  const { data, change, exportCsv, pending } = useOps();
  const plan = planDetails.find((p) => p.name === data.plan) || planDetails[0];
  return (
    <>
      <Header
        title="Plan & billing"
        description="Subscriptions and payments are managed by the platform owner."
      />
      <section className="panel live-panel">
        <div className="section-title">
          <h2>{plan.name} plan</h2>
          <Badge status={data.subscriptionStatus || 'Active'} />
        </div>
        <p>
          {money(plan.price)} per month · {data.members.length} team members · {data.items.length}{' '}
          items
        </p>
        <Callout>
          After you arrange payment with the platform owner, they can activate your plan and record
          an invoice here.
        </Callout>
      </section>
      <div className="plans">
        {planDetails.map((p) => (
          <section className="panel plan" key={p.name}>
            <h2>{p.name}</h2>
            <strong>
              {money(p.price)}
              <small> / month</small>
            </strong>
            <ul>
              {p.features.map((feature) => (
                <li key={feature}>{feature}</li>
              ))}
            </ul>
            <Button
              disabled={
                p.name === data.plan ||
                pending ||
                data.notes.some(
                  (n) => n.type === 'plan-request' && n.plan === p.name && n.status !== 'Resolved',
                )
              }
              onClick={() =>
                change(
                  (d) => ({
                    ...d,
                    notes: [
                      {
                        id: crypto.randomUUID(),
                        type: 'plan-request',
                        status: 'Open',
                        plan: p.name,
                        date: new Date().toISOString(),
                      },
                      ...d.notes,
                    ],
                  }),
                  `Requested ${p.name} plan. Contact the platform owner to arrange payment.`,
                )
              }
            >
              {p.name === data.plan
                ? 'Current plan'
                : data.notes.some(
                      (n) =>
                        n.type === 'plan-request' && n.plan === p.name && n.status !== 'Resolved',
                    )
                  ? 'Request sent'
                  : 'Request ' + p.name}
            </Button>
          </section>
        ))}
      </div>
      <section className="panel">
        <div className="panel-head">
          <h2>Invoices</h2>
          <Button
            icon="Download"
            disabled={!data.invoices.length}
            onClick={() => exportCsv(data.invoices, 'invoices')}
          >
            Export CSV
          </Button>
        </div>
        {!data.invoices.length ? (
          <Empty
            title="No invoices yet"
            text="Verified manual payments will appear here once the platform owner records them."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((i) => (
                  <tr key={i.id}>
                    <td className="mono">{i.id}</td>
                    <td>{i.date}</td>
                    <td>
                      <Badge status={i.status} />
                    </td>
                    <td>{money(i.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
export function LiveAdminSummary() {
  const { data, page, setDrawer, reload, announce } = useOps();
  const [busy, setBusy] = useState(false);
  if (page === 'Metrics') {
    const active = data.merchants.filter((m) => ['Active', 'Trial'].includes(m.status));
    return (
      <>
        <Header
          title="Platform overview"
          description="Live workspace and manually verified billing totals."
        />
        <Stats
          stats={[
            {
              label: 'Active workspaces',
              value: active.length,
              caption: 'Active and trial accounts',
            },
            {
              label: 'Recorded payments',
              value: money(
                data.merchants.reduce((sum, m) => sum + m.revenue, 0),
                true,
              ),
              caption: 'Paid manual invoices · all time',
            },
            {
              label: 'Items',
              value: data.merchants.reduce((sum, m) => sum + m.items, 0),
              caption: 'Across all workspaces',
            },
            {
              label: 'Orders',
              value: data.merchants.reduce((sum, m) => sum + m.orders, 0),
              caption: 'Across all workspaces',
            },
          ]}
        />
        <section className="panel">
          <div className="panel-head">
            <h2>Workspace attention</h2>
          </div>
          {data.merchants
            .filter((m) => ['Past due', 'Trial', 'Suspended'].includes(m.status))
            .map((m) => (
              <button
                className="merchant-attention"
                key={m.id}
                onClick={() => setDrawer({ type: 'merchant', id: m.id })}
              >
                <div>
                  <strong>{m.name}</strong>
                  <small>
                    {m.status} · {m.plan}
                  </small>
                </div>
                <Badge status={m.status} />
              </button>
            ))}
          {(data.planRequests || []).map((request) => (
            <button
              className="merchant-attention"
              key={request.id}
              onClick={() => setDrawer({ type: 'merchant', id: request.merchant })}
            >
              <div>
                <strong>{data.merchants.find((m) => m.id === request.merchant)?.name}</strong>
                <small>Requested {request.plan} plan · manual activation</small>
              </div>
            </button>
          ))}
          {!data.merchants.length && (
            <Empty
              title="No workspaces yet"
              text="Merchants will appear after creating their account and workspace."
            />
          )}
        </section>
      </>
    );
  }
  return (
    <>
      <Header
        title="Moderation"
        description="Review buyer reports submitted through real storefronts."
      />
      {data.reports
        .filter((r) => r.status === 'Open')
        .map((r) => (
          <section className="panel live-panel" key={r.id}>
            <h3>{data.merchants.find((m) => m.id === r.merchant)?.name || 'Storefront report'}</h3>
            <p>{r.note}</p>
            <small className="muted">{new Date(r.date).toLocaleString()}</small>
            <div className="message-actions">
              <Button onClick={() => setDrawer({ type: 'merchant', id: r.merchant })}>
                Review merchant
              </Button>
              <Button
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  try {
                    await rpc('jastip_resolve_report', { p_workspace: r.merchant, p_report: r.id });
                    await reload();
                    announce('Report resolved.');
                  } catch (e) {
                    announce(e.message);
                  } finally {
                    setBusy(false);
                  }
                }}
              >
                Resolve report
              </Button>
            </div>
          </section>
        ))}
      {!data.reports.some((r) => r.status === 'Open') && (
        <Empty title="No open reports" text="Buyer reports will appear here for review." />
      )}
    </>
  );
}
export function ManualInvoice({ merchant, onDone }) {
  const { announce, reload } = useOps();
  const [busy, setBusy] = useState(false),
    [amount, setAmount] = useState(''),
    [note, setNote] = useState(''),
    [error, setError] = useState('');
  return (
    <form
      className="manual-invoice"
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError('');
        try {
          await adminAction(merchant.id, 'invoice', {
            amount: Number(amount),
            note,
            status: 'Paid',
          });
          announce('Manual payment verified and invoice recorded.');
          onDone();
          await reload();
        } catch (e) {
          setError(e.message);
        } finally {
          setBusy(false);
        }
      }}
    >
      <Field label="Verified payment amount (IDR)">
        <MoneyInput
          currency={'IDR'}
          required
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
      </Field>
      <Field label="Payment reference or note">
        <input required value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <Button primary type="submit" disabled={busy}>
        {busy ? 'Recording…' : 'Record verified payment'}
      </Button>
    </form>
  );
}
