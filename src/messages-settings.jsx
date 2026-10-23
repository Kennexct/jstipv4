// Settings → Messages (ADR-008): the buyer messages every Copy button uses, plus bank details.
import React, { useEffect, useState } from 'react';
import { useOps, useUnsavedChanges } from './store';
import { Field, Callout, SaveBar } from './ui';
import {
  TEMPLATE_KEYS,
  TEMPLATE_LABELS,
  DEFAULT_TEMPLATES,
  PLACEHOLDERS,
  templatesOf,
  orderMessage,
  bankLine,
} from './lib/messages';

const sampleOrder = {
  id: 'JO-1047',
  name: 'Dewi Anggraini',
  item: 'Matcha ceremonial blend',
  qty: 2,
  total: 850000,
  paid: 425000,
  deposit: 425000,
  status: 'Purchased',
  courier: 'JNE',
  resi: 'JNE0123456789',
};

const draftOf = (messaging) => ({
  templates: templatesOf(messaging),
  bank: { bank: '', number: '', holder: '', ...(messaging?.bank || {}) },
});

export function MessagesSettings() {
  const { messaging, saveMessaging, role, support, data } = useOps();
  const canEdit = role !== 'Helper' && !support;
  const [draft, setDraft] = useState(() => draftOf(messaging)),
    [touched, setTouched] = useState(false),
    [preview, setPreview] = useState('quote'),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const saved = JSON.stringify(draftOf(messaging));
  const dirty = touched && JSON.stringify(draft) !== saved;
  useUnsavedChanges('messages-settings', dirty);
  useEffect(() => {
    if (!touched) setDraft(draftOf(messaging));
  }, [saved]);
  const edit = (fn) => {
    setTouched(true);
    setDraft((d) => fn(structuredClone(d)));
  };
  const save = async () => {
    if (draft.bank.number && !/^[0-9][0-9 -]{3,29}$/.test(draft.bank.number.trim())) {
      setError('Account number: digits, spaces or dashes.');
      return;
    }
    setError('');
    setSaving(true);
    // Only store templates that differ from the defaults, so improved defaults reach everyone.
    const templates = Object.fromEntries(
      TEMPLATE_KEYS.filter((k) => draft.templates[k].trim() !== DEFAULT_TEMPLATES[k]).map((k) => [
        k,
        draft.templates[k].trim(),
      ]),
    );
    if (await saveMessaging({ templates, bank: draft.bank })) setTouched(false);
    setSaving(false);
  };
  const discard = () => {
    setDraft(draftOf(messaging));
    setTouched(false);
    setError('');
  };
  const previewText = orderMessage(preview, sampleOrder, {
    messaging: draft,
    currency: data.trips[0]?.baseCurrency || 'IDR',
    trackingLink: 'https://…/track/…',
  });
  return (
    <>
      {messaging.unavailable && (
        <Callout>
          Saved templates need the latest database update (202610230001). Until then, Copy uses the
          default messages.
        </Callout>
      )}
      {!canEdit && (
        <Callout>
          {support
            ? 'Support view is read-only.'
            : 'Only owners and managers can change messages. You can still copy them from each order.'}
        </Callout>
      )}
      <section className="panel settings-form messages-settings">
        <div className="panel-head flush">
          <h2>Bank account for transfers</h2>
          <small>Fills {'{rekening}'} in your messages</small>
        </div>
        <div className="bank-grid">
          <Field label="Bank">
            <input
              disabled={!canEdit}
              maxLength={40}
              placeholder="BCA"
              value={draft.bank.bank}
              onChange={(e) => edit((d) => ((d.bank.bank = e.target.value), d))}
            />
          </Field>
          <Field label="Account number">
            <input
              disabled={!canEdit}
              maxLength={30}
              inputMode="numeric"
              placeholder="123 456 7890"
              value={draft.bank.number}
              onChange={(e) => edit((d) => ((d.bank.number = e.target.value), d))}
            />
          </Field>
          <Field label="Account holder">
            <input
              disabled={!canEdit}
              maxLength={80}
              placeholder="Rina Kusuma"
              value={draft.bank.holder}
              onChange={(e) => edit((d) => ((d.bank.holder = e.target.value), d))}
            />
          </Field>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <section className="panel settings-form messages-settings">
        <div className="panel-head flush">
          <h2>Message templates</h2>
          <small>Used by every Copy button on an order</small>
        </div>
        <div className="messages-grid">
          <div className="messages-fields">
            {TEMPLATE_KEYS.map((k) => (
              <Field key={k} label={TEMPLATE_LABELS[k]}>
                <textarea
                  rows={3}
                  maxLength={1000}
                  disabled={!canEdit}
                  value={draft.templates[k]}
                  onFocus={() => setPreview(k)}
                  onChange={(e) => edit((d) => ((d.templates[k] = e.target.value), d))}
                />
              </Field>
            ))}
            {canEdit && (
              <button
                type="button"
                className="text-btn"
                onClick={() => edit((d) => ((d.templates = { ...DEFAULT_TEMPLATES }), d))}
              >
                Restore default templates
              </button>
            )}
          </div>
          <aside className="messages-side">
            <div className="message-preview" aria-live="polite">
              <small>Preview · {TEMPLATE_LABELS[preview]}</small>
              <p>{previewText}</p>
              {!bankLine(draft.bank) && (
                <small className="amber">
                  Add your bank account so {'{rekening}'} isn’t empty.
                </small>
              )}
            </div>
            <div className="placeholder-list">
              <small>Placeholders</small>
              <dl>
                {PLACEHOLDERS.map(([key, label]) => (
                  <React.Fragment key={key}>
                    <dt className="mono">{key}</dt>
                    <dd>{label}</dd>
                  </React.Fragment>
                ))}
              </dl>
            </div>
          </aside>
        </div>
      </section>
      <SaveBar dirty={dirty} busy={saving} onSave={save} onDiscard={discard} />
    </>
  );
}
