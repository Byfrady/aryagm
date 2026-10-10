/**
 * ARYA GM - Painel de Execução de Testes de Aceitação
 * Executa a suíte de testes de ponta a ponta e exibe evidências técnicas.
 */

import React, { useState, useEffect } from 'react';
import { AcceptanceTestResult } from '../types';
import { runAllAcceptanceTests } from '../tests/acceptanceTests';
import { Play, CheckCircle2, XCircle, RotateCcw, ShieldCheck, Terminal } from 'lucide-react';

export const AcceptanceTestPanel: React.FC = () => {
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [results, setResults] = useState<AcceptanceTestResult[]>([]);
  const [hasRun, setHasRun] = useState<boolean>(false);

  const executeTests = async () => {
    setIsRunning(true);
    try {
      const res = await runAllAcceptanceTests();
      setResults(res);
      setHasRun(true);
    } finally {
      setIsRunning(false);
    }
  };

  useEffect(() => {
    // Executa uma bateria inicial ao abrir para validação imediata
    executeTests();
  }, []);

  const passedCount = results.filter((r) => r.passed).length;
  const totalCount = results.length;
  const allPassed = totalCount > 0 && passedCount === totalCount;

  return (
    <div className="space-y-4 text-xs">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
            allPassed ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
          }`}>
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Bateria de Testes Automatizados de Aceitação (Etapa 7)</span>
              {hasRun && (
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  allPassed ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400'
                }`}>
                  {passedCount}/{totalCount} Aprovados
                </span>
              )}
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Validação programática de conexão, deduplicação, isolamento de cooldown, Roblox e licença.
            </p>
          </div>
        </div>

        <button
          onClick={executeTests}
          disabled={isRunning}
          className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20 disabled:opacity-50 shrink-0"
        >
          {isRunning ? <RotateCcw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
          <span>{isRunning ? 'Executando Testes...' : 'Reexecutar Bateria Completa'}</span>
        </button>
      </div>

      {/* Test Results List */}
      <div className="space-y-2">
        {results.map((test) => (
          <div
            key={test.id}
            className={`bg-slate-900/90 border rounded-xl p-3.5 transition-all ${
              test.passed ? 'border-slate-800/80 hover:border-emerald-500/30' : 'border-red-500/50 bg-red-950/20'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                {test.passed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                )}
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200 text-xs">{test.title}</span>
                    <span className="text-[10px] font-mono px-2 py-0.2 bg-slate-950 text-slate-400 rounded">
                      {test.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">{test.details}</p>
                </div>
              </div>

              <div className="text-right shrink-0 font-mono text-[11px]">
                <span className={test.passed ? 'text-emerald-400 font-bold' : 'text-red-400 font-bold'}>
                  {test.passed ? 'PASSED' : 'FAILED'}
                </span>
                <p className="text-[10px] text-slate-500">{test.latencyMs} ms</p>
              </div>
            </div>

            {/* Evidence Terminal Box */}
            <div className="mt-2.5 bg-slate-950 rounded-lg p-2 font-mono text-[10px] text-slate-300 flex items-center gap-2 border border-slate-800/60">
              <Terminal className="w-3 h-3 text-slate-500 shrink-0" />
              <span className="text-slate-500 select-none">Evidência:</span>
              <span className="text-amber-300/90 truncate">{test.evidence}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
