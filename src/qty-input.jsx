// Quantity with − / + buttons (feedback round 1). Called as a function, not a component, so the
// surrounding <Field> still finds the <input> and links its label. Tapping the number selects it
// (see the global focus handler in main.jsx), so typing replaces it instead of appending.
import React from 'react';
import { I } from './ui';

export function qtyControl({ value, onChange, min = 0, max, required, label, disabled }) {
  const n = Number(value) || 0;
  const clamp = (v) => Math.max(min, max != null ? Math.min(max, v) : v);
  return (
    <div className="qty-input">
      <button
        type="button"
        className="qty-step"
        aria-label={label ? `Decrease ${label}` : 'Decrease'}
        disabled={disabled || n <= min}
        onClick={() => onChange(String(clamp(n - 1)))}
      >
        <I name="Minus" size={15} />
      </button>
      <input
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step="1"
        required={required}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={(e) => e.target.value === '' && onChange(String(min))}
      />
      <button
        type="button"
        className="qty-step"
        aria-label={label ? `Increase ${label}` : 'Increase'}
        disabled={disabled || (max != null && n >= max)}
        onClick={() => onChange(String(clamp(n + 1)))}
      >
        <I name="Plus" size={15} />
      </button>
    </div>
  );
}
