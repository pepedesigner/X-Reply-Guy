import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

interface TweetPostProps {
  filledReplyText?: string;
  isReplying?: boolean;
  highlightPost?: boolean;
}

export const TweetPost: React.FC<TweetPostProps> = ({
  filledReplyText,
  isReplying = false,
  highlightPost = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Subtle highlight pulse for Step 1
  const borderPulse = highlightPost
    ? interpolate(Math.sin((frame / 15) * Math.PI), [-1, 1], [0.3, 0.9])
    : 0;

  return (
    <div
      style={{
        width: '100%',
        maxWidth: 620,
        margin: '18px auto 0 auto',
        padding: '0 16px',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Tweet Card */}
      <div
        style={{
          backgroundColor: '#000000',
          border: highlightPost
            ? `1.5px solid rgba(56, 189, 248, ${borderPulse})`
            : '1px solid #2f3336',
          borderRadius: 16,
          padding: 20,
          boxShadow: highlightPost
            ? '0 8px 32px rgba(56, 189, 248, 0.15)'
            : '0 4px 20px rgba(0,0,0,0.4)',
          transition: 'border 0.2s ease',
        }}
      >
        {/* Author Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
          {/* Avatar */}
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
            }}
          >
            🚀
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontWeight: 750, fontSize: 15, color: '#e7e9ea' }}>
                Alex Rivera
              </span>
              <span style={{ color: '#1d9bf0', fontSize: 13 }}>✓</span>
              <span style={{ color: '#71767b', fontSize: 14 }}>@alex_builder</span>
              <span style={{ color: '#71767b', fontSize: 13 }}>· 2h</span>
            </div>
            <div style={{ color: '#71767b', fontSize: 12 }}>Founder & AI Engineer</div>
          </div>
        </div>

        {/* Tweet Body Content */}
        <div
          style={{
            fontSize: 15.5,
            lineHeight: 1.5,
            color: '#e7e9ea',
            marginBottom: 16,
            fontWeight: 400,
          }}
        >
          AI agents are moving way faster than expected. The biggest bottleneck now isn't model intelligence — it's <span style={{ color: '#38bdf8' }}>context</span>, <span style={{ color: '#38bdf8' }}>tooling</span>, and workflow speed.
          <br /><br />
          What does your daily engineering stack look like this week?
        </div>

        {/* Tweet Timestamp & Engagement Meta */}
        <div
          style={{
            display: 'flex',
            gap: 16,
            padding: '12px 0',
            borderTop: '1px solid #2f3336',
            borderBottom: '1px solid #2f3336',
            fontSize: 13,
            color: '#71767b',
          }}
        >
          <span><b style={{ color: '#e7e9ea' }}>184</b> Reposts</span>
          <span><b style={{ color: '#e7e9ea' }}>1,290</b> Likes</span>
          <span><b style={{ color: '#e7e9ea' }}>45.2K</b> Views</span>
        </div>

        {/* Action icons */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            paddingTop: 12,
            color: '#71767b',
            fontSize: 14,
          }}
        >
          <span>💬 42</span>
          <span>🔁 184</span>
          <span>❤️ 1.2K</span>
          <span>🔖 95</span>
          <span>📤</span>
        </div>
      </div>

      {/* Reply Composer Box below the tweet */}
      <div
        id="reply-composer-area"
        style={{
          marginTop: 14,
          backgroundColor: '#0a0c10',
          border: filledReplyText ? '1.5px solid #1d9bf0' : '1px solid #2f3336',
          borderRadius: 14,
          padding: 14,
          boxShadow: filledReplyText ? '0 0 24px rgba(29,155,240,0.25)' : 'none',
          transition: 'all 0.3s ease',
        }}
      >
        <div style={{ display: 'flex', gap: 12 }}>
          {/* User Avatar */}
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 16,
              flexShrink: 0,
            }}
          >
            ⚡
          </div>

          <div style={{ flex: 1 }}>
            {/* Reply Text input or placeholder */}
            <div
              style={{
                minHeight: 48,
                fontSize: 14,
                lineHeight: 1.5,
                color: filledReplyText ? '#e7e9ea' : '#71767b',
                whiteSpace: 'pre-wrap',
                fontWeight: filledReplyText ? 500 : 400,
              }}
            >
              {filledReplyText ? (
                <span>
                  {filledReplyText}
                  <span
                    style={{
                      display: 'inline-block',
                      width: 2,
                      height: 15,
                      backgroundColor: '#1d9bf0',
                      marginLeft: 2,
                      animation: 'blink 1s infinite',
                    }}
                  />
                </span>
              ) : (
                'Post your reply...'
              )}
            </div>

            {/* Composer Footer Actions */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginTop: 10,
                paddingTop: 10,
                borderTop: '1px solid #202327',
              }}
            >
              <div style={{ display: 'flex', gap: 10, color: '#1d9bf0', fontSize: 15 }}>
                <span>🖼️</span>
                <span>📊</span>
                <span>😊</span>
                <span>📍</span>
              </div>

              {/* Native Reply Button */}
              <button
                style={{
                  backgroundColor: filledReplyText ? '#1d9bf0' : '#1e3a5f',
                  color: filledReplyText ? '#ffffff' : '#8899a6',
                  border: 'none',
                  borderRadius: 20,
                  padding: '7px 18px',
                  fontWeight: 750,
                  fontSize: 13,
                  cursor: filledReplyText ? 'pointer' : 'default',
                  boxShadow: filledReplyText
                    ? '0 0 16px rgba(29,155,240,0.5)'
                    : 'none',
                  transform: filledReplyText ? 'scale(1.05)' : 'scale(1)',
                  transition: 'all 0.2s ease',
                }}
              >
                Reply
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
