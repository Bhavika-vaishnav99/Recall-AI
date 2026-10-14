'use client';

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  delayMs?: number;
  children: React.ReactElement;
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = 'bottom',
  delayMs = 120,
  children,
  className = '',
}) => {
  const [visible, setVisible] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState<{ top: number; left: number; flippedPos: string }>({
    top: 0,
    left: 0,
    flippedPos: position,
  });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    let targetPos = position;
    let top = 0;
    let left = 0;

    if (targetPos === 'bottom') {
      top = rect.bottom + 6;
      left = rect.left;
      if (top + 50 > viewportHeight) {
        targetPos = 'top';
        top = rect.top - 6;
      }
    } else if (targetPos === 'top') {
      top = rect.top - 6;
      left = rect.left;
      if (top < 50) {
        targetPos = 'bottom';
        top = rect.bottom + 6;
      }
    } else if (targetPos === 'left') {
      top = rect.top;
      left = rect.left - 6;
      if (left < 160) {
        targetPos = 'right';
        left = rect.right + 6;
      }
    } else if (targetPos === 'right') {
      top = rect.top;
      left = rect.right + 6;
      if (left + 220 > viewportWidth) {
        targetPos = 'left';
        left = rect.left - 6;
      }
    }

    // Prevent horizontal overflow beyond viewport edges
    const margin = 12;
    if (left < margin) left = margin;
    if (left + 220 > viewportWidth - margin) {
      left = Math.max(margin, viewportWidth - 230);
    }

    setCoords({ top, left, flippedPos: targetPos });
  };

  const handleMouseEnter = () => {
    updatePosition();
    timerRef.current = setTimeout(() => {
      updatePosition();
      setVisible(true);
    }, delayMs);
  };

  const handleMouseLeave = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => {
    if (visible) {
      window.addEventListener('scroll', updatePosition, true);
      window.addEventListener('resize', updatePosition);
      return () => {
        window.removeEventListener('scroll', updatePosition, true);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [visible]);

  if (!content) return children;

  return (
    <>
      <div
        ref={triggerRef}
        className={`inline-flex items-center ${className}`}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleMouseEnter}
        onBlur={handleMouseLeave}
      >
        {children}
      </div>

      {visible && mounted && createPortal(
        <div
          style={{
            position: 'fixed',
            top: `${coords.top}px`,
            left: `${coords.left}px`,
            transform: coords.flippedPos === 'top' ? 'translateY(-100%)' : 'none',
          }}
          className="z-[99999] pointer-events-none animate-fadeIn"
        >
          <div className="bg-[#e3e3e3] text-[#1f1f1f] text-[12px] leading-snug font-normal px-3.5 py-2 rounded-2xl shadow-lg shadow-black/25 max-w-[180px] text-left shrink-0 select-none">
            {content}
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
