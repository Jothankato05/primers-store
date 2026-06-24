import React from 'react';

/**
 * Primers Store — Badge
 * Soft-tinted pill for status, roles, prices and category tags.
 */
export function Badge({
  children,
  tone = 'brand',
  size = 'md',
  icon: Icon,
  dot = false,
  style,
  ...rest
}) {
  const tones = {
    brand:   { color: 'var(--brand-text)',  bg: 'rgba(67,97,238,0.15)',  bd: 'rgba(92,124,250,0.25)' },
    success: { color: '#34d399',            bg: 'var(--success-soft)',   bd: 'rgba(16,185,129,0.20)' },
    warning: { color: '#fbbf24',            bg: 'var(--warning-soft)',   bd: 'rgba(245,158,11,0.20)' },
    danger:  { color: '#f87171',            bg: 'var(--danger-soft)',    bd: 'rgba(239,68,68,0.20)' },
    violet:  { color: 'var(--violet-400)',  bg: 'rgba(168,85,247,0.12)', bd: 'rgba(168,85,247,0.20)' },
    neutral: { color: 'var(--text-muted)',  bg: 'rgba(255,255,255,0.05)',bd: 'var(--border)' },
  };
  const t = tones[tone] || tones.brand;
  const pad = size === 'sm' ? '2px 8px' : '3px 10px';
  const fs = size === 'sm' ? '0.6875rem' : 'var(--text-xs)';

  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5,
        padding: pad,
        fontFamily: 'var(--font-sans)', fontSize: fs,
        fontWeight: 'var(--weight-semibold)', lineHeight: 1.4,
        color: t.color, background: t.bg,
        border: `1px solid ${t.bd}`,
        borderRadius: 'var(--radius-full)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: t.color, boxShadow: `0 0 6px ${t.color}` }} />}
      {Icon && <Icon size={12} strokeWidth={2.4} />}
      {children}
    </span>
  );
}
