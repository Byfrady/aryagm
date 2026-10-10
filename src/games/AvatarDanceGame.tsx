/**
 * ARYA GM — Avatar Dance Live (Roblox 3D Imersivo)
 * Baseado diretamente nas transmissões reais do TikTok LIVE e RavenGames:
 * - Personagens com proporções e acessórios R6/R15 idênticos ao Roblox (Boné LA, Cabelo Anime/Chiquinhas, Moai Gigante, Abóbora, Capuz).
 * - Faixa superior com Cards Neon de Presentes oficiais (SKIP LINE, 3 SECONDS SCENE, GIANT, SUPER GIANT) e aviso vermelho de username.
 * - Holofote circular neon no chão sob o dançarino em destaque.
 * - Crachá de identificação fiel ao Roblox: fundo preto arredondado, nome amarelo, @arroba branco e balãozinho de fala.
 * - Efeito 3D de presente flutuante translúcido com anéis planetários (Coração/Galáxia com mãos holográficas, idêntico à imagem 2).
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AvatarPlayer, NormalizedEvent } from '../types';
import { soundEngine } from '../services/soundEngine';
import { robloxAvatarService } from '../services/robloxAvatarService';
import confetti from 'canvas-confetti';

interface AvatarDanceGameProps {
  isTransparentBg?: boolean;
  bgMode?: 'alpha' | 'chroma_green' | 'chroma_magenta' | 'scene';
}

interface RobloxCostume {
  type: 'la_cap_hoodie' | 'anime_pigtails' | 'pumpkin_head' | 'batman_suit' | 'white_cyber' | 'moai_giant';
  primaryColor: string;
  pantsColor: string;
  hatColor: string;
  quote: string;
}

const COSTUMES: RobloxCostume[] = [
  {
    type: 'la_cap_hoodie',
    primaryColor: '#F8FAFC', // Moletom branco oversize
    pantsColor: '#334155',   // Jeans cargo
    hatColor: '#F472B6',     // Boné LA rosa
    quote: "sorry ladies i'm sigma"
  },
  {
    type: 'anime_pigtails',
    primaryColor: '#86EFAC', // Top verde/floral
    pantsColor: '#FDE047',   // Saia amarela
    hatColor: '#18181B',     // Cabelo preto com laços
    quote: "bora dançar galera!"
  },
  {
    type: 'pumpkin_head',
    primaryColor: '#0F172A', // Roupa preta
    pantsColor: '#0F172A',
    hatColor: '#F97316',     // Cabeça de abóbora brilhante
    quote: "halloween vibe 🎃"
  },
  {
    type: 'batman_suit',
    primaryColor: '#1E293B', // Armadura tática
    pantsColor: '#0F172A',
    hatColor: '#020617',     // Máscara
    quote: "i am the night 🦇"
  },
  {
    type: 'white_cyber',
    primaryColor: '#E2E8F0',
    pantsColor: '#94A3B8',
    hatColor: '#FFFFFF',
    quote: "vip dance live"
  }
];

export const AvatarDanceGame: React.FC<AvatarDanceGameProps> = ({
  isTransparentBg = false,
  bgMode = 'scene'
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const dancersRef = useRef<Map<string, AvatarPlayer & { costume: RobloxCostume }>>(new Map());
  const floatingGiftRef = useRef<{ name: string; coins: number; life: number; maxLife: number } | null>(null);
  const imageCacheRef = useRef<Map<string, HTMLImageElement>>(new Map());

  const [activeDancersCount, setActiveDancersCount] = useState<number>(0);
  const [currentBpm] = useState<number>(128);
  const [isMusicOn, setIsMusicOn] = useState<boolean>(false);
  const [measuredFps, setMeasuredFps] = useState<number>(60);
  const [activeSpotlightUser, setActiveSpotlightUser] = useState<string>('dnhhhxx');

  const preloadAvatarImage = useCallback((url: string) => {
    if (imageCacheRef.current.has(url)) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = url;
    img.onload = () => imageCacheRef.current.set(url, img);
  }, []);

  // Adiciona avatar ao palco com figurino autêntico do Roblox
  const spawnDancer = useCallback(async (username: string, robloxIdentifier?: string, giftCoins: number = 0) => {
    const existing = dancersRef.current.get(username);
    if (existing) {
      existing.danceStyle = ['floss', 'breakdance', 'disco', 'robot', 'salsa'][Math.floor(Math.random() * 5)] as AvatarPlayer['danceStyle'];
      existing.totalGifts += giftCoins;
      existing.spotlightUntil = Date.now() + 10000;
      setActiveSpotlightUser(username);
      return;
    }

    const targetRoblox = robloxIdentifier || username;
    const resolvedData = await robloxAvatarService.resolveRobloxUser(targetRoblox);

    if (resolvedData.headshotThumbnailUrl) preloadAvatarImage(resolvedData.headshotThumbnailUrl);
    if (resolvedData.avatarThumbnailUrl) preloadAvatarImage(resolvedData.avatarThumbnailUrl);

    const costumeIndex = dancersRef.current.size % COSTUMES.length;
    const costume = COSTUMES[costumeIndex];

    const currentCount = dancersRef.current.size;
    const gridCols = [-1.4, -0.7, 0, 0.7, 1.4];
    const gridRows = [0.9, 1.35, 1.8];
    const x = gridCols[currentCount % gridCols.length];
    const y = gridRows[Math.floor(currentCount / gridCols.length) % gridRows.length];

    const newDancer: AvatarPlayer & { costume: RobloxCostume } = {
      id: `dancer_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      username,
      robloxUsername: resolvedData.username,
      robloxData: resolvedData,
      avatarColor: costume.primaryColor,
      x,
      y,
      danceStyle: currentCount === 0 ? 'breakdance' : (['floss', 'disco', 'robot', 'salsa'][currentCount % 4] as AvatarPlayer['danceStyle']),
      scale: 1.0,
      joinedAt: Date.now(),
      totalGifts: giftCoins,
      costume,
      spotlightUntil: currentCount === 0 ? Date.now() + 60000 : undefined
    };

    dancersRef.current.set(username, newDancer);
    setActiveDancersCount(dancersRef.current.size);
    if (currentCount === 0) setActiveSpotlightUser(username);
  }, [preloadAvatarImage]);

  // Ações externas
  const handleGameAction = useCallback((action: string, event: NormalizedEvent) => {
    const username = event.user.displayName;
    const dancer = dancersRef.current.get(username);

    switch (action) {
      case 'spawn_avatar': {
        const robloxArg = event.commentText?.replace('!entrar', '').trim() || username;
        spawnDancer(username, robloxArg);
        break;
      }

      case 'confetti_shower':
        confetti({ particleCount: 60, spread: 100, origin: { y: 0.35 } });
        break;

      case 'vip_spotlight':
        if (dancer) {
          dancer.spotlightUntil = Date.now() + 12000;
          dancer.totalGifts += event.gift?.coins || 99;
          setActiveSpotlightUser(username);
          soundEngine.playShield();
        } else {
          spawnDancer(username, username, event.gift?.coins || 99);
        }
        break;

      case 'giant_scale':
        if (dancer) {
          dancer.giantUntil = Date.now() + 14000;
          dancer.totalGifts += event.gift?.coins || 1000;
          setActiveSpotlightUser(username);
          soundEngine.playGiftFanfare(1000);
          confetti({ particleCount: 90, spread: 120, origin: { y: 0.4 } });
        }
        break;

      case 'super_dance_solo':
        soundEngine.playGiftFanfare(29999);
        confetti({ particleCount: 160, spread: 140, origin: { y: 0.25 } });
        if (dancer) {
          dancer.soloUntil = Date.now() + 18000;
          dancer.danceStyle = 'breakdance';
          setActiveSpotlightUser(username);
        }
        break;
    }

    // Ativa presente 3D holográfico flutuante no meio da tela (como no print 2!)
    if (event.eventType === 'gift' && event.gift) {
      floatingGiftRef.current = {
        name: event.gift.name,
        coins: event.gift.coins,
        life: 1.0,
        maxLife: 4.5
      };
    }
  }, [spawnDancer]);

  useEffect(() => {
    (window as unknown as { __ARYA_TRIGGER_AVATAR_ACTION?: (act: string, evt: NormalizedEvent) => void }).__ARYA_TRIGGER_AVATAR_ACTION = handleGameAction;
    return () => {
      delete (window as unknown as { __ARYA_TRIGGER_AVATAR_ACTION?: unknown }).__ARYA_TRIGGER_AVATAR_ACTION;
    };
  }, [handleGameAction]);

  // Semeia os avatares inspirados nas capturas reais enviadas pelo usuário
  useEffect(() => {
    const defaultRoster = [
      { name: 'dnhhhxx', roblox: 'dnhhhxx' },
      { name: 'lola_2y', roblox: 'lola_2y' },
      { name: 'firelays840', roblox: 'firelays840' },
      { name: 'blalaraca', roblox: 'blalaraca' }
    ];
    defaultRoster.forEach((b) => spawnDancer(b.name, b.roblox));
  }, [spawnDancer]);

  const toggleMusic = () => {
    if (isMusicOn) {
      soundEngine.stopMusic();
      setIsMusicOn(false);
    } else {
      soundEngine.startDanceMusic();
      setIsMusicOn(true);
    }
  };

  // Loop de Renderização Canvas (Roblox 3D Autêntico)
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

      // 1. Cenário: Baseplate do Roblox com Céu Aberto e Piso Quadriculado Suave
      if (bgMode === 'chroma_green') {
        ctx.fillStyle = '#00FF00';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      } else if (bgMode === 'chroma_magenta') {
        ctx.fillStyle = '#FF00FF';
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT);
      } else if (!isTransparentBg && bgMode === 'scene') {
        // Céu suave do Roblox Studio com gradiente atmosférico
        const skyGrad = ctx.createLinearGradient(0, 0, 0, V_HEIGHT * 0.75);
        skyGrad.addColorStop(0, '#7EA6D8');
        skyGrad.addColorStop(0.5, '#B7D0E8');
        skyGrad.addColorStop(1, '#D8E5F3');
        ctx.fillStyle = skyGrad;
        ctx.fillRect(0, 0, V_WIDTH, V_HEIGHT * 0.75);

        // Horizonte e Chão Baseplate (Textura cinza suave com grade)
        const floorY = V_HEIGHT * 0.52;
        const groundGrad = ctx.createLinearGradient(0, floorY, 0, V_HEIGHT);
        groundGrad.addColorStop(0, '#94A3B8');
        groundGrad.addColorStop(1, '#64748B');
        ctx.fillStyle = groundGrad;
        ctx.fillRect(0, floorY, V_WIDTH, V_HEIGHT - floorY);

        // Linhas de perspectiva quadriculadas do Baseplate do Roblox Studio
        ctx.save();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.18)';
        ctx.lineWidth = 1.5;

        // Linhas horizontais com espaçamento de profundidade
        for (let i = 0; i <= 8; i++) {
          const depthY = floorY + Math.pow(i / 8, 1.7) * (V_HEIGHT - floorY);
          ctx.beginPath();
          ctx.moveTo(0, depthY);
          ctx.lineTo(V_WIDTH, depthY);
          ctx.stroke();
        }

        // Linhas de fuga em perspectiva
        for (let col = -4; col <= 4; col++) {
          ctx.beginPath();
          ctx.moveTo(V_WIDTH / 2, floorY - 30);
          ctx.lineTo(V_WIDTH / 2 + col * 260, V_HEIGHT);
          ctx.stroke();
        }
        ctx.restore();

        // 2. Avatar Moai Gigante no Fundo (Como visto na Imagem 8 da live!)
        ctx.save();
        const moaiX = V_WIDTH * 0.22;
        const moaiY = floorY - 30;
        ctx.fillStyle = '#475569';
        // Cabeça Moai estilo estátua da ilha de páscoa
        ctx.beginPath();
        ctx.roundRect(moaiX - 70, moaiY - 260, 140, 240, 20);
        ctx.fill();
        ctx.strokeStyle = '#1E293B';
        ctx.lineWidth = 3;
        ctx.stroke();

        // Nariz e sobrancelha Moai
        ctx.fillStyle = '#334155';
        ctx.fillRect(moaiX - 16, moaiY - 190, 32, 100);
        ctx.fillRect(moaiX - 55, moaiY - 220, 110, 20); // Sobrancelha
        ctx.fillRect(moaiX - 35, moaiY - 70, 70, 14);  // Lábio inferior

        // Etiqueta Moai
        ctx.font = 'bold 18px sans-serif';
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.textAlign = 'center';
        ctx.fillText('Lungs_m9', moaiX, moaiY + 30);
        ctx.restore();
      }

      // 3. Renderização dos Avatares do Roblox (Proporções e Rigs R6 Autênticos)
      const dancers = Array.from(dancersRef.current.values()).sort((a, b) => a.y - b.y);
      const floorHorizon = V_HEIGHT * 0.52;
      const floorBottom = V_HEIGHT * 0.95;

      const beatPhase = (currentTime * 0.006) % (Math.PI * 2);
      const bounce = Math.abs(Math.sin(beatPhase));

      dancers.forEach((dancer, idx) => {
        const isGiant = !!(dancer.giantUntil && dancer.giantUntil > Date.now());
        const isSpotlight = dancer.username === activeSpotlightUser || !!(dancer.spotlightUntil && dancer.spotlightUntil > Date.now());
        const isSolo = !!(dancer.soloUntil && dancer.soloUntil > Date.now());

        const scaleFactor = 0.82 + dancer.y * 0.38;
        const finalScale = (isGiant ? 2.0 : 1.0) * scaleFactor;

        let screenX = V_WIDTH / 2 + dancer.x * (180 + dancer.y * 110);
        let screenY = floorHorizon + (dancer.y / 2.0) * (floorBottom - floorHorizon);

        if (isSolo) {
          screenX = V_WIDTH / 2;
          screenY = floorHorizon + 0.65 * (floorBottom - floorHorizon);
        }

        // CÍRCULO HOLOFOTE NEON NO CHÃO (Como no print da live do TikTok!)
        if (isSpotlight || isSolo) {
          ctx.save();
          ctx.translate(screenX, screenY + 12);
          ctx.scale(1, 0.42); // Projeção em elipse no plano do chão
          ctx.beginPath();
          ctx.arc(0, 0, 75 * finalScale, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(250, 204, 21, 0.35)'; // Amarelo brilhante
          ctx.fill();
          ctx.lineWidth = 5;
          ctx.strokeStyle = '#FACC15';
          ctx.shadowColor = '#EAB308';
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.restore();
        }

        ctx.save();
        ctx.translate(screenX, screenY);

        // Sombra suave dos pés
        ctx.fillStyle = 'rgba(15, 23, 42, 0.45)';
        ctx.beginPath();
        ctx.ellipse(0, 8, 48 * finalScale, 16 * finalScale, 0, 0, Math.PI * 2);
        ctx.fill();

        // Cinemática de Dança do Roblox R6
        let torsoAngle = 0;
        let leftArmAngle = 0;
        let rightArmAngle = 0;
        let leftLegAngle = 0;
        let rightLegAngle = 0;
        let headBob = bounce * 8 * finalScale;

        if (dancer.danceStyle === 'breakdance') {
          torsoAngle = currentTime * 0.007; // Giro contínuo de break
          headBob = -20 * finalScale;
          leftArmAngle = 2.4;
          rightArmAngle = -2.4;
          leftLegAngle = Math.sin(currentTime * 0.01) * 0.7;
          rightLegAngle = -Math.sin(currentTime * 0.01) * 0.7;
        } else if (dancer.danceStyle === 'floss') {
          torsoAngle = Math.sin(currentTime * 0.01) * 0.2;
          leftArmAngle = Math.sin(currentTime * 0.01) * 1.3;
          rightArmAngle = Math.sin(currentTime * 0.01) * 1.3;
        } else if (dancer.danceStyle === 'disco') {
          leftArmAngle = Math.sin(currentTime * 0.008) * 1.4 - 0.4;
          rightArmAngle = -0.4;
          torsoAngle = Math.sin(currentTime * 0.006) * 0.12;
        } else {
          // Emote dança padrão
          torsoAngle = Math.sin(currentTime * 0.006) * 0.15;
          leftArmAngle = Math.cos(currentTime * 0.006) * 0.8;
          rightArmAngle = -Math.cos(currentTime * 0.006) * 0.8;
          leftLegAngle = Math.sin(currentTime * 0.006) * 0.4;
          rightLegAngle = -Math.sin(currentTime * 0.006) * 0.4;
        }

        ctx.rotate(torsoAngle);

        // --- RENDERIZAÇÃO DO BONECO ROBLOX R6 (Geometria em Blocos de Alta Precisão) ---
        const b = finalScale * 1.15;

        // 1. Pernas em bloco (Left & Right Legs)
        ctx.fillStyle = dancer.costume.pantsColor;
        // Perna Esquerda
        ctx.save();
        ctx.translate(-14 * b, -32 * b);
        ctx.rotate(leftLegAngle);
        ctx.fillRect(-8 * b, 0, 16 * b, 32 * b);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8 * b, 0, 16 * b, 32 * b);
        // Tênis na sola
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-8 * b, 24 * b, 16 * b, 8 * b);
        ctx.restore();

        // Perna Direita
        ctx.save();
        ctx.translate(14 * b, -32 * b);
        ctx.rotate(rightLegAngle);
        ctx.fillStyle = dancer.costume.pantsColor;
        ctx.fillRect(-8 * b, 0, 16 * b, 32 * b);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8 * b, 0, 16 * b, 32 * b);
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(-8 * b, 24 * b, 16 * b, 8 * b);
        ctx.restore();

        // 2. Tronco em Bloco (Torso Retangular R6)
        ctx.fillStyle = dancer.costume.primaryColor;
        ctx.fillRect(-22 * b, -72 * b, 44 * b, 40 * b);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 2;
        ctx.strokeRect(-22 * b, -72 * b, 44 * b, 40 * b);

        // Detalhe de estampa / cordão no moletom
        ctx.fillStyle = '#94A3B8';
        ctx.fillRect(-3 * b, -70 * b, 6 * b, 14 * b);

        // 3. Braços em Bloco com Mãos Amarelas R6
        // Braço Esquerdo
        ctx.save();
        ctx.translate(-26 * b, -70 * b);
        ctx.rotate(leftArmAngle);
        ctx.fillStyle = dancer.costume.primaryColor;
        ctx.fillRect(-8 * b, 0, 14 * b, 36 * b);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-8 * b, 0, 14 * b, 36 * b);
        // Mão cilíndrica amarela clássica do Roblox
        ctx.fillStyle = '#FCD34D';
        ctx.fillRect(-8 * b, 26 * b, 14 * b, 10 * b);
        ctx.strokeRect(-8 * b, 26 * b, 14 * b, 10 * b);
        ctx.restore();

        // Braço Direito
        ctx.save();
        ctx.translate(26 * b, -70 * b);
        ctx.rotate(rightArmAngle);
        ctx.fillStyle = dancer.costume.primaryColor;
        ctx.fillRect(-6 * b, 0, 14 * b, 36 * b);
        ctx.strokeStyle = '#0F172A';
        ctx.lineWidth = 1.5;
        ctx.strokeRect(-6 * b, 0, 14 * b, 36 * b);
        ctx.fillStyle = '#FCD34D';
        ctx.fillRect(-6 * b, 26 * b, 14 * b, 10 * b);
        ctx.strokeRect(-6 * b, 26 * b, 14 * b, 10 * b);
        ctx.restore();

        // 4. Cabeça e Acessórios Temáticos (Boné LA, Chiquinhas, Abóbora)
        ctx.save();
        ctx.translate(0, -96 * b - headBob);

        if (dancer.costume.type === 'pumpkin_head') {
          // Cabeça de Abóbora brilhante
          ctx.fillStyle = '#F97316';
          ctx.beginPath();
          ctx.arc(0, -2, 22 * b, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#C2410C';
          ctx.lineWidth = 2;
          ctx.stroke();

          // Rosto Jack-o'-Lantern iluminado
          ctx.fillStyle = '#FEF08A';
          ctx.fillRect(-8 * b, -8 * b, 5 * b, 6 * b);
          ctx.fillRect(4 * b, -8 * b, 5 * b, 6 * b);
          ctx.fillRect(-6 * b, 4 * b, 12 * b, 4 * b);
        } else if (dancer.costume.type === 'anime_pigtails') {
          // Cabeça Roblox clássica
          ctx.fillStyle = '#FCD34D';
          ctx.fillRect(-16 * b, -20 * b, 32 * b, 24 * b);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.strokeRect(-16 * b, -20 * b, 32 * b, 24 * b);

          // Rosto fofo Roblox
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-9 * b, -13 * b, 4 * b, 5 * b);
          ctx.fillRect(5 * b, -13 * b, 4 * b, 5 * b);
          ctx.beginPath();
          ctx.arc(0, -6 * b, 5 * b, 0, Math.PI);
          ctx.stroke();

          // Cabelo preto com Chiquinhas longas (Imagem 1)
          ctx.fillStyle = '#18181B';
          ctx.fillRect(-20 * b, -26 * b, 40 * b, 10 * b);
          // Chiquinha esquerda caindo
          ctx.fillRect(-26 * b, -20 * b, 10 * b, 45 * b);
          // Chiquinha direita caindo
          ctx.fillRect(16 * b, -20 * b, 10 * b, 45 * b);
        } else {
          // Cabeça com Boné LA e Moletom (Estilo dnhhhxx da Imagem 7!)
          ctx.fillStyle = '#FCD34D';
          ctx.fillRect(-16 * b, -20 * b, 32 * b, 24 * b);
          ctx.strokeStyle = '#0F172A';
          ctx.lineWidth = 2;
          ctx.strokeRect(-16 * b, -20 * b, 32 * b, 24 * b);

          // Olhos
          ctx.fillStyle = '#0F172A';
          ctx.fillRect(-9 * b, -13 * b, 4 * b, 5 * b);
          ctx.fillRect(5 * b, -13 * b, 4 * b, 5 * b);

          // Boné virado rosa LA
          ctx.fillStyle = dancer.costume.hatColor;
          ctx.fillRect(-22 * b, -26 * b, 44 * b, 9 * b);  // Aba do boné
          ctx.fillRect(-16 * b, -36 * b, 32 * b, 12 * b); // Copa do boné
          ctx.fillStyle = '#FFFFFF';
          ctx.font = `bold ${Math.floor(8 * b)}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.fillText('LA', 0, -28 * b);
        }
        ctx.restore();

        ctx.restore();

        // 5. Crachá de Identificação do Roblox Fiel à Imagem 7!
        ctx.save();
        const tagY = screenY - 115 * finalScale;

        // Fundo preto arredondado
        ctx.fillStyle = 'rgba(15, 23, 42, 0.94)';
        ctx.strokeStyle = isSpotlight ? '#FACC15' : '#475569';
        ctx.lineWidth = isSpotlight ? 2.5 : 1.5;
        ctx.beginPath();
        ctx.roundRect(screenX - 90, tagY - 28, 180, 52, 14);
        ctx.fill();
        ctx.stroke();

        // Linha 1: Nome do Roblox em Amarelo Ouro
        ctx.font = 'bold 19px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FDE047'; // Amarelo característico do print
        ctx.textAlign = 'center';
        ctx.fillText(dancer.username, screenX, tagY - 8);

        // Linha 2: @identificador em Branco
        ctx.font = 'bold 13px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.fillText(`@${dancer.robloxUsername}`, screenX, tagY + 14);

        // Linha 3: Balãozinho de Fala Estilo Comic (Imagem 7)
        ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
        ctx.strokeStyle = '#334155';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.roundRect(screenX - 70, tagY + 30, 140, 22, 11);
        ctx.fill();
        ctx.stroke();

        ctx.font = 'bold 10px sans-serif';
        ctx.fillStyle = '#E2E8F0';
        ctx.fillText(dancer.costume.quote, screenX, tagY + 44);

        ctx.restore();
      });

      // 4. EFEITO HOLOGRÁFICO 3D DE PRESENTE FLUTUANTE (Idêntico à Imagem 2 da live!)
      if (floatingGiftRef.current) {
        const gift = floatingGiftRef.current;
        gift.life -= dt * (1.0 / gift.maxLife);

        if (gift.life <= 0) {
          floatingGiftRef.current = null;
        } else {
          ctx.save();
          const centerX = V_WIDTH / 2;
          const centerY = V_HEIGHT * 0.68;
          const giftScale = (0.7 + (1 - gift.life) * 0.3) * 1.5;

          ctx.translate(centerX, centerY);
          ctx.globalAlpha = Math.min(1.0, gift.life * 2);

          // Anéis planetários girando
          ctx.save();
          ctx.rotate(currentTime * 0.003);
          ctx.beginPath();
          ctx.ellipse(0, 0, 95 * giftScale, 28 * giftScale, 0, 0, Math.PI * 2);
          ctx.strokeStyle = '#38BDF8';
          ctx.lineWidth = 5;
          ctx.shadowColor = '#0284C7';
          ctx.shadowBlur = 18;
          ctx.stroke();
          ctx.restore();

          // Esfera / Coração de cristal translúcido brilhante
          const sphereGrad = ctx.createRadialGradient(-15, -15, 5, 0, 0, 50 * giftScale);
          sphereGrad.addColorStop(0, '#FFFFFF');
          sphereGrad.addColorStop(0.4, '#38BDF8');
          sphereGrad.addColorStop(1, '#1E40AF');
          ctx.fillStyle = sphereGrad;
          ctx.beginPath();
          ctx.arc(0, 0, 48 * giftScale, 0, Math.PI * 2);
          ctx.fill();

          // Mãos holográficas de néon cor-de-rosa embaixo segurando a esfera (como na foto 2!)
          ctx.strokeStyle = '#F472B6';
          ctx.lineWidth = 6;
          ctx.shadowColor = '#EC4899';
          ctx.shadowBlur = 15;
          // Mão esquerda curvada
          ctx.beginPath();
          ctx.arc(-35 * giftScale, 40 * giftScale, 30 * giftScale, Math.PI * 0.8, Math.PI * 1.8);
          ctx.stroke();
          // Mão direita curvada
          ctx.beginPath();
          ctx.arc(35 * giftScale, 40 * giftScale, 30 * giftScale, Math.PI * 1.2, Math.PI * 0.2, true);
          ctx.stroke();

          // Texto do Presente
          ctx.font = 'bold 24px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.shadowColor = '#000000';
          ctx.shadowBlur = 8;
          ctx.fillText(`✨ ${gift.name.toUpperCase()} ✨`, 0, -70 * giftScale);

          ctx.restore();
        }
      }

      // 5. FAIXA SUPERIOR DE CARDS NEON DE PRESENTES (Idêntica às Imagens 6 e 8 da live!)
      ctx.save();
      const cardY = 80;
      const cardW = (V_WIDTH - 80) / 4;
      const cardH = 140;

      const giftCards = [
        { title: 'SKIP LINE', coins: '1 COIN', bg: '#BE185D', emoji: '🌹' },
        { title: '3 SEC SCENE', coins: '5 COINS', bg: '#DC2626', emoji: '🫰' },
        { title: 'GIANT', coins: '10 COINS', bg: '#B91C1C', emoji: '🌹' },
        { title: 'SUPER GIANT', coins: '30 COINS', bg: '#9333EA', emoji: '🍩' }
      ];

      giftCards.forEach((c, cIdx) => {
        const cX = 40 + cIdx * cardW;
        ctx.fillStyle = c.bg;
        ctx.beginPath();
        ctx.roundRect(cX + 4, cardY, cardW - 8, cardH, 14);
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Emoji / Ícone central
        ctx.font = '40px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(c.emoji, cX + cardW / 2, cardY + 55);

        // Título do Card
        ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.shadowColor = '#000000';
        ctx.shadowBlur = 4;
        ctx.fillText(c.title, cX + cardW / 2, cardY + 95);

        // Moedas
        ctx.font = 'bold 13px font-mono';
        ctx.fillStyle = '#FDE047';
        ctx.fillText(c.coins, cX + cardW / 2, cardY + 122);
      });

      // AVISO VERMELHO OFICIAL: "after gift don't forget to type your username"
      ctx.fillStyle = 'rgba(220, 38, 38, 0.95)';
      ctx.beginPath();
      ctx.roundRect(80, cardY + cardH + 16, V_WIDTH - 160, 38, 12);
      ctx.fill();
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 16px "Plus Jakarta Sans", sans-serif';
      ctx.fillStyle = '#FFFFFF';
      ctx.textAlign = 'center';
      ctx.fillText("after gift don't forget to type your username!", V_WIDTH / 2, cardY + cardH + 40);

      // Sub-aviso vermelho: "type in chat your user !"
      ctx.fillStyle = 'rgba(185, 28, 28, 0.9)';
      ctx.beginPath();
      ctx.roundRect(V_WIDTH / 2 - 160, cardY + cardH + 62, 320, 34, 10);
      ctx.fill();
      ctx.fillText("type in chat your user !", V_WIDTH / 2, cardY + cardH + 84);

      ctx.restore();

      animId = requestAnimationFrame(loop);
    };

    animId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animId);
  }, [isTransparentBg, bgMode, activeSpotlightUser]);

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

        {/* HUD Superior da Transmissão */}
        <div className="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none">
          <div className="bg-slate-950/85 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-purple-500/50 flex items-center gap-2.5 shadow-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider text-white uppercase font-mono">ROBLOX LIVE</span>
          </div>

          <div className="bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-700/60 flex items-center gap-2 text-xs font-mono font-semibold text-purple-400">
            <span>FPS:</span>
            <span className="text-white text-sm">{measuredFps}</span>
          </div>
        </div>

        {/* Botão de Música da Live */}
        <div className="absolute bottom-20 left-4 z-20">
          <button
            onClick={toggleMusic}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border flex items-center gap-1.5 shadow-xl transition-all ${
              isMusicOn
                ? 'bg-purple-600 border-purple-400 text-white shadow-purple-500/30'
                : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:text-white'
            }`}
          >
            <span>{isMusicOn ? '🔊 Som do Palco: Ativo' : '🔇 Som do Palco: Mudo'}</span>
          </button>
        </div>

        {/* Rodapé Flutuante */}
        <div className="absolute bottom-4 left-4 right-4 bg-slate-950/90 backdrop-blur-md rounded-2xl p-3 border border-purple-500/30 flex items-center justify-between text-xs shadow-2xl">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-base shadow-inner">
              🕺
            </div>
            <div>
              <p className="text-xs font-bold text-white">Envie seu presente e digite seu <span className="text-yellow-400 font-mono">@roblox</span></p>
              <p className="text-[10px] text-slate-400">Rosa = Fura Fila · Coração = 3s Holofote · Galáxia = Gigante</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono text-slate-400">Dançando:</span>
            <p className="text-sm font-extrabold text-purple-400 font-mono">{activeDancersCount}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
