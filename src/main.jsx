import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource/geist/latin-400.css';
import '@fontsource/geist/latin-500.css';
import '@fontsource/geist/latin-600.css';
import '@fontsource/geist-mono/latin-400.css';
import { Provider, useOps } from './store';
import { Overview, Orders, Items, Requests, Trips, Purchasing, Reports, Customers } from './seller';
import { Billing, Settings, Welcome, Storefront, Admin } from './workspaces';
import { Dialog, DetailDrawer, CommandPalette } from './dialogs';
import { I, Button, Avatar, Empty, Header, Skeleton, Progress, navIcons } from './ui';
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
  } = useOps();
  const [notifications, setNotifications] = useState(false);
  const open = data.orders.filter((o) => !['Cancelled', 'Delivered'].includes(o.status)),
    pending = data.orders.filter((o) => o.status === 'Requested'),
    plan = planDetails.find((p) => p.name === data.plan);
  const navs =
    mode === 'admin'
      ? ['Metrics', 'Merchants', 'Moderation', 'Audit']
      : ['Overview', 'Orders', 'Requests', 'Items', 'Trips', 'Purchasing', 'Customers', 'Reports'];
  const Screen = screens[page] || (mode === 'admin' ? Admin : Overview);
  return (
    <>
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
        <Storefront />
      ) : (
        <div className="app-shell">
          {mobile && <div className="sidebar-scrim" onClick={() => setMobile(false)} />}
          <aside className={`sidebar ${mobile ? 'mobile-open' : ''}`}>
            <button className="brand" onClick={() => navigate('Overview')}>
              <span className="brand-symbol">
                <I name="ShoppingBag" size={19} />
              </span>
              <strong>
                jastip<span>ops</span>
              </strong>
              <small>workspace</small>
            </button>
            <button className="workspace-switch" onClick={() => setDialog({ type: 'workspace' })}>
              <Avatar name="Rina Kusuma" />
              <div>
                <strong>{mode === 'admin' ? 'Platform console' : data.shop.name}</strong>
                <small>{mode === 'admin' ? 'Platform owner' : data.plan + ' workspace'}</small>
              </div>
              <I name="ChevronsUpDown" size={13} />
            </button>
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
                    {p === 'Requests' && pending.length > 0 && <i className="nav-dot" />}
                    {p === 'Moderation' && <span className="nav-count">1</span>}
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
                        <i className={`trip-dot ${t.id === 'seoul' ? 'amber-dot' : ''}`} />
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
              {mode === 'seller' && (
                <div className="plan-note">
                  <div>
                    <I name="Layers" size={15} />
                    <strong>{data.plan} plan</strong>
                    <span>Monthly</span>
                  </div>
                  <p>
                    {data.items.filter((i) => i.status !== 'Draft').length} of {plan.items} active
                    items
                  </p>
                  <Progress
                    value={
                      (data.items.filter((i) => i.status !== 'Draft').length / plan.items) * 100
                    }
                  />
                  <button className="text-btn" onClick={() => navigate('Billing')}>
                    Manage plan <I name="ArrowUpRight" size={12} />
                  </button>
                </div>
              )}
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
                <Avatar name="Rina Kusuma" />
                <div>
                  <strong>Rina Kusuma</strong>
                  <small>{role}</small>
                </div>
                <I name="ChevronsUpDown" size={13} />
              </button>
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
                  <i className="notification-dot" />
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
                <Avatar name="Rina Kusuma" small />
              </div>
              {notifications && (
                <div className="notification-pop">
                  <h3>Notifications</h3>
                  <button
                    onClick={() => {
                      navigate('Orders');
                      setNotifications(false);
                    }}
                  >
                    <i className="nav-dot" />
                    <div>
                      <strong>{pending.length} new order requests</strong>
                      <p>Your customers found something they love.</p>
                      <small>Today</small>
                    </div>
                  </button>
                  <button
                    onClick={() => {
                      navigate('Trips');
                      setNotifications(false);
                    }}
                  >
                    <I name="Plane" />
                    <div>
                      <strong>Tokyo trip starts in 2 days</strong>
                      <p>Your shopping checklist is ready.</p>
                      <small>Today</small>
                    </div>
                  </button>
                </div>
              )}
            </header>
            {support && (
              <div className="support-banner">
                <I name="Eye" size={15} />
                <span>Read-only support view · {data.shop.name}</span>
                <button
                  className="text-btn"
                  onClick={() => {
                    setSupport(false);
                    navigate('Merchants');
                  }}
                >
                  Exit support view <I name="X" size={13} />
                </button>
              </div>
            )}
            <div id="main" tabIndex="-1" className="page" key={page + screenState}>
              {screenState === 'loading' ? (
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
                Demo workspace · Saved locally
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
createRoot(document.getElementById('root')).render(
  <Provider>
    <App />
  </Provider>,
);
