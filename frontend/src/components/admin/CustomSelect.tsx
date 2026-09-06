import React, { useState, useRef, useEffect } from 'react';

export function CustomSelect({ value, onChange, options, placeholder = "Chọn...", maxHeight = "250px" }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // options format: 
  // [
  //   { type: 'group', label: 'Nhóm 1', items: [{value: '1', label: 'A'}] },
  //   { type: 'option', value: '2', label: 'B' }
  // ]

  const getDisplayValue = () => {
    if (!value) return placeholder;
    for (const opt of options) {
      if (opt.type === 'option' && opt.value == value) return opt.label;
      if (opt.type === 'group') {
        const found = opt.items.find((i: any) => i.value == value);
        if (found) return found.label;
      }
    }
    return placeholder;
  };

  return (
    <div ref={ref} style={{ position: 'relative', width: '100%', flex: 1 }}>
      <div 
        className="input" 
        onClick={() => setIsOpen(!isOpen)} 
        style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', userSelect: 'none' }}
      >
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{getDisplayValue()}</span>
        {React.createElement('ion-icon', { name: isOpen ? 'chevron-up' : 'chevron-down' })}
      </div>
      
      {isOpen && (
        <div style={{ 
          position: 'absolute', top: '100%', left: 0, width: '100%', maxHeight, overflowY: 'auto', 
          background: 'var(--sidebar-bg)', border: '1px solid var(--border)', zIndex: 9999, 
          borderRadius: '8px', marginTop: '4px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
          display: 'flex', flexDirection: 'column', padding: '0.25rem 0'
        }}>
          <div 
            onClick={() => { onChange(''); setIsOpen(false); }}
            style={{ padding: '8px 12px', cursor: 'pointer', color: 'var(--text-muted)', fontSize: '0.9rem' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {placeholder}
          </div>
          
          {options.map((opt: any, i: number) => {
            if (opt.type === 'option') {
              return (
                <div 
                  key={i}
                  onClick={() => { onChange(opt.value); setIsOpen(false); }}
                  style={{ 
                    padding: '8px 12px', cursor: 'pointer', fontSize: '0.9rem',
                    color: value == opt.value ? 'var(--accent)' : 'var(--text)',
                    background: value == opt.value ? 'rgba(134, 59, 255, 0.1)' : 'transparent'
                  }}
                  onMouseEnter={e => { if (value != opt.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                  onMouseLeave={e => { if (value != opt.value) e.currentTarget.style.background = 'transparent'; }}
                >
                  {opt.label}
                </div>
              );
            }
            if (opt.type === 'group') {
              return (
                <div key={i}>
                  <div style={{ padding: '8px 12px 4px 12px', fontSize: '0.75rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.5px' }}>
                    {opt.label}
                  </div>
                  {opt.items.map((item: any, j: number) => (
                    <div 
                      key={`${i}-${j}`}
                      onClick={() => { onChange(item.value); setIsOpen(false); }}
                      style={{ 
                        padding: '8px 12px 8px 24px', cursor: 'pointer', fontSize: '0.9rem',
                        color: item.color || (value == item.value ? 'var(--accent)' : 'var(--text)'),
                        fontWeight: item.fontWeight || (value == item.value ? 600 : 400),
                        background: value == item.value ? 'rgba(134, 59, 255, 0.1)' : 'transparent'
                      }}
                      onMouseEnter={e => { if (value != item.value) e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; }}
                      onMouseLeave={e => { if (value != item.value) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {item.icon && <span style={{marginRight: '6px'}}>{React.createElement('ion-icon', { name: item.icon })}</span>}
                      {item.label}
                    </div>
                  ))}
                </div>
              );
            }
            return null;
          })}
        </div>
      )}
    </div>
  );
}