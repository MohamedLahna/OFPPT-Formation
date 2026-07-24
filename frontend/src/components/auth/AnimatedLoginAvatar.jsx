import { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

export default function AnimatedLoginAvatar({
  emailValue = '',
  emailFocused = false,
  passwordFocused = false,
  showPassword = false,
}) {
  const eyesLayerRef = useRef(null);
  const leftPupilRef = useRef(null);
  const rightPupilRef = useRef(null);
  const neutralMouthRef = useRef(null);
  const smileMouthRef = useRef(null);
  const leftCoverRef = useRef(null);
  const rightCoverRef = useRef(null);
  const leftFingersRef = useRef(null);
  const rightFingersRef = useRef(null);
  useLayoutEffect(() => {
    gsap.set(eyesLayerRef.current, { autoAlpha: 1 });
    gsap.set([leftCoverRef.current, rightCoverRef.current], {
      y: 42,
      autoAlpha: 0,
      x: 0,
      rotation: 0,
    });
    gsap.set([leftFingersRef.current, rightFingersRef.current], {
      scaleY: 0.88,
      y: 0,
      transformOrigin: '50% 100%',
    });
  }, []);

  useEffect(() => {
    if (passwordFocused) {
      const peek = showPassword;

      gsap.to(eyesLayerRef.current, {
        autoAlpha: peek ? 0.48 : 0,
        duration: 0.14,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      gsap.to([leftCoverRef.current, rightCoverRef.current], {
        y: 0,
        autoAlpha: 1,
        duration: 0.38,
        ease: 'power3.out',
        overwrite: 'auto',
      });
      gsap.to(leftCoverRef.current, {
        x: peek ? -8 : 0,
        y: peek ? -1.2 : 0,
        rotation: peek ? -5 : 0,
        transformOrigin: '84px 78px',
        duration: 0.28,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      gsap.to(rightCoverRef.current, {
        x: peek ? 8 : 0,
        y: peek ? -1.2 : 0,
        rotation: peek ? 5 : 0,
        transformOrigin: '136px 78px',
        duration: 0.28,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      gsap.to([leftFingersRef.current, rightFingersRef.current], {
        scaleY: peek ? 0.58 : 0.88,
        y: peek ? -2 : 0,
        duration: 0.24,
        ease: 'power2.out',
        overwrite: 'auto',
      });
      return;
    }

    gsap.to(eyesLayerRef.current, {
      autoAlpha: 1,
      duration: 0.2,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to([leftCoverRef.current, rightCoverRef.current], {
      y: 42,
      autoAlpha: 0,
      duration: 0.45,
      ease: 'power3.inOut',
      overwrite: 'auto',
    });
    gsap.to([leftCoverRef.current, rightCoverRef.current], {
      x: 0,
      rotation: 0,
      duration: 0.3,
      ease: 'power2.out',
      overwrite: 'auto',
    });
    gsap.to([leftFingersRef.current, rightFingersRef.current], {
      scaleY: 0.9,
      y: 0,
      duration: 0.24,
      ease: 'power2.out',
      overwrite: 'auto',
    });
  }, [passwordFocused, showPassword]);

  useEffect(() => {
    if (passwordFocused) return;

    const text = String(emailValue || '');
    const len = text.length;
    const hasAt = text.includes('@');

    const targetX = emailFocused
      ? clamp((len - 9) * 0.08 + (hasAt ? 0.35 : 0), -1.4, 1.4)
      : 0;
    const targetY = emailFocused ? (hasAt ? -0.1 : 0.25) : 0;

    gsap.to([leftPupilRef.current, rightPupilRef.current], {
      x: targetX,
      y: targetY,
      duration: 0.22,
      ease: 'power2.out',
      overwrite: 'auto',
    });

    const smiling = hasAt;
    gsap.to(neutralMouthRef.current, {
      opacity: smiling ? 0 : 1,
      duration: 0.2,
      overwrite: 'auto',
    });
    gsap.to(smileMouthRef.current, {
      opacity: smiling ? 1 : 0,
      duration: 0.2,
      overwrite: 'auto',
    });
  }, [emailValue, emailFocused, passwordFocused]);

  return (
    <div className="animated-login-avatar" aria-hidden="true">
      <div className="animated-login-avatar-ring">
        <svg className="animated-login-avatar-svg" viewBox="0 0 220 190" role="presentation">
          <defs>
            <linearGradient id="loginAvatarAura" x1="30" y1="24" x2="190" y2="166" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#38d6ff" />
              <stop offset="52%" stopColor="#8b5cf6" />
              <stop offset="100%" stopColor="#c6a8ff" />
            </linearGradient>
            <linearGradient id="loginAvatarSkin" x1="82" y1="44" x2="144" y2="148" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#f2f4ff" />
              <stop offset="100%" stopColor="#d2d8f3" />
            </linearGradient>
            <linearGradient id="loginAvatarHand" x1="58" y1="74" x2="162" y2="148" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#eef2ff" />
              <stop offset="100%" stopColor="#c5ceed" />
            </linearGradient>
            <filter id="loginAvatarGlow" x="-70%" y="-70%" width="240%" height="240%">
              <feGaussianBlur stdDeviation="7" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          <circle cx="110" cy="94" r="73" fill="#0b1126" opacity="0.72" />
          <circle
            cx="110"
            cy="94"
            r="71"
            fill="none"
            stroke="url(#loginAvatarAura)"
            strokeWidth="4.6"
            opacity="0.96"
            filter="url(#loginAvatarGlow)"
          />

          <circle cx="110" cy="96" r="56" fill="url(#loginAvatarSkin)" />
          <path d="M82 79C87 76 93 75 99 76" fill="none" stroke="#8f97c2" strokeWidth="3" strokeLinecap="round" />
          <path d="M121 76C127 75 133 76 138 79" fill="none" stroke="#8f97c2" strokeWidth="3" strokeLinecap="round" />

          <g ref={eyesLayerRef}>
            <g style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <ellipse cx="91" cy="95" rx="11.5" ry="7.2" fill="#eef2ff" />
              <circle ref={leftPupilRef} cx="91" cy="95" r="3.9" fill="#2a2352" />
            </g>

            <g style={{ transformBox: 'fill-box', transformOrigin: 'center' }}>
              <ellipse cx="129" cy="95" rx="11.5" ry="7.2" fill="#eef2ff" />
              <circle ref={rightPupilRef} cx="129" cy="95" r="3.9" fill="#2a2352" />
            </g>
          </g>

          <path
            ref={neutralMouthRef}
            d="M98 122H122"
            fill="none"
            stroke="#46376f"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="1"
          />
          <path
            ref={smileMouthRef}
            d="M96 121C102 126 118 126 124 121"
            fill="none"
            stroke="#46376f"
            strokeWidth="3.5"
            strokeLinecap="round"
            opacity="0"
          />

          <path d="M62 141C64 125 70 114 79 108" fill="none" stroke="#d7ddf6" strokeWidth="10.5" strokeLinecap="round" opacity="0.46" />
          <path d="M158 141C156 125 150 114 141 108" fill="none" stroke="#d7ddf6" strokeWidth="10.5" strokeLinecap="round" opacity="0.46" />

          <g ref={leftCoverRef}>
            <path d="M62 141C54 116 63 92 83 75" fill="none" stroke="url(#loginAvatarHand)" strokeWidth="13.4" strokeLinecap="round" />
            <ellipse cx="87" cy="79" rx="20" ry="14.2" fill="url(#loginAvatarHand)" />
            <g ref={leftFingersRef}>
              <rect x="74" y="66" width="4.7" height="13.6" rx="2.3" fill="#f5f7ff" />
              <rect x="81.5" y="63" width="4.7" height="16.6" rx="2.3" fill="#f5f7ff" />
              <rect x="89" y="63" width="4.7" height="16.6" rx="2.3" fill="#f5f7ff" />
              <rect x="96.5" y="66" width="4.7" height="13.6" rx="2.3" fill="#f5f7ff" />
            </g>
          </g>

          <g ref={rightCoverRef}>
            <path d="M158 141C166 116 157 92 137 75" fill="none" stroke="url(#loginAvatarHand)" strokeWidth="13.4" strokeLinecap="round" />
            <ellipse cx="133" cy="79" rx="20" ry="14.2" fill="url(#loginAvatarHand)" />
            <g ref={rightFingersRef}>
              <rect x="119" y="66" width="4.7" height="13.6" rx="2.3" fill="#f5f7ff" />
              <rect x="126.5" y="63" width="4.7" height="16.6" rx="2.3" fill="#f5f7ff" />
              <rect x="134" y="63" width="4.7" height="16.6" rx="2.3" fill="#f5f7ff" />
              <rect x="141.5" y="66" width="4.7" height="13.6" rx="2.3" fill="#f5f7ff" />
            </g>
          </g>
        </svg>
      </div>
    </div>
  );
}
