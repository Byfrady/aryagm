/**
 * ARYA GM - Rule Engine Configuration Panel
 */

import React, { useState } from 'react';
import { RuleMapping } from '../types';
import { ruleEngine } from '../services/ruleEngine';
import { Sliders, RotateCcw, Plus, Check } from 'lucide-react';

interface RuleEnginePanelProps {
  rules: RuleMapping[];
  onRulesUpdated: () => void;
}

export const RuleEnginePanel: React.FC<RuleEnginePanelProps> = ({
  rules,
  onRulesUpdated
}) => {
  const [selectedTarget, setSelectedTarget] = useState<'all' | 'pipas' | 'avatar'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMatch, setNewMatch] = useState('');
  const [newAction, setNewAction] = useState<RuleMapping['action']>('spawn_kite');
  const [newCoins, setNewCoins] = useState(1);
  const [newTarget, setNewTarget] = useState<'pipas' | 'avatar'>('pipas');
  const [newDesc, setNewDesc] = useState('');

  const filteredRules = rules.filter((r) => {
    if (selectedTarget === 'all') return true;
    return r.gameTarget === selectedTarget || r.gameTarget === 'both';
  });

  const handleReset = () => {
    ruleEngine.resetToDefaults();
    onRulesUpdated();
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    ruleEngine.addRule({
      id: `custom_rule_${Date.now()}`,
      eventType: newCoins > 0 ? 'gift' : 'comment',
      matchPattern: newMatch,
      minCoins: newCoins,
      gameTarget: newTarget,
      action: newAction,
      description: newDesc || `Ação ${newAction} para ${newMatch}`,
      userCooldownMs: 3000,
      globalCooldownMs: 500,
      isEnabled: true
    });
    setShowAddModal(false);
    setNewMatch('');
    setNewDesc('');
    onRulesUpdated();
  };

  return (
    <div className="space-y-4 text-xs">
      {/* Top Filter & Actions */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <Sliders className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200">Motor de Regras de Integração</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Target Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setSelectedTarget('all')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedTarget === 'all' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Todos
            </button>
            <button
              onClick={() => setSelectedTarget('pipas')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedTarget === 'pipas' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Pipas Combate
            </button>
            <button
              onClick={() => setSelectedTarget('avatar')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                selectedTarget === 'avatar' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'
              }`}
            >
              Avatar Dance
            </button>
          </div>

          <button
            onClick={() => setShowAddModal(true)}
            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg flex items-center gap-1 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Nova Regra</span>
          </button>

          <button
            onClick={handleReset}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
            title="Restaurar regras padrão"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Rules List */}
      <div className="space-y-2">
        {filteredRules.map((rule) => (
          <div
            key={rule.id}
            className="bg-slate-900 border border-slate-800/80 rounded-xl p-3 flex items-start justify-between gap-3 hover:border-slate-700 transition-colors"
          >
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded-full ${
                    rule.gameTarget === 'pipas'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  }`}
                >
                  {rule.gameTarget === 'pipas' ? 'Pipas 2D' : 'Avatar 3D'}
                </span>

                <span className="font-semibold text-white">
                  Gatilho: <code className="text-amber-300 font-mono bg-slate-950 px-1.5 py-0.5 rounded">{rule.matchPattern}</code>
                </span>

                {rule.minCoins ? (
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({rule.minCoins} moedas)
                  </span>
                ) : null}
              </div>

              <p className="text-slate-400 text-[11px]">{rule.description}</p>
            </div>

            <div className="text-right shrink-0">
              <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 justify-end">
                <Check className="w-3 h-3" />
                <span>Ativa</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">
                Cooldown: {rule.userCooldownMs}ms (user) · {rule.globalCooldownMs}ms (global)
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Add Custom Rule Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4">
            <h3 className="text-sm font-bold text-white">Criar Nova Regra de Interação</h3>

            <form onSubmit={handleAddRule} className="space-y-3">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Jogo Alvo</label>
                <select
                  value={newTarget}
                  onChange={(e) => setNewTarget(e.target.value as 'pipas' | 'avatar')}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                >
                  <option value="pipas">Pipas Combate Live</option>
                  <option value="avatar">Avatar Dance Live</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Texto ou Presente do TikTok</label>
                <input
                  type="text"
                  value={newMatch}
                  onChange={(e) => setNewMatch(e.target.value)}
                  placeholder="Ex: !subir, Rosa, Donut, Foguete"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Moedas Mínimas</label>
                  <input
                    type="number"
                    value={newCoins}
                    onChange={(e) => setNewCoins(Number(e.target.value))}
                    min={0}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-slate-400 block mb-1">Ação Executada</label>
                  <select
                    value={newAction}
                    onChange={(e) => setNewAction(e.target.value as RuleMapping['action'])}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                  >
                    <option value="spawn_kite">Subir Pipa (Pipas)</option>
                    <option value="boost_turbo">Turbo de Velocidade (Pipas)</option>
                    <option value="activate_cerol">Linha Chilena / Cerol (Pipas)</option>
                    <option value="activate_shield">Escudo Protetor (Pipas)</option>
                    <option value="wind_gust">Rajada de Vento (Pipas)</option>
                    <option value="spawn_avatar">Entrar no Palco (Avatar)</option>
                    <option value="vip_spotlight">Holofote VIP (Avatar)</option>
                    <option value="confetti_shower">Chuva de Confetes (Avatar)</option>
                    <option value="giant_scale">Avatar Gigante (Avatar)</option>
                    <option value="super_dance_solo">Solo de Dança (Avatar)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Descrição Explicativa</label>
                <input
                  type="text"
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Ex: Dispara turbo quando espectador envia presente"
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 rounded-lg text-slate-400 hover:text-white"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg"
                >
                  Salvar Regra
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
