// Settings → Shipping & region (feedback round 1, ADR-010). Bawa isn't Indonesia-only, so the
// courier list, country, calling code and message language belong to the seller.
import React, { useEffect, useState } from 'react';
import { useOps, useUnsavedChanges } from './store';
import { Field, Callout, SaveBar, Button, I } from './ui';
import { COUNTRIES, LANGUAGES, checkSettings, defaultCouriers, words } from './lib/region';

const draftOf = (couriers, region) => ({
  couriers: couriers.map((c) => ({ name: c.name, tracking: c.tracking !== false })),
  region: { ...region },
});

export function ShippingSettings() {
  const { settings, couriers, region, saveSettings, role, support } = useOps();
  const canEdit = role !== 'Helper' && !support;
  const saved = JSON.stringify(draftOf(couriers, region));
  const [draft, setDraft] = useState(() => draftOf(couriers, region)),
    [touched, setTouched] = useState(false),
    [adding, setAdding] = useState(''),
    [saving, setSaving] = useState(false),
    [error, setError] = useState('');
  const dirty = touched && JSON.stringify(draft) !== saved;
  useUnsavedChanges('shipping-settings', dirty);
  useEffect(() => {
    if (!touched) setDraft(draftOf(couriers, region));
  }, [saved]);
  const edit = (fn) => {
    setTouched(true);
    setError('');
    setDraft((d) => fn(structuredClone(d)));
  };
  const known = COUNTRIES.find(([code]) => code === draft.region.country);
  const pickCountry = (code) =>
    edit((d) => {
      const c = COUNTRIES.find(([k]) => k === code);
      d.region.country = code;
      // A new country suggests its calling code and language; both stay editable.
      if (c?.[2] && !(settings.hasCredits && c[2] !== region.callingCode))
        d.region.callingCode = c[2];
      if (c) d.region.language = c[3];
      return d;
    });
  const addCourier = () => {
    const name = adding.trim();
    if (!name) return;
    if (draft.couriers.some((c) => c.name.toLowerCase() === name.toLowerCase()))
      return setError(`${name} is already on your list.`);
    edit((d) => ((d.couriers = [...d.couriers, { name, tracking: true }]), d));
    setAdding('');
  };
  const save = async () => {
    const value = {};
    if (JSON.stringify(draft.couriers) !== JSON.stringify(draftOf(couriers, region).couriers))
      value.couriers = draft.couriers;
    if (JSON.stringify(draft.region) !== JSON.stringify(region)) value.region = draft.region;
    try {
      checkSettings(value, settings);
    } catch (e) {
      return setError(e.message);
    }
    setSaving(true);
    if (await saveSettings(value)) setTouched(false);
    setSaving(false);
  };
  const discard = () => {
    setDraft(draftOf(couriers, region));
    setTouched(false);
    setError('');
  };
  const w = words(draft.region);
  return (
    <>
      {settings.unavailable && (
        <Callout>
          Shipping and region settings need the latest database update (202610250001). Until then,
          Bawa uses Indonesia and its usual couriers.
        </Callout>
      )}
      {!canEdit && (
        <Callout>
          {support
            ? 'Support view is read-only.'
            : 'Only owners and managers can change these. You can still add a new courier while shipping.'}
        </Callout>
      )}
      <section className="panel settings-form">
        <div className="panel-head flush">
          <h2>Where you sell</h2>
          <small>Sets phone numbers, message language and default couriers</small>
        </div>
        <div className="bank-grid">
          <Field label="Country">
            <select
              disabled={!canEdit}
              value={known ? draft.region.country : 'ZZ'}
              onChange={(e) => pickCountry(e.target.value)}
            >
              {COUNTRIES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Calling code"
            hint={
              settings.hasCredits
                ? 'Locked: buyer credit is saved under this code.'
                : `A number typed as 0812… is read as +${draft.region.callingCode || '…'} 812…`
            }
          >
            <div className="input-combo prefix">
              <span aria-hidden="true">+</span>
              <input
                disabled={!canEdit || settings.hasCredits}
                inputMode="numeric"
                maxLength={4}
                value={draft.region.callingCode}
                onChange={(e) =>
                  edit((d) => ((d.region.callingCode = e.target.value.replace(/\D/g, '')), d))
                }
              />
            </div>
          </Field>
          <Field label="Message language" hint="For the default buyer messages.">
            <select
              disabled={!canEdit}
              value={draft.region.language}
              onChange={(e) => edit((d) => ((d.region.language = e.target.value), d))}
            >
              {LANGUAGES.map(([code, name]) => (
                <option key={code} value={code}>
                  {name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </section>
      <section className="panel settings-form">
        <div className="panel-head flush">
          <h2>Couriers</h2>
          <small>Shown when you mark orders shipped</small>
        </div>
        <ul className="courier-list" aria-label="Your couriers">
          {draft.couriers.map((c, n) => (
            <li key={n}>
              <input
                aria-label={`Courier ${n + 1} name`}
                disabled={!canEdit}
                maxLength={40}
                value={c.name}
                onChange={(e) => edit((d) => ((d.couriers[n].name = e.target.value), d))}
              />
              <label className="check-row">
                <input
                  type="checkbox"
                  disabled={!canEdit}
                  checked={c.tracking}
                  onChange={(e) => edit((d) => ((d.couriers[n].tracking = e.target.checked), d))}
                />
                <span>{w.usesTracking}</span>
              </label>
              <button
                type="button"
                className="icon-btn"
                aria-label={`Remove ${c.name || 'courier'}`}
                disabled={!canEdit || draft.couriers.length <= 1}
                onClick={() => edit((d) => (d.couriers.splice(n, 1), d))}
              >
                <I name="X" size={15} />
              </button>
            </li>
          ))}
        </ul>
        {canEdit && (
          <div className="courier-add">
            <input
              aria-label="New courier"
              placeholder="Add a courier, e.g. Lalamove"
              maxLength={40}
              value={adding}
              onChange={(e) => setAdding(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCourier();
                }
              }}
            />
            <Button icon="Plus" onClick={addCourier} disabled={!adding.trim()}>
              Add
            </Button>
            <button
              type="button"
              className="text-btn"
              onClick={() => edit((d) => ((d.couriers = defaultCouriers(d.region.country)), d))}
            >
              Use the usual list for {known?.[1] || 'this country'}
            </button>
          </div>
        )}
        <p className="footnote">
          Turn off “{w.usesTracking}” for pickup or same-day rides, so shipping doesn’t ask for one.
          Orders keep the courier name they shipped with.
        </p>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
      </section>
      <SaveBar dirty={dirty} busy={saving} onSave={save} onDiscard={discard} />
    </>
  );
}
