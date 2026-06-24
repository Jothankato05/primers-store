import React from 'react';

const Star = ({ size, fill, stroke }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke={stroke}
       strokeWidth="1.5" strokeLinejoin="round" style={{ display: 'block' }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

/**
 * Primers Store — StarRating
 * Five amber stars. Read-only by default; pass `interactive` + `onChange`
 * to collect a review rating.
 */
export function StarRating({
  rating = 0,
  count = 0,
  size = 'sm',
  interactive = false,
  onChange,
  style,
}) {
  const px = { sm: 16, md: 20, lg: 24 }[size] || 16;
  const [hover, setHover] = React.useState(0);
  const shown = hover || rating;

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2, ...style }}>
      {[1, 2, 3, 4, 5].map((s) => {
        const on = s <= Math.round(shown);
        return (
          <button
            key={s}
            type="button"
            disabled={!interactive}
            onClick={() => interactive && onChange?.(s)}
            onMouseEnter={() => interactive && setHover(s)}
            onMouseLeave={() => interactive && setHover(0)}
            style={{
              padding: 0, border: 'none', background: 'none', lineHeight: 0,
              cursor: interactive ? 'pointer' : 'default',
              transition: 'transform var(--duration-fast) var(--ease)',
              transform: interactive && hover === s ? 'scale(1.15)' : 'none',
            }}
          >
            <Star size={px} fill={on ? 'var(--rating)' : 'none'} stroke={on ? 'var(--rating)' : 'rgba(255,255,255,0.25)'} />
          </button>
        );
      })}
      {count > 0 && (
        <span style={{ marginLeft: 6, fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)', color: 'var(--text-subtle)' }}>
          ({count.toLocaleString()})
        </span>
      )}
    </div>
  );
}
