import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist/latin-600.css';
import '@fontsource/geist-mono/latin-400.css';
import { Provider, useOps } from './store';
import { ConnectionGate } from './auth';
import { Overview, Orders, Items, Requests, Trips, Purchasing, Reports, Customers } from './seller';
import { Billing, Settings, Welcome, Storefront, Admin } from './workspaces';
import { Dialog, DetailDrawer, CommandPalette } from './dialogs';
import {
  I,
  Button,
  Avatar,
  Empty,
  Header,
  Skeleton,
  StoreLoading,
  Progress,
  TopProgress,
  ConfirmDialog,
  navIcons,
  BrandMark,
  BrandWordmark,
} from './ui';
import { planDetails } from './data';
import './styles/tokens.css';
import './styles/app.css';
const screens = {
  Overview,
  Orders,
  Items,
  Requests,
  Trips,
  Purchasing,
  Reports,
  Customers,
  Billing,
  Settings,
  Welcome,
};
function App() {
  const {
    data,
    page,
    mode,
    navigate,
    setDialog,
    drawer,
    dialog,
    palette,
    setPalette,
    toast,
    setToast,
    mobile,
    setMobile,
    role,
    support,
    setSupport,
    screenState,
    setScreenState,
    setData,
    connection,
    demoMode,
    session,
    signOut,
    pending,
    reload,
    pageLoading,
    routeLoading,
    confirm,
    setConfirm,
    exitSupport,
  } = useOps();
  const [notifications, setNotifications] = useState(false);
  if (!demoMode && (connection !== 'ready' || page === 'Recovery')) return <ConnectionGate />;
  const open = data.orders.filter((o) => !['Cancelled', 'Delivered'].includes(o.status)),
    requests = data.orders.filter((o) => o.status === 'Requested'),
    plan = planDetails.find((p) => p.name === data.plan) || planDetails[0],
    activeItems = data.items.filter((i) => i.status !== 'Draft').length;
  const navs =
    mode === 'admin'
      ? ['Metrics', 'Merchants', 'Moderation', 'Audit']
      : ['Overview', 'Orders', 'Requests', 'Items', 'Trips', 'Purchasing', 'Customers', 'Reports'];
  const Screen = screens[page] || (mode === 'admin' ? Admin : Overview);
  return (
    <>
      <TopProgress active={routeLoading || pageLoading} />
      {confirm && (
        <ConfirmDialog {...confirm} onConfirm={confirm.proceed} onCancel={() => setConfirm(null)} />
      )}
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      {mode === 'store' ? (
        pageLoading ? (
          <StoreLoading />
        ) : (
          <Storefront />
        )
      ) : (
        <div className="app-shell">
          {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
          <aside className={`sidebar ${mobile ? 'open' : ''}`}>
            <button className="brand" onClick={() => navigate('Overview')}>
              <BrandMark tone="tile" size={29} className="brand-symbol" label="" />
              <BrandWordmark height={17} />
              <small>workspace</small>
            </button>
            <button className="workspace-switch" onClick={() => setDialog({ type: 'workspace' })}>
              <Avatar name={session?.user?.user_metadata?.name || data.shop.name} />
              <div>
                <strong>{mode === 'admin' ? 'Platform console' : data.shop.name}</strong>
                <small>{mode === 'admin' ? 'Platform owner' : data.plan + ' workspace'}</small>
              </div>
              <I name="ChevronsUpDown" size={13} />
            </button>
            {mode === 'seller' && (
              <div className="plan-note">
                <div>
                  <I name="Layers" size={15} />
                  <strong>{data.plan} plan</strong>
                  <span>Monthly</span>
                </div>
                <p>
                  {activeItems} of {plan.items} active items
                </p>
                <Progress value={Math.min(100, (activeItems / plan.items) * 100)} />
                <button className="text-btn" onClick={() => navigate('Billing')}>
                  Manage plan <I name="ArrowUpRight" size={12} />
                </button>
              </div>
            )}
            <button className="sidebar-search" onClick={() => setPalette(true)}>
              <I name="Search" size={14} />
              <span>Search anything…</span>
              <kbd>⌘ K</kbd>
            </button>
            <div className="nav-label">{mode === 'admin' ? 'PLATFORM' : 'WORKSPACE'}</div>
            <nav>
              {navs
                .filter((p) => role !== 'Helper' || !['Overview', 'Reports'].includes(p))
                .map((p) => (
                  <button
                    key={p}
                    className={`nav-item ${page === p ? 'active' : ''}`}
                    onClick={() => navigate(p)}
                  >
                    <I name={navIcons[p]} />
                    <span>{p}</span>
                    {p === 'Orders' && <span className="nav-count">{open.length}</span>}
                    {p === 'Requests' && requests.length > 0 && <i className="nav-dot" />}
                    {p === 'Moderation' && (
                      <span className="nav-count">
                        {demoMode ? 1 : data.reports.filter((r) => r.status === 'Open').length}
                      </span>
                    )}
                  </button>
                ))}
            </nav>
            {mode === 'seller' && (
              <>
                <div className="nav-label with-action">
                  YOUR TRIPS
                  <button
                    className="icon-btn"
                    aria-label="New trip"
                    onClick={() => setDialog({ type: 'trip' })}
                  >
                    <I name="Plus" size={13} />
                  </button>
                </div>
                <nav>
                  {data.trips
                    .filter((t) => t.status !== 'Closed')
                    .map((t) => (
                      <button
                        className="nav-item trip-nav"
                        key={t.id}
                        onClick={() => {
                          sessionStorage.setItem('jo-trip', t.id);
                          navigate('Trips');
                        }}
                      >
                        <i className={`trip-dot ${t.status === 'Shopping' ? 'amber-dot' : ''}`} />
                        <span>{t.name}</span>
                      </button>
                    ))}
                </nav>
                <div className="sidebar-store">
                  <button className="nav-item" onClick={() => navigate('Storefront')}>
                    <I name="Store" />
                    <span>Your storefront</span>
                    <I name="ArrowUpRight" size={13} />
                  </button>
                </div>
              </>
            )}
            <div className="sidebar-footer">
              <button className="nav-item" onClick={() => setDialog({ type: 'help' })}>
                <I name="CircleHelp" />
                <span>Help & shortcuts</span>
                <kbd>?</kbd>
              </button>
              <button
                className={`nav-item ${page === 'Settings' ? 'active' : ''}`}
                onClick={() => navigate('Settings')}
              >
                <I name="Settings" />
                <span>Settings</span>
              </button>
              <button className="profile" onClick={() => setDialog({ type: 'workspace' })}>
                <Avatar name={session?.user?.user_metadata?.name || data.shop.name} />
                <div>
                  <strong>{demoMode ? 'Rina Kusuma' : session?.user?.email}</strong>
                  <small>{role}</small>
                </div>
                <I name="ChevronsUpDown" size={13} />
              </button>
              {!demoMode && (
                <button className="nav-item sign-out" onClick={signOut} disabled={pending}>
                  <I name="LogOut" />
                  <span>Sign out</span>
                </button>
              )}
            </div>
          </aside>
          <main className="main">
            <header className="topbar">
              <button
                className="icon-btn mobile-menu"
                aria-label="Open navigation"
                onClick={() => setMobile(true)}
              >
                <I name="Menu" />
              </button>
              <div className="breadcrumbs">
                <span>{mode === 'admin' ? 'Platform' : 'Workspace'}</span>
                <I name="ChevronRight" size={12} />
                <strong>
                  {page === 'Purchasing'
                    ? 'Purchase checklist'
                    : page === 'Billing'
                      ? 'Plan & billing'
                      : page}
                </strong>
              </div>
              <div className="topbar-actions">
                {!demoMode && (
                  <button
                    className="text-btn"
                    disabled={pending || pageLoading}
                    onClick={() => reload({ quiet: true })}
                  >
                    {pending ? 'Saving…' : 'Refresh'}
                  </button>
                )}
                <button className="top-search" onClick={() => setPalette(true)}>
                  <I name="Search" size={14} />
                  <span>Search</span>
                  <kbd>⌘ K</kbd>
                </button>
                <span className="top-divider" />
                <button
                  className="icon-btn"
                  aria-label="Notifications"
                  onClick={() => setNotifications((v) => !v)}
                >
                  <I name="Bell" />
                  {(requests.length > 0 ||
                    data.trips.some((t) => ['Open for orders', 'Shopping'].includes(t.status))) && (
                    <i className="notification-dot" />
                  )}
                </button>
                <button
                  className="icon-btn"
                  aria-label="Toggle dark mode"
                  onClick={() =>
                    setData((d) => ({
                      ...d,
                      preferences: {
                        ...d.preferences,
                        theme: d.preferences.theme === 'dark' ? 'light' : 'dark',
                      },
                    }))
                  }
                >
                  <I name={data.preferences.theme === 'dark' ? 'Sun' : 'Moon'} />
                </button>
                <Avatar name={session?.user?.user_metadata?.name || data.shop.name} small />
              </div>
              {notifications && (
                <div className="notification-pop">
                  <h3>Notifications</h3>
                  {requests.length > 0 && (
                    <button
                      onClick={() => {
                        navigate('Requests');
                        setNotifications(false);
                      }}
                    >
                      <i className="nav-dot" />
                      <div>
                        <strong>
                          {requests.length} new order{' '}
                          {requests.length === 1 ? 'request' : 'requests'}
                        </strong>
                        <p>Your customers requested custom finds.</p>
                        <small>Action needed</small>
                      </div>
                    </button>
                  )}
                  {data.trips
                    .filter((t) => ['Open for orders', 'Shopping'].includes(t.status))
                    .map((trip) => (
                      <button
                        key={trip.id}
                        onClick={() => {
                          sessionStorage.setItem('jo-trip', trip.id);
                          navigate('Trips');
                          setNotifications(false);
                        }}
                      >
                        <I name="Plane" />
                        <div>
                          <strong>{trip.name}</strong>
                          <p>
                            {trip.city} · {trip.status}
                          </p>
                          <small>{trip.dates || 'Upcoming'}</small>
                        </div>
                      </button>
                    ))}
                  {!requests.length &&
                    !data.trips.some((t) => ['Open for orders', 'Shopping'].includes(t.status)) && (
                      <div
                        style={{
                          padding: '16px',
                          textAlign: 'center',
                          color: 'var(--text-3)',
                          fontSize: 'var(--fs-xs)',
                        }}
                      >
                        All caught up! No active notifications.
                      </div>
                    )}
                </div>
              )}
            </header>
            {support && (
              <div className="support-banner">
                <I name="Eye" size={15} />
                <span>Read-only support view · {data.shop.name}</span>
                <button className="text-btn" onClick={exitSupport}>
                  Exit support view <I name="X" size={13} />
                </button>
              </div>
            )}
            <div id="main" tabIndex="-1" className="page" key={page + screenState}>
              {screenState === 'loading' || (pageLoading && data.role === 'Buyer') ? (
                <Skeleton />
              ) : screenState === 'error' ? (
                <>
                  <Header title="Overview" description="We couldn’t refresh your workspace." />
                  <Empty
                    title="Let’s try that again"
                    text="Your saved data is safe. Check your connection and retry."
                  >
                    <Button primary icon="RotateCw" onClick={() => setScreenState('ready')}>
                      Retry
                    </Button>
                  </Empty>
                </>
              ) : screenState === 'empty' ? (
                <>
                  <Header
                    title="Welcome to your workspace"
                    description="Your next trip starts with a little structure."
                  />
                  <Empty
                    title="Every journey starts with a first find"
                    text="Create a trip, then add an item to see your business take shape."
                  >
                    <Button
                      primary
                      icon="Plus"
                      onClick={() => {
                        setScreenState('ready');
                        setDialog({ type: 'trip' });
                      }}
                    >
                      Create your first trip
                    </Button>
                  </Empty>
                </>
              ) : role === 'Helper' && ['Overview', 'Reports'].includes(page) ? (
                <Empty
                  title="Your orders are ready"
                  text="Your helper role includes orders, items, and the purchase checklist."
                >
                  <Button primary onClick={() => navigate('Orders')}>
                    Open orders
                  </Button>
                </Empty>
              ) : (
                <Screen key={page} />
              )}
            </div>
            <footer className="app-footer">
              <span>
                <i className="sync-dot" />
                {demoMode
                  ? 'Demo workspace · Saved locally'
                  : pending
                    ? 'Saving to database…'
                    : 'Connected to Supabase'}
              </span>
              <span>Made for the journey.</span>
            </footer>
          </main>
          <nav className="bottom-nav">
            {[
              ['Overview', 'House', 'Home'],
              ['Orders', 'Inbox', 'Orders'],
              ['Add', 'Plus', 'Add'],
              ['Trips', 'Plane', 'Trips'],
              ['More', 'Menu', 'More'],
            ].map(([p, i, l]) => (
              <button
                key={p}
                className={page === p ? 'active' : ''}
                onClick={() =>
                  p === 'Add'
                    ? setDialog({ type: 'item' })
                    : p === 'More'
                      ? setMobile(true)
                      : navigate(p)
                }
              >
                <I name={i} size={20} />
                <span>{l}</span>
              </button>
            ))}
          </nav>
        </div>
      )}
      {drawer && <DetailDrawer key={drawer.id} />} {palette && <CommandPalette />}
      {dialog && (
        <Dialog
          key={dialog.type + (dialog.item?.id || dialog.order?.id || dialog.budget?.id || '')}
        />
      )}{' '}
      {toast && (
        <div className="toast" role="status">
          <I name="CheckCircle2" size={16} />
          <span>{toast.message}</span>
          {toast.undo && <button onClick={toast.undo}>Undo</button>}
          <button aria-label="Dismiss notification" onClick={() => setToast(null)}>
            <I name="X" size={14} />
          </button>
        </div>
      )}
    </>
  );
}
async function start() {
  const initialSeed =
    import.meta.env.VITE_ENABLE_DEMO === 'true'
      ? (await import('./demo/fixtures')).seed
      : undefined;
  createRoot(document.getElementById('root')).render(
    <Provider initialSeed={initialSeed}>
      <App />
    </Provider>,
  );
}
start();
