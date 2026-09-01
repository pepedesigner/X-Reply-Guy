import React from 'react';
import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';
import { BrowserMockup } from './components/BrowserMockup';
import { ExtensionPopup } from './components/ExtensionPopup';
import { MouseCursor } from './components/MouseCursor';
import { StepHeader } from './components/StepHeader';
import { TweetPost } from './components/TweetPost';
import { StepInfo } from './types';

const STEPS: StepInfo[] = [
  {
    stepNumber: 1,
    title: 'Locate Post on X',
    subtitle: 'Browse your timeline or post detail page',
    tag: 'Step 1: Locate',
    color: '#38bdf8',
  },
  {
    stepNumber: 2,
    title: 'Instant Context Extraction',
    subtitle: '1-Click trigger parses tweet author & body',
    tag: 'Step 2: Parse',
    color: '#10b981',
  },
  {
    stepNumber: 3,
    title: 'Choose Reply Strategy',
    subtitle: '10 battle-tested engagement personas',
    tag: 'Step 3: Strategy',
    color: '#f59e0b',
  },
  {
    stepNumber: 4,
    title: 'Fast SSE Streaming',
    subtitle: 'Real-time LLM generates high-impact replies',
    tag: 'Step 4: Stream',
    color: '#8b5cf6',
  },
  {
    stepNumber: 5,
    title: '1-Click Fill & Publish',
    subtitle: 'Injects directly into X composer with zero typing',
    tag: 'Step 5: Fill & Post',
    color: '#ec4899',
  },
];

const TARGET_REPLY =
  'Spot on. We found that pairing lightweight local context parsers with low-latency SSE streaming cuts execution latency by 80% compared to monolithic multi-agent chains.';

export const GuideVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();

  // Determine current step based on frame
  let currentStepIndex = 0;
  if (frame >= 345) {
    currentStepIndex = 4;
  } else if (frame >= 255) {
    currentStepIndex = 3;
  } else if (frame >= 170) {
    currentStepIndex = 2;
  } else if (frame >= 85) {
    currentStepIndex = 1;
  } else {
    currentStepIndex = 0;
  }

  const currentStep = STEPS[currentStepIndex];
  const progress = frame / durationInFrames;

  let cursorX = 500;
  let cursorY = 400;
  let isClicking = false;
  let clickFrame: number | undefined = undefined;
  let cursorLabel: string | undefined = undefined;

  if (frame < 85) {
    // Step 1: Browse & locate
    cursorX = interpolate(frame, [0, 50], [500, 640], { extrapolateRight: 'clamp' });
    cursorY = interpolate(frame, [0, 50], [450, 270], { extrapolateRight: 'clamp' });
    cursorLabel = frame > 30 ? 'Reading tweet' : undefined;
  } else if (frame < 170) {
    // Step 2: Trigger Extension
    cursorX = interpolate(frame, [85, 110], [640, 1210], { extrapolateRight: 'clamp' });
    cursorY = interpolate(frame, [85, 110], [270, 78], { extrapolateRight: 'clamp' });
    if (frame >= 108 && frame <= 116) {
      isClicking = true;
      clickFrame = 110;
      cursorLabel = 'Click Extension';
    }
  } else if (frame < 255) {
    // Step 3: Choose strategy "Value" at (985, 390)
    cursorX = interpolate(frame, [170, 200], [1210, 985], { extrapolateRight: 'clamp' });
    cursorY = interpolate(frame, [170, 200], [78, 390], { extrapolateRight: 'clamp' });
    if (frame >= 198 && frame <= 206) {
      isClicking = true;
      clickFrame = 200;
      cursorLabel = 'Select "Value"';
    }
  } else if (frame < 345) {
    // Step 4: Streaming candidates, move to Fill button at (1215, 555)
    cursorX = interpolate(frame, [255, 305], [985, 1215], { extrapolateRight: 'clamp' });
    cursorY = interpolate(frame, [255, 305], [390, 555], { extrapolateRight: 'clamp' });
    cursorLabel = frame > 295 ? 'Pick Candidate #1' : 'Streaming SSE...';
  } else {
    // Step 5: 1-Click Fill & Publish
    if (frame <= 370) {
      cursorX = 1215;
      cursorY = 555;
      if (frame >= 358 && frame <= 366) {
        isClicking = true;
        clickFrame = 360;
        cursorLabel = '1-Click Fill!';
      }
    } else {
      cursorX = interpolate(frame, [370, 400], [1215, 890], { extrapolateRight: 'clamp' });
      cursorY = interpolate(frame, [370, 400], [555, 640], { extrapolateRight: 'clamp' });
      cursorLabel = 'Ready to Post!';
    }
  }

  // Extension popup state
  const isPopupOpen = frame >= 110 && frame <= 375;
  const isExtensionActive = frame >= 110 && frame <= 375;
  const selectedStyle = frame >= 200 ? 'value' : null;

  // Streaming progress inside popup
  const streamingProgress =
    frame >= 200
      ? interpolate(frame, [200, 270], [0, 1], { extrapolateRight: 'clamp' })
      : 0;

  const isFillClicked = frame >= 360;
  const selectedFillIndex = frame >= 340 ? 0 : null;

  // Composer reply text filled
  let filledReplyText: string | undefined = undefined;
  if (frame >= 365) {
    const charsToShow = Math.floor(
      interpolate(frame, [365, 390], [0, TARGET_REPLY.length], {
        extrapolateRight: 'clamp',
      })
    );
    filledReplyText = TARGET_REPLY.slice(0, charsToShow);
  }

  // Global Fade in at start and fade out at end for seamless looping
  const fadeIn = interpolate(frame, [0, 12], [0, 1], { extrapolateRight: 'clamp' });
  const fadeOut = interpolate(frame, [438, 450], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const globalOpacity = fadeIn * fadeOut;

  // Success celebration banner spring
  const successSpring = spring({
    frame: frame - 370,
    fps,
    config: { damping: 12, stiffness: 120 },
  });

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: '#0a0f1d',
        opacity: globalOpacity,
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Top Step Header */}
      <StepHeader
        currentStep={currentStep}
        totalSteps={STEPS.length}
        progress={progress}
      />

      {/* Main Browser Canvas */}
      <BrowserMockup extensionActive={isExtensionActive}>
        <TweetPost
          highlightPost={frame >= 20 && frame <= 85}
          filledReplyText={filledReplyText}
          isReplying={frame >= 365}
        />

        {/* Extension Popup overlay */}
        <ExtensionPopup
          isOpen={isPopupOpen}
          selectedStyle={selectedStyle}
          streamingProgress={streamingProgress}
          selectedFillIndex={selectedFillIndex}
          isFillClicked={isFillClicked}
        />

        {/* Success Banner on Step 5 */}
        {frame >= 370 && (
          <div
            style={{
              position: 'absolute',
              bottom: 34,
              left: '50%',
              transform: `translateX(-50%) translateY(${interpolate(
                successSpring,
                [0, 1],
                [30, 0]
              )}px) scale(${interpolate(successSpring, [0, 1], [0.9, 1])})`,
              backgroundColor: 'rgba(16, 185, 129, 0.95)',
              border: '1px solid #34d399',
              borderRadius: 30,
              padding: '10px 24px',
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              boxShadow: '0 10px 30px rgba(16, 185, 129, 0.4)',
              backdropFilter: 'blur(8px)',
              zIndex: 80,
            }}
          >
            <span style={{ fontSize: 18 }}>🎉</span>
            <span style={{ color: '#ffffff', fontWeight: 750, fontSize: 14 }}>
              Auto-Injected! Native Reply Button Ready
            </span>
          </div>
        )}

        {/* Animated Mouse Cursor */}
        <MouseCursor
          x={cursorX}
          y={cursorY}
          isClicking={isClicking}
          clickFrame={clickFrame}
          label={cursorLabel}
        />
      </BrowserMockup>
    </div>
  );
};
