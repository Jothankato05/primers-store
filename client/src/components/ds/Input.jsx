import React from 'react';

/**
 * Primers Store — Input
 * Frosted field with optional leading icon and a brand focus ring.
 */
export function Input({
  icon: Icon,
  type = 'text',
  placeholder,
  value,
  defaultValue,
  label,
  hint,
  error,
  disabled = false,
  fullWidth = true,
  onChange,
  style,
  ...rest
}) {
  const [focus, setFocus] = React.useState(false);

  const field = (
    <div style={{ position: 'relative', width: fullWidth ? '100%' : 'auto' }}>
      {Icon && (
        <Icon
          size={16}
          strokeWidth={2}
          style={{
            position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
            color: focus ? 'var(--brand-text)' : 'var(--text-subtle)',
            transition: 'color var(--duration) var(--ease)', pointerEvents: 'none',
          }}
        />
      )}
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        defaultValue={defaultValue}
        disabled={disabled}
        onChange={onChange}
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
        style={{
          width: '100%',
          height: 'var(--field-height)',
          padding: Icon ? '0 1rem 0 2.375rem' : '0 1rem',
          fontFamily: 'var(--font-sans)',
          fontSize: 'var(--text-sm)',
          color: 'var(--text-strong)',
          background: 'var(--surface-input)',
          border: `1px solid ${error ? 'var(--danger)' : focus ? 'transparent' : 'var(--border-strong)'}`,
          borderRadius: 'var(--radius-md)',
          outline: 'none',
          boxShadow: focus && !error ? '0 0 0 2px var(--primer-500)' : 'none',
          backdropFilter: 'blur(var(--blur-glass))',
          WebkitBackdropFilter: 'blur(var(--blur-glass))',
          opacity: disabled ? 0.5 : 1,
          transition: 'box-shadow var(--duration) var(--ease), border-color var(--duration) var(--ease)',
          ...style,
        }}
        {...rest}
      />
    </div>
  );

  if (!label && !hint && !error) return field;

  return (
    <div style={{ width: fullWidth ? '100%' : 'auto' }}>
      {label && (
        <label style={{
          display: 'block', marginBottom: 6,
          fontFamily: 'var(--font-sans)', fontSize: 'var(--text-sm)',
          fontWeight: 'var(--weight-semibold)', color: 'var(--text-body)',
        }}>{label}</label>
      )}
      {field}
      {(hint || error) && (
        <p style={{
          margin: '6px 0 0', fontFamily: 'var(--font-sans)', fontSize: 'var(--text-xs)',
          color: error ? 'var(--danger)' : 'var(--text-subtle)',
        }}>{error || hint}</p>
      )}
    </div>
  );
}
