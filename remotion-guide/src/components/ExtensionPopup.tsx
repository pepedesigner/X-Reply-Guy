import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface ExtensionPopupProps {
  isOpen: boolean;
  selectedStyle?: string | null;
  streamingProgress?: number; // 0 to 1
  selectedFillIndex?: number | null;
  isFillClicked?: boolean;
}

const STYLES = [
  { id: 'value', label: 'Value', emoji: '💡' },
  { id: 'question', label: 'Question', emoji: '❓' },
  { id: 'hot', label: 'Hot take', emoji: '🔥' },
  { id: 'witty', label: 'Witty', emoji: '😏' },
  { id: 'agree', label: 'Relate', emoji: '🤝' },
  { id: 'data', label: 'Data', emoji: '📊' },
];

const CANDIDATES = [
  "Spot on. We found that pairing lightweight local context parsers with low-latency SSE streaming cuts execution latency by 80% compared to monolithic multi-agent chains.",
  "The shift is from prompt engineering to harness engineering. Once the agent has structured tool feedback, even 8B models outperform raw reasoning.",
];

export const ExtensionPopup: React.FC<ExtensionPopupProps> = ({
  isOpen,
  selectedStyle = null,
  streamingProgress = 0,
  selectedFillIndex = null,
  isFillClicked = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  if (!isOpen) return null;

  const popupSpring = spring({
    frame: frame % 120,
    fps,
    config: { damping: 14, stiffness: 140 },
  });

  const translateY = interpolate(popupSpring, [0, 1], [-15, 0]);
  const opacity = interpolate(popupSpring, [0, 1], [0, 1]);
  const scale = interpolate(popupSpring, [0, 1], [0.96, 1]);

  return (
    <div
      id="extension-popup-window"
      style={{
        position: 'absolute',
        top: 44,
        right: 28,
        width: 350,
        backgroundColor: '#ffffff',
        borderRadius: 14,
        boxShadow: '0 20px 60px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.08)',
        overflow: 'hidden',
        zIndex: 100,
        opacity,
        transform: `translateY(${translateY}px) scale(${scale})`,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        color: '#111111',
      }}
    >
      {/* Header */}
      <div
        style={{
          backgroundColor: '#111111',
          color: '#ffffff',
          padding: '10px 12px',
          borderBottom: '1px solid #222222',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ fontSize: 13 }}>⚡</span>
            <span style={{ fontSize: 12.5, fontWeight: 700, letterSpacing: '-0.02em' }}>
              X Reply Guy
            </span>
            <span style={{ fontSize: 10.5, opacity: 0.6, fontWeight: 400 }}>
              — growth replies
            </span>
          </div>
          <div
            style={{
              fontSize: 9.5,
              backgroundColor: '#222222',
              border: '1px solid #333333',
              padding: '2px 6px',
              borderRadius: 4,
              color: '#38bdf8',
              fontWeight: 600,
            }}
          >
            MV3 • SSE
          </div>
        </div>
        <div style={{ fontSize: 10.5, color: '#9ca3af', marginTop: 3 }}>
          Turn any tweet into high-engagement replies
        </div>
      </div>

      {/* Body */}
      <div style={{ padding: '10px 12px' }}>
        {/* Label: Current tweet */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            marginBottom: 5,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span>Current Tweet</span>
          <span style={{ color: '#10b981', fontSize: 9 }}>✓ Auto-Detected</span>
        </div>

        {/* Tweet Context Card */}
        <div
          style={{
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 8,
            padding: '7px 9px',
            fontSize: 11,
            lineHeight: 1.35,
            color: '#334155',
            marginBottom: 8,
          }}
        >
          <div style={{ fontWeight: 600, color: '#0f172a', marginBottom: 2 }}>
            @alex_builder
          </div>
          AI agents are moving way faster than expected. The biggest bottleneck now isn't model intelligence...
        </div>

        {/* Reply Styles */}
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#6b7280',
            marginBottom: 5,
          }}
        >
          Reply Strategy
        </div>

        <div
          id="styles-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 4,
            marginBottom: 8,
          }}
        >
          {STYLES.map((s) => {
            const isSelected = selectedStyle === s.id;
            return (
              <div
                key={s.id}
                id={`style-btn-${s.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  padding: '5px 4px',
                  borderRadius: 6,
                  border: isSelected ? '1.5px solid #111111' : '1px solid #e2e8f0',
                  backgroundColor: isSelected ? '#111111' : '#ffffff',
                  color: isSelected ? '#ffffff' : '#1e293b',
                  fontSize: 10.5,
                  fontWeight: 600,
                  transform: isSelected ? 'scale(1.02)' : 'scale(1)',
                  boxShadow: isSelected ? '0 2px 8px rgba(0,0,0,0.15)' : 'none',
                }}
              >
                <span>{s.emoji}</span>
                <span>{s.label}</span>
              </div>
            );
          })}
        </div>

        {/* Output Area */}
        <div style={{ marginTop: 6 }}>
          {selectedStyle ? (
            <div>
              {/* Streaming loading or candidate list */}
              {streamingProgress < 0.2 ? (
                <div
                  style={{
                    padding: '8px 10px',
                    borderRadius: 8,
                    backgroundColor: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    fontSize: 10.5,
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <span>⚡ Streaming candidates with DeepSeek...</span>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {CANDIDATES.slice(0, streamingProgress > 0.6 ? 2 : 1).map((cand, idx) => {
                    const isCandidateSelected = selectedFillIndex === idx;
                    const isFilled = isCandidateSelected && isFillClicked;

                    return (
                      <div
                        key={idx}
                        id={`reply-candidate-${idx}`}
                        style={{
                          backgroundColor: isCandidateSelected ? '#f0f9ff' : '#ffffff',
                          border: isCandidateSelected
                            ? '1.5px solid #0284c7'
                            : '1px solid #e2e8f0',
                          borderRadius: 8,
                          padding: '7px 9px',
                          boxShadow: isCandidateSelected
                            ? '0 4px 12px rgba(2, 132, 199, 0.12)'
                            : '0 1px 2px rgba(0,0,0,0.03)',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 10.5,
                            lineHeight: 1.35,
                            color: '#1e293b',
                            marginBottom: 5,
                          }}
                        >
                          {cand}
                        </div>

                        {/* Action buttons */}
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            style={{
                              flex: 1,
                              padding: '3px 6px',
                              borderRadius: 5,
                              border: '1px solid #e2e8f0',
                              backgroundColor: '#ffffff',
                              color: '#475569',
                              fontSize: 9.5,
                              fontWeight: 600,
                              cursor: 'pointer',
                            }}
                          >
                            📋 Copy
                          </button>
                          <button
                            id={`fill-btn-${idx}`}
                            style={{
                              flex: 1.3,
                              padding: '3px 6px',
                              borderRadius: 5,
                              border: '1px solid #111111',
                              backgroundColor: isFilled ? '#10b981' : '#111111',
                              color: '#ffffff',
                              fontSize: 9.5,
                              fontWeight: 700,
                              cursor: 'pointer',
                              transform: isFilled ? 'scale(0.96)' : 'scale(1)',
                              boxShadow: isFilled
                                ? '0 0 10px rgba(16, 185, 129, 0.6)'
                                : 'none',
                            }}
                          >
                            {isFilled ? '✓ Injected!' : '✍️ Fill'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div
              style={{
                textAlign: 'center',
                padding: '8px',
                fontSize: 10.5,
                color: '#94a3b8',
                backgroundColor: '#f8fafc',
                borderRadius: 8,
                border: '1px dashed #cbd5e1',
              }}
            >
              Pick a style to generate reply candidates.
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: '6px 12px',
          borderTop: '1px solid #e2e8f0',
          backgroundColor: '#fafafa',
          fontSize: 9.5,
          color: '#64748b',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>Click <b>Fill</b> to inject into X</span>
        <span style={{ color: '#0284c7', fontWeight: 600 }}>Options ⚙️</span>
      </div>
    </div>
  );
};
