/**
 * ARYA GM - Painel de Conexão, Ingestão e Simulação
 * Etapas 1 e 3 da Auditoria Técnica:
 * - Seleção entre Adaptador de Produção (WebSocket/Relay) e Simulador de Desenvolvimento.
 * - Controle explícito de Conectar / Desconectar (inicia em DISCONNECTED).
 * - Monitoramento em tempo real de deduplicações e descarte.
 */

import React, { useState } from 'react';
import { NormalizedEvent, ConnectionState, DeduplicationStats } from '../types';
import { eventConnector } from '../services/eventConnector';
import { Zap, Play, Square, RefreshCw, Send, CheckCircle2, Filter, Radio, ShieldAlert } from 'lucide-react';

interface EventSimulatorPanelProps {
  events: NormalizedEvent[];
  connectionState: ConnectionState;
  activeAdapterType: 'simulator' | 'tiktok_production';
  onSwitchAdapter: (type: 'simulator' | 'tiktok_production') => void;
  onConnect: () => void;
  onDisconnect: () => void;
  onTriggerPreset: (preset: 'rose_barrage' | 'chat_wave' | 'galaxy_boss' | 'lion_legend' | 'disconnect_reconnect') => void;
  isAutoSim: boolean;
  onToggleAutoSim: () => void;
  dedupStats: DeduplicationStats;
}

export const EventSimulatorPanel: React.FC<EventSimulatorPanelProps> = ({
  events,
  connectionState,
  activeAdapterType,
  onSwitchAdapter,
  onConnect,
  onDisconnect,
  onTriggerPreset,
  isAutoSim,
  onToggleAutoSim,
  dedupStats
}) => {
  const [manualUser, setManualUser] = useState('Espectador_TikTok');
  const [manualType, setManualType] = useState<'comment' | 'gift'>('gift');
  const [manualComment, setManualComment] = useState('!jogar pipa azul');
  const [manualGift, setManualGift] = useState('Rosa');
  const [filterType, setFilterType] = useState<string>('all');

  const GIFTS_LIST = [
    { name: 'Rosa', coins: 1 },
    { name: 'Coração', coins: 10 },
    { name: 'Boné ARYA', coins: 99 },
    { name: 'Galáxia 3D', coins: 1000 },
    { name: 'Leão Lendário', coins: 29999 }
  ];

  const handleSendManual = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualType === 'comment') {
      eventConnector.ingestManualEvent({
        eventType: 'comment',
        user: { id: `usr_${manualUser.toLowerCase()}`, displayName: manualUser },
        commentText: manualComment,
        source: 'manual'
      });
    } else {
      const selectedG = GIFTS_LIST.find((g) => g.name === manualGift) || GIFTS_LIST[0];
      eventConnector.ingestManualEvent({
        eventType: 'gift',
        user: { id: `usr_${manualUser.toLowerCase()}`, displayName: manualUser },
        gift: {
          id: `gift_${selectedG.name.toLowerCase()}`,
          name: selectedG.name,
          coins: selectedG.coins,
          repeatCount: 1,
          isFinal: true
        },
        source: 'manual'
      });
    }
  };

  const filteredEvents = events.filter((e) => {
    if (filterType === 'all') return true;
    return e.eventType === filterType;
  });

  const isConnected = connectionState === 'CONNECTED';

  return (
    <div className="space-y-4">
      {/* Seletor de Adaptador e Controle de Conexão Real (Etapa 1) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Radio className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Adaptador de Conexão de Eventos (Etapa 1)
            </h4>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
              isConnected ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'
            }`}>
              {connectionState}
            </span>

            {isConnected ? (
              <button
                onClick={onDisconnect}
                className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 rounded-lg text-xs font-semibold transition-colors"
              >
                Desconectar
              </button>
            ) : (
              <button
                onClick={onConnect}
                className="px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-lg text-xs font-bold transition-colors shadow-sm"
              >
                Conectar ao Feed
              </button>
            )}
          </div>
        </div>

        {/* Alternador de Adaptador */}
        <div className="grid grid-cols-2 gap-2 text-xs">
          <button
            onClick={() => onSwitchAdapter('simulator')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeAdapterType === 'simulator'
                ? 'bg-slate-950 border-amber-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>Simulador Local</span>
              <span className="text-[9px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-amber-300">Dev</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Ambiente isolado de testes e homologação.</p>
          </button>

          <button
            onClick={() => onSwitchAdapter('tiktok_production')}
            className={`p-2.5 rounded-lg border text-left transition-all ${
              activeAdapterType === 'tiktok_production'
                ? 'bg-slate-950 border-blue-500 text-white shadow-sm'
                : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <div className="font-bold flex items-center justify-between">
              <span>TikTok LIVE Conector</span>
              <span className="text-[9px] font-mono bg-slate-800 px-1.5 py-0.2 rounded text-blue-300">Prod</span>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">Relay WebSocket / Webhooks em tempo real.</p>
          </button>
        </div>

        {activeAdapterType === 'tiktok_production' && (
          <div className="p-2.5 rounded-lg bg-blue-950/20 border border-blue-500/30 text-[11px] text-blue-300 flex items-start gap-2">
            <ShieldAlert className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <p>
              O adaptador de produção requer o conector local (Node.js/Express) ou proxy na Vercel ativo escutando a transmissão real. Sem ele, o estado permanece honestamente como DISCONNECTED ou RECONNECTING.
            </p>
          </div>
        )}
      </div>

      {/* Disparadores de Teste Rápido (Presets) */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Disparadores de Homologação (Presets)
            </h4>
          </div>
          <button
            onClick={onToggleAutoSim}
            className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isAutoSim
                ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30'
            }`}
          >
            {isAutoSim ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
            <span>{isAutoSim ? 'Pausar Simulação' : 'Simulação Contínua'}</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          <button
            onClick={() => onTriggerPreset('rose_barrage')}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-pink-500/50 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-pink-400 group-hover:text-pink-300">🌹 Combo Rosas (x5)</div>
            <div className="text-[10px] text-slate-400">Valida repeatCount & deduplicação</div>
          </button>

          <button
            onClick={() => onTriggerPreset('chat_wave')}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-blue-500/50 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-blue-400 group-hover:text-blue-300">💬 Onda de Chat</div>
            <div className="text-[10px] text-slate-400">5 espectadores entrando simultâneos</div>
          </button>

          <button
            onClick={() => onTriggerPreset('galaxy_boss')}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-purple-500/50 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-purple-400 group-hover:text-purple-300">🪐 Galáxia 3D</div>
            <div className="text-[10px] text-slate-400">1.000 moedas · Vento / Gigante</div>
          </button>

          <button
            onClick={() => onTriggerPreset('lion_legend')}
            className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-left transition-all group"
          >
            <div className="text-xs font-semibold text-amber-400 group-hover:text-amber-300">🦁 Leão Lendário</div>
            <div className="text-[10px] text-slate-400">29.999 moedas · Corte / Solo</div>
          </button>

          <button
            onClick={() => onTriggerPreset('disconnect_reconnect')}
            className="col-span-2 sm:col-span-2 p-2.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-600 text-left transition-all flex items-center justify-between"
          >
            <div>
              <div className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>Simular Queda de Rede & Auto-Reconexão</span>
              </div>
              <div className="text-[10px] text-slate-400">Testa resiliência do motor durante a live</div>
            </div>
            <span className="text-[10px] font-mono bg-slate-800 px-2 py-0.5 rounded text-slate-300">Resilience</span>
          </button>
        </div>
      </div>

      {/* Injetor Manual de Interações */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
          Injetor Manual de Interações
        </h4>
        <form onSubmit={handleSendManual} className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Nome no TikTok</label>
              <input
                type="text"
                value={manualUser}
                onChange={(e) => setManualUser(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                placeholder="Ex: @joao_silva"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Tipo de Evento</label>
              <select
                value={manualType}
                onChange={(e) => setManualType(e.target.value as 'comment' | 'gift')}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
              >
                <option value="gift">Presente Virtual (Gift)</option>
                <option value="comment">Comentário de Chat</option>
              </select>
            </div>
          </div>

          {manualType === 'gift' ? (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Selecione o Presente</label>
              <select
                value={manualGift}
                onChange={(e) => setManualGift(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
              >
                {GIFTS_LIST.map((g) => (
                  <option key={g.name} value={g.name}>
                    {g.name} ({g.coins.toLocaleString('pt-BR')} moedas)
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Texto do Comentário</label>
              <input
                type="text"
                value={manualComment}
                onChange={(e) => setManualComment(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-white focus:outline-none focus:border-amber-500"
                placeholder="Ex: !jogar ou !entrar @roblox"
              />
            </div>
          )}

          <button
            type="submit"
            className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Injetar Evento</span>
          </button>
        </form>
      </div>

      {/* Log de Eventos com Status de Deduplicação */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Fluxo Normalizado ({filteredEvents.length}) · Descartados: {dedupStats.duplicateCount}
            </h4>
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            <button
              onClick={() => setFilterType('all')}
              className={`px-2 py-0.5 rounded ${filterType === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              Todos
            </button>
            <button
              onClick={() => setFilterType('gift')}
              className={`px-2 py-0.5 rounded ${filterType === 'gift' ? 'bg-slate-800 text-pink-400' : 'text-slate-400 hover:text-white'}`}
            >
              Presentes
            </button>
            <button
              onClick={() => setFilterType('comment')}
              className={`px-2 py-0.5 rounded ${filterType === 'comment' ? 'bg-slate-800 text-blue-400' : 'text-slate-400 hover:text-white'}`}
            >
              Chat
            </button>
          </div>
        </div>

        <div className="max-h-56 overflow-y-auto space-y-1.5 pr-1 font-mono text-[11px]">
          {filteredEvents.length === 0 ? (
            <div className="text-slate-500 italic py-3 text-center">Nenhum evento registrado ainda.</div>
          ) : (
            filteredEvents.slice(0, 30).map((evt) => (
              <div
                key={evt.eventId}
                className="bg-slate-950/70 border border-slate-800/80 rounded-lg p-2 flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">{evt.user.displayName}</span>
                    <span
                      className={`text-[9px] uppercase px-1.5 py-0.2 rounded font-semibold ${
                        evt.eventType === 'gift'
                          ? 'bg-pink-500/20 text-pink-400'
                          : evt.eventType === 'comment'
                          ? 'bg-blue-500/20 text-blue-400'
                          : 'bg-emerald-500/20 text-emerald-400'
                      }`}
                    >
                      {evt.eventType}
                    </span>
                    <span className="text-[10px] text-slate-500">
                      {new Date(evt.receivedAt).toLocaleTimeString('pt-BR')}
                    </span>
                  </div>
                  <p className="text-slate-400 text-[11px]">
                    {evt.eventType === 'gift' && evt.gift ? (
                      <>
                        Enviou <strong className="text-amber-300">{evt.gift.name}</strong> ({evt.gift.coins} moedas)
                        {evt.gift.repeatCount > 1 && (
                          <span className="text-pink-400 font-bold ml-1.5">Combo x{evt.gift.repeatCount}!</span>
                        )}
                      </>
                    ) : (
                      <span className="text-slate-300">"{evt.commentText}"</span>
                    )}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-[10px] text-emerald-400 shrink-0">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{evt.hasGenuineId ? 'ID Oficial' : 'Hash Fallback'}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
