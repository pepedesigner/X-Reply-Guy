import React from 'react';

interface BrowserMockupProps {
  children: React.ReactNode;
  extensionActive?: boolean;
}

export const BrowserMockup: React.FC<BrowserMockupProps> = ({
  children,
  extensionActive = false,
}) => {
  return (
    <div
      style={{
        flex: 1,
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#000000',
        color: '#e7e9ea',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Chrome Browser Navigation Bar */}
      <div
        style={{
          height: 44,
          backgroundColor: '#16181c',
          borderBottom: '1px solid #2f3336',
          display: 'flex',
          alignItems: 'center',
          padding: '0 16px',
          gap: 12,
          userSelect: 'none',
          zIndex: 40,
        }}
      >
        {/* Mac Window Dots */}
        <div style={{ display: 'flex', gap: 6, marginRight: 6 }}>
          <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#ff5f56' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#ffbd2e' }} />
          <div style={{ width: 11, height: 11, borderRadius: '50%', backgroundColor: '#27c93f' }} />
        </div>

        {/* Back / Forward / Reload icons */}
        <div style={{ display: 'flex', gap: 10, color: '#71767b', fontSize: 13 }}>
          <span>←</span>
          <span>→</span>
          <span>↻</span>
        </div>

        {/* URL Bar */}
        <div
          style={{
            flex: 1,
            maxWidth: 600,
            height: 28,
            backgroundColor: '#202327',
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            padding: '0 12px',
            gap: 8,
            fontSize: 12,
            color: '#71767b',
            border: '1px solid #2f3336',
          }}
        >
          <span style={{ color: '#00ba7c' }}>🔒</span>
          <span style={{ color: '#e7e9ea', fontWeight: 500 }}>x.com</span>
          <span style={{ color: '#71767b' }}>/alex_builder/status/1895029</span>
        </div>

        {/* Extension Toolbar on right */}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
          {/* X Reply Guy Toolbar Extension Icon */}
          <div
            id="extension-icon-btn"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '4px 10px',
              backgroundColor: extensionActive ? '#1d9bf0' : '#202327',
              border: extensionActive ? '1px solid #38bdf8' : '1px solid #2f3336',
              borderRadius: 14,
              cursor: 'pointer',
              boxShadow: extensionActive ? '0 0 12px rgba(29,155,240,0.6)' : 'none',
              transition: 'all 0.2s ease',
            }}
          >
            <span style={{ fontSize: 13 }}>⚡</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#fff' }}>Reply Guy</span>
          </div>

          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: '50%',
              backgroundColor: '#333639',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
            }}
          >
            👤
          </div>
        </div>
      </div>

      {/* Main Page Content Area (Twitter / X interface) */}
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          overflow: 'hidden',
          backgroundColor: '#000000',
        }}
      >
        {children}
      </div>
    </div>
  );
};
