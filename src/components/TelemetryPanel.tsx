/**
 * ARYA GM - Telemetria, Diagnóstico & Indicadores Reais de Engenharia
 * Etapa 5 da Auditoria Técnica:
 * - Eliminação total de dados gerados por Math.random().
 * - Exibição de 'N/D' quando métricas não puderem ser calculadas (ex: live desconectada).
 * - Monitoramento preciso de deduplicação (recebidos, aceitos, duplicados e inválidos).
 */

import React from 'react';
import { StreamTelemetry, DeduplicationStats, ConnectionState } from '../types';
import { Activity, Gauge, Server, Cpu, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface TelemetryPanelProps {
  telemetry: StreamTelemetry;
  dedupStats: DeduplicationStats;
  connectionState: ConnectionState;
  activeAdapterName: string;
}

export const TelemetryPanel: React.FC<TelemetryPanelProps> = ({
  telemetry,
  dedupStats,
  connectionState,
  activeAdapterName
}) => {
  const isConnected = connectionState === 'CONNECTED';
  const hasLatency = telemetry.latencyMs !== null && isConnected;
  const isSlaCompliant = hasLatency && telemetry.latencyMs! < 500;

  return (
    <div className="space-y-4 text-xs">
      {/* SLA Target Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            hasLatency && isSlaCompliant
              ? 'bg-emerald-500/20 text-emerald-400'
              : hasLatency
              ? 'bg-amber-500/20 text-amber-400'
              : 'bg-slate-800 text-slate-500'
          }`}>
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>SLA de Latência de Engenharia: &lt; 500ms</span>
              {hasLatency ? (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  isSlaCompliant
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                }`}>
                  {isSlaCompliant ? 'Dentro da Meta (<500ms)' : 'Acima da Meta (>500ms)'}
                </span>
              ) : (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400">
                  N/D (Aguardando Pacotes)
                </span>
              )}
            </h4>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Adaptador Ativo: <strong className="text-slate-300">{activeAdapterName}</strong> · Estado: <strong className="text-amber-400">{connectionState}</strong>
            </p>
          </div>
        </div>

        <div className="text-right font-mono">
          <span className="text-[10px] text-slate-400">Latência do Último Evento:</span>
          <div className="text-xl font-bold text-white">
            {hasLatency ? `${telemetry.latencyMs} ms` : 'N/D'}
          </div>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-mono">FPS Real</span>
            <Gauge className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {telemetry.fps} <span className="text-xs text-slate-400">FPS</span>
          </div>
          <span className="text-[10px] text-emerald-400">Medição delta via performance.now()</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-mono">Taxa de Eventos</span>
            <Cpu className="w-3.5 h-3.5 text-blue-400" />
          </div>
          <div className="text-xl font-bold text-white font-mono mt-1">
            {isConnected ? telemetry.eventsPerSec.toFixed(1) : '0.0'}{' '}
            <span className="text-xs text-slate-400">evt/s</span>
          </div>
          <span className="text-[10px] text-slate-400">Fluxo em tempo real</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-mono">Eventos Aceitos</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
            {dedupStats.acceptedCount}
          </div>
          <span className="text-[10px] text-slate-400">Processados pelo motor</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[10px] uppercase font-mono">Moedas Presentes</span>
            <Server className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold text-amber-400 font-mono mt-1">
            {telemetry.totalGiftsCoins.toLocaleString('pt-BR')}
          </div>
          <span className="text-[10px] text-slate-400">Total acumulado na sessão</span>
        </div>
      </div>

      {/* Deduplication & Ingestion Audit Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Auditoria de Deduplicação e Descarte (Métricas Reais)
            </h4>
          </div>
          <span className="text-[10px] font-mono text-slate-400">
            Total Recebidos: {dedupStats.receivedCount}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center font-mono">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">ACEITOS</span>
            <span className="text-emerald-400 font-bold text-sm">{dedupStats.acceptedCount}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">DUPLICADOS</span>
            <span className="text-amber-400 font-bold text-sm">{dedupStats.duplicateCount}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">INVÁLIDOS</span>
            <span className="text-red-400 font-bold text-sm">{dedupStats.invalidCount}</span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
            <span className="text-[10px] text-slate-400 block">DESCARTADOS</span>
            <span className="text-slate-400 font-bold text-sm">{dedupStats.discardedCount}</span>
          </div>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          Eventos com identificador oficial são deduplicados diretamente; eventos sem ID confiável utilizam hash determinístico baseado em janela temporal e remetente para evitar flood.
        </p>
      </div>
    </div>
  );
};
