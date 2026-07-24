import { useEffect, useRef, useCallback } from 'react';
import gsap from 'gsap';

export default function IntroScreen({ onComplete }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const welcomeRef = useRef(null);
  const sloganARef = useRef(null);
  const sloganBRef = useRef(null);
  const audioRef = useRef(null);
  const lettersRef = useRef([]);
  const waveLineRef = useRef(null);
  const rafRef = useRef(null);
  const completedRef = useRef(false);

  const completeOnce = useCallback(() => {
    if (completedRef.current) return;
    completedRef.current = true;
    onComplete?.();
  }, [onComplete]);

  const startWaves = useCallback((canvas) => {
    const ctx = canvas.getContext('2d');

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const layers = [
      { color1: '#1E3A8A', color2: '#3B82F6', amp: 0.26, freq: 0.0018, speed: 0.38, yOff: 0.72, blur: 52, phase: 0.0 },
      { color1: '#0891B2', color2: '#06B6D4', amp: 0.20, freq: 0.0025, speed: 0.52, yOff: 0.62, blur: 44, phase: 1.3 },
      { color1: '#059669', color2: '#10B981', amp: 0.17, freq: 0.0031, speed: 0.33, yOff: 0.80, blur: 48, phase: 2.5 },
      { color1: '#6D28D9', color2: '#7C3AED', amp: 0.22, freq: 0.0015, speed: 0.45, yOff: 0.55, blur: 56, phase: 3.8 },
      { color1: '#1E40AF', color2: '#60A5FA', amp: 0.19, freq: 0.0021, speed: 0.60, yOff: 0.88, blur: 40, phase: 0.9 },
    ];

    const state = {
      waveOpacity: 0,
      waveY: 80,
      globalAlpha: 1,
    };
    canvas._waveState = state;

    const hexRgb = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `${r},${g},${b}`;
    };

    let time = 0;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#060D1C';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const glow = ctx.createRadialGradient(
        canvas.width / 2,
        canvas.height / 2,
        0,
        canvas.width / 2,
        canvas.height / 2,
        canvas.width * 0.6,
      );
      glow.addColorStop(0, 'rgba(37,99,235,0.07)');
      glow.addColorStop(0.5, 'rgba(109,40,217,0.04)');
      glow.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.globalAlpha = state.globalAlpha;

      layers.forEach((layer) => {
        const yBase = layer.yOff * canvas.height + state.waveY;

        ctx.save();
        ctx.filter = `blur(${layer.blur}px)`;
        ctx.globalAlpha = state.waveOpacity * 0.72;

        ctx.beginPath();
        ctx.moveTo(0, canvas.height);
        for (let x = 0; x <= canvas.width; x += 4) {
          const y = yBase
            + Math.sin(x * layer.freq + time * layer.speed + layer.phase) * layer.amp * canvas.height
            + Math.sin(x * layer.freq * 1.8 + time * layer.speed * 0.75 + layer.phase + 1) * layer.amp * canvas.height * 0.38
            + Math.cos(x * layer.freq * 0.55 + time * layer.speed * 1.15 + layer.phase + 2) * layer.amp * canvas.height * 0.28;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(canvas.width, canvas.height);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, yBase - layer.amp * canvas.height, 0, canvas.height);
        grad.addColorStop(0, `rgba(${hexRgb(layer.color2)},0.88)`);
        grad.addColorStop(0.4, `rgba(${hexRgb(layer.color1)},0.65)`);
        grad.addColorStop(1, `rgba(${hexRgb(layer.color1)},0.22)`);

        ctx.fillStyle = grad;
        ctx.fill();
        ctx.restore();
      });

      ctx.restore();
      time += 0.009;
      rafRef.current = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const stopWaves = startWaves(canvas);
    const state = canvas._waveState;
    const safety = setTimeout(() => completeOnce(), 9000);

    gsap.set(welcomeRef.current, { opacity: 0, y: 30, scale: 1.8 });
    gsap.set(sloganARef.current, { opacity: 0, y: 14 });
    gsap.set(sloganBRef.current, { opacity: 0, y: 14 });
    gsap.set(lettersRef.current.filter(Boolean), { opacity: 0, y: 9 });
    gsap.set(waveLineRef.current, { scaleX: 0, transformOrigin: 'left center', opacity: 0 });

    const tl = gsap.timeline();

    tl.to(welcomeRef.current, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 1.4,
      ease: 'power3.inOut',
    }, 0);

    tl.to(sloganARef.current, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: 'power3.out',
    }, 0.9);

    tl.to(sloganBRef.current, {
      opacity: 1,
      y: 0,
      duration: 0.55,
      ease: 'power3.out',
    }, 1.3);

    tl.to(welcomeRef.current, {
      opacity: 0,
      y: -20,
      scale: 0.95,
      duration: 0.5,
      ease: 'power2.in',
    }, 2.4);

    tl.to(state, {
      waveOpacity: 1,
      duration: 0.7,
      ease: 'power2.out',
    }, 3.2);

    tl.to(state, {
      waveY: 0,
      duration: 1.4,
      ease: 'power2.out',
    }, 3.3);

    const validLetters = lettersRef.current.filter(Boolean);
    validLetters.forEach((letter, index) => {
      tl.to(letter, {
        opacity: 1,
        y: 0,
        duration: 0.2,
        ease: 'power2.out',
      }, 3.9 + index * 0.062);
    });

    const lastLetterTime = 3.9 + (validLetters.length - 1) * 0.062 + 0.2;

    tl.to(waveLineRef.current, {
      opacity: 1,
      scaleX: 1,
      duration: 0.45,
      ease: 'power2.inOut',
    }, lastLetterTime + 0.08);

    const exitTime = lastLetterTime + 0.08 + 0.45 + 0.7;

    tl.to(state, {
      globalAlpha: 0,
      duration: 0.4,
      ease: 'power2.in',
    }, exitTime);

    tl.to(containerRef.current, {
      opacity: 0,
      duration: 0.4,
      ease: 'power2.in',
      onComplete: () => {
        clearTimeout(safety);
        completeOnce();
      },
    }, exitTime);

    const audio = new Audio('/audio/intro-voice.mp3');
    audio.volume = 0;
    audioRef.current = audio;
    audio.addEventListener('error', () => {
      console.warn('Place ElevenLabs MP3 at: public/audio/intro-voice.mp3');
    });

    const audioTimer = setTimeout(() => {
      const promise = audio.play();
      if (promise) {
        promise.then(() => {
          let volume = 0;
          const interval = setInterval(() => {
            volume = Math.min(volume + 0.05, 0.82);
            audio.volume = volume;
            if (volume >= 0.82) clearInterval(interval);
          }, 40);
        }).catch(() => {});
      }
    }, 3900);

    const fadeTimer = setTimeout(() => {
      const fade = setInterval(() => {
        if (!audioRef.current) {
          clearInterval(fade);
          return;
        }
        if (audio.volume > 0.05) {
          audio.volume = Math.max(0, audio.volume - 0.05);
        } else {
          audio.volume = 0;
          audio.pause();
          clearInterval(fade);
        }
      }, 40);
    }, exitTime * 1000);

    return () => {
      clearTimeout(safety);
      clearTimeout(audioTimer);
      clearTimeout(fadeTimer);
      tl.kill();
      stopWaves();
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, [completeOnce, startWaves]);

  const letters = 'OFPPT Formation'.split('');

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        overflow: 'hidden',
        background: '#060D1C',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          zIndex: 1,
        }}
      />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
        }}
      >
        <div
          ref={welcomeRef}
          style={{
            position: 'absolute',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            opacity: 0,
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              fontFamily: "'Inter',sans-serif",
              fontSize: 11,
              fontWeight: 500,
              letterSpacing: '0.30em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.40)',
              marginBottom: 8,
            }}
          >
            Bienvenue sur
          </div>
          <div
            style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: 'clamp(2rem,5vw,4rem)',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              background: 'linear-gradient(135deg,#60A5FA 0%,#A78BFA 50%,#34D399 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              marginBottom: 24,
              textAlign: 'center',
            }}
          >
            OFPPT Formation
          </div>
          <div
            ref={sloganARef}
            style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: 'clamp(1rem,2.2vw,1.9rem)',
              fontWeight: 700,
              color: '#ffffff',
              letterSpacing: '-0.02em',
              textAlign: 'center',
              marginBottom: 8,
              textShadow: '0 0 40px rgba(59,130,246,0.4)',
            }}
          >
            Formez les formateurs de demain.
          </div>
          <div
            ref={sloganBRef}
            style={{
              fontFamily: "'Sora',sans-serif",
              fontSize: 'clamp(0.85rem,1.6vw,1.35rem)',
              fontWeight: 600,
              color: 'rgba(255,255,255,0.50)',
              letterSpacing: '0.02em',
              textAlign: 'center',
            }}
          >
            Gérez. Suivez. Évaluez. Transformez.
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            fontFamily: "'Sora', sans-serif",
            fontSize: 'clamp(2.4rem, 5.5vw, 4.8rem)',
            fontWeight: 800,
            letterSpacing: '-0.03em',
            color: '#ffffff',
            marginBottom: 14,
          }}
        >
          {letters.map((char, index) => (
            <span
              key={`${char}-${index}`}
              ref={(element) => { lettersRef.current[index] = element; }}
              style={{
                display: 'inline-block',
                opacity: 0,
                whiteSpace: char === ' ' ? 'pre' : 'normal',
                width: char === ' ' ? '0.32em' : 'auto',
              }}
            >
              {char}
            </span>
          ))}
        </div>

        <div
          ref={waveLineRef}
          style={{
            width: 'clamp(200px, 40vw, 420px)',
            height: 1.5,
            background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.30), transparent)',
          }}
        />
      </div>
    </div>
  );
}
