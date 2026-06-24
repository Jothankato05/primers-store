import React from 'react';

/**
 * Primers Store — Card
 * The core surface: a #13131a panel with a hairline border. Optional
 * `glass` frosting, `glow` brand border on hover, and `interactive` lift.
 */
export function Card({
  children,
  variant = 'solid',
  interactive = false,
  padding = 'lg',
  style,
  onClick,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);

  const pads = { none: 0, sm: 'var(--space-4)', md: 'var(--space-5)', lg: 'var(--space-6)', xl: 'var(--space-8)' };

  const variants = {
    solid: {
      background: 'var(--surface-card)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-md)',
    },
    glass: {
      background: 'var(--glass-fill)',
      border: '1px solid var(--glass-border)',
      boxShadow: 'var(--shadow-card)',
      backdropFilter: 'blur(var(--blur-glass))',
      WebkitBackdropFilter: 'blur(var(--blur-glass))',
    },
    sunken: {
      background: 'var(--surface-sunken)',
      border: '1px solid var(--border-soft)',
      boxShadow: 'none',
    },
  };
  const v = variants[variant] || variants.solid;

  const hoverStyle = (interactive && hover) ? {
    borderColor: 'var(--border-brand)',
    boxShadow: 'var(--shadow-lg)',
    transform: 'translateY(-2px)',
  } : {};

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        padding: pads[padding],
        borderRadius: 'var(--radius-lg)',
        cursor: interactive ? 'pointer' : 'default',
        transition: 'border-color var(--duration-slow) var(--ease), box-shadow var(--duration-slow) var(--ease), transform var(--duration-slow) var(--ease)',
        ...v,
        ...hoverStyle,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}
