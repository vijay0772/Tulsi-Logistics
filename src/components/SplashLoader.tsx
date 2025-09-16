"use client";

import { useEffect, useState } from "react";

export default function SplashLoader() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setVisible(false), 2200);
    return () => clearTimeout(t);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur flex items-center justify-center pointer-events-none">
      <div className="absolute inset-0 overflow-hidden">
        <video className="h-full w-full object-cover opacity-30" autoPlay muted loop playsInline>
          <source src="/truck-bg2.mp4" type="video/mp4" />
        </video>
      </div>
      <div className="w-full max-w-3xl px-6 select-none">
        <div className="text-center mb-8">
          <div className="text-4xl sm:text-5xl md:text-6xl font-sans font-semibold tracking-[0.35em] text-transparent bg-clip-text bg-gradient-to-r from-sky-300 via-teal-300 to-emerald-300 drop-shadow">
            TULSI LOGISTICS
          </div>
        </div>
        <div className="relative h-4 rounded-full bg-white/15 ring-1 ring-white/10 overflow-hidden">
          <div className="absolute inset-y-0 left-0 bg-teal-300/90 animate-[loading-fill_2.2s_linear_forwards]"></div>
          <div className="absolute top-1/2 -translate-y-1/2 animate-[truck-move_2.2s_linear_forwards]">
            <img src="/truck.png" alt="truck" className="h-8 w-auto drop-shadow-[0_4px_8px_rgba(0,0,0,0.6)]" />
          </div>
        </div>
      </div>
    </div>
  );
}


