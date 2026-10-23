// Amount input with thousand separators (feedback round 1). Drop-in for <input type="number">:
// onChange gets { target: { value } } with the plain number string, so forms stay unchanged.
import React, { useLayoutEffect, useRef } from 'react';
import { formatAmount, parseAmount, separatorsFor } from './lib/amount';
import { decimalsFor } from './money';

// min/max/step from the old number inputs are accepted and ignored: the forms check ranges.
// eslint-disable-next-line no-unused-vars
export function MoneyInput({ value, onChange, currency = 'IDR', min, max, step, ...rest }) {
  const ref = useRef(null),
    caret = useRef(null);
  const shown = formatAmount(value, currency),
    { decimal } = separatorsFor(currency);
  // Keep the caret after the same number of digits once separators move.
  useLayoutEffect(() => {
    const el = ref.current;
    if (caret.current == null || !el || document.activeElement !== el) return;
    let seen = 0,
      at = 0;
    while (at < shown.length && seen < caret.current) {
      if (/[0-9]/.test(shown[at]) || shown[at] === decimal) seen++;
      at++;
    }
    el.setSelectionRange(at, at);
    caret.current = null;
  });
  return (
    <input
      {...rest}
      ref={ref}
      type="text"
      inputMode={decimalsFor(currency) ? 'decimal' : 'numeric'}
      autoComplete="off"
      value={shown}
      onChange={(e) => {
        const text = e.target.value,
          pos = e.target.selectionStart ?? text.length;
        caret.current = text
          .slice(0, pos)
          .replace(new RegExp(`[^0-9\\${decimal}]`, 'g'), '').length;
        onChange({ target: { value: parseAmount(text, currency) } });
      }}
    />
  );
}
MoneyInput.fieldInput = true;
