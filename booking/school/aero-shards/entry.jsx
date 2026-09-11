import React from 'react';
import { createRoot } from 'react-dom/client';
import AeroShards from './AeroShards.jsx';
import BlurText from './BlurText.jsx';

const configuration = {
  backgroundColor: '#120F17',
  shardColor: '#896ABD',
  accentColor: '#A855F7',
  placement: 'full',
  flow: 'stream',
  material: 'pearl',
  detail: 'balanced',
  effect: 'none',
  scale: 1,
  spread: 1,
  depth: 1,
  speed: 0.45,
  spin: 1,
  interaction: 'repel',
  density: 1.5,
  shardSize: 1.1,
  stretch: 1,
  turbulence: 1,
  glow: 0,
  edgeSoftness: 2,
  bloom: 0,
  grain: 0,
  chromaticAberration: 0,
  transitionDuration: 1,
  interactionRadius: 1.5,
  interactionStrength: 0.5,
  rippleIntensity: 1,
  holdToGather: true
};

const roots = new WeakMap();

window.mountAeroShards = element => {
  if (!element || roots.has(element)) return;
  const root = createRoot(element);
  roots.set(element, root);
  root.render(
    <AeroShards
      {...configuration}
      className="school-aero-shards"
      onError={error => {
        element.dataset.failed = 'true';
        console.error('AeroShards could not start:', error);
      }}
    />
  );
};

window.mountBookingHeading = (element, text) => {
  if (!element || roots.has(element)) return;
  const root = createRoot(element);
  roots.set(element, root);
  root.render(<BlurText text={text} delay={38} animateBy="letters" direction="top" stepDuration={0.22} className="booking-heading-blur" />);
};
