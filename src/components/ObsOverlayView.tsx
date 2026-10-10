/**
 * ARYA GM - OBS & TikTok LIVE Studio Clean Broadcast Source View
 * Etapa 5 da Auditoria Técnica:
 * - Suporte a Canal Alfa Real (transparência nativa).
 * - Suporte a Chroma Key Verde (#00FF00) e Magenta (#FF00FF).
 * - Documentação e guia de configuração rápida para OBS Studio e TikTok LIVE Studio.
 */

import React, { useState } from 'react';
import { PipasCombatGame } from '../games/PipasCombatGame';
import { AvatarDanceGame } from '../games/AvatarDanceGame';
import { Minimize2, Layers, HelpCircle, Check, Copy } from 'lucide-react';

interface ObsOverlayViewProps {
  activeGame: 'pipas' | 'avatar';
  onCloseOverlay: () => void;
}

export const ObsOverlayView: React.FC<ObsOverlayViewProps> = ({
  activeGame,
  onCloseOverlay
}) => {
  const [bgMode, setBgMode] = useState<'alpha' | 'chroma_green' | 'chroma_magenta' | 'scene'>('alpha');
  const [showHelp, setShowHelp] = useState(false);
  const [copiedCss, setCopiedCss] = useState(false);

  const obsCustomCss = `/* CSS Personalizado para Fonte de Navegador no OBS Studio */\nbody { background-color: rgba(0, 0, 0, 0) !important; margin: 0px auto; overflow: hidden; }`;

  const copyObsCss = () => {
    navigator.clipboard.writeText(obsCustomCss);
    setCopiedCss(true);
    setTimeout(() => setCopiedCss(false), 2000);
  };

  const getContainerBg = () => {
    if (bgMode === 'alpha') return 'bg-transparent';
    if (bgMode === 'chroma_green') return 'bg-[#00FF00]';
    if (bgMode === 'chroma_magenta') return 'bg-[#FF00FF]';
    return 'bg-black';
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${getContainerBg()}`}>
      {/* Control Toolbar (fica discreto no topo) */}
      <div className="absolute top-3 right-3 z-50 flex items-center gap-2 bg-slate-900/90 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-700/60 shadow-2xl">
        <div className="flex items-center gap-1.5 text-xs text-slate-300">
          <Layers className="w-3.5 h-3.5 text-amber-400" />
          <span className="font-semibold text-white mr-1">Fundo OBS:</span>
          
          <button
            onClick={() => setBgMode('alpha')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              bgMode === 'alpha' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Alfa Real
          </button>

          <button
            onClick={() => setBgMode('chroma_green')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              bgMode === 'chroma_green' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chroma Verde
          </button>

          <button
            onClick={() => setBgMode('chroma_magenta')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              bgMode === 'chroma_magenta' ? 'bg-pink-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Chroma Magenta
          </button>

          <button
            onClick={() => setBgMode('scene')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              bgMode === 'scene' ? 'bg-slate-700 text-white font-bold' : 'text-slate-400 hover:text-white'
            }`}
          >
            Cenário 100%
          </button>
        </div>

        <button
          onClick={() => setShowHelp(!showHelp)}
          className="p-1 text-slate-400 hover:text-white transition-colors"
          title="Instruções de configuração OBS"
        >
          <HelpCircle className="w-4 h-4" />
        </button>

        <button
          onClick={onCloseOverlay}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded-lg bg-slate-800 transition-colors"
        >
          <Minimize2 className="w-3.5 h-3.5" />
          <span>Sair</span>
        </button>
      </div>

      {/* Modal de Instruções OBS Studio / TikTok LIVE Studio */}
      {showHelp && (
        <div className="absolute top-14 right-3 z-50 w-96 bg-slate-900 border border-slate-700 rounded-2xl p-4 text-xs space-y-3 shadow-2xl text-slate-300">
          <div className="flex justify-between items-center text-white font-bold">
            <span>Como Configurar no OBS Studio</span>
            <button onClick={() => setShowHelp(false)} className="text-slate-500 hover:text-white">✕</button>
          </div>
          <ol className="list-decimal list-inside space-y-1 text-[11px] text-slate-400">
            <li>No OBS, adicione uma <strong>Fonte de Navegador (Browser Source)</strong>.</li>
            <li>Defina a largura como <strong className="text-white">1080</strong> e a altura como <strong className="text-white">1920</strong>.</li>
            <li>Marque a opção <em>"Controlar áudio via OBS"</em> se desejar mixar os efeitos.</li>
            <li>Selecione <strong>Alfa Real</strong> para que os jogos fiquem sobrepostos ao seu vídeo sem tela preta.</li>
          </ol>
          <button
            onClick={copyObsCss}
            className="w-full py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg flex items-center justify-center gap-1 text-[11px] font-mono"
          >
            {copiedCss ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCss ? 'CSS Copiado!' : 'Copiar CSS Transparente'}</span>
          </button>
        </div>
      )}

      {/* Renderização do Jogo Selecionado com Modo de Fundo Específico */}
      <div className="w-full h-full flex items-center justify-center p-2">
        {activeGame === 'pipas' ? (
          <PipasCombatGame 
            isTransparentBg={bgMode !== 'scene'} 
            bgMode={bgMode} 
          />
        ) : (
          <AvatarDanceGame 
            isTransparentBg={bgMode !== 'scene'} 
            bgMode={bgMode} 
          />
        )}
      </div>
    </div>
  );
};
