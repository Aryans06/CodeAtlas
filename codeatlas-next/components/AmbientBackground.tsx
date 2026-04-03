'use client';
import { useEffect, useRef } from 'react';

export default function AmbientBackground() {
  const orbsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orbsRef.current) return;
    const colors = ['rgba(108,92,231,0.18)', 'rgba(0,206,255,0.14)', 'rgba(253,121,168,0.12)'];
    for (let i = 0; i < 5; i++) {
      const orb = document.createElement('div');
      const size = 200 + Math.random() * 300;
      orb.style.cssText = `
        position:absolute;width:${size}px;height:${size}px;border-radius:50%;
        background:${colors[i % colors.length]};filter:blur(${60 + Math.random() * 40}px);
        left:${Math.random() * 100}%;top:${Math.random() * 100}%;
        animation:orbFloat ${12 + Math.random() * 8}s ease-in-out infinite alternate;
        animation-delay:${-Math.random() * 10}s;pointer-events:none;
      `;
      orbsRef.current.appendChild(orb);
    }
  }, []);

  return (
    <div className="ambient-bg" id="ambientBg">
      <div className="ambient-bg__mesh" />
      <div className="ambient-bg__orbs" ref={orbsRef} />
    </div>
  );
}
