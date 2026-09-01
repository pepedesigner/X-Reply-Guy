import React from 'react';
import { interpolate, useCurrentFrame } from 'remotion';

interface MouseCursorProps {
  x: number;
  y: number;
  isClicking?: boolean;
  clickFrame?: number;
  label?: string;
}

export const MouseCursor: React.FC<MouseCursorProps> = ({
  x,
  y,
  isClicking = false,
  clickFrame,
  label,
}) => {
  const frame = useCurrentFrame();

  // Ripple effect on click
  let rippleScale = 0;
  let rippleOpacity = 0;
  if (clickFrame !== undefined && frame >= clickFrame) {
    const elapsed = frame - clickFrame;
    rippleScale = interpolate(elapsed, [0, 16], [0.8, 2.6], {
      extrapolateRight: 'clamp',
    });
    rippleOpacity = interpolate(elapsed, [0, 16], [0.85, 0], {
      extrapolateRight: 'clamp',
    });
  }

  const clickScale = isClicking ? 0.82 : 1;
  const isNearRightEdge = x > 1050;

  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-2px, -2px) scale(${clickScale})`,
        pointerEvents: 'none',
        zIndex: 9999,
      }}
    >
      {/* Click ripple */}
      {rippleOpacity > 0 && (
        <div
          style={{
            position: 'absolute',
            left: -14,
            top: -14,
            width: 36,
            height: 36,
            borderRadius: '50%',
            backgroundColor: 'rgba(56, 189, 248, 0.45)',
            border: '2px solid #38bdf8',
            transform: `scale(${rippleScale})`,
            opacity: rippleOpacity,
          }}
        />
      )}

      {/* SVG Mouse Pointer */}
      <svg
        width="26"
        height="26"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{
          filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.8)) drop-shadow(0 0 2px rgba(255,255,255,0.6))',
        }}
      >
        <path
          d="M4.5 3L11 20.5L14.2 13.8L21 11L4.5 3Z"
          fill="#ffffff"
          stroke="#090d16"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
      </svg>

      {/* Optional action tag badge next to cursor */}
      {label && (
        <div
          style={{
            position: 'absolute',
            ...(isNearRightEdge ? { right: 14, top: -30 } : { left: 24, top: 8 }),
            background: 'rgba(15, 23, 42, 0.96)',
            border: '1px solid #38bdf8',
            color: '#38bdf8',
            padding: '3px 8px',
            borderRadius: 6,
            fontSize: 11,
            fontWeight: 700,
            whiteSpace: 'nowrap',
            boxShadow: '0 6px 16px rgba(0,0,0,0.6)',
            letterSpacing: '0.02em',
            backdropFilter: 'blur(4px)',
          }}
        >
          {label}
        </div>
      )}
    </div>
  );
};
