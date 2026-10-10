/**
 * ARYA GM — Pipas Combat Live (Overhaul Físico & Visual Humanizado)
 * Baseado diretamente nas transmissões reais do TikTok LIVE (Marcelo Kyrat / Pipa Combate):
 * - Física de Rabiola fluida com Verlet/Spring-Chain de 22 nós e arrasto aerodinâmico.
 * - Efeito de faíscas incandescentes em fusão (Additive Blending) no atrito de linhas ("Relo").
 * - Estampa e armação autêntica de pipas brasileiras (Bambu + Fibra + Seda colorida).
 * - Foto/Avatar do espectador no centro da pipa e barra de tensão/vida no estilo da live.
 * - Skyline de lajes e telhados urbanos no horizonte com céu estilizado e nuvens em camadas.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { KitePlayer, NormalizedEvent } from '../types';
import { soundEngine } from '../services/soundEngine';
import confetti from 'canvas-confetti';

interface PipasCombatGameProps {
  isTransparentBg?: boolean;
  bgMode?: 'alpha' | 'chroma_green' | 'chroma_magenta' | 'scene';
}

// Nó da cadeia de rabiola (Física de Verlet)
interface TailNode {
  x: number;
  y: number;
  oldX: number;
  oldY: number;
}

interface SparkParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
  maxLife: number;
}

interface EnhancedKitePlayer extends KitePlayer {
  tailNodes: TailNode[];
  life: number; // 0 a 100 (barra de cerol/tensão)
  maxLife: number;
  targetX: number;
  targetY: number;
  avatarImg?: HTMLImageElement;
}

const KITE_PALETTES = [
  { primary: '#DC2626', secondary: '#FBBF24', pattern: 'stripes' },
  { primary: '#2563EB', secondary: '#FFFFFF', pattern: 'split' },
  { primary: '#059669', secondary: '#FDE047', pattern: 'diamond' },
  { primary: '#7C3AED', secondary: '#F472B6', pattern: 'cross' },
  { primary: '#EA580C', secondary: '#1E293B', pattern: 'stripes' },
  { primary: '#0284C7', secondary: '#38BDF8', pattern: 'diamond' },
];

export const PipasCombatGame: React.FC<PipasCombatGameProps> = ({
  isTransparentBg = false,
  bgMode = 'scene'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const playersRef = useRef<Map<string, EnhancedKitePlayer>>(new Map());
  const sparksRef = useRef<SparkParticle[]>([]);
  const lineFrictionPointsRef = useRef<Array<{ x: number; y: number; intensity: number }>>([]);
  const cutBannersRef = useRef<Array<{ id: string; winner: string; victim: string; timestamp: number }>>([]);
  const avatarCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [roundTimeLeft, setRoundTimeLeft] = useState<number>(90);
  const [totalCutsSession, setTotalCutsSession] = useState<number>(0);
  const [activePlayerCount, setActivePlayerCount] = useState<number>(0);
  const [measuredFps, setMeasuredFps] = useState<number>(60);
  const [recentCutBanner, setRecentCutBanner] = useState<{ winner: string; victim: string } | null>(null);

  // Pré-carrega avatar do espectador
  const loadAvatarImage = useCallback((url: string, username: string) => {
    if (avatarCacheRef.current.has(username)) return avatarCacheRef.current.get(username);
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`;
    img.onload = () => {
      avatarCacheRef.current.set(username, img);
      const player = playersRef.current.get(username);
      if (player) player.avatarImg = img;
    };
    return img;
  }, []);

  // Inicializa nós da rabiola para física suave
  const initTailNodes = (startX: number, startY: number, count = 20): TailNode[] => {
    const nodes: TailNode[] = [];
    for (let i = 0; i < count; i++) {
      nodes.push({
        x: startX,
        y: startY + i * 14,
        oldX: startX,
        oldY: startY + i * 14
      });
    }
    return nodes;
  };

  // Spawn de nova pipa na arena
  const spawnKite = useCallback((username: string, avatarUrl?: string, giftCoins: number = 0) => {
    const existing = playersRef.current.get(username);
    if (existing && !existing.isCut) {
      existing.turboActiveUntil = Date.now() + 6000;
      existing.life = Math.min(100, existing.life + 30);
      soundEngine.playTurbo();
      return;
    }

    const palette = KITE_PALETTES[Math.floor(Math.random() * KITE_PALETTES.length)];
    const x = 200 + Math.random() * 680;
    const y = 380 + Math.random() * 520;

    const newKite: EnhancedKitePlayer = {
      id: `kite_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username,
      avatarUrl: avatarUrl || `https://api.dicebear.com/7.x/bottts/svg?seed=${username}`,
      x,
      y,
      targetX: x,
      targetY: y,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.2,
      angle: 0,
      lineTension: 1.0,
      model: 'raia',
      color: palette.primary,
      tailLength: 20,
      tailNodes: initTailNodes(x, y + 55, 20),
      isCut: false,
      score: 0,
      cutsMade: 0,
      coinsGifted: giftCoins,
      life: 100,
      maxLife: 100,
      avatarImg: loadAvatarImage(avatarUrl || '', username)
    };

    playersRef.current.set(username, newKite);
    setActivePlayerCount(playersRef.current.size);
  }, [loadAvatarImage]);

  // Ações externas
  const handleGameAction = useCallback((action: string, event: NormalizedEvent) => {
    const username = event.user.displayName;
    const player = playersRef.current.get(username);

    switch (action) {
      case 'spawn_kite':
        spawnKite(username, event.user.avatarUrl);
        break;

      case 'boost_turbo':
        if (player && !player.isCut) {
          player.turboActiveUntil = Date.now() + 8000;
          player.life = Math.min(100, player.life + 40);
          player.coinsGifted += event.gift?.coins || 1;
          soundEngine.playTurbo();
        } else {
          spawnKite(username, event.user.avatarUrl, event.gift?.coins || 1);
        }
        break;

      case 'activate_cerol':
        if (player && !player.isCut) {
          player.cerolActiveUntil = Date.now() + 14000;
          player.life = 100;
          soundEngine.playShield();
        }
        break;

      case 'activate_shield':
        if (player && !player.isCut) {
          player.shieldActiveUntil = Date.now() + 12000;
          soundEngine.playShield();
        }
        break;

      case 'wind_gust':
        soundEngine.playTurbo();
        playersRef.current.forEach((k) => {
          k.vx += (Math.random() - 0.5) * 12;
          k.vy += (Math.random() - 0.5) * 8;
        });
        break;

      case 'cut_random':
        soundEngine.playGiftFanfare(29999);
        confetti({ particleCount: 90, spread: 110, origin: { y: 0.35 } });
        playersRef.current.forEach((k) => {
          if (k.username !== username && !k.isCut && (!k.shieldActiveUntil || k.shieldActiveUntil < Date.now())) {
            k.isCut = true;
            k.cutTimestamp = Date.now();
            k.vx = (Math.random() - 0.5) * 10;
            k.vy = -5;
          }
        });
        break;
    }
  }, [spawnKite]);

  useEffect(() => {
    (window as unknown as { __ARYA_TRIGGER_PIPAS_ACTION?: (act: string, evt: NormalizedEvent) => void }).__ARYA_TRIGGER_PIPAS_ACTION = handleGameAction;
    return () => {
      delete (window as unknown as { __ARYA_TRIGGER_PIPAS_ACTION?: unknown }).__ARYA_TRIGGER_PIPAS_ACTION;
    };
  }, [handleGameAction]);

  // Pipas iniciais de demonstração
  useEffect(() => {
    const bots = ['@vitin_pipas', '@darlan_cerol', '@marcelo_kyrat', '@pedro_linha10'];
    bots.forEach((b) => spawnKite(b));
  }, [spawnKite]);

  // Temporizador de rodada
  useEffect(() => {
    const timer = setInterval(() => {
      setRoundTimeLeft((prev) => {
        if (prev <= 1) {
          playersRef.current.forEach((k) => {
            k.isCut = false;
            k.life = 100;
            k.x = 220 + Math.random() * 640;
            k.y = 400 + Math.random() * 460;
            k.tailNodes = initTailNodes(k.x, k.y + 55, 20);
          });
          confetti({ particleCount: 70, spread: 90, origin: { y: 0.3 } });
          return 90;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Loop de Renderização e Física de Alta Precisão (Canvas 60fps)
  useEffect(() => {
    let animId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const V_WIDTH = 1080;
    const V_HEIGHT = 1920;

    let frameCount = 0;
    let lastFpsTime = performance.now();
    let lastFrameTime = performance.now();

    const loop = (currentTime: number) => {
      frameCount++;
      if (currentTime - lastFpsTime >= 1000) {
        setMeasuredFps(Math.round((frameCount * 1000) / (currentTime - lastFpsTime)));
        frameCount = 0;
        lastFpsTime = currentTime;
      }

      const dt = Math.min((currentTime - lastFrameTime) / 1000, 0.08);
      lastFrameTime = currentTime;

      ctx.clearRect(0, 0, V_WIDTH, V_HEIGHT);

      // 1. Cenário e Céu Natural (Idêntico ao TikTok LIVE dos prints)
      if (bgMode === 'chroma_green') {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      } else if (bgMode === 'chroma_magenta') {
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      } else if (!isTransparentBg && bgMode === 'scene') {
        // Céu azul vivo com gradiente ensolarado
        const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT);
        skyGrad.addColorStop(0, '#0284C7');     // Azul céu intenso topo
        skyGrad.addColorStop(0.55, '#38BDF8');  // Azul claro médio
        skyGrad.addColorStop(0.82, '#FDE68A');  // Horizonte dourado pôr do sol
        skyGrad.addColorStop(1, '#FB923C');     // Laranja suave na base
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);

        // Nuvens fofas em camadas com transparência suave
        const renderCloud = (cx: number, cy: number, scale: number, alpha: number) => {
          ctx.save();
          ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
          ctx.beginPath();
          ctx.arc(cx, cy, 55 * scale, 0, Math.PI * 2);
          ctx.arc(cx + 45 * scale, cy - 20 * scale, 65 * scale, 0, Math.PI * 2);
          ctx.arc(cx + 105 * scale, cy - 10 * scale, 55 * scale, 0, Math.PI * 2);
          ctx.arc(cx + 150 * scale, cy + 10 * scale, 45 * scale, 0, Math.PI * 2);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        };

        const t = currentTime * 0.00008;
        renderCloud(((180 + t * 400) % (V_WIDTH + 300)) - 150, 360, 1.2, 0.55);
        renderCloud(((720 + t * 250) % (V_WIDTH + 300)) - 150, 520, 1.0, 0.45);
        renderCloud(((380 + t * 320) % (V_WIDTH + 300)) - 150, 780, 1.4, 0.4);

        // Silhueta de lajes e telhados da comunidade / cidade no horizonte (como no print!)
        ctx.save();
        ctx.fillStyle = '#1E1B4B'; // Silhueta escura azul-índigo
        ctx.beginPath();
        ctx.moveTo(0, V_HEIGHT);
        ctx.lineTo(0, V_HEIGHT * 0.85);

        // Geometria de casas, caixas d'água e lajes
        const roofs = [
          { w: 90, h: 40 }, { w: 110, h: 70 }, { w: 80, h: 50 }, { w: 140, h: 90 },
          { w: 100, h: 60 }, { w: 120, h: 100 }, { w: 90, h: 45 }, { w: 130, h: 75 },
          { w: 110, h: 55 }, { w: 110, h: 80 }
        ];
        let currX = 0;
        roofs.forEach((r) => {
          ctx.lineTo(currX, V_HEIGHT * 0.85 - r.h);
          ctx.lineTo(currX + r.w, V_HEIGHT * 0.85 - r.h);
          currX += r.w;
        });
        ctx.lineTo(V_WIDTH, V_HEIGHT * 0.85);
        ctx.lineTo(V_WIDTH, V_HEIGHT);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }

      // 2. Física das Pipas (Voo aerodinâmico e empuxo)
      const players = Array.from(playersRef.current.values());

      players.forEach((kite) => {
        const isTurbo = !!(kite.turboActiveUntil && kite.turboActiveUntil > Date.now());
        const speedFactor = isTurbo ? 2.5 : 1.0;

        if (kite.isCut) {
          // Pipa cortada girando e caindo ("pipa avoada")
          kite.vy += 9.8 * dt;
          kite.x += kite.vx * 32 * dt;
          kite.y += kite.vy * 32 * dt;
          kite.angle += 4.2 * dt;
          return;
        }

        // Puxada suave simulada de empinar pipa
        const targetHoverX = kite.targetX + Math.sin(currentTime * 0.002 + kite.y * 0.01) * 60;
        const targetHoverY = kite.targetY + Math.cos(currentTime * 0.0018 + kite.x * 0.01) * 35;

        kite.vx += (targetHoverX - kite.x) * 1.5 * dt * speedFactor;
        kite.vy += (targetHoverY - kite.y) * 1.5 * dt * speedFactor;

        kite.vx *= 0.92;
        kite.vy *= 0.92;

        kite.x += kite.vx * dt * 35;
        kite.y += kite.vy * dt * 35;

        // Limites de tela verticais
        if (kite.x < 140) { kite.x = 140; kite.vx *= -0.5; }
        if (kite.x > V_WIDTH - 140) { kite.x = V_WIDTH - 140; kite.vx *= -0.5; }
        if (kite.y < 260) { kite.y = 260; kite.vy *= -0.5; }
        if (kite.y > V_HEIGHT * 0.72) { kite.y = V_HEIGHT * 0.72; kite.vy *= -0.5; }

        // Inclinação suave da pipa em curva
        kite.angle = (kite.vx * 0.08) + Math.sin(currentTime * 0.003 + kite.x) * 0.05;

        // FÍSICA DE VERLET DA RABIOLA (Chain Physics de 20 nós com gravidade e arrasto)
        const tailOriginX = kite.x - Math.sin(kite.angle) * 45;
        const tailOriginY = kite.y + Math.cos(kite.angle) * 45;

        kite.tailNodes[0].x = tailOriginX;
        kite.tailNodes[0].y = tailOriginY;

        for (let i = 1; i < kite.tailNodes.length; i++) {
          const node = kite.tailNodes[i];
          const vx = (node.x - node.oldX) * 0.88;
          const vy = (node.y - node.oldY) * 0.88;

          node.oldX = node.x;
          node.oldY = node.y;

          // Gravidade suave + vento horizontal ondulatório
          const windFlutter = Math.sin(currentTime * 0.006 + i * 0.4) * (2.5 + i * 0.4);
          node.x += vx + windFlutter;
          node.y += vy + 1.8; // Gravidade puxando para baixo
        }

        // Restrição de distância entre nós (Constrained Distance)
        const segmentDist = 14;
        for (let iter = 0; iter < 3; iter++) {
          for (let i = 1; i < kite.tailNodes.length; i++) {
            const prev = kite.tailNodes[i - 1];
            const curr = kite.tailNodes[i];
            const dx = curr.x - prev.x;
            const dy = curr.y - prev.y;
            const dist = Math.hypot(dx, dy) || 1;
            const diff = (dist - segmentDist) / dist;

            curr.x -= dx * 0.75 * diff;
            curr.y -= dy * 0.75 * diff;
          }
        }
      });

      // 3. Detecção de Cruzamento de Linhas e Efeito de Faíscas Incandescentes
      lineFrictionPointsRef.current = [];

      for (let i = 0; i < players.length; i++) {
        for (let j = i + 1; j < players.length; j++) {
          const kA = players[i];
          const kB = players[j];

          if (kA.isCut || kB.isCut) continue;

          // Âncoras das linhas na base (espectadores no chão/laje)
          const anchorAX = V_WIDTH * 0.25 + (i % 3) * 240;
          const anchorAY = V_HEIGHT * 0.98;
          const anchorBX = V_WIDTH * 0.25 + (j % 3) * 240;
          const anchorBY = V_HEIGHT * 0.98;

          // Ponto de interseção aproximado das retas/curvas das linhas
          const midAX = (anchorAX + kA.x) / 2;
          const midAY = (anchorAY + kA.y) / 2;
          const midBX = (anchorBX + kB.x) / 2;
          const midBY = (anchorBY + kB.y) / 2;

          const lineDist = Math.hypot(midAX - midBX, midAY - midBY);

          // Quando as linhas cruzam e atritam:
          if (lineDist < 65 || Math.hypot(kA.x - kB.x, kA.y - kB.y) < 95) {
            const contactX = (midAX + midBX) / 2;
            const contactY = (midAY + midBY) / 2;

            lineFrictionPointsRef.current.push({ x: contactX, y: contactY, intensity: 1.0 });

            // Dispara faíscas brilhantes de cerol
            for (let s = 0; s < 4; s++) {
              sparksRef.current.push({
                x: contactX + (Math.random() - 0.5) * 10,
                y: contactY + (Math.random() - 0.5) * 10,
                vx: (Math.random() - 0.5) * 14,
                vy: (Math.random() - 0.5) * 14 - 2,
                color: Math.random() > 0.3 ? '#FDE047' : '#FB923C',
                size: 2 + Math.random() * 4,
                life: 1.0,
                maxLife: 0.35 + Math.random() * 0.25
              });
            }

            // Dano contínuo de atrito na barra de vida
            const cerolA = !!(kA.cerolActiveUntil && kA.cerolActiveUntil > Date.now());
            const cerolB = !!(kB.cerolActiveUntil && kB.cerolActiveUntil > Date.now());
            const shieldA = !!(kA.shieldActiveUntil && kA.shieldActiveUntil > Date.now());
            const shieldB = !!(kB.shieldActiveUntil && kB.shieldActiveUntil > Date.now());

            const damageA = shieldB ? 0 : (cerolB ? 2.4 : 0.8);
            const damageB = shieldA ? 0 : (cerolA ? 2.4 : 0.8);

            kA.life = Math.max(0, kA.life - damageA);
            kB.life = Math.max(0, kB.life - damageB);

            // Resolução do corte quando a vida de um esgota
            if (kA.life <= 0 || kB.life <= 0) {
              const victim = kA.life <= 0 ? kA : kB;
              const winner = kA.life <= 0 ? kB : kA;

              victim.isCut = true;
              victim.cutTimestamp = Date.now();
              victim.vx = (Math.random() - 0.5) * 10;
              victim.vy = -5;

              winner.score += 100;
              winner.cutsMade += 1;
              winner.life = Math.min(100, winner.life + 35);

              setTotalCutsSession((prev) => prev + 1);
              setRecentCutBanner({ winner: winner.username, victim: victim.username });
              setTimeout(() => setRecentCutBanner(null), 4000);

              soundEngine.playKiteCut();

              // Explosão de confetes e faíscas no corte
              for (let exp = 0; exp < 40; exp++) {
                sparksRef.current.push({
                  x: victim.x,
                  y: victim.y,
                  vx: (Math.random() - 0.5) * 18,
                  vy: (Math.random() - 0.5) * 18,
                  color: exp % 2 === 0 ? '#EF4444' : '#F59E0B',
                  size: 4 + Math.random() * 5,
                  life: 1.0,
                  maxLife: 0.8
                });
              }
            }
          }
        }
      }

      // 4. Renderização das Linhas de Pipa com Brilho e Tensão
      players.forEach((kite, idx) => {
        const anchorX = V_WIDTH * 0.25 + (idx % 3) * 240;
        const anchorY = V_HEIGHT * 0.98;

        if (!kite.isCut) {
          ctx.save();
          ctx.beginPath();
          ctx.moveTo(anchorX, anchorY);

          // Curva de catenária natural
          const isCerol = !!(kite.cerolActiveUntil && kite.cerolActiveUntil > Date.now());
          const isShield = !!(kite.shieldActiveUntil && kite.shieldActiveUntil > Date.now());

          const midX = (anchorX + kite.x) / 2 + Math.sin(currentTime * 0.003) * 12;
          const midY = (anchorY + kite.y) / 2 + 25;
          ctx.quadraticCurveTo(midX, midY, kite.x, kite.y);

          if (isCerol) {
            ctx.strokeStyle = '#EF4444';
            ctx.lineWidth = 4;
            ctx.shadowColor = '#DC2626';
            ctx.shadowBlur = 12;
          } else if (isShield) {
            ctx.strokeStyle = '#38BDF8';
            ctx.lineWidth = 3.5;
            ctx.shadowColor = '#0284C7';
            ctx.shadowBlur = 10;
          } else {
            // Linha branca/amarela pura
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.88)';
            ctx.lineWidth = 2.4;
          }
          ctx.stroke();
          ctx.restore();
        }

        // 5. Renderização da Rabiola com Fitilhos de Seda Balançando
        ctx.save();
        for (let i = 1; i < kite.tailNodes.length; i++) {
          const prev = kite.tailNodes[i - 1];
          const curr = kite.tailNodes[i];

          // Linha guia da rabiola
          ctx.strokeStyle = 'rgba(15, 23, 42, 0.7)';
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(curr.x, curr.y);
          ctx.stroke();

          // Fitilho amarrado a cada 2 nós (papel de seda colorido voando)
          if (i % 2 === 0) {
            const fitilhoColor = i % 4 === 0 ? kite.color : '#FBBF24';
            const ribbonW = 16 + (i % 3) * 4;
            const ribbonH = 6;
            const flutterAngle = Math.sin(currentTime * 0.008 + i) * 0.4;

            ctx.save();
            ctx.translate(curr.x, curr.y);
            ctx.rotate(flutterAngle);
            ctx.fillStyle = fitilhoColor;
            ctx.fillRect(-ribbonW / 2, -ribbonH / 2, ribbonW, ribbonH);
            ctx.strokeStyle = '#0F172A';
            ctx.lineWidth = 1;
            ctx.strokeRect(-ribbonW / 2, -ribbonH / 2, ribbonW, ribbonH);
            ctx.restore();
          }
        }
        ctx.restore();

        // 6. Renderização da Pipa com Estampa Geométrica Brasileira
        ctx.save();
        ctx.translate(kite.x, kite.y);
        ctx.rotate(kite.angle);

        const kW = 48;
        const kTop = 44;
        const kBottom = 68;

        // Corpo da Pipa (Losango Raia Carioca)
        ctx.beginPath();
        ctx.moveTo(0, -kTop);
        ctx.lineTo(kW, 0);
        ctx.lineTo(0, kBottom);
        ctx.lineTo(-kW, 0);
        ctx.closePath();

        ctx.fillStyle = kite.color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = '#0F172A';
        ctx.stroke();

        // Estampa interna geométrica de seda (Faixa central / triângulos)
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.moveTo(0, -kTop);
        ctx.lineTo(kW * 0.5, 0);
        ctx.lineTo(0, kBottom * 0.55);
        ctx.lineTo(-kW * 0.5, 0);
        ctx.closePath();
        ctx.fill();

        // Vareta central de bambu
        ctx.strokeStyle = '#78350F';
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        ctx.moveTo(0, -kTop);
        ctx.lineTo(0, kBottom);
        ctx.stroke();

        // Verga curvada de fibra de vidro (horizontal)
        ctx.beginPath();
        ctx.moveTo(-kW, 0);
        ctx.quadraticCurveTo(0, -12, kW, 0);
        ctx.stroke();

        // Avatar / Foto do Espectador no centro da pipa (como no print da live!)
        if (kite.avatarImg && !kite.isCut) {
          ctx.save();
          ctx.beginPath();
          ctx.arc(0, 4, 18, 0, Math.PI * 2);
          ctx.clip();
          ctx.drawImage(kite.avatarImg, -18, -14, 36, 36);
          ctx.restore();

          ctx.beginPath();
          ctx.arc(0, 4, 18, 0, Math.PI * 2);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        }

        ctx.restore();

        // 7. Barra de Vida/Cerol e Nome do Jogador (Estilo Pipa Combate Live)
        if (!kite.isCut) {
          ctx.save();
          const hudY = kite.y - 75;

          // Barra de vida slim sobre a pipa
          const barW = 70;
          const barH = 7;
          ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
          ctx.fillRect(kite.x - barW / 2, hudY - 14, barW, barH);

          // Preenchimento de vida (Verde -> Amarelo -> Vermelho)
          const lifePct = kite.life / kite.maxLife;
          ctx.fillStyle = lifePct > 0.5 ? '#10B981' : lifePct > 0.25 ? '#F59E0B' : '#EF4444';
          ctx.fillRect(kite.x - barW / 2, hudY - 14, barW * lifePct, barH);
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 1;
          ctx.strokeRect(kite.x - barW / 2, hudY - 14, barW, barH);

          // Nome do Espectador (@usuario)
          ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 6;
          ctx.fillText(kite.username, kite.x, hudY + 12);

          ctx.restore();
        }
      });

      // 8. Renderização das Faíscas Incandescentes (Additive Blending para Brilho Real)
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      for (let sIdx = sparksRef.current.length - 1; sIdx >= 0; sIdx--) {
        const s = sparksRef.current[sIdx];
        s.x += s.vx;
        s.y += s.vy;
        s.life -= dt * (1.0 / s.maxLife);

        if (s.life <= 0) {
          sparksRef.current.splice(sIdx, 1);
          continue;
        }

        ctx.fillStyle = s.color;
        ctx.globalAlpha = s.life;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.size * s.life, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isTransparentBg, bgMode]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-slate-950 overflow-hidden select-none">
      <div className={`relative aspect-[9/16] h-full max-h-[880px] shadow-2xl rounded-2xl overflow-hidden border border-slate-800 ${
        isTransparentBg && bgMode === 'alpha' ? 'bg-transparent' : 'bg-slate-900'
      }`}>
        <canvas
          ref={canvasRef}
          width={1080}
          height={1920}
          className="w-full h-full object-contain block"
        />

        {/* HUD Superior Oficial (Exatamente como o vídeo da LIVE enviado) */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          {/* Badge LIVE vermelho + Contador de tempo */}
          <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-slate-700/60 flex items-center gap-2.5 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-white uppercase font-mono">LIVE</span>
            <span className="text-slate-500">|</span>
            <span className="text-xs font-mono font-bold text-amber-400">{roundTimeLeft}s</span>
          </div>

          {/* Cortes acumulados e jogadores */}
          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 flex items-center gap-3 text-xs font-mono text-slate-300">
            <span className="text-amber-400 font-bold">✂️ {totalCutsSession}</span>
            <span className="text-slate-500">·</span>
            <span className="text-emerald-400 font-bold">🪁 {activePlayerCount}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{measuredFps} FPS</span>
          </div>
        </div>

        {/* Notificação Flutuante de Corte Recente (Estilo Pill com Borda Vermelha do Vídeo) */}
        {recentCutBanner && (
          <div className="absolute top-16 left-6 right-6 z-20 flex justify-center pointer-events-none animate-bounce">
            <div className="bg-slate-950/95 border-2 border-red-500 rounded-full px-5 py-2 shadow-2xl shadow-red-500/30 flex items-center gap-2 text-xs">
              <span className="text-base">✂️</span>
              <span className="text-white font-bold">{recentCutBanner.winner}</span>
              <span className="text-red-400 font-bold uppercase text-[10px]">CORTOU</span>
              <span className="text-slate-300 line-through text-[11px]">{recentCutBanner.victim}</span>
              <span className="text-amber-400 font-mono font-bold ml-1">+100 pts</span>
            </div>
          </div>
        )}

        {/* Rodapé Flutuante de Instrução da LIVE */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md rounded-2xl p-3 border border-amber-500/30 flex items-center justify-between text-xs shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-base shadow-inner">
              🪁
            </div>
            <div>
              <p className="text-xs font-bold text-white">Comente <span className="text-amber-400 font-mono">!jogar</span> para subir pipa</p>
              <p className="text-[10px] text-slate-400">Rosa = Turbo · Coração = Linha Chilena · Leão = Raio</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400">Relos:</span>
            <p className="text-sm font-extrabold text-amber-400 font-mono">{totalCutsSession}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
