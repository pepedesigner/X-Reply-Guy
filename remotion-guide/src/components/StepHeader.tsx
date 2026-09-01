import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { StepInfo } from '../types';

interface StepHeaderProps {
  currentStep: StepInfo;
  totalSteps: number;
  progress: number; // 0 to 1
}

export const StepHeader: React.FC<StepHeaderProps> = ({
  currentStep,
  totalSteps,
  progress,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const badgeSpring = spring({
    frame: frame % 90,
    fps,
    config: { damping: 14, stiffness: 120 },
  });

  return (
    <div
      style={{
        width: '100%',
        padding: '16px 28px 12px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'linear-gradient(180deg, rgba(15,23,42,0.95) 0%, rgba(15,23,42,0.85) 100%)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        zIndex: 50,
      }}
    >
      {/* Left: Brand + Current Step Tag */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'linear-gradient(135deg, #1d9bf0 0%, #38bdf8 100%)',
            padding: '6px 14px',
            borderRadius: 8,
            boxShadow: '0 0 20px rgba(56, 189, 248, 0.4)',
          }}
        >
          <span style={{ fontSize: 16 }}>⚡</span>
          <span style={{ fontWeight: 800, fontSize: 14, color: '#fff', letterSpacing: '-0.02em' }}>
            X Reply Guy
          </span>
        </div>

        {/* Step Badge */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.12)',
            padding: '5px 12px',
            borderRadius: 6,
            transform: `scale(${interpolate(badgeSpring, [0, 1], [0.95, 1])})`,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              backgroundColor: currentStep.color,
              boxShadow: `0 0 10px ${currentStep.color}`,
            }}
          />
          <span style={{ color: '#94a3b8', fontSize: 12, fontWeight: 700 }}>
            STEP {currentStep.stepNumber} / {totalSteps}
          </span>
          <span style={{ color: '#e2e8f0', fontSize: 13, fontWeight: 700 }}>
            {currentStep.title}
          </span>
        </div>
      </div>

      {/* Right: Subtitle description & Mini step pill bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{ color: '#94a3b8', fontSize: 13, fontWeight: 500 }}>
          {currentStep.subtitle}
        </div>

        {/* 5 Step Progress Dots */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {Array.from({ length: totalSteps }).map((_, idx) => {
            const stepNum = idx + 1;
            const isActive = stepNum === currentStep.stepNumber;
            const isDone = stepNum < currentStep.stepNumber;
            return (
              <div
                key={idx}
                style={{
                  width: isActive ? 24 : 8,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: isActive
                    ? currentStep.color
                    : isDone
                    ? '#38bdf8'
                    : 'rgba(255,255,255,0.15)',
                  transition: 'all 0.3s ease',
                  boxShadow: isActive ? `0 0 8px ${currentStep.color}` : 'none',
                }}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};
