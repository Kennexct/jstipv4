import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { seed } from './data';
const Context = createContext(null);
export const useOps = () => useContext(Context);
const read = () => {
  try {
    return JSON.parse(localStorage.getItem('jastip-ops-v1')) || structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
};
export function Provider({ children }) {
  const [data, setData] = useState(read),
    [page, setPage] = useState(location.hash.slice(1) || 'Overview'),
    [dialog, setDialog] = useState(null),
    [drawer, setDrawer] = useState(null),
    [palette, setPalette] = useState(false),
    [toast, setToast] = useState(null),
    [mobile, setMobile] = useState(false),
    [role, setRole] = useState('Owner'),
    [support, setSupport] = useState(false),
    [screenState, setScreenState] = useState('ready');
  const timer = useRef();
  const chord = useRef(0);
  const mode =
    page === 'Storefront'
      ? 'store'
      : ['Merchants', 'Metrics', 'Moderation', 'Audit'].includes(page)
        ? 'admin'
        : 'seller';
  const announce = (message, undo) => {
    setToast({ message, undo });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 5500);
  };
  const change = (fn, message, { publicAction = false } = {}) => {
    if (support && !publicAction) {
      announce('Support view is read-only. Exit support view to edit.');
      return false;
    }
    setData((prev) => {
      const next = fn(prev);
      return {
        ...next,
        audit: message
          ? [
              {
                id: crypto.randomUUID(),
                event: message,
                actor: mode === 'admin' ? 'Platform owner' : 'Rina Kusuma',
                date: new Date().toLocaleString('en-GB', { timeZone: 'Asia/Bangkok' }),
                merchant: prev.shop.name,
              },
              ...next.audit,
            ].slice(0, 100)
          : next.audit,
      };
    });
    if (message) announce(message);
    return true;
  };
  const navigate = (p) => {
    setPage(p);
    location.hash = p;
    setDrawer(null);
    setMobile(false);
    setScreenState('ready');
    window.scrollTo(0, 0);
  };
  const copy = async (text, label = 'WhatsApp message') => {
    try {
      await navigator.clipboard.writeText(text);
      announce(label + ' copied.');
    } catch {
      setDialog({ type: 'message', text });
    }
  };
  const exportCsv = (rows, name) => {
    const keys = Object.keys(rows[0] || {});
    const csv = [
      keys.join(','),
      ...rows.map((r) =>
        keys.map((k) => '"' + String(r[k] ?? '').replaceAll('"', '""') + '"').join(','),
      ),
    ].join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    announce(`${name}.csv exported.`);
  };
  useEffect(() => {
    try {
      localStorage.setItem('jastip-ops-v1', JSON.stringify(data));
    } catch {
      announce('Browser storage is full. Export your changes before closing this page.');
    }
    Object.entries(data.preferences).forEach(([k, v]) => (document.documentElement.dataset[k] = v));
  }, [data]);
  useEffect(() => {
    const hash = () => {
      setPage(location.hash.slice(1) || 'Overview');
      setDrawer(null);
      setMobile(false);
    };
    window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, []);
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') {
        if (dialog) setDialog(null);
        else if (palette) setPalette(false);
        else if (drawer) setDrawer(null);
        else setMobile(false);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setPalette((p) => !p);
        return;
      }
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName)) return;
      if (e.key === '/') {
        e.preventDefault();
        setPalette(true);
      }
      if (e.key === 'n') setDialog({ type: 'item' });
      if (e.key === '?') setDialog({ type: 'help' });
      if (Date.now() - chord.current < 1000) {
        const target = {
          h: 'Overview',
          o: 'Orders',
          i: 'Items',
          t: 'Trips',
          p: 'Purchasing',
          r: 'Reports',
          s: 'Settings',
        }[e.key];
        if (target) navigate(target);
        chord.current = 0;
      }
      if (e.key === 'g') chord.current = Date.now();
    };
    window.addEventListener('keydown', key);
    return () => window.removeEventListener('keydown', key);
  }, [dialog, palette, drawer]);
  const updateOrder = (id, patch) => {
    const o = data.orders.find((o) => o.id === id);
    if (patch.status === 'Paid' && (patch.paid ?? o.paid) < o.total) {
      setDialog({ type: 'payment', order: o });
      return;
    }
    const old = o;
    change(
      (d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? { ...o, ...patch } : o)) }),
      `${id} updated${patch.status ? ' to ' + patch.status : ''}.`,
    );
    if (!support)
      setToast({
        message: `${id} updated${patch.status ? ' to ' + patch.status : ''}.`,
        undo: () => {
          setData((d) => ({ ...d, orders: d.orders.map((o) => (o.id === id ? old : o)) }));
          setToast(null);
        },
      });
  };
  return (
    <Context.Provider
      value={{
        data,
        setData,
        change,
        page,
        mode,
        navigate,
        dialog,
        setDialog,
        drawer,
        setDrawer,
        palette,
        setPalette,
        toast,
        setToast,
        announce,
        mobile,
        setMobile,
        role,
        setRole,
        support,
        setSupport,
        screenState,
        setScreenState,
        copy,
        exportCsv,
        updateOrder,
      }}
    >
      {children}
    </Context.Provider>
  );
}
