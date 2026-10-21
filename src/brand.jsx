// Bawa logo (brand kit v1.0, ADR-005). Geometry comes from docs/brand; never retype the wordmark.
// tone: 'auto' follows the theme (forest + pine dot in light, paper + lime dot in dark),
// 'current' inherits CSS color, 'tile' is the app-icon square.
const MARK_PATH = 'M32 30V84M32 52C40 40 70 38 72 62C74 82 50 90 38 80';
const WORDMARK_PATH =
  'M368 14Q301 14 265.0 -9.0Q229 -32 212 -60H194V0H70V-700H196V-439H214Q225 -457 243.5 -473.0Q262 -489 292.5 -499.5Q323 -510 368 -510Q428 -510 479.0 -480.5Q530 -451 561.0 -394.0Q592 -337 592 -256V-240Q592 -159 561.0 -102.0Q530 -45 479.0 -15.5Q428 14 368 14ZM330 -96Q388 -96 427.0 -133.5Q466 -171 466 -243V-253Q466 -325 427.5 -362.5Q389 -400 330 -400Q272 -400 233.0 -362.5Q194 -325 194 -253V-243Q194 -171 233.0 -133.5Q272 -96 330 -96Z M827.0 14Q774.0 14 732.0 -4.5Q690.0 -23 665.5 -58.5Q641.0 -94 641.0 -145Q641.0 -196 665.5 -230.5Q690.0 -265 733.5 -282.5Q777.0 -300 833.0 -300H969.0V-328Q969.0 -363 947.0 -385.5Q925.0 -408 877.0 -408Q830.0 -408 807.0 -386.5Q784.0 -365 777.0 -331L661.0 -370Q673.0 -408 699.5 -439.5Q726.0 -471 770.5 -490.5Q815.0 -510 879.0 -510Q977.0 -510 1034.0 -461.0Q1091.0 -412 1091.0 -319V-134Q1091.0 -104 1119.0 -104H1159.0V0H1075.0Q1038.0 0 1014.0 -18.0Q990.0 -36 990.0 -66V-67H971.0Q967.0 -55 953.0 -35.5Q939.0 -16 909.0 -1.0Q879.0 14 827.0 14ZM849.0 -88Q902.0 -88 935.5 -117.5Q969.0 -147 969.0 -196V-206H842.0Q807.0 -206 787.0 -191.0Q767.0 -176 767.0 -149Q767.0 -122 788.0 -105.0Q809.0 -88 849.0 -88Z M1256.0 0 1186.0 -496H1311.0L1355.0 -85H1373.0L1437.0 -496H1639.0L1703.0 -85H1721.0L1765.0 -496H1890.0L1820.0 0H1611.0L1547.0 -411H1529.0L1465.0 0Z M2119.0 14Q2066.0 14 2024.0 -4.5Q1982.0 -23 1957.5 -58.5Q1933.0 -94 1933.0 -145Q1933.0 -196 1957.5 -230.5Q1982.0 -265 2025.5 -282.5Q2069.0 -300 2125.0 -300H2261.0V-328Q2261.0 -363 2239.0 -385.5Q2217.0 -408 2169.0 -408Q2122.0 -408 2099.0 -386.5Q2076.0 -365 2069.0 -331L1953.0 -370Q1965.0 -408 1991.5 -439.5Q2018.0 -471 2062.5 -490.5Q2107.0 -510 2171.0 -510Q2269.0 -510 2326.0 -461.0Q2383.0 -412 2383.0 -319V-134Q2383.0 -104 2411.0 -104H2451.0V0H2367.0Q2330.0 0 2306.0 -18.0Q2282.0 -36 2282.0 -66V-67H2263.0Q2259.0 -55 2245.0 -35.5Q2231.0 -16 2201.0 -1.0Q2171.0 14 2119.0 14ZM2141.0 -88Q2194.0 -88 2227.5 -117.5Q2261.0 -147 2261.0 -196V-206H2134.0Q2099.0 -206 2079.0 -191.0Q2059.0 -176 2059.0 -149Q2059.0 -122 2080.0 -105.0Q2101.0 -88 2141.0 -88Z';
const WORDMARK_BOX = [70, -700, 2381.0, 714];
const LOCKUP_BOX = [192.86, 51.06];
const LOCKUP_MARK = 'translate(-14.264 -2.972) scale(0.5943)';
const LOCKUP_WORD = 'translate(45.801 50.222) scale(0.06)';

function colours(tone) {
  if (tone === 'current') return { ink: 'currentColor', dot: 'currentColor' };
  if (tone === 'tile') return { ink: 'var(--brand-paper)', dot: 'var(--brand-lime)' };
  return { ink: 'var(--brand-ink)', dot: 'var(--brand-dot)' };
}

function MarkShape({ ink, dot, stroke = 11 }) {
  return (
    <>
      <circle cx="32" cy="13" r="8" fill={dot} />
      <path
        d={MARK_PATH}
        fill="none"
        stroke={ink}
        strokeWidth={stroke}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  );
}

export function BrandMark({ size = 16, tone = 'auto', className = '', label = 'Bawa' }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  if (tone === 'tile') {
    const k = size < 24 ? 0.84 : 0.74;
    return (
      <svg
        className={'brand-mark ' + className}
        width={size}
        height={size}
        viewBox="0 0 100 100"
        {...a11y}
      >
        <rect width="100" height="100" rx="24" fill="var(--brand-forest)" />
        <g
          transform={`translate(${(50 - 50.8 * k).toFixed(2)} ${(48.5 - 47.4 * k).toFixed(2)}) scale(${k})`}
        >
          <MarkShape {...colours('tile')} stroke={size < 24 ? 13 : 11} />
        </g>
      </svg>
    );
  }
  return (
    <svg
      className={'brand-mark ' + className}
      width={(size * 53.6) / 84.8}
      height={size}
      viewBox="24 5 53.6 84.8"
      {...a11y}
    >
      <MarkShape {...colours(tone)} />
    </svg>
  );
}

export function BrandWordmark({ height = 16, tone = 'auto', className = '', label = 'Bawa' }) {
  const [x, y, w, h] = WORDMARK_BOX;
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      className={'brand-wordmark ' + className}
      width={(height * w) / h}
      height={height}
      viewBox={`${x} ${y} ${w} ${h}`}
      {...a11y}
    >
      <path fill={colours(tone).ink} d={WORDMARK_PATH} />
    </svg>
  );
}

export function BrandLockup({ height = 24, tone = 'auto', className = '', label = 'Bawa' }) {
  const [w, h] = LOCKUP_BOX;
  const c = colours(tone);
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true };
  return (
    <svg
      className={'brand-lockup ' + className}
      width={(height * w) / h}
      height={height}
      viewBox={`0 0 ${w} ${h}`}
      {...a11y}
    >
      <g transform={LOCKUP_MARK}>
        <MarkShape {...c} />
      </g>
      <path transform={LOCKUP_WORD} fill={c.ink} d={WORDMARK_PATH} />
    </svg>
  );
}
