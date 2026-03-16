import { useState, useRef, useEffect } from 'react';

interface InfoTooltipProps {
  text: string;
  align?: 'center' | 'left' | 'right';
}

export default function InfoTooltip({ text, align = 'center' }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const wrapRef = useRef<HTMLSpanElement>(null);

  const handleEnter = () => {
    clearTimeout(timerRef.current);
    setShow(true);
  };

  const handleLeave = () => {
    timerRef.current = setTimeout(() => setShow(false), 150);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShow(prev => !prev);
  };

  // Close on outside tap (mobile)
  useEffect(() => {
    if (!show) return;
    const handler = (e: Event) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setShow(false);
      }
    };
    document.addEventListener('pointerdown', handler);
    return () => document.removeEventListener('pointerdown', handler);
  }, [show]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const alignClass = align === 'right' ? 'tooltip-right' : align === 'left' ? 'tooltip-left' : '';

  return (
    <span
      ref={wrapRef}
      className="info-tooltip-wrap"
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
    >
      <button
        type="button"
        className="info-tooltip-btn"
        onClick={handleClick}
        aria-label="More info"
      >
        i
      </button>
      {show && (
        <span className={`info-tooltip-bubble ${alignClass}`}>
          {text}
        </span>
      )}
    </span>
  );
}
