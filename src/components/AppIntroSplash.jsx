import { useState, useEffect } from 'react';
import { ShieldCheck, Fingerprint, Lock, Shield } from 'lucide-react';

export default function AppIntroSplash({ onComplete }) {
  const isTest = typeof process !== 'undefined' && process.env?.NODE_ENV === 'test';
  const [fading, setFading] = useState(false);
  const [introCipher, setIntroCipher] = useState('SECURECHAT');
  const [isDecrypted, setIsDecrypted] = useState(false);
  const [introStage, setIntroStage] = useState(0); // 0: scanning, 1: resolving, 2: completed
  const [introProgress, setIntroProgress] = useState(25);

  useEffect(() => {
    if (isTest) {
      if (onComplete) onComplete();
      return;
    }

    // Stage 1: Resolving identity
    const t1 = setTimeout(() => {
      setIntroStage(1);
      setIntroProgress(65);
    }, 300);

    // Dynamic cipher resolving quickly into "SECURECHAT"
    const targetWord = 'SECURECHAT';
    const cipherChars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!#%*';
    let iter = 0;
    const cipherTimer = setInterval(() => {
      iter++;
      setIntroCipher(() => {
        return targetWord
          .split('')
          .map((letter, index) => {
            if (index < iter / 1.2) return letter;
            return cipherChars[Math.floor(Math.random() * cipherChars.length)];
          })
          .join('');
      });
      if (iter >= 12) {
        clearInterval(cipherTimer);
        setIntroCipher(targetWord);
        setIsDecrypted(true);
      }
    }, 30);

    // Stage 2: Shield Verified & 100% Progress
    const t2 = setTimeout(() => {
      setIntroStage(2);
      setIntroProgress(100);
      setIsDecrypted(true);
      setIntroCipher(targetWord);
    }, 650);

    // Fade out and reveal app
    const t3 = setTimeout(() => {
      setFading(true);
    }, 2100);

    const t4 = setTimeout(() => {
      if (onComplete) onComplete();
    }, 2500);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
      clearInterval(cipherTimer);
    };
  }, [isTest, onComplete]);

  const handleDismiss = () => {
    setFading(true);
    setTimeout(() => {
      if (onComplete) onComplete();
    }, 180);
  };

  if (isTest) return null;

  return (
    <div
      id="securechat-opening-splash"
      onClick={handleDismiss}
      className={`fixed inset-0 z-[100] flex flex-col items-center justify-center p-6 bg-[#060b10] select-none cursor-pointer transition-all duration-500 overflow-hidden ${
        fading ? 'opacity-0 scale-105 pointer-events-none' : 'opacity-100 scale-100'
      }`}
    >
      {/* Background with Orange & White Ambient Glow */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: `radial-gradient(circle at 50% 50%, rgba(249, 115, 22, 0.22) 0%, transparent 65%),
                            linear-gradient(to right, rgba(255, 255, 255, 0.04) 1px, transparent 1px),
                            linear-gradient(to bottom, rgba(255, 255, 255, 0.04) 1px, transparent 1px)`,
          backgroundSize: '100% 100%, 36px 36px, 36px 36px'
        }}
      />

      {/* Ambient Pulsing Aura in Orange and White */}
      <div className="absolute w-[460px] h-[460px] rounded-full bg-[#f97316]/18 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute w-[320px] h-[320px] rounded-full bg-white/10 blur-[90px] pointer-events-none" />

      {/* Floating Orange and White Ambient Particles */}
      <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 rounded-full bg-[#f97316] blur-[0.5px] animate-ping" />
      <div className="absolute bottom-1/4 right-1/4 w-2 h-2 rounded-full bg-orange-400 blur-[0.5px] animate-pulse" />
      <div className="absolute top-1/3 right-1/3 w-1 h-1 rounded-full bg-white blur-[0.5px] animate-ping [animation-delay:0.6s]" />

      {/* Center Shield & Brand Composition */}
      <div className="relative flex flex-col items-center justify-center z-10 space-y-7 max-w-sm w-full">
        
        <div className="relative flex items-center justify-center">
          {/* Outer Orange & White Holographic Counter-Rotating Rings */}
          <div className="absolute w-44 h-44 rounded-full border border-[#f97316]/35 border-dashed animate-spin [animation-duration:14s]" />
          <div className="absolute w-52 h-52 rounded-full border border-white/20 border-t-[#f97316] animate-spin [animation-duration:9s] [animation-direction:reverse]" />
          <div className="absolute w-60 h-60 rounded-full border border-orange-500/15 animate-pulse" />

          {/* Hexagonal Glowing Orange & White Frame */}
          <div className="relative w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 bg-gradient-to-tr from-[#f97316] via-orange-400 to-white shadow-[0_0_55px_rgba(249,115,22,0.45)] flex items-center justify-center transform transition-transform hover:scale-105">
            <div className="w-full h-full rounded-[22px] bg-[#09121a] flex items-center justify-center backdrop-blur-xl border border-white/15 relative overflow-hidden">
              
              {/* Vertical Laser Scanner Beam moving across shield in bright orange & white */}
              <div
                className="absolute left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-white to-transparent shadow-[0_0_14px_#f97316] animate-pulse"
                style={{
                  animation: 'scannerMoveOrange 2s ease-in-out infinite'
                }}
              />

              {/* Central Emblem: Orange Fingerprint / Lock -> ShieldCheck morph */}
              {introStage < 2 ? (
                <div className="relative flex items-center justify-center">
                  <Fingerprint className="w-14 h-14 text-[#f97316] animate-pulse drop-shadow-[0_0_16px_rgba(249,115,22,0.8)]" />
                  <Lock className="w-6 h-6 text-white absolute drop-shadow-md" />
                </div>
              ) : (
                <div className="relative flex items-center justify-center animate-in zoom-in-75 duration-300">
                  <ShieldCheck className="w-16 h-16 text-[#f97316] drop-shadow-[0_0_24px_rgba(249,115,22,0.9)]" />
                  <div className="absolute w-6 h-6 bg-white/20 rounded-full blur-sm" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SecureChat Typography */}
        <div className="text-center space-y-2.5">
          <div className="relative inline-block">
            {isDecrypted ? (
              <h1 className="text-4xl sm:text-5xl font-black tracking-tight drop-shadow-[0_0_25px_rgba(249,115,22,0.35)] flex items-center justify-center">
                <span className="text-white">Secure</span>
                <span className="text-[#f97316]">Chat</span>
              </h1>
            ) : (
              <h1 className="text-4xl sm:text-5xl font-black tracking-wider font-mono text-white drop-shadow-[0_0_25px_rgba(249,115,22,0.35)]">
                {introCipher.slice(0, 6)}
                <span className="text-[#f97316]">{introCipher.slice(6)}</span>
              </h1>
            )}
            
            {introStage >= 2 && (
              <span className="absolute -top-1 -right-3 flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#f97316] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#f97316]"></span>
              </span>
            )}
          </div>

          {/* Requested Tagline: Beyond Messaging. Built for Privacy. */}
          <div className="flex items-center justify-center gap-1.5 pt-1">
            <Shield className="w-3.5 h-3.5 text-[#f97316]" />
            <p className="text-xs sm:text-sm font-medium tracking-wide text-white/90">
              Beyond Messaging. <span className="text-[#f97316] font-semibold">Built for Privacy.</span>
            </p>
          </div>
        </div>

        {/* Minimalist Orange & White Progress Bar */}
        <div className="w-48 sm:w-56 space-y-2 pt-1">
          <div className="h-1.5 w-full bg-[#0a141f] rounded-full overflow-hidden border border-[#f97316]/30 p-[1px] shadow-inner">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#f97316] via-orange-400 to-white transition-all duration-300 shadow-[0_0_12px_rgba(249,115,22,0.7)]"
              style={{ width: `${introProgress}%` }}
            />
          </div>
        </div>

        {/* Tap to enter hint */}
        <span className="text-[11px] text-white/40 hover:text-[#f97316] pt-1 transition cursor-pointer tracking-wide">
          Tap anywhere to continue
        </span>
      </div>

      {/* Global keyframe for orange laser scanner */}
      <style>{`
        @keyframes scannerMoveOrange {
          0% { top: 12%; opacity: 0.35; }
          50% { top: 82%; opacity: 1; }
          100% { top: 12%; opacity: 0.35; }
        }
      `}</style>
    </div>
  );
}
