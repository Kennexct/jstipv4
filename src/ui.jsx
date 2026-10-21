import { demoMode } from './lib/supabase';
import { LiveRevenueChart } from './charts';
import React, { useId, useEffect, useRef } from 'react';
import { paymentState } from './money';
import {
  Circle,
  Trash2,
  Mail,
  Send,
  Link2,
  Image,
  LogOut,
  X,
  LayoutDashboard,
  Inbox,
  Package,
  MessageSquare,
  Plane,
  ListChecks,
  Users,
  ChartNoAxesCombined,
  Store,
  Settings,
  CreditCard,
  Building2,
  ShieldCheck,
  History,
  ArrowUpRight,
  Search,
  ChevronRight,
  ExternalLink,
  Plus,
  Wallet,
  TrendingUp,
  CircleAlert,
  ArrowRight,
  Calendar,
  Globe,
  Sparkles,
  Download,
  Pencil,
  Copy,
  BedDouble,
  Utensils,
  LockKeyhole,
  Check,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
  PackageSearch,
  MessageCircle,
  MapPin,
  BadgeCheck,
  ShoppingBag,
  ChevronsUpDown,
  Layers,
  CircleHelp,
  Menu,
  Bell,
  Eye,
  RotateCw,
  House,
  CheckCircle2,
  Paperclip,
  CalendarPlus,
  FileText,
  CircleCheck,
  Camera,
  Lightbulb,
  Info,
  Compass,
  CornerDownLeft,
  ChevronLeft,
} from 'lucide-react';
const icons = {
  Circle,
  Trash2,
  Mail,
  Send,
  Link2,
  Image,
  LogOut,
  X,
  LayoutDashboard,
  Inbox,
  Package,
  MessageSquare,
  Plane,
  ListChecks,
  Users,
  ChartNoAxesCombined,
  Store,
  Settings,
  CreditCard,
  Building2,
  ShieldCheck,
  History,
  ArrowUpRight,
  Search,
  ChevronRight,
  ExternalLink,
  Plus,
  Wallet,
  TrendingUp,
  CircleAlert,
  ArrowRight,
  Calendar,
  Globe,
  Sparkles,
  Download,
  Pencil,
  Copy,
  BedDouble,
  Utensils,
  LockKeyhole,
  Check,
  Sun,
  Moon,
  Monitor,
  RotateCcw,
  ShieldAlert,
  ArrowLeft,
  PackageSearch,
  MessageCircle,
  MapPin,
  BadgeCheck,
  ShoppingBag,
  ChevronsUpDown,
  Layers,
  CircleHelp,
  Menu,
  Bell,
  Eye,
  RotateCw,
  House,
  CheckCircle2,
  Paperclip,
  CalendarPlus,
  FileText,
  CircleCheck,
  Camera,
  Lightbulb,
  Info,
  Compass,
  CornerDownLeft,
  ChevronLeft,
};
export const navIcons = {
  Overview: 'LayoutDashboard',
  Orders: 'Inbox',
  Requests: 'MessageSquare',
  Items: 'Package',
  Trips: 'Plane',
  Purchasing: 'ListChecks',
  Customers: 'Users',
  Reports: 'ChartNoAxesCombined',
  Settings: 'Settings',
  Billing: 'CreditCard',
  Merchants: 'Building2',
  Metrics: 'ChartNoAxesCombined',
  Moderation: 'ShieldCheck',
  Audit: 'History',
  Storefront: 'Store',
  Welcome: 'Compass',
};
export function I({ name, size = 16, ...props }) {
  const C = icons[name] || Circle;
  return <C size={size} strokeWidth={1.65} aria-hidden="true" {...props} />;
}
export function Button({ children, icon, primary, className = '', ...props }) {
  return (
    <button className={`btn ${primary ? 'primary' : ''} ${className}`} {...props}>
      {icon && <I name={icon} size={14} />} {children}
    </button>
  );
}
export function Badge({ status }) {
  const tone = /Paid|Delivered|Available|Active/.test(status)
    ? 'green'
    : /Cancelled|Suspended|Past due/.test(status)
      ? 'red'
      : /Quoted|Trial|Shopping|Invited/.test(status)
        ? 'amber'
        : /Confirmed|Purchased|Open for orders|Delivering/.test(status)
          ? 'blue'
          : /Shipped|Pre-order|Planning/.test(status)
            ? 'violet'
            : 'gray';
  return (
    <span className={`badge ${tone}`}>
      <i />
      {status}
    </span>
  );
}
export function Avatar({ name = '', small = false }) {
  return (
    <span className={`avatar ${small ? 'small' : ''}`}>
      {name
        .split(' ')
        .map((s) => s[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()}
    </span>
  );
}
export function Field({ label, children, hint }) {
  const id = useId();
  let assigned = false;
  const enhance = (n) =>
    React.Children.map(n, (c) => {
      if (!React.isValidElement(c)) return c;
      if (['input', 'select', 'textarea'].includes(c.type) && !assigned) {
        assigned = true;
        return React.cloneElement(c, {
          id,
          'aria-label': c.props['aria-label'] || label,
          'aria-describedby': hint ? id + '-hint' : undefined,
        });
      }
      return c.props.children ? React.cloneElement(c, {}, enhance(c.props.children)) : c;
    });
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {enhance(children)}
      {hint && <small id={id + '-hint'}>{hint}</small>}
    </div>
  );
}
export function Header({ title, description, children }) {
  return (
    <div className="page-header">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      <div className="header-actions">{children}</div>
    </div>
  );
}
export function Stats({ stats }) {
  return (
    <div className="stat-strip">
      {stats.map((s) => (
        <div className="stat" key={s.label}>
          <div className="stat-label">
            {s.label}
            <I name={s.icon || 'ArrowUpRight'} size={14} />
          </div>
          <div className="stat-value">{s.value}</div>
          <div className={`stat-caption ${s.tone || ''}`}>{s.caption}</div>
        </div>
      ))}
    </div>
  );
}
export function Empty({
  title = 'Nothing here yet',
  text = 'Try another filter to find what you’re looking for.',
  children,
}) {
  return (
    <div className="empty">
      <I name="Inbox" size={24} />
      <h3>{title}</h3>
      <p>{text}</p>
      {children}
    </div>
  );
}
export function Progress({ value }) {
  return (
    <div className="progress">
      <i style={{ width: Math.max(0, Math.min(100, value)) + '%' }} />
    </div>
  );
}
export function SearchField({ value, onChange, placeholder }) {
  return (
    <div className="search-field">
      <I name="Search" size={14} />
      <input
        aria-label={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
      />
      {value && (
        <button className="icon-btn" aria-label="Clear search" onClick={() => onChange('')}>
          <I name="X" size={12} />
        </button>
      )}
    </div>
  );
}
export function TripFilter({ trips, value, onChange }) {
  return (
    <select aria-label="Filter by trip" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="all">All trips</option>
      {trips.map((t) => (
        <option value={t.id} key={t.id}>
          {t.name}
        </option>
      ))}
    </select>
  );
}
export function Tabs({ options, value, onChange }) {
  return (
    <div className="tabs">
      {options.map((s) => (
        <button key={s} className={s === value ? 'active' : ''} onClick={() => onChange(s)}>
          {s}
        </button>
      ))}
    </div>
  );
}
export function Callout({ children, icon = 'Info' }) {
  return (
    <div className="callout">
      <I name={icon} size={15} />
      <span>{children}</span>
    </div>
  );
}
export function Overlay({ children, onClose, drawer = false, label, title }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current.querySelector('[data-autofocus],button,input,select,textarea')?.focus();
    const trap = (e) => {
      if (
        e.key !== 'Tab' ||
        document
          .querySelectorAll('[aria-modal="true"]')
          .item(document.querySelectorAll('[aria-modal="true"]').length - 1) !== ref.current
      )
        return;
      const nodes = [
        ...ref.current.querySelectorAll(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea,[tabindex="0"]',
        ),
      ];
      if (!nodes.length) return;
      const first = nodes[0],
        last = nodes.at(-1);
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.body.style.overflow = old;
      document.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className={`overlay ${drawer ? 'drawer-overlay' : ''}`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        ref={ref}
        className={drawer ? 'drawer' : 'modal'}
        role="dialog"
        aria-modal="true"
        aria-label={label}
        aria-labelledby={title}
      >
        {children}
      </section>
    </div>
  );
}
export function RevenueChart({ currency = 'IDR' }) {
  if (!demoMode) return <LiveRevenueChart currency={currency} />;
  return (
    <>
      <div className="revenue-chart">
        <div className="chart-y">
          {['Rp 8M', 'Rp 6M', 'Rp 4M', 'Rp 2M', '0'].map((s) => (
            <span key={s}>{s}</span>
          ))}
        </div>
        <div className="chart-body">
          <svg
            viewBox="0 0 600 180"
            preserveAspectRatio="none"
            role="img"
            aria-label="Illustrative revenue trend"
          >
            <g className="chart-grid">
              {[5, 45, 85, 125, 165].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} />
              ))}
            </g>
            <path
              className="chart-previous"
              d="M0 160 C25 160 28 152 50 148 S80 153 100 143 S130 142 150 133 S181 140 200 128 S232 129 250 116 S277 120 300 103 S330 108 350 88 S380 99 400 81 S429 82 450 65 S476 76 500 57 S528 65 550 48 S580 56 600 39"
            />
            <path
              className="chart-current"
              d="M0 158 C25 158 30 148 50 144 S80 145 100 127 S124 141 150 118 S175 127 200 101 S223 116 250 93 S278 99 300 80 S328 84 350 64 S377 70 400 49 S427 61 450 38 S478 45 500 27 S526 34 550 14 S580 23 600 4"
            />
          </svg>
          <div className="chart-x">
            {['1 Oct', '5 Oct', '10 Oct', '15 Oct', '20 Oct', '25 Oct', '31 Oct'].map((s) => (
              <span key={s}>{s}</span>
            ))}
          </div>
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i />
          Revenue
        </span>
        <span>
          <i className="dashed" />
          Previous month
        </span>
      </div>
    </>
  );
}
export function ProductArt({ item, type = item?.image || 'none', photo = 0 }) {
  if (item?.photos?.length)
    return (
      <img className="item-photo" src={item.photos[photo] || item.photos[0]} alt={item.name} />
    );
  if (type === 'none')
    return (
      <div className="product-art no-photo">
        <I name="Image" size={24} />
        <span>No photo yet</span>
      </div>
    );
  return (
    <div className={`product-art art-${type}`}>
      <svg viewBox="0 0 240 200" role="img" aria-label={`${type} illustrative product preview`}>
        <ellipse cx="120" cy="163" rx="57" ry="6" className="product-shadow" />
        {type === 'shoes' ? (
          <g>
            <path
              className="shoe-body"
              d="M47 140c15-2 27-26 39-40l28 10 14 15c17 6 37 6 53 13 9 4 16 11 13 20H47c-6-5-6-12 0-18Z"
            />
            <path className="shoe-stripe" d="m91 105 54 42M102 103l-18 42m35-29-18 30" />
            <path className="shoe-sole" d="M47 151h147m-113-34 24 1" />
          </g>
        ) : type === 'bag' ? (
          <g>
            <path className="bag-handle" d="M86 91V65c0-33 68-33 68 0v26" />
            <path className="bag-body" d="M72 79h96l9 80H64Z" />
            <text x="120" y="125" textAnchor="middle" className="product-label" letterSpacing="3">
              MUJI
            </text>
          </g>
        ) : type === 'matcha' ? (
          <g>
            <rect x="81" y="68" width="78" height="93" rx="6" className="tea-body" />
            <ellipse cx="120" cy="68" rx="39" ry="9" className="tea-lid" />
            <rect x="91" y="91" width="58" height="48" className="product-paper" />
            <text x="120" y="109" textAnchor="middle" className="product-label">
              IPPODO
            </text>
            <text x="120" y="129" textAnchor="middle" className="product-label">
              抹茶
            </text>
          </g>
        ) : type === 'banana' ? (
          <g>
            <rect x="62" y="80" width="112" height="74" className="banana-body" />
            <path className="banana-lid" d="m62 80 15-13h112l-15 13" />
            <path className="banana-side" d="m174 80 15-13v73l-15 14" />
            <text x="118" y="112" textAnchor="middle" className="product-label">
              TOKYO BANANA
            </text>
          </g>
        ) : (
          <g>
            <rect x="101" y="43" width="38" height="21" rx="3" className="bottle-cap" />
            {type === 'honey' && <path d="M119 43V33h27" className="pump" />}
            <rect x="84" y="63" width="72" height="99" rx="12" className="bottle-body" />
            <rect x="90" y="83" width="60" height="56" rx="2" className="product-paper" />
            <text x="120" y="107" textAnchor="middle" className="product-label">
              {type === 'honey' ? '&honey' : type === 'anessa' ? 'ANESSA' : '肌ラボ'}
            </text>
            <text x="120" y="123" textAnchor="middle" className="product-micro">
              JAPAN · ORIGINAL
            </text>
          </g>
        )}
      </svg>
    </div>
  );
}
export function Loader({ label = 'Loading…' }) {
  return (
    <div className="loader" role="status" aria-live="polite">
      <span className="loader-mark">
        <I name="ShoppingBag" size={18} />
      </span>
      <span className="loader-ring" aria-hidden="true" />
      <span className="loader-label">{label}</span>
    </div>
  );
}
export function StoreLoading() {
  return (
    <div className="storefront store-loading">
      <Loader label="Opening the storefront…" />
    </div>
  );
}
export function Skeleton() {
  return (
    <div className="loading" aria-busy="true" aria-label="Loading workspace">
      <div className="skeleton heading" />
      <div className="skeleton subheading" />
      <div className="skeleton stats" />
      <div className="skeleton-grid">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      <div className="skeleton list" />
    </div>
  );
}
export function PayBadge({ order }) {
  const state = paymentState(order);
  return (
    <span className={`badge ${state.tone}`}>
      <i />
      {state.label}
    </span>
  );
}
// Shown when leaving a form with unsaved changes. Page behind is blurred.
export function ConfirmDialog({
  title = 'Discard unsaved changes?',
  text = 'You have changes that haven’t been saved yet. If you leave now, they’ll be lost.',
  confirmLabel = 'Discard changes',
  cancelLabel = 'Keep editing',
  onConfirm,
  onCancel,
}) {
  const keep = useRef();
  useEffect(() => keep.current?.focus(), []);
  return (
    <div className="confirm-scrim" onMouseDown={(e) => e.target === e.currentTarget && onCancel()}>
      <section
        className="confirm-card"
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        aria-describedby="confirm-text"
      >
        <span className="confirm-icon">
          <I name="CircleAlert" size={18} />
        </span>
        <h2 id="confirm-title">{title}</h2>
        <p id="confirm-text">{text}</p>
        <div className="confirm-actions">
          <button ref={keep} className="btn" onClick={onCancel}>
            {cancelLabel}
          </button>
          <button className="btn danger" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </section>
    </div>
  );
}
// Thin accent bar across the top of the window during page changes.
export function TopProgress({ active }) {
  return (
    <div className={`top-progress ${active ? 'active' : ''}`} aria-hidden={!active}>
      {active && <span role="progressbar" aria-label="Loading page" />}
    </div>
  );
}
// One save pattern for every editable page: appears when there are unsaved changes.
export function SaveBar({ dirty, busy, onSave, onDiscard, label = 'Save changes' }) {
  if (!dirty) return null;
  return (
    <div className="save-bar" role="region" aria-label="Unsaved changes">
      <span>
        <i className="save-dot" />
        You have unsaved changes
      </span>
      <span className="spacer" />
      <button type="button" className="btn" disabled={busy} onClick={onDiscard}>
        Discard
      </button>
      <button type="button" className="btn primary" disabled={busy} onClick={onSave}>
        {busy ? 'Saving…' : label}
      </button>
    </div>
  );
}
// Totals are never converted between currencies: pick which selling currency to view.
export function CurrencySwitch({ value, options, onChange }) {
  if (options.length < 2) return null;
  return (
    <select
      className="currency-switch"
      aria-label="Show totals in currency"
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      {options.map((c) => (
        <option key={c} value={c}>
          Totals in {c}
        </option>
      ))}
    </select>
  );
}
