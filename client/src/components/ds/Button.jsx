import React from 'react';

export function Button({ children, variant = 'primary', size = 'md', icon: Icon, iconRight: IconRight, disabled = false, fullWidth = false, type = 'button', onClick, style, ...rest }) {
  const sizes = {
    sm: { padding: '0.375rem 0.75rem', fontSize: '0.8125rem', gap: '0.375rem', icon: 15 },
    md: { padding: '0.625rem 1.25rem', fontSize: '0.875rem', gap: '0.5rem', icon: 16 },
    lg: { padding: '0.875rem 1.75rem', fontSize: '1rem', gap: '0.5rem', icon: 18 },
  };
  const s = sizes[size] || sizes.md;
  const variants = {
    primary:   { background: 'var(--brand)', color: 'var(--text-on-brand)', border: '1px solid transparent', boxShadow: 'var(--glow)' },
    secondary: { background: 'rgba(255,255,255,0.10)', color: 'var(--text-strong)', border: '1px solid var(--border-strong)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)' },
    ghost:     { background: 'transparent', color: 'var(--text-muted)', border: '1px solid transparent' },
    danger:    { background: 'var(--danger)', color: '#fff', border: '1px solid transparent' },
  };
  const v = variants[variant] || variants.primary;
  const [hover, setHover] = React.useState(false);
  const [active, setActive] = React.useState(false);
  const hoverStyle = !disabled && hover ? ({
    primary:   { background: 'var(--brand-hover)', boxShadow: 'var(--glow-lg)', transform: active ? 'none' : 'translateY(-1px)' },
    secondary: { background: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.30)' },
    ghost:     { background: 'rgba(255,255,255,0.06)', color: 'var(--text-strong)' },
    danger:    { background: '#f05252' },
  }[variant] || {}) : {};
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      onMouseEnter={() => setHover(true)} onMouseLeave={() => { setHover(false); setActive(false); }}
      onMouseDown={() => setActive(true)} onMouseUp={() => setActive(false)}
      style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: s.gap, padding: s.padding, width: fullWidth ? '100%' : 'auto', fontFamily: 'var(--font-sans)', fontSize: s.fontSize, fontWeight: 600, lineHeight: 1, borderRadius: 'var(--radius-md)', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.5 : 1, transition: 'background 200ms, box-shadow 200ms, transform 200ms, border-color 200ms', whiteSpace: 'nowrap', textDecoration: 'none', ...v, ...hoverStyle, ...style }} {...rest}>
      {Icon && <Icon size={s.icon} strokeWidth={2.2} />}
      {children}
      {IconRight && <IconRight size={s.icon} strokeWidth={2.2} />}
    </button>
  );
}
