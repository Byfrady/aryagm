/**
 * ARYA GM - Modelo Comercial, Licenciamento & Integração Supabase
 * Etapa 6 da Auditoria Técnica:
 * - Validação de licenças via LicenseService com estados rigorosos.
 * - Teste explícito de chaves válidas, expiradas, revogadas e contingência offline (72h).
 * - Tabela de planos e distinção entre moedas TikTok e faturamento de software.
 * - Esquema DDL do Supabase para implementação em produção.
 */

import React, { useState, useEffect } from 'react';
import { DollarSign, ShieldCheck, Key, Check, TrendingUp, HelpCircle, AlertTriangle, Database, RefreshCw } from 'lucide-react';
import { licenseService } from '../services/licenseService';
import { supabaseService, SUPABASE_SQL_SCHEMA } from '../services/supabaseClient';
import { LicenseValidationResult, LicenseStatus } from '../types';

export const BusinessSaaSPanel: React.FC = () => {
  const [subscribers, setSubscribers] = useState<number>(100);
  const [planPrice] = useState<number>(39.9);
  const [inputKey, setInputKey] = useState<string>('');
  const [streamerHandle, setStreamerHandle] = useState<string>('@streamer_live');
  const [validationResult, setValidationResult] = useState<LicenseValidationResult | null>(null);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [showSqlSchema, setShowSqlSchema] = useState<boolean>(false);
  const [copiedSql, setCopiedSql] = useState<boolean>(false);

  // Inicializa com o status real do serviço (sem chave fictícia forçada como válida)
  useEffect(() => {
    const lease = licenseService.getActiveLease();
    if (lease) {
      setInputKey(lease.key);
      setValidationResult({
        status: 'ACTIVE',
        key: lease.key,
        streamerName: lease.streamerName,
        plan: lease.plan,
        expiresAt: lease.validUntil,
        hardwareSeatId: lease.hardwareSeatId,
        allowedSeats: lease.allowedSeats,
        activeSeats: lease.activeSeats,
        signatureVerified: true,
        message: 'Licença ativa recuperada do cache local.'
      });
    }
  }, []);

  const handleValidate = async (keyToValidate?: string, simulateFailure: boolean = false) => {
    const key = keyToValidate || inputKey;
    setIsValidating(true);
    try {
      const res = await licenseService.validateLicenseKey(key, streamerHandle, simulateFailure);
      setValidationResult(res);
      setInputKey(key);
    } finally {
      setIsValidating(false);
    }
  };

  const copySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SCHEMA);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  // Cálculos financeiros reais
  const grossMonthlyRevenue = subscribers * planPrice;
  const paymentFees = grossMonthlyRevenue * 0.055;
  const infraCost = 120 + subscribers * 0.4;
  const netContribution = grossMonthlyRevenue - paymentFees - infraCost;

  return (
    <div className="space-y-4 text-xs">
      {/* Aviso Conceitual sobre Fluxo Monetário */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center gap-2 text-amber-400">
          <HelpCircle className="w-4 h-4" />
          <h3 className="font-bold text-sm text-white">Esclarecimento Comercial: TikTok vs ARYA GM</h3>
        </div>
        <p className="text-slate-300 leading-relaxed text-[11px]">
          O dinheiro que o público gasta com moedas na LIVE pertence ao ecossistema do TikTok, que remunera o criador em diamantes conforme elegibilidade e retenções da plataforma. 
          <strong> A ARYA GM comercializa exclusivamente a licença e a assinatura de software para streamers, estúdios e agências.</strong>
        </p>
      </div>

      {/* Validador de Licenças Confiável com Backend Supabase */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-400" />
            <h4 className="text-sm font-bold text-white">Validação Real de Licença e Assentos (HWID)</h4>
          </div>
          <span className="font-mono text-[10px] text-slate-400">
            ID de Máquina: <strong className="text-amber-300">{licenseService.getHardwareSeatId()}</strong>
          </span>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handleValidate(); }} className="flex gap-2">
          <input
            type="text"
            value={inputKey}
            onChange={(e) => setInputKey(e.target.value)}
            className="flex-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white font-mono text-xs focus:outline-none focus:border-amber-500 uppercase"
            placeholder="Digite a chave da licença (Ex: ARYA-PRO-2026-LIVE)"
          />
          <button
            type="submit"
            disabled={isValidating}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs transition-colors flex items-center gap-1.5"
          >
            {isValidating && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
            <span>Validar no Servidor</span>
          </button>
        </form>

        {/* Chaves Pré-configuradas para Testes de Homologação */}
        <div className="space-y-1.5 pt-1">
          <span className="text-[10px] text-slate-400 block font-mono">Chaves de Teste para Auditoria:</span>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => handleValidate('ARYA-PRO-2026-LIVE')}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-emerald-500 text-emerald-400 font-mono text-[10px]"
            >
              ✓ Chave Pro Ativa
            </button>
            <button
              type="button"
              onClick={() => handleValidate('ARYA-TRIAL-7DAYS')}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-amber-500 text-amber-400 font-mono text-[10px]"
            >
              ⏱ Chave Trial 7 Dias
            </button>
            <button
              type="button"
              onClick={() => handleValidate('ARYA-EXPIRED-2024')}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-red-500 text-red-400 font-mono text-[10px]"
            >
              ✕ Chave Expirada
            </button>
            <button
              type="button"
              onClick={() => handleValidate('ARYA-REVOKED-FRAUD')}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-red-500 text-red-400 font-mono text-[10px]"
            >
              ⛔ Chave Revogada
            </button>
            <button
              type="button"
              onClick={() => handleValidate('ARYA-PRO-2026-LIVE', true)}
              className="px-2 py-1 rounded bg-slate-950 border border-slate-800 hover:border-blue-500 text-blue-400 font-mono text-[10px]"
            >
              🛡 Simular Queda Servidor (72h Grace)
            </button>
          </div>
        </div>

        {/* Card de Resultado da Licença */}
        {validationResult && (
          <div className={`p-3 rounded-lg border flex items-start justify-between gap-3 ${
            validationResult.status === 'ACTIVE' || validationResult.status === 'TRIAL'
              ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
              : validationResult.status === 'OFFLINE_GRACE'
              ? 'bg-blue-950/20 border-blue-500/40 text-blue-300'
              : 'bg-red-950/20 border-red-500/40 text-red-300'
          }`}>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-bold text-xs uppercase font-mono">
                  Status: {validationResult.status}
                </span>
                <span className="text-[10px] bg-slate-900 px-2 py-0.5 rounded text-white font-mono">
                  Plano: {validationResult.plan.toUpperCase()}
                </span>
              </div>
              <p className="text-[11px] leading-relaxed text-slate-300">{validationResult.message}</p>
              {validationResult.expiresAt && (
                <p className="text-[10px] text-slate-400 font-mono">
                  Válido até: {new Date(validationResult.expiresAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>

            <div className="text-right shrink-0 font-mono text-[11px]">
              <span className="text-slate-400 block text-[10px]">Assentos Ativos</span>
              <span className="font-bold text-white">
                {validationResult.activeSeats}/{validationResult.allowedSeats} máquinas
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Estrutura Comercial de Preços Clarificada */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-[10px] font-mono text-slate-400 uppercase">Licença Avulsa</div>
          <h4 className="font-bold text-white text-sm">Pipas OU Avatar Dance</h4>
          <div className="text-lg font-extrabold text-amber-400 font-mono">R$ 59,90</div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Acesso permanente a <strong>1 jogo</strong> escolhido com 1 ano de atualizações para 1 computador.
          </p>
        </div>

        <div className="bg-slate-900 border border-amber-500/50 rounded-xl p-3.5 space-y-2 relative shadow-lg shadow-amber-500/5">
          <div className="absolute top-2 right-2 px-1.5 py-0.5 bg-amber-500 text-slate-950 text-[9px] font-bold rounded">
            MAIS POPULAR
          </div>
          <div className="text-[10px] font-mono text-amber-400 uppercase">Plano Recorrente</div>
          <h4 className="font-bold text-white text-sm">Combo Pipas + Avatar</h4>
          <div className="text-lg font-extrabold text-amber-400 font-mono">
            R$ 39,90<span className="text-xs text-slate-400">/mês</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Acesso aos <strong>dois jogos</strong>, novas atualizações, novos efeitos e suporte contínuo para 1 computador.
          </p>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-3.5 space-y-2">
          <div className="text-[10px] font-mono text-purple-400 uppercase">Estúdios & Agências</div>
          <h4 className="font-bold text-white text-sm">ARYA Studio Pro</h4>
          <div className="text-lg font-extrabold text-purple-400 font-mono">
            R$ 99,90<span className="text-xs text-slate-400">/mês</span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Até <strong>3 computadores simultâneos</strong>, ambos os jogos, personalização de logotipos e suporte prioritário.
          </p>
        </div>
      </div>

      {/* Calculadora de MRR da Seção 7.3 */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-bold text-white">Simulador de Receita Recorrente (MRR da Seção 7.3)</h4>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">Plano Base: R$ 39,90/mês</span>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs font-mono">
            <span className="text-slate-400">Clientes Ativos:</span>
            <span className="text-amber-400 font-bold">{subscribers} criadores</span>
          </div>
          <input
            type="range"
            min={10}
            max={600}
            step={5}
            value={subscribers}
            onChange={(e) => setSubscribers(Number(e.target.value))}
            className="w-full accent-amber-500 cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono">
            <span>25 clientes (R$ 997,50)</span>
            <span>100 clientes (R$ 3.990)</span>
            <span>300 clientes (R$ 11.970)</span>
            <span>500 clientes (R$ 19.950)</span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Receita Bruta</span>
            <p className="text-sm font-bold text-white font-mono mt-0.5">
              R$ {grossMonthlyRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Taxas Gateway (5.5%)</span>
            <p className="text-sm font-bold text-red-400 font-mono mt-0.5">
              - R$ {paymentFees.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-center">
            <span className="text-[10px] text-slate-400 uppercase font-mono">Infraestrutura</span>
            <p className="text-sm font-bold text-slate-300 font-mono mt-0.5">
              - R$ {infraCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>

          <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-500/40 text-center">
            <span className="text-[10px] text-emerald-400 uppercase font-mono">Margem Líquida</span>
            <p className="text-sm font-bold text-emerald-400 font-mono mt-0.5">
              R$ {netContribution.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>

      {/* Backend Supabase Schema Viewer */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-blue-400" />
            <h4 className="text-sm font-bold text-white">Integração Supabase & Vercel Backend</h4>
          </div>
          <button
            onClick={() => setShowSqlSchema(!showSqlSchema)}
            className="text-[11px] text-blue-400 hover:text-blue-300 underline font-mono"
          >
            {showSqlSchema ? 'Ocultar Script SQL' : 'Visualizar Script SQL Supabase'}
          </button>
        </div>

        <p className="text-[11px] text-slate-400 leading-relaxed">
          {supabaseService.getStatusMessage()}
        </p>

        {showSqlSchema && (
          <div className="space-y-2 pt-2">
            <div className="bg-slate-950 p-3 rounded-lg border border-slate-800 font-mono text-[10px] text-slate-300 max-h-48 overflow-y-auto">
              <pre>{SUPABASE_SQL_SCHEMA}</pre>
            </div>
            <button
              onClick={copySql}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-mono flex items-center gap-1.5"
            >
              {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Database className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copiedSql ? 'Schema Copiado!' : 'Copiar DDL PostgreSQL para o Supabase'}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
