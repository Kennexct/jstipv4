import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { demoMode, supabase, rpc, publicSlug } from './lib/supabase';
import { emptyWorkspace, recordId, csvCell } from './lib/records';
import { loadWorkspace, loadStorefront, commitWorkspace, adminAction } from './lib/repository';
const Context = createContext(null);
export const useOps = () => useContext(Context);
// Register a form's unsaved state so navigation, Esc and closing ask before discarding it.
export function useUnsavedChanges(key, dirty) {
  const { setGuard } = useContext(Context);
  useEffect(() => {
    setGuard(key, dirty);
    return () => setGuard(key, false);
  }, [key, dirty]);
}
const route = () => location.hash.slice(1).split('/')[0] || 'Overview';
const read = (seed) => {
  if (!demoMode) return emptyWorkspace();
  try {
    return JSON.parse(localStorage.getItem('jastip-ops-demo-v1')) || structuredClone(seed);
  } catch {
    return structuredClone(seed);
  }
};
export function Provider({ children, initialSeed }) {
  const [data, setRawData] = useState(() => read(initialSeed)),
    [page, setPage] = useState(route),
    [dialog, setDialog] = useState(null),
    [drawer, setDrawer] = useState(null),
    [palette, setPalette] = useState(false),
    [toast, setToast] = useState(null),
    [mobile, setMobile] = useState(false),
    [role, setRole] = useState('Owner'),
    [support, setSupport] = useState(false),
    [screenState, setScreenState] = useState('ready'),
    [session, setSession] = useState(null),
    [connection, setConnection] = useState(
      demoMode ? 'ready' : supabase ? 'loading' : 'unconfigured',
    ),
    [connectionError, setConnectionError] = useState(''),
    [pending, setPending] = useState(false),
    [pageLoading, setPageLoading] = useState(false),
    [routeLoading, setRouteLoading] = useState(false),
    [confirm, setConfirm] = useState(null);
  const dataRef = useRef(data),
    supportRef = useRef(support),
    busyRef = useRef(false),
    generation = useRef(0),
    activeWorkspace = useRef(null),
    timer = useRef(),
    chord = useRef(0),
    connectionRef = useRef(connection),
    sessionRef = useRef(null),
    accountPrefs = useRef(null),
    prefTimer = useRef(),
    guards = useRef(new Map()),
    dialogCloser = useRef(null),
    routeTimer = useRef(),
    pageRef = useRef(page),
    hashSuppress = useRef(false);
  pageRef.current = page;
  // Unsaved-changes guard: forms register `dirty`; leaving asks before discarding.
  const isDirty = () => [...guards.current.values()].some(Boolean);
  const setGuard = (key, dirty) => {
    if (dirty) guards.current.set(key, true);
    else guards.current.delete(key);
  };
  const confirmDiscard = (proceed) => {
    if (!isDirty()) return proceed();
    setConfirm({
      proceed: () => {
        guards.current.clear();
        setConfirm(null);
        proceed();
      },
    });
  };
  const startRouteLoading = () => {
    setRouteLoading(true);
    clearTimeout(routeTimer.current);
    routeTimer.current = setTimeout(() => setRouteLoading(false), 450);
  };
  dataRef.current = data;
  connectionRef.current = connection;
  supportRef.current = support;
  const mode =
    page === 'Storefront'
      ? 'store'
      : ['Merchants', 'Metrics', 'Moderation', 'Audit'].includes(page)
        ? 'admin'
        : 'seller';
  const announce = (message, undo) => {
    setToast({ message, undo });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), 8000);
  };
  function install(value) {
    let preferences = value.preferences;
    try {
      preferences = JSON.parse(localStorage.getItem('jastip-preferences')) || preferences;
    } catch {}
    // Account-level appearance (synced across devices) wins over this device's copy.
    if (accountPrefs.current) preferences = { ...preferences, ...accountPrefs.current };
    setRawData({ ...value, preferences });
    dataRef.current = { ...value, preferences };
    if (!demoMode) setRole(value.role || 'Owner');
  }
  // Quiet reloads (menu navigation, Refresh) keep the app on screen and show a page loader
  // instead of returning to the full-screen connection gate.
  async function reload({ quiet = false } = {}) {
    if (demoMode) return;
    const request = ++generation.current;
    if (!supabase) {
      setConnection('unconfigured');
      return;
    }
    const soft = quiet && connectionRef.current === 'ready';
    if (soft) setPageLoading(true);
    else {
      setConnection('loading');
      setConnectionError('');
    }
    try {
      const {
        data: { session: s },
        error,
      } = await supabase.auth.getSession();
      if (error) throw error;
      setSession(s);
      sessionRef.current = s;
      accountPrefs.current = s?.user?.user_metadata?.preferences || accountPrefs.current;
      let result;
      if (route() === 'Storefront') {
        const slug = publicSlug() || dataRef.current.shop.slug;
        if (!slug) throw Error('Open a storefront using its shared URL.');
        result = await loadStorefront(slug);
      } else {
        if (!s) {
          setConnection('signedout');
          return;
        }
        let invitation = route() === 'invite' ? location.hash.split('/')[1] : null;
        try {
          invitation ||= sessionStorage.getItem('jo-invite');
        } catch {}
        if (invitation) {
          try {
            sessionStorage.removeItem('jo-invite');
          } catch {}
          try {
            activeWorkspace.current = await rpc('jastip_accept_invitation', {
              p_invitation: invitation,
            });
            announce('You joined the workspace. Welcome to the team!');
            const meta = s.user?.user_metadata || {};
            if (meta.invited && !meta.password_set)
              setTimeout(() => setDialog({ type: 'set-password' }), 0);
          } catch (e) {
            announce(e.message);
          }
          history.replaceState(null, '', location.pathname + '#Overview');
          setPage('Overview');
        }
        result = await loadWorkspace(
          supportRef.current ? dataRef.current.workspaceId : activeWorkspace.current,
        );
        if (['Merchants', 'Metrics', 'Moderation', 'Audit'].includes(route())) {
          const platform = await rpc('jastip_platform');
          result = {
            ...emptyWorkspace(),
            ...result,
            ...platform,
            isAdmin: true,
            role: result?.role || 'Platform admin',
          };
        }
        if (!result) {
          setConnection('onboarding');
          return;
        }
      }
      if (request !== generation.current) return;
      install(result);
      setConnection('ready');
    } catch (e) {
      if (request !== generation.current) return;
      if (soft) announce(e.message);
      else {
        setConnectionError(e.message);
        setConnection('error');
      }
    } finally {
      if (request === generation.current) setPageLoading(false);
    }
  }
  function signOut() {
    confirmDiscard(doSignOut);
  }
  async function doSignOut() {
    if (pending) {
      announce('Wait for the current save to finish.');
      return;
    }
    const { error } = await supabase.auth.signOut({ scope: 'local' });
    if (error) {
      announce('Sign out failed: ' + error.message);
      return;
    }
    setSupport(false);
    supportRef.current = false;
    activeWorkspace.current = null;
    sessionStorage.removeItem('jastip-password-recovery');
    accountPrefs.current = null;
    sessionRef.current = null;
    install(emptyWorkspace());
    setSession(null);
    setConnection('signedout');
    location.hash = 'Overview';
    setPage('Overview');
  }
  async function openSupport(merchant) {
    if (demoMode) {
      setSupport(true);
      navigate('Overview');
      return;
    }
    try {
      await adminAction(merchant.id, 'support', {});
      const result = await loadWorkspace(merchant.id);
      supportRef.current = true;
      setSupport(true);
      install({ ...result, role: 'Support' });
      navigate('Overview');
      setConnection('ready');
    } catch (e) {
      announce(e.message);
    }
  }
  async function selectWorkspace(id) {
    activeWorkspace.current = id;
    supportRef.current = false;
    setSupport(false);
    navigate('Overview');
    await reload();
  }
  async function exitSupport() {
    supportRef.current = false;
    setSupport(false);
    navigate('Merchants');
    await reload();
  }
  const setData = (fn) => {
    const previous = dataRef.current;
    const next = typeof fn === 'function' ? fn(previous) : fn;
    if (
      !demoMode &&
      JSON.stringify({ ...next, preferences: previous.preferences }) !== JSON.stringify(previous)
    ) {
      announce('Use a database action to change business data.');
      return;
    }
    setRawData(next);
    dataRef.current = next;
    try {
      localStorage.setItem('jastip-preferences', JSON.stringify(next.preferences));
    } catch {}
    if (!demoMode && supabase && sessionRef.current) {
      accountPrefs.current = next.preferences;
      clearTimeout(prefTimer.current);
      prefTimer.current = setTimeout(
        () => supabase.auth.updateUser({ data: { preferences: next.preferences } }).catch(() => {}),
        600,
      );
    }
  };
  const change = async (fn, message, { publicAction = false } = {}) => {
    if (supportRef.current && !publicAction) {
      announce('Support view is read-only. Exit support view to edit.');
      return false;
    }
    if (busyRef.current) {
      announce('A change is still saving. Please wait.');
      return false;
    }
    const previous = dataRef.current;
    const next = fn(structuredClone(previous));
    if (demoMode) {
      next.audit = message
        ? [
            {
              id: recordId(),
              event: message,
              actor: mode === 'admin' ? 'Platform owner' : 'Rina Kusuma',
              date: new Date().toLocaleString(),
              merchant: previous.shop.name,
            },
            ...next.audit,
          ]
        : next.audit;
      install(next);
      if (message) announce(message);
      return true;
    }
    busyRef.current = true;
    setPending(true);
    try {
      if (publicAction) throw Error('Use the public order or report form.');
      let result;
      if (mode === 'admin') {
        const changed = next.merchants.filter(
          (m) =>
            JSON.stringify(m) !== JSON.stringify(previous.merchants.find((x) => x.id === m.id)),
        );
        for (const m of changed) {
          const old = previous.merchants.find((x) => x.id === m.id);
          if (!old) throw Error('Merchants create their own accounts and workspaces.');
          if (m.plan !== old.plan) await adminAction(m.id, 'plan', { plan: m.plan });
          if (m.status !== old.status)
            await adminAction(m.id, 'status', { status: m.status, reason: m.reason });
          if (m.trialDays !== old.trialDays) await adminAction(m.id, 'trial', {});
        }
        for (const note of next.notes.filter(
          (n) => !previous.notes.some((old) => old.id === n.id),
        )) {
          await adminAction(note.merchant, 'refund', { note: note.note });
        }
        result = { ...previous, ...(await rpc('jastip_platform')) };
      } else {
        for (const k of ['customers', 'notes'])
          next[k] = next[k].map((row) => (row.id ? row : { ...row, id: recordId() }));
        result = await commitWorkspace(previous, next, message);
      }
      install(result);
      if (message) announce(message);
      return true;
    } catch (e) {
      announce('Changes were not saved: ' + e.message);
      if (/Another user/.test(e.message)) await reload();
      return false;
    } finally {
      busyRef.current = false;
      setPending(false);
    }
  };
  const navigate = (p) => confirmDiscard(() => go(p));
  const go = (p) => {
    startRouteLoading();
    try {
      if (p === 'Storefront') sessionStorage.setItem('jo-store-preview', '1');
      else sessionStorage.removeItem('jo-store-preview');
    } catch {}
    setPage(p);
    location.hash = p === 'Storefront' && !demoMode ? 'Storefront/' + dataRef.current.shop.slug : p;
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
    const csv = [keys.join(','), ...rows.map((r) => keys.map((k) => csvCell(r[k])).join(','))].join(
      '\r\n',
    );
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = name + '.csv';
    a.click();
    URL.revokeObjectURL(url);
    announce(`${name}.csv exported.`);
  };
  useEffect(() => {
    if (demoMode) localStorage.setItem('jastip-ops-demo-v1', JSON.stringify(data));
    Object.entries(data.preferences).forEach(([k, v]) => (document.documentElement.dataset[k] = v));
  }, [data]);
  useEffect(() => {
    if (!supabase) return;
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      sessionRef.current = s;
      if (
        event === 'PASSWORD_RECOVERY' ||
        (s && sessionStorage.getItem('jastip-password-recovery') === 'true')
      ) {
        location.hash = 'Recovery';
        setPage('Recovery');
      }
      if (!['TOKEN_REFRESHED', 'USER_UPDATED'].includes(event)) setTimeout(() => reload(), 0);
    });
    return () => {
      generation.current++;
      subscription.unsubscribe();
    };
  }, []);
  useEffect(() => {
    const hash = () => {
      if (hashSuppress.current) {
        hashSuppress.current = false;
        return;
      }
      // Browser back/forward or a typed link while a form has unsaved changes.
      if (isDirty() && route() !== pageRef.current) {
        const target = location.hash;
        hashSuppress.current = true;
        location.hash = pageRef.current;
        confirmDiscard(() => {
          location.hash = target;
        });
        return;
      }
      startRouteLoading();
      setPage(route());
      setDrawer(null);
      setDialog(null);
      setMobile(false);
      if (!demoMode) reload({ quiet: true });
    };
    window.addEventListener('hashchange', hash);
    return () => window.removeEventListener('hashchange', hash);
  }, []);
  useEffect(() => {
    if (demoMode || !session) return;
    const id = setInterval(() => {
      if (document.visibilityState === 'visible' && !busyRef.current && connection === 'ready')
        refreshQuietly();
    }, 30000);
    return () => clearInterval(id);
  }, [session, connection, page]);
  async function refreshQuietly() {
    const revisionAtStart = dataRef.current.revision;
    try {
      if (mode === 'store') {
        install(await loadStorefront(publicSlug() || dataRef.current.shop.slug));
        return;
      }
      const updated = await loadWorkspace(dataRef.current.workspaceId);
      if (
        updated &&
        updated.revision !== dataRef.current.revision &&
        dataRef.current.revision === revisionAtStart &&
        !busyRef.current
      )
        install(updated);
    } catch (e) {
      announce(e.message);
    }
  }
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'Escape') {
        if (confirm) setConfirm(null);
        else if (dialog) (dialogCloser.current || (() => setDialog(null)))();
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
  }, [dialog, palette, drawer, confirm]);
  useEffect(() => {
    // Closing or reloading the tab: browsers only allow their own generic warning here.
    const leave = (e) => {
      if (!isDirty()) return;
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, []);
  const updateOrder = async (id, patch) => {
    const o = dataRef.current.orders.find((o) => o.id === id);
    if (!o) return false;
    if (patch.status === 'Paid' && (patch.paid ?? o.paid) < o.total) {
      setDialog({ type: 'payment', order: o });
      return false;
    }
    const paid = patch.paid ?? o.paid,
      deposit = patch.deposit ?? o.deposit ?? 0;
    if (['Shipped', 'Delivered'].includes(patch.status) && paid < o.total) {
      announce('Record the full payment before shipping.');
      setDialog({ type: 'payment', order: o });
      return false;
    }
    if (patch.status === 'Purchased' && paid < deposit) {
      announce('Collect the down payment before purchasing.');
      setDialog({ type: 'payment', order: o });
      return false;
    }
    if (
      !demoMode &&
      patch.status === 'Purchased' &&
      patch.actualCost == null &&
      o.actualCost == null
    ) {
      setDialog({ type: 'purchase', order: o });
      return false;
    }
    const saved = await change(
      (d) => ({ ...d, orders: d.orders.map((x) => (x.id === id ? { ...x, ...patch } : x)) }),
      `${id} updated${patch.status ? ' to ' + patch.status : ''}.`,
    );
    if (saved && demoMode)
      setToast({
        message: `${id} updated.`,
        undo: () => {
          setRawData((d) => ({ ...d, orders: d.orders.map((x) => (x.id === id ? o : x)) }));
          setToast(null);
        },
      });
    return saved;
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
        setDialog: (value) => {
          if (
            value &&
            !demoMode &&
            role === 'Helper' &&
            [
              'item',
              'quote',
              'purchase',
              'budget',
              'trip',
              'invite',
              'plan',
              'customer',
              'request',
              'manual-order',
            ].includes(value.type)
          ) {
            announce('This action requires an owner or manager.');
            return;
          }
          if (
            value &&
            !demoMode &&
            ['item', 'quote', 'request', 'buyer-request'].includes(value.type) &&
            !data.trips.length
          ) {
            announce('Create a trip before adding items or requests.');
            if (mode !== 'store') navigate('Trips');
            return;
          }
          if (value && !demoMode && value.type === 'manual-order' && !data.items.length) {
            announce('Add an item first, or create a custom request.');
            navigate('Items');
            return;
          }
          setDialog(value ? { ...value, baseRevision: data.revision } : null);
        },
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
        setRole: supabase ? () => announce('Roles are assigned by the workspace owner.') : setRole,
        support,
        setSupport,
        screenState,
        setScreenState,
        copy,
        exportCsv,
        updateOrder,
        connection,
        connectionError,
        reload,
        pageLoading,
        routeLoading,
        confirm,
        setConfirm,
        setGuard,
        confirmDiscard,
        dialogCloser,
        session,
        signOut,
        pending,
        demoMode,
        openSupport,
        exitSupport,
        selectWorkspace,
      }}
    >
      {children}
    </Context.Provider>
  );
}
