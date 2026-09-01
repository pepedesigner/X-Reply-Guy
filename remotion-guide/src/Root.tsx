import React from 'react';
import { Composition } from 'remotion';
import { GuideVideo } from './GuideVideo';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="StepByStepGuide"
      component={GuideVideo}
      durationInFrames={450}
      fps={30}
      width={1280}
      height={720}
    />
  );
};
