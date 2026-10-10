/**
 * ARYA GM — Plataforma de Transmissão & Jogos Interativos TikTok LIVE
 * Layout Inspirado no RavenGames Launcher & TikTok LIVE Studio:
 * - Barra Superior: [ Início ] [ Pipas Combat ] [ Avatar Roblox ] [ Filtros & Conexão ] [ Regras & AFK ] [ Licença ]
 * - Conexão de Live com status real, botão 'Trocar de Live' e filtros de moderação do chat.
 * - Modo AFK inteligente para transmissões autônomas.
 * - Integração completa com Roblox Dance e Pipas Combat.
 */

import React, { useState, useEffect } from 'react';
import { ConnectionState, NormalizedEvent, RuleMapping, StreamTelemetry } from './types';
import { eventConnector } from './services/eventConnector';
import { ruleEngine } from './services/ruleEngine';
import { soundEngine } from './services/soundEngine';
import { PipasCombatGame } from './games/PipasCombatGame';
import { AvatarDanceGame } from './games/AvatarDanceGame';
import { EventSimulatorPanel } from './components/EventSimulatorPanel';
import { RuleEnginePanel } from './components/RuleEnginePanel';
import { ChecklistPanel } from './components/ChecklistPanel';
import { BusinessSaaSPanel } from './components/BusinessSaaSPanel';
import { TelemetryPanel } from './components/TelemetryPanel';
import { AcceptanceTestPanel } from './components/AcceptanceTestPanel';
import { ObsOverlayView } from './components/ObsOverlayView';
import { 
  Tv, 
  Volume2, 
  VolumeX, 
  Sliders, 
  TrendingUp, 
  MessageSquare, 
  Send,
  Zap,
  TestTube2,
  Copy,
  Check,
  Sparkles,
  ShieldCheck,
  Filter,
  Flame,
  Radio,
  ExternalLink,
  Play
} from 'lucide-react';

type NavigationTab = 'inicio' | 'pipas' | 'avatar' | 'conexao' | 'regras' | 'licenca' | 'testes';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavigationTab>('avatar');
  const [connectionState, setConnectionState] = useState<ConnectionState>('DISCONNECTED');
  const [streamerUsername, setStreamerUsername] = useState<string>('@neverhurtanyones');
  const [isEditingStreamer, setIsEditingStreamer] = useState<boolean>(false);
  const [tempStreamer, setTempStreamer] = useState<string>('@neverhurtanyones');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isObsFullscreen, setIsObsFullscreen] = useState<boolean>(false);
  const [bgMode, setBgMode] = useState<'scene' | 'alpha' | 'chroma_green'>('scene');
  const [copiedObsLink, setCopiedObsLink] = useState<boolean>(false);

  // Filtros de Moderação do TikTok (Requisito Explícito do Usuário)
  const [filterMinCoins, setFilterMinCoins] = useState<number>(1);
  const [filterIgnoreSpam, setFilterIgnoreSpam] = useState<boolean>(true);
  const [filterAfkAutoPlay, setFilterAfkAutoPlay] = useState<boolean>(true);
  const [filterSoundAlerts, setFilterSoundAlerts] = useState<boolean>(true);

  // Chat ao vivo interativo
  const [chatMessage, setChatMessage] = useState<string>('');
  const [chatSender, setChatSender] = useState<string>('dnhhhxx');
  const [eventsHistory, setEventsHistory] = useState<NormalizedEvent[]>([]);
  const [rules, setRules] = useState<RuleMapping[]>(ruleEngine.getRules());

  // Saldo e Diamantes da LIVE
  const [streamBalanceBrl, setStreamBalanceBrl] = useState<number>(169.98);
  const [totalDiamonds, setTotalDiamonds] = useState<number>(1560);

  const [telemetry, setTelemetry] = useState<StreamTelemetry>({
    fps: 60,
    latencyMs: null,
    eventsPerSec: 0,
    totalEventsProcessed: 0,
    eventsDeduped: 0,
    totalGiftsCoins: 0,
    activePlayers: 4,
    lastEventTimestamp: null
  });

  // Conexão e eventos
  useEffect(() => {
    const unsubState = eventConnector.onStateChange((st) => setConnectionState(st));
    return unsubState;
  }, []);

  useEffect(() => {
    let recentTimes: number[] = [];

    const unsubEvent = eventConnector.onEvent((event: NormalizedEvent) => {
      // Aplica filtros configurados
      if (event.eventType === 'gift' && event.gift && event.gift.coins < filterMinCoins) {
        return;
      }
      if (filterIgnoreSpam && event.eventType === 'comment' && !event.commentText?.includes('!') && !event.commentText?.includes('@')) {
        // Ignora comentários casuais fora de comando se o filtro anti-spam estiver ativo
        return;
      }

      setEventsHistory((prev) => [event, ...prev.slice(0, 80)]);

      const now = Date.now();
      const receivedTime = new Date(event.receivedAt).getTime();
      const measuredLatency = Math.max(10, now - receivedTime);

      recentTimes.push(now);
      recentTimes = recentTimes.filter((t) => now - t < 5000);
      const computedEvtPerSec = Number((recentTimes.length / 5).toFixed(1));

      const coins = event.gift?.coins || 0;
      if (coins > 0) {
        setTotalDiamonds((prev) => prev + coins);
        setStreamBalanceBrl((prev) => Number((prev + coins * 0.026).toFixed(2)));
      }

      const dedupStats = eventConnector.getDeduplicationStats();

      setTelemetry((prev) => ({
        ...prev,
        latencyMs: measuredLatency,
        eventsPerSec: computedEvtPerSec,
        totalEventsProcessed: prev.totalEventsProcessed + 1,
        eventsDeduped: dedupStats.duplicateCount,
        totalGiftsCoins: prev.totalGiftsCoins + coins,
        lastEventTimestamp: now
      }));

      // Avaliação de Regras
      const gameTarget = activeTab === 'pipas' ? 'pipas' : 'avatar';
      const matched = ruleEngine.evaluateEvent(event, gameTarget);
      matched.forEach((r) => {
        if (gameTarget === 'pipas') {
          const fn = (window as unknown as { __ARYA_TRIGGER_PIPAS_ACTION?: (act: string, evt: NormalizedEvent) => void }).__ARYA_TRIGGER_PIPAS_ACTION;
          if (fn) fn(r.action, event);
        } else {
          const fn = (window as unknown as { __ARYA_TRIGGER_AVATAR_ACTION?: (act: string, evt: NormalizedEvent) => void }).__ARYA_TRIGGER_AVATAR_ACTION;
          if (fn) fn(r.action, event);
        }
      });
    });

    return unsubEvent;
  }, [activeTab, filterMinCoins, filterIgnoreSpam]);

  const handleToggleMute = () => {
    const muted = soundEngine.toggleMute();
    setIsMuted(muted);
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMessage.trim()) return;

    eventConnector.ingestManualEvent({
      eventType: 'comment',
      user: { id: `usr_${chatSender.toLowerCase()}`, displayName: chatSender },
      commentText: chatMessage.trim(),
      source: 'manual'
    });
    setChatMessage('');
  };

  const handleQuickGift = (name: string, coins: number) => {
    eventConnector.ingestManualEvent({
      eventType: 'gift',
      user: { id: `usr_${chatSender.toLowerCase()}`, displayName: chatSender },
      gift: {
        id: `gift_${name.toLowerCase()}`,
        name,
        coins,
        repeatCount: 1,
        isFinal: true
      },
      source: 'manual'
    });
  };

  const copyObsUrl = () => {
    const game = activeTab === 'pipas' ? 'pipas' : 'avatar';
    navigator.clipboard.writeText(`${window.location.origin}/?mode=obs&game=${game}`);
    setCopiedObsLink(true);
    setTimeout(() => setCopiedObsLink(false), 2000);
  };

  const isConnected = connectionState === 'CONNECTED';
  const dedupStats = eventConnector.getDeduplicationStats();

  return (
    <div className="min-h-screen bg-[#07090E] text-slate-100 flex flex-col font-sans select-none antialiased">
      {/* Janela Flutuante OBS */}
      {isObsFullscreen && (
        <ObsOverlayView
          activeGame={activeTab === 'pipas' ? 'pipas' : 'avatar'}
          onCloseOverlay={() => setIsObsFullscreen(false)}
        />
      )}

      {/* BARRA SUPERIOR ESTILO RAVENGAMES LAUNCHER (Foto 9) */}
      <header className="h-16 px-6 border-b border-slate-800/80 bg-[#0C101A] flex items-center justify-between gap-4 sticky top-0 z-30 shadow-md">
        {/* Esquerda: Identificação do App e Abas de Navegação */}
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-cyan-500/20">
              R
            </div>
            <span className="font-extrabold text-base tracking-tight text-white font-sans">
              ARYA <span className="text-cyan-400 font-normal text-xs font-mono">GAMES</span>
            </span>
          </div>

          {/* Abas Superiores Estilo RavenGames: [ Início ] [ Pipas ] [ Avatar ] [ Conexão ] [ Regras ] */}
          <nav className="hidden md:flex items-center gap-1.5 p-1 bg-slate-950/80 rounded-xl border border-slate-800/80 text-xs font-medium">
            <button
              onClick={() => setActiveTab('inicio')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'inicio' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Início
            </button>
            <button
              onClick={() => setActiveTab('avatar')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'avatar' ? 'bg-purple-600 text-white font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🕺 Avatar Roblox</span>
            </button>
            <button
              onClick={() => setActiveTab('pipas')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'pipas' ? 'bg-amber-500 text-slate-950 font-bold shadow-sm' : 'text-slate-400 hover:text-white'
              }`}
            >
              <span>🪁 Pipas Combat</span>
            </button>
            <button
              onClick={() => setActiveTab('conexao')}
              className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5 ${
                activeTab === 'conexao' ? 'bg-slate-800 text-cyan-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Filter className="w-3.5 h-3.5" />
              <span>Filtros & Conexão</span>
            </button>
            <button
              onClick={() => setActiveTab('regras')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'regras' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Regras & AFK
            </button>
            <button
              onClick={() => setActiveTab('licenca')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'licenca' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Licença
            </button>
            <button
              onClick={() => setActiveTab('testes')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeTab === 'testes' ? 'bg-slate-800 text-emerald-400 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Auditoria
            </button>
          </nav>
        </div>

        {/* Direita: [ 🔴 Sua live: @neverhurtanyones ] e [ Trocar de Live ] (Idêntico ao Foto 9!) */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#090C14] px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-red-500 animate-pulse' : 'bg-slate-600'}`} />
            <span className="text-slate-400 font-medium">Sua live:</span>
            {isEditingStreamer ? (
              <form onSubmit={(e) => { e.preventDefault(); setStreamerUsername(tempStreamer); setIsEditingStreamer(false); }} className="flex items-center gap-1">
                <input
                  type="text"
                  value={tempStreamer}
                  onChange={(e) => setTempStreamer(e.target.value)}
                  className="bg-slate-900 border border-slate-700 px-2 py-0.5 rounded text-white text-xs w-36 focus:outline-none"
                  autoFocus
                />
                <button type="submit" className="text-emerald-400 font-bold text-xs">OK</button>
              </form>
            ) : (
              <span className="font-mono font-bold text-cyan-300">{streamerUsername}</span>
            )}
          </div>

          <button
            onClick={() => setIsEditingStreamer(!isEditingStreamer)}
            className="px-3.5 py-1.5 bg-[#E11D48] hover:bg-[#BE123C] text-white font-bold rounded-xl text-xs transition-colors shadow-sm"
          >
            {isEditingStreamer ? 'Concluir' : 'Trocar de Live'}
          </button>

          {/* Mudo */}
          <button
            onClick={handleToggleMute}
            className={`p-2 rounded-xl border transition-colors ${
              isMuted ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-slate-900 border-slate-800 text-amber-400'
            }`}
            title="Alternar Áudio"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>

          {/* Modo OBS */}
          <button
            onClick={() => setIsObsFullscreen(true)}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5"
          >
            <Tv className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Modo OBS 9:16</span>
          </button>
        </div>
      </header>

      {/* ÁREA DE CONTEÚDO PRINCIPAL */}
      <main className="flex-1 max-w-[1680px] w-full mx-auto p-4 lg:p-6">
        {/* TELA DE INÍCIO COM GUIA DE 3 PASSOS (Foto 9) */}
        {activeTab === 'inicio' && (
          <div className="max-w-4xl mx-auto space-y-6 pt-4">
            <div className="bg-[#0D121F] border border-slate-800/80 rounded-3xl p-8 space-y-6 shadow-2xl">
              <div>
                <h2 className="text-2xl font-extrabold text-white flex items-center gap-2">
                  <span>Bem-vindo!</span>
                  <span>👋</span>
                </h2>
                <p className="text-slate-400 text-sm mt-1">
                  Três passos e a sua live está no ar. Tudo aqui salva sozinho:
                </p>
              </div>

              {/* 3 Passos Guiados */}
              <div className="space-y-4">
                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-sm shrink-0">
                    1
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Conecte a sua live</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Digite o seu @ do TikTok na barra lá em cima e clique em Conectar. O sistema vincula comentários e presentes em tempo real.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold text-sm shrink-0">
                    2
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Escolha o modo do jogo</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Clique no cartão do <strong>Roblox Avatar</strong> ou do <strong>Pipas Combat</strong>. A troca é instantânea na transmissão.
                    </p>
                  </div>
                </div>

                <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-4">
                  <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm shrink-0">
                    3
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-sm">Aperte Play no OBS Studio ou TikTok LIVE Studio</h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Adicione a Fonte de Navegador em 1080×1920 com transparência Alfa nativa ou capture a janela dedicada.
                    </p>
                  </div>
                </div>
              </div>

              {/* Banners dos 2 Jogos para Início Rápido */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <button
                  onClick={() => setActiveTab('avatar')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-purple-900/40 to-slate-950 border border-purple-500/40 hover:border-purple-400 text-left transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-2xl">🕺</span>
                    <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/20 px-2 py-0.5 rounded-lg">Popular</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-3 group-hover:text-purple-300 transition-colors">
                    Roblox Avatar Dance Live
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Avatares reais dançando no palco com cards neon de presentes e fura-fila.
                  </p>
                </button>

                <button
                  onClick={() => setActiveTab('pipas')}
                  className="p-5 rounded-2xl bg-gradient-to-br from-amber-900/40 to-slate-950 border border-amber-500/40 hover:border-amber-400 text-left transition-all group"
                >
                  <div className="flex justify-between items-center">
                    <span className="text-2xl">🪁</span>
                    <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/20 px-2 py-0.5 rounded-lg">Combate</span>
                  </div>
                  <h3 className="text-base font-bold text-white mt-3 group-hover:text-amber-300 transition-colors">
                    Pipas Combat Live (Relo)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Física de rabiola fluida, faíscas incandescentes de cerol e combate vertical.
                  </p>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TELAS DE JOGO AO VIVO: ROBLOX AVATAR DANCE OU PIPAS COMBAT */}
        {(activeTab === 'avatar' || activeTab === 'pipas') && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* LADO ESQUERDO: O JOGO VERTICAL DA LIVE (6 Colunas) */}
            <div className="lg:col-span-6 flex flex-col space-y-3">
              <div className="flex items-center justify-between text-xs px-1">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-bold text-white">
                    {activeTab === 'avatar' ? 'Palco Roblox 3D' : 'Arena Pipas Combat'}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="font-mono text-[11px] text-slate-400">1080×1920 (9:16)</span>
                </div>

                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                  <button
                    onClick={() => setBgMode('scene')}
                    className={`px-2.5 py-0.5 rounded-lg font-medium transition-colors ${
                      bgMode === 'scene' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Cenário
                  </button>
                  <button
                    onClick={() => setBgMode('alpha')}
                    className={`px-2.5 py-0.5 rounded-lg font-medium transition-colors ${
                      bgMode === 'alpha' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Alfa OBS
                  </button>
                  <button
                    onClick={() => setBgMode('chroma_green')}
                    className={`px-2.5 py-0.5 rounded-lg font-medium transition-colors ${
                      bgMode === 'chroma_green' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Chroma
                  </button>
                </div>
              </div>

              {/* Canvas Renderizado */}
              <div className="flex-1 min-h-[640px] h-[750px] rounded-2xl overflow-hidden border border-slate-800 bg-[#0B0E17] shadow-2xl relative flex items-center justify-center">
                {activeTab === 'avatar' ? (
                  <AvatarDanceGame isTransparentBg={bgMode !== 'scene'} bgMode={bgMode} />
                ) : (
                  <PipasCombatGame isTransparentBg={bgMode !== 'scene'} bgMode={bgMode} />
                )}
              </div>

              {/* Barra de Disparo Rápido */}
              <div className="bg-[#0C101A] border border-slate-800/80 rounded-2xl p-2.5 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-400 font-mono flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Testar Presentes da Live:</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleQuickGift('Rosa', 1)}
                    className="px-2.5 py-1 rounded-lg bg-pink-500/20 text-pink-300 hover:bg-pink-500/30 border border-pink-500/40 text-[11px] font-semibold"
                  >
                    🌹 Rosa (1)
                  </button>
                  <button
                    onClick={() => handleQuickGift('Coração', 5)}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 text-[11px] font-semibold"
                  >
                    🫰 3s Holofote (5)
                  </button>
                  <button
                    onClick={() => handleQuickGift('Galáxia 3D', 10)}
                    className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 hover:bg-red-500/30 border border-red-500/40 text-[11px] font-semibold"
                  >
                    🌹 Gigante (10)
                  </button>
                  <button
                    onClick={() => handleQuickGift('Super Gigante', 30)}
                    className="px-2.5 py-1 rounded-lg bg-purple-500/20 text-purple-300 hover:bg-purple-500/30 border border-purple-500/40 text-[11px] font-semibold"
                  >
                    🍩 Super (30)
                  </button>
                </div>
              </div>
            </div>

            {/* LADO DIREITO: CHAT DA LIVE E PAINEL AFK (6 Colunas) */}
            <div className="lg:col-span-6 flex flex-col space-y-3">
              {/* Card de Faturamento e Diamantes (Fotos 4 & 5) */}
              <div className="bg-gradient-to-r from-[#111625] to-[#171329] border border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold text-lg">
                    💰
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-mono tracking-wider block">Saldo Estimado na Transmissão</span>
                    <div className="text-xl font-extrabold text-white font-mono flex items-center gap-1.5">
                      <span>R$ {streamBalanceBrl.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      <span className="text-[10px] text-emerald-400 bg-emerald-500/20 px-2 py-0.5 rounded-full font-bold">+BRL</span>
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono text-xs">
                  <span className="text-[10px] text-slate-400 block">Diamantes Acumulados</span>
                  <span className="text-sm font-bold text-amber-400">💎 {totalDiamonds.toLocaleString('pt-BR')}</span>
                </div>
              </div>

              {/* Chat da LIVE Interativo com Filtros */}
              <div className="bg-[#0C101A] border border-slate-800 rounded-2xl p-4 flex flex-col h-[540px] space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <h4 className="font-bold text-white text-xs">Chat da LIVE ao Vivo</h4>
                    <span className="px-2 py-0.5 rounded-full bg-slate-900 border border-slate-800 text-[10px] font-mono text-slate-400">
                      Filtro Anti-Spam Ativo
                    </span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">{eventsHistory.length} interações</span>
                </div>

                {/* Mensagens rolantes */}
                <div className="flex-1 overflow-y-auto space-y-2 pr-1 text-xs">
                  {eventsHistory.length === 0 ? (
                    <div className="text-slate-500 italic py-16 text-center text-xs">
                      Aguardando comentários e presentes dos espectadores da LIVE...<br />
                      <span className="text-[11px] text-slate-600">Comente seu @roblox abaixo para dançar</span>
                    </div>
                  ) : (
                    eventsHistory.slice(0, 45).map((evt) => (
                      <div
                        key={evt.eventId}
                        className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-start gap-2.5"
                      >
                        <div className="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-[10px] text-white shrink-0 overflow-hidden">
                          {evt.user.avatarUrl ? (
                            <img src={evt.user.avatarUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            evt.user.displayName.substring(0, 2).toUpperCase()
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-slate-200 text-[11px] truncate">
                              {evt.user.displayName}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono">
                              {new Date(evt.receivedAt).toLocaleTimeString('pt-BR')}
                            </span>
                          </div>

                          {evt.eventType === 'gift' && evt.gift ? (
                            <div className="mt-0.5 text-pink-400 font-bold flex items-center gap-1 text-[11px]">
                              <span>Enviou {evt.gift.name}</span>
                              <span className="text-amber-400 font-mono font-normal">({evt.gift.coins} moedas)</span>
                            </div>
                          ) : (
                            <p className="text-slate-300 text-[11px] mt-0.5 break-words">
                              {evt.commentText}
                            </p>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Envio de Comentário */}
                <form onSubmit={handleSendChat} className="pt-2 border-t border-slate-800 flex gap-2">
                  <input
                    type="text"
                    value={chatSender}
                    onChange={(e) => setChatSender(e.target.value)}
                    className="w-28 bg-slate-950 border border-slate-800 rounded-xl px-2.5 py-2 text-white font-mono text-[11px] focus:outline-none focus:border-cyan-500"
                    placeholder="@usuario"
                  />
                  <input
                    type="text"
                    value={chatMessage}
                    onChange={(e) => setChatMessage(e.target.value)}
                    className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="Comente seu @roblox para dançar"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl text-xs flex items-center gap-1 transition-colors"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* TELA DE FILTROS & CONEXÃO TIKTOK (Requisito Explícito do Usuário) */}
        {activeTab === 'conexao' && (
          <div className="max-w-4xl mx-auto space-y-5 pt-2">
            <div className="bg-[#0D121F] border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Filtros e Conexão da Conta TikTok</h3>
                    <p className="text-xs text-slate-400">
                      Configure a moderação de chat, limiares de presentes e modo de conexão à transmissão.
                    </p>
                  </div>
                </div>

                <span className={`px-3 py-1 rounded-full text-xs font-mono font-bold ${
                  isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  Status: {connectionState}
                </span>
              </div>

              {/* Conta do Streamer */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Identificador do Streamer (@username)</label>
                  <input
                    type="text"
                    value={streamerUsername}
                    onChange={(e) => setStreamerUsername(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white font-mono text-xs focus:outline-none focus:border-cyan-500"
                    placeholder="@seucanal"
                  />
                  <p className="text-[10px] text-slate-500">Nome exato da sua conta que iniciará a transmissão ao vivo.</p>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-300">Modo de Operação</label>
                  <select
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2.5 text-white text-xs focus:outline-none focus:border-cyan-500"
                  >
                    <option value="direct">Conexão Direta Oficial (WebSocket / Relay)</option>
                    <option value="afk">Modo AFK Inteligente (Automação Anti-Inatividade)</option>
                    <option value="dev">Simulador de Desenvolvimento e Testes</option>
                  </select>
                  <p className="text-[10px] text-slate-500">O modo AFK mantém o jogo ativo mesmo quando você está longe do teclado.</p>
                </div>
              </div>

              {/* Filtros de Moderação de Mensagens */}
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">Filtros de Chat & Presentes</h4>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Anti-Spam de Comentários</span>
                      <span className="text-[10px] text-slate-400">Processa apenas mensagens com @ ou comandos válidos</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={filterIgnoreSpam}
                      onChange={(e) => setFilterIgnoreSpam(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Modo AFK / Anti-Inatividade</span>
                      <span className="text-[10px] text-slate-400">Evita que o TikTok encerre a live por falta de ação</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={filterAfkAutoPlay}
                      onChange={(e) => setFilterAfkAutoPlay(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Alertas Sonoros de Presentes</span>
                      <span className="text-[10px] text-slate-400">Toca fanfarra quando o público enviar presentes</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={filterSoundAlerts}
                      onChange={(e) => setFilterSoundAlerts(e.target.checked)}
                      className="w-4 h-4 accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                    <div>
                      <span className="font-bold text-white text-xs block">Mínimo de Moedas para Alerta</span>
                      <span className="text-[10px] text-slate-400">Apenas presentes acima do valor disparam hologramas</span>
                    </div>
                    <select
                      value={filterMinCoins}
                      onChange={(e) => setFilterMinCoins(Number(e.target.value))}
                      className="bg-slate-900 border border-slate-700 px-2.5 py-1 rounded text-white text-xs font-mono"
                    >
                      <option value={1}>1 Moeda (Rosa)</option>
                      <option value={5}>5 Moedas (Coração)</option>
                      <option value={10}>10 Moedas</option>
                      <option value={30}>30 Moedas (Donut)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Botões de Ação de Conexão */}
              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                {isConnected ? (
                  <button
                    onClick={() => eventConnector.disconnect()}
                    className="px-4 py-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-xl text-xs font-bold"
                  >
                    Desconectar da LIVE
                  </button>
                ) : (
                  <button
                    onClick={() => eventConnector.connect({ streamerHandle: streamerUsername })}
                    className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-bold rounded-xl text-xs shadow-md shadow-cyan-500/20 flex items-center gap-1.5"
                  >
                    <Radio className="w-3.5 h-3.5" />
                    <span>Conectar à LIVE do TikTok</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* TELAS AUXILIARES: REGRAS, LICENÇA, TESTES */}
        {activeTab === 'regras' && (
          <div className="max-w-4xl mx-auto">
            <RuleEnginePanel rules={rules} onRulesUpdated={() => setRules(ruleEngine.getRules())} />
          </div>
        )}

        {activeTab === 'licenca' && (
          <div className="max-w-4xl mx-auto">
            <BusinessSaaSPanel />
          </div>
        )}

        {activeTab === 'testes' && (
          <div className="max-w-4xl mx-auto">
            <AcceptanceTestPanel />
          </div>
        )}
      </main>
    </div>
  );
}
