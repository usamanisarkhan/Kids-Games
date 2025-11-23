
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Balloon, GameState, Particle, Point, PopEffect, Reward } from '../types';
import { 
  CANVAS_WIDTH, 
  CANVAS_HEIGHT, 
  BALLOON_COLORS, 
  BALLOON_RADIUS_MIN, 
  BALLOON_RADIUS_MAX, 
  SPAWN_RATE,
  MOTION_THRESHOLD,
  POP_TEXTS
} from '../constants';
import { soundManager } from '../services/soundManager';

interface GameCanvasProps {
  gameState: GameState;
  onScoreUpdate: (score: number) => void;
  onGameOver: () => void;
  onFrameCapture: (base64Data: string) => void;
  speedLevel: number;
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ 
  gameState, 
  onScoreUpdate, 
  onGameOver,
  onFrameCapture,
  speedLevel
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const motionCanvasRef = useRef<HTMLCanvasElement>(null); // Offscreen canvas for motion diff
  const prevFrameRef = useRef<ImageData | null>(null);
  const requestRef = useRef<number | undefined>(undefined);
  
  // Game Entities Refs
  const balloonsRef = useRef<Balloon[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const popEffectsRef = useRef<PopEffect[]>([]);
  const rewardsRef = useRef<Reward[]>([]);
  const scoreRef = useRef(0);
  const frameCountRef = useRef(0);
  const lastCaptureTimeRef = useRef(0);

  // Initialize Camera
  useEffect(() => {
    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: { ideal: 1280 }, 
            height: { ideal: 720 },
            facingMode: "user" 
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error("Error accessing camera:", err);
      }
    };
    startCamera();
  }, []);

  // Reset Game
  useEffect(() => {
    if (gameState === GameState.PLAYING) {
      balloonsRef.current = [];
      particlesRef.current = [];
      popEffectsRef.current = [];
      rewardsRef.current = [];
      scoreRef.current = 0;
      frameCountRef.current = 0;
      onScoreUpdate(0);
    }
  }, [gameState, onScoreUpdate]);

  const spawnBalloon = () => {
    const radius = Math.random() * (BALLOON_RADIUS_MAX - BALLOON_RADIUS_MIN) + BALLOON_RADIUS_MIN;
    const x = Math.random() * (CANVAS_WIDTH - radius * 2) + radius;
    
    // Calculate speed based on speedLevel (1-10)
    // Level 1: ~1.5px
    // Level 5: ~5.5px
    // Level 10: ~10.5px
    const baseSpeed = speedLevel; 
    const variance = Math.random() * 2; // Add some randomness
    const speed = Math.max(1, baseSpeed + variance);

    balloonsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y: -radius,
      radius,
      speed: speed,
      color: BALLOON_COLORS[Math.floor(Math.random() * BALLOON_COLORS.length)],
      isPopped: false,
      popProgress: 0
    });
  };

  const createParticles = (x: number, y: number, color: string) => {
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      particlesRef.current.push({
        id: Date.now() + i,
        x,
        y,
        vx: Math.cos(angle) * (Math.random() * 5 + 2),
        vy: Math.sin(angle) * (Math.random() * 5 + 2),
        color,
        life: 1.0
      });
    }
  };

  const createPopEffect = (x: number, y: number) => {
    popEffectsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      scale: 0.1,
      opacity: 1.0,
      text: POP_TEXTS[Math.floor(Math.random() * POP_TEXTS.length)],
      rotation: (Math.random() - 0.5) * 0.5 
    });
  };

  const createReward = (x: number, y: number, value: number) => {
    rewardsRef.current.push({
      id: Date.now() + Math.random(),
      x,
      y,
      value,
      opacity: 1.0,
      scale: 0.5
    });
  };

  const detectMotionAndCollisions = (
    ctx: CanvasRenderingContext2D, 
    motionCtx: CanvasRenderingContext2D, 
    video: HTMLVideoElement
  ) => {
    const w = 160; 
    const h = 90; 
    
    motionCtx.drawImage(video, 0, 0, w, h);
    const frame = motionCtx.getImageData(0, 0, w, h);
    const data = frame.data;

    if (prevFrameRef.current) {
      const prevData = prevFrameRef.current.data;
      
      for (let y = 0; y < h; y += 2) {
        for (let x = 0; x < w; x += 2) {
          const i = (y * w + x) * 4;
          const rDiff = Math.abs(data[i] - prevData[i]);
          const gDiff = Math.abs(data[i + 1] - prevData[i + 1]);
          const bDiff = Math.abs(data[i + 2] - prevData[i + 2]);
          
          if (rDiff + gDiff + bDiff > MOTION_THRESHOLD * 3) {
            // Motion Detected
            const screenX = CANVAS_WIDTH - (x / w) * CANVAS_WIDTH; 
            const screenY = (y / h) * CANVAS_HEIGHT;
            
            // Check collision
            balloonsRef.current.forEach(balloon => {
              if (!balloon.isPopped) {
                const dx = screenX - balloon.x;
                const dy = screenY - balloon.y;
                if (Math.sqrt(dx*dx + dy*dy) < balloon.radius) {
                   // POP!
                   balloon.isPopped = true;
                   soundManager.playPop(); // Play sound effect
                   createParticles(balloon.x, balloon.y, balloon.color);
                   createPopEffect(balloon.x, balloon.y);
                   createReward(balloon.x, balloon.y, 10);
                   scoreRef.current += 10;
                   onScoreUpdate(scoreRef.current);
                }
              }
            });
          }
        }
      }
    }
    prevFrameRef.current = frame;
  };

  const drawHUD = (ctx: CanvasRenderingContext2D) => {
    // Score
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillStyle = "white";
    ctx.font = "900 48px 'Inter', sans-serif";
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillText(`SCORE: ${scoreRef.current}`, 40, 40);

    // Lives display removed
    ctx.shadowBlur = 0;
  };

  const gameLoop = useCallback(() => {
    if (!canvasRef.current || !videoRef.current || !motionCanvasRef.current) return;

    const ctx = canvasRef.current.getContext('2d');
    const motionCtx = motionCanvasRef.current.getContext('2d', { willReadFrequently: true });
    
    if (!ctx || !motionCtx) return;

    // 1. Draw Video Background
    ctx.save();
    ctx.translate(CANVAS_WIDTH, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(videoRef.current, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();

    // 2. Logic (Only if playing)
    if (gameState === GameState.PLAYING) {
      frameCountRef.current++;

      // Spawn - Adjust spawn rate slightly based on speed? 
      // Actually, keep rate constant but maybe slower if speed is very slow to avoid clutter
      const adjustedSpawnRate = Math.max(20, Math.floor(SPAWN_RATE - (speedLevel * 2))); 
      if (frameCountRef.current % adjustedSpawnRate === 0) {
        spawnBalloon();
      }

      // Motion Detection & Collision
      detectMotionAndCollisions(ctx, motionCtx, videoRef.current);

      // Update Balloons
      balloonsRef.current.forEach(b => {
        if (!b.isPopped) {
          b.y += b.speed;
          
          // Check if missed (hit bottom)
          if (b.y - b.radius > CANVAS_HEIGHT) {
             b.isPopped = true; 
             b.popProgress = 2; // Mark for removal
             // Logic for losing lives removed
          }
        }
      });

      // Clean up balloons
      balloonsRef.current = balloonsRef.current.filter(b => !b.isPopped || b.popProgress < 1);

      // Update Particles
      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.2;
        p.life -= 0.05;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // Update Pop Effects
      popEffectsRef.current.forEach(e => {
        e.scale += 0.15;
        if (e.scale > 1.2) e.opacity -= 0.1;
      });
      popEffectsRef.current = popEffectsRef.current.filter(e => e.opacity > 0);

      // Update Rewards
      rewardsRef.current.forEach(r => {
        r.y -= 2; // Float up
        r.scale = Math.min(1, r.scale + 0.1);
        r.opacity -= 0.02;
      });
      rewardsRef.current = rewardsRef.current.filter(r => r.opacity > 0);
    }

    // 3. Render Game Objects
    
    // Balloons
    balloonsRef.current.forEach(b => {
      if (b.isPopped) return; 
      
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
      ctx.fillStyle = b.color;
      ctx.fill();
      
      // Shine
      ctx.beginPath();
      ctx.arc(b.x - b.radius * 0.3, b.y - b.radius * 0.3, b.radius * 0.2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      ctx.fill();
      
      // String
      ctx.beginPath();
      ctx.moveTo(b.x, b.y + b.radius);
      ctx.lineTo(b.x, b.y + b.radius + 20);
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Particles
    particlesRef.current.forEach(p => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life;
      ctx.fill();
      ctx.globalAlpha = 1.0;
    });

    // Pop Effects (POW!)
    popEffectsRef.current.forEach(e => {
      ctx.save();
      ctx.globalAlpha = e.opacity;
      ctx.translate(e.x, e.y);
      ctx.rotate(e.rotation);
      ctx.scale(e.scale, e.scale);
      
      // Starburst
      ctx.beginPath();
      const points = 12;
      for (let i = 0; i < points * 2; i++) {
          const r = i % 2 === 0 ? 70 : 45;
          const angle = (i / (points * 2)) * Math.PI * 2;
          ctx.lineTo(Math.cos(angle) * r, Math.sin(angle) * r);
      }
      ctx.closePath();
      ctx.fillStyle = '#fef08a';
      ctx.fill();
      ctx.lineWidth = 3;
      ctx.strokeStyle = 'black';
      ctx.stroke();
      
      // Text
      ctx.font = "900 36px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = '#ef4444';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'black';
      ctx.strokeText(e.text, 0, 0);
      ctx.fillText(e.text, 0, 0);
      
      ctx.restore();
    });

    // Rewards (+10)
    rewardsRef.current.forEach(r => {
      ctx.save();
      ctx.globalAlpha = r.opacity;
      ctx.translate(r.x, r.y);
      ctx.scale(r.scale, r.scale);
      
      ctx.shadowColor = "black";
      ctx.shadowBlur = 2;
      ctx.font = "900 40px 'Inter', sans-serif";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      ctx.fillStyle = '#fbbf24'; // Gold
      ctx.strokeStyle = 'black';
      ctx.lineWidth = 2;
      ctx.strokeText(`+${r.value}`, 0, 0);
      ctx.fillText(`+${r.value}`, 0, 0);
      
      ctx.restore();
    });

    // HUD
    if (gameState === GameState.PLAYING || gameState === GameState.GAME_OVER) {
       drawHUD(ctx);
    }

    // 4. Capture Frame
    const now = Date.now();
    if (gameState === GameState.PLAYING && now - lastCaptureTimeRef.current > 500) {
      const smallCanvas = motionCanvasRef.current;
      motionCtx.drawImage(canvasRef.current, 0, 0, 160, 90); 
      const base64 = smallCanvas.toDataURL('image/jpeg', 0.5).split(',')[1];
      onFrameCapture(base64);
      lastCaptureTimeRef.current = now;
    }

    requestRef.current = requestAnimationFrame(gameLoop);
  }, [gameState, onScoreUpdate, onFrameCapture, onGameOver, speedLevel]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(gameLoop);
    return () => {
      if (requestRef.current !== undefined) cancelAnimationFrame(requestRef.current);
    };
  }, [gameLoop]);

  return (
    <div className="relative w-full max-w-6xl mx-auto aspect-video rounded-2xl overflow-hidden shadow-2xl border-4 border-slate-700 bg-black">
      <video ref={videoRef} className="hidden" playsInline muted />
      <canvas ref={motionCanvasRef} width={160} height={90} className="hidden" />
      <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-full object-cover" />
    </div>
  );
};
