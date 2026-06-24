import React from 'react';

/**
 * Primers Store — Avatar
 * Circular user/app avatar with a brand-tinted ring. Falls back to
 * initials. `app` shape uses a rounded square (app-icon style).
 */
export function Avatar({
  src,
  name = '',
  size = 'md',
  shape = 'circle',
  ring = true,
  style,
  ...rest
}) {
  const px = { xs: 28, sm: 36, md: 44, lg: 56, xl: 72 }[size] || 44;
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const radius = shape === 'app' ? 'var(--radius-lg)' : 'var(--radius-full)';

  return (
    <div
      style={{
        width: px, height: px, flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: radius,
        overflow: 'hidden',
        background: src ? 'transparent' : 'linear-gradient(135deg, var(--primer-500), var(--primer-700))',
        border: ring ? '2px solid var(--border-brand)' : '1px solid var(--border)',
        color: '#fff',
        fontFamily: 'var(--font-sans)',
        fontWeight: 'var(--weight-bold)',
        fontSize: px * 0.4,
        boxShadow: shape === 'app' ? 'var(--glow)' : 'none',
        ...style,
      }}
      {...rest}
    >
      {src
        ? <img src={src} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : <span>{initials || '?'}</span>}
    </div>
  );
}
