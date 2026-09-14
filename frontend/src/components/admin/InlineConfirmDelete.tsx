import React, { useState, useEffect, useRef } from 'react';

interface Props {
  onConfirm: () => void;
  title?: string;
  className?: string;
  style?: React.CSSProperties;
  children?: React.ReactNode;
}

export const InlineConfirmDelete: React.FC<Props> = ({ 
  onConfirm, 
  title = 'Xóa', 
  className = 'btn btn-icon btn-danger-ghost', 
  style,
  children
}) => {
  const [confirming, setConfirming] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (confirming) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setConfirming(false);
      onConfirm();
    } else {
      setConfirming(true);
      timeoutRef.current = setTimeout(() => {
        setConfirming(false);
      }, 3000);
    }
  };

  if (confirming) {
    return (
      <button 
        type="button"
        className={`${className} btn-danger`} 
        style={{ ...style, background: '#ef4444', color: '#fff', borderColor: '#ef4444' }}
        onClick={handleClick}
        title="Bấm lần nữa để xác nhận xóa"
      >
        {React.createElement('ion-icon', { name: 'checkmark-outline' })}
      </button>
    );
  }

  return (
    <button 
      type="button"
      className={className} 
      style={style}
      onClick={handleClick}
      title={title}
    >
      {children || React.createElement('ion-icon', { name: 'trash-outline' })}
    </button>
  );
};
