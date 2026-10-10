/**
 * ARYA GM - Interface Comum para Adaptadores de Eventos
 * Etapa 1 da Auditoria Técnica:
 * Padronização de adaptadores (Produção vs Simulador) com isolamento rigoroso.
 */

import { ConnectionState, NormalizedEvent } from '../../types';

export interface IEventAdapter {
  readonly id: string;
  readonly name: string;
  readonly isProduction: boolean;
  
  connect(config?: { streamerHandle?: string; relayUrl?: string; sessionToken?: string }): Promise<void>;
  disconnect(): Promise<void>;
  getState(): ConnectionState;
  
  onRawEvent(callback: (raw: Partial<NormalizedEvent>) => void): () => void;
  onStateChange(callback: (state: ConnectionState) => void): () => void;
  onError(callback: (errorMsg: string) => void): () => void;
}
