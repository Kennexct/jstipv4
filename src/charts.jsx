import React from 'react';
import { useOps } from './store';
import { money } from './money';
export function LiveRevenueChart() {
  const { data } = useOps();
  const end = new Date();
  end.setUTCHours(0, 0, 0, 0);
  const series = Array.from({ length: 30 }, (_, i) => {
    const day = new Date(end);
    day.setUTCDate(day.getUTCDate() - 29 + i);
    const key = day.toISOString().slice(0, 10);
    return {
      key,
      value: data.orders
        .filter((o) => o.status !== 'Cancelled' && (o.createdAt || o.date).slice(0, 10) === key)
        .reduce((sum, o) => sum + o.total, 0),
    };
  });
  const max = Math.max(1, ...series.map((d) => d.value));
  const points = series.map((d, i) => `${(i * 600) / 29},${180 - (d.value / max) * 160}`).join(' ');
  return (
    <>
      <div className="revenue-chart live-chart">
        <div className="chart-y">
          <span>{money(max === 1 ? 0 : max, true)}</span>
          <span>{money(max === 1 ? 0 : max / 2, true)}</span>
          <span>0</span>
        </div>
        <div className="chart-body">
          <svg
            viewBox="0 0 600 190"
            role="img"
            aria-label="Daily order value over the last 30 days"
          >
            <g className="chart-grid">
              {[20, 100, 180].map((y) => (
                <line key={y} x1="0" x2="600" y1={y} y2={y} />
              ))}
            </g>
            <polyline className="chart-current" points={points} />
            {series.map((d, i) => (
              <circle
                key={d.key}
                cx={(i * 600) / 29}
                cy={180 - (d.value / max) * 160}
                r="3"
                fill="var(--accent)"
              >
                <title>
                  {d.key}: {money(d.value)}
                </title>
              </circle>
            ))}
          </svg>
          <div className="chart-x">
            <span>{series[0].key}</span>
            <span>{series[29].key}</span>
          </div>
        </div>
      </div>
      <div className="chart-legend">
        <span>
          <i />
          Daily non-cancelled order value · last 30 days
        </span>
      </div>
    </>
  );
}
