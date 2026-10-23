// Quick-action sheet behind the bottom-bar "+" on phones and tablets (feedback round 1).
// The current page's main action comes first; Helpers only see what their role can do.
import React, { useEffect, useRef } from 'react';
import { useOps } from './store';
import { I } from './ui';

export function quickActions(page, role) {
  const seller = role !== 'Helper';
  const all = [
    seller && {
      id: 'order',
      icon: 'Inbox',
      label: 'Add order',
      hint: 'Someone ordered by chat',
      pages: ['Orders', 'Customers', 'Overview'],
    },
    seller && {
      id: 'item',
      icon: 'Package',
      label: 'Add item',
      hint: 'A photo and a price',
      pages: ['Items', 'Trips', 'Overview'],
    },
    {
      id: 'payment',
      icon: 'Wallet',
      label: 'Record payment',
      hint: 'Opens unpaid orders',
      pages: ['Orders'],
    },
    {
      id: 'ship',
      icon: 'Truck',
      label: 'Ship orders',
      hint: 'Bought items ready to send',
      pages: ['Purchasing'],
    },
    seller && {
      id: 'trip',
      icon: 'Plane',
      label: 'New trip',
      hint: 'Plan the next run',
      pages: ['Trips'],
    },
    { id: 'search', icon: 'Search', label: 'Search', hint: 'Orders, items, customers', pages: [] },
  ].filter(Boolean);
  return [...all].sort((a, b) => Number(b.pages.includes(page)) - Number(a.pages.includes(page)));
}

export function QuickSheet({ onClose }) {
  const { page, role, setDialog, navigate, setPalette, support } = useOps();
  const first = useRef(null);
  useEffect(() => {
    first.current?.focus();
    const key = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, []);
  const run = (id) => {
    onClose();
    if (id === 'order') setDialog({ type: 'manual-order' });
    else if (id === 'item') setDialog({ type: 'item' });
    else if (id === 'trip') setDialog({ type: 'trip' });
    else if (id === 'payment') {
      sessionStorage.setItem('jo-orders-tab', 'Unpaid');
      navigate('Orders');
      window.dispatchEvent(new Event('jo-orders-tab'));
    } else if (id === 'ship') navigate('Purchasing');
    else setPalette(true);
  };
  const actions = quickActions(page, role).filter(
    (a) => !support || ['payment', 'ship', 'search'].includes(a.id),
  );
  return (
    <>
      <div className="quick-scrim" onClick={onClose} />
      <div className="quick-sheet" role="dialog" aria-modal="true" aria-label="Quick actions">
        <div className="quick-sheet-head">
          <strong>Quick actions</strong>
          <button className="icon-btn" aria-label="Close quick actions" onClick={onClose}>
            <I name="X" size={16} />
          </button>
        </div>
        <div className="quick-grid">
          {actions.map((a, n) => (
            <button key={a.id} ref={n === 0 ? first : null} onClick={() => run(a.id)}>
              <I name={a.icon} size={20} />
              <span>
                <strong>{a.label}</strong>
                <small>{a.hint}</small>
              </span>
            </button>
          ))}
        </div>
      </div>
    </>
  );
}
