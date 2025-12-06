import React, { useState, useEffect } from 'react';
import { Lock, Sparkles } from 'lucide-react';

interface ComingSoonOverlayProps {
  onBreak: () => void;
}

export const ComingSoonOverlay: React.FC<ComingSoonOverlayProps> = ({ onBreak }) => {
  const [clicks, setClicks] = useState(0);
  const [isShaking, setIsShaking] = useState(false);
  const [isBreaking, setIsBreaking] = useState(false);
  const [shards, setShards] = useState<Array<{ id: number; x: number; y: number; rotation: number; scale: number }>>([]);
  const CLICKS_TO_BREAK = 5;

  const handleClick = () => {
    const newClicks = clicks + 1;
    setClicks(newClicks);
    setIsShaking(true);

    setTimeout(() => setIsShaking(false), 300);

    if (newClicks >= CLICKS_TO_BREAK) {
      // Trigger shatter animation
      setIsBreaking(true);
      
      // Create shards
      const newShards = Array.from({ length: 20 }, (_, i) => ({
        id: i,
        x: (Math.random() - 0.5) * 1000,
        y: Math.random() * -800 - 200,
        rotation: Math.random() * 720 - 360,
        scale: Math.random() * 0.5 + 0.5
      }));
      setShards(newShards);

      // After animation completes, reveal the page
      setTimeout(() => {
        onBreak();
      }, 800);
    }
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center transition-all duration-300 ${
        isBreaking ? 'pointer-events-none' : ''
      }`}
      style={{
        background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.98) 0%, rgba(30, 41, 59, 0.98) 100%)',
        backdropFilter: 'blur(10px)'
      }}
    >
      {/* Shatter Animation Shards */}
      {isBreaking && shards.map((shard) => (
        <div
          key={shard.id}
          className="absolute inset-0 bg-gradient-to-br from-slate-800 to-slate-900 opacity-80"
          style={{
            clipPath: `polygon(${Math.random() * 50}% ${Math.random() * 50}%, ${50 + Math.random() * 50}% ${Math.random() * 50}%, ${50 + Math.random() * 50}% ${50 + Math.random() * 50}%, ${Math.random() * 50}% ${50 + Math.random() * 50}%)`,
            animation: `shatter 0.8s ease-out forwards`,
            transform: `translate(${shard.x}px, ${shard.y}px) rotate(${shard.rotation}deg) scale(${shard.scale})`,
            opacity: 0
          }}
        />
      ))}

      {/* Main Content */}
      <div 
        className={`relative flex flex-col items-center gap-8 transition-all duration-300 ${
          isShaking ? 'animate-shake' : ''
        } ${isBreaking ? 'opacity-0 scale-150' : 'opacity-100 scale-100'}`}
        onClick={handleClick}
        style={{ cursor: clicks < CLICKS_TO_BREAK ? 'pointer' : 'default' }}
      >
        {/* Animated Chains */}
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 flex gap-8">
          <div className="w-2 h-32 bg-gradient-to-b from-slate-600 to-slate-700 rounded animate-swing" style={{ transformOrigin: 'top center' }} />
          <div className="w-2 h-32 bg-gradient-to-b from-slate-600 to-slate-700 rounded animate-swing-delayed" style={{ transformOrigin: 'top center' }} />
        </div>

        {/* Lock with Shackles */}
        <div className="relative">
          {/* Top Shackle */}
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-20 h-16 border-8 border-slate-600 rounded-t-full" />
          
          {/* Main Lock Body */}
          <div className="relative bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-12 rounded-2xl shadow-2xl border-4 border-slate-600">
            {/* Lock Icon */}
            <Lock className="w-24 h-24 text-slate-400" strokeWidth={2.5} />
            
            {/* Keyhole */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-2 w-4 h-8 bg-slate-950 rounded-full" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 translate-y-6 w-2 h-6 bg-slate-950" />
          </div>

          {/* Side Shackles */}
          <div className="absolute top-1/2 -left-8 -translate-y-1/2 w-6 h-20 border-8 border-l-0 border-slate-600 rounded-r-full" />
          <div className="absolute top-1/2 -right-8 -translate-y-1/2 w-6 h-20 border-8 border-r-0 border-slate-600 rounded-l-full" />
        </div>

        {/* Coming Soon Text */}
        <div className="text-center space-y-4">
          <div className="flex items-center gap-2 justify-center">
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
            <h2 className="text-4xl font-bold text-white">Coming Soon</h2>
            <Sparkles className="w-6 h-6 text-yellow-400 animate-pulse" />
          </div>
          <p className="text-slate-300 text-lg">
            Daily Routine Dashboard is being crafted
          </p>
          
          {/* Click Progress */}
          <div className="mt-8 space-y-2">
            <p className="text-sm text-slate-400">
              {clicks < CLICKS_TO_BREAK ? (
                <>Click {CLICKS_TO_BREAK - clicks} more {CLICKS_TO_BREAK - clicks === 1 ? 'time' : 'times'} to break the lock...</>
              ) : (
                'Breaking...'
              )}
            </p>
            <div className="flex gap-2 justify-center">
              {Array.from({ length: CLICKS_TO_BREAK }).map((_, i) => (
                <div
                  key={i}
                  className={`w-3 h-3 rounded-full transition-all duration-300 ${
                    i < clicks 
                      ? 'bg-yellow-400 scale-125 shadow-lg shadow-yellow-400/50' 
                      : 'bg-slate-600'
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Hint Text */}
        <p className="text-xs text-slate-500 animate-pulse">
          Psst... Click to unlock early access 🔓
        </p>
      </div>

      {/* CSS Animations */}
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0) rotate(0deg); }
          25% { transform: translateX(-10px) rotate(-5deg); }
          75% { transform: translateX(10px) rotate(5deg); }
        }
        
        @keyframes swing {
          0%, 100% { transform: rotate(-5deg); }
          50% { transform: rotate(5deg); }
        }
        
        @keyframes swing-delayed {
          0%, 100% { transform: rotate(5deg); }
          50% { transform: rotate(-5deg); }
        }
        
        @keyframes shatter {
          0% {
            opacity: 1;
            transform: translate(0, 0) rotate(0deg) scale(1);
          }
          100% {
            opacity: 0;
            transform: translate(var(--shard-x), var(--shard-y)) rotate(var(--shard-rotation)) scale(var(--shard-scale));
          }
        }
        
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        
        .animate-swing {
          animation: swing 2s ease-in-out infinite;
        }
        
        .animate-swing-delayed {
          animation: swing-delayed 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};
