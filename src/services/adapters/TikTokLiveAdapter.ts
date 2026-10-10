/**
 * ARYA GM - Adaptador de Produção TikTok LIVE
 * Etapa 1 da Auditoria Técnica:
 * Gerencia a conexão com WebSocket/Relay real da transmissão ao vivo.
 * Inicia obrigatoriamente em DISCONNECTED e não simula sucesso falso.
 */

import { ConnectionState, NormalizedEvent } from '../../types';
import { IEventAdapter } from './IEventAdapter';

export class TikTokLiveAdapter implements IEventAdapter {
  readonly id = 'tiktok_production';
  readonly name = 'Conector de Produção TikTok LIVE (WebSocket / Relay)';
  readonly isProduction = true;

  private state: ConnectionState = 'DISCONNECTED';
  private streamerHandle: string = '';
  private relayUrl: string = 'ws://localhost:8081'; // URL padrão do relay local/Vercel
  private ws: WebSocket | null = null;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectTimer: number | null = null;

  private eventCallbacks: Set<(raw: Partial<NormalizedEvent>) => void> = new Set();
  private stateCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private errorCallbacks: Set<(msg: string) => void> = new Set();

  async connect(config?: { streamerHandle?: string; relayUrl?: string; sessionToken?: string }): Promise<void> {
    if (config?.streamerHandle) {
      this.streamerHandle = config.streamerHandle.startsWith('@') 
        ? config.streamerHandle 
        : `@${config.streamerHandle}`;
    }

    if (config?.relayUrl) {
      this.relayUrl = config.relayUrl;
    }

    if (!this.streamerHandle) {
      this.setState('ERROR');
      this.emitError('Identificador do criador (@streamer) é obrigatório para conectar à LIVE real.');
      return;
    }

    this.setState('CONNECTING');

    try {
      // Tentativa de conexão real via WebSocket com o serviço de relay
      this.ws = new WebSocket(`${this.relayUrl}?streamer=${encodeURIComponent(this.streamerHandle)}`);

      this.ws.onopen = () => {
        this.reconnectAttempts = 0;
        this.setState('CONNECTED');
      };

      this.ws.onmessage = (event) => {
        try {
          const parsed = JSON.parse(event.data);
          // O payload do relay precisa fornecer eventType e dados de usuário
          if (parsed && parsed.eventType) {
            this.eventCallbacks.forEach((cb) => cb(parsed));
          }
        } catch {
          // Erro de parse de frame corrompido
          this.emitError('Pacote recebido da transmissão com formato inválido.');
        }
      };

      this.ws.onclose = () => {
        if (this.state === 'CONNECTED' || this.state === 'CONNECTING') {
          this.handleDisconnectAndRetry();
        } else {
          this.setState('DISCONNECTED');
        }
      };

      this.ws.onerror = () => {
        this.handleDisconnectAndRetry();
      };
    } catch {
      this.handleDisconnectAndRetry();
    }
  }

  private handleDisconnectAndRetry() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      this.setState('RECONNECTING');
      const delay = Math.min(1000 * Math.pow(1.6, this.reconnectAttempts), 8000);
      
      this.reconnectTimer = window.setTimeout(() => {
        this.connect({ streamerHandle: this.streamerHandle, relayUrl: this.relayUrl });
      }, delay);
    } else {
      this.setState('ERROR');
      this.emitError(
        `Falha ao conectar ao relay TikTok em ${this.relayUrl}. Certifique-se de que o conector local (Node.js) ou proxy na Vercel está em execução.`
      );
    }
  }

  async disconnect(): Promise<void> {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.reconnectAttempts = 0;
    this.setState('DISCONNECTED');
  }

  getState(): ConnectionState {
    return this.state;
  }

  onRawEvent(cb: (raw: Partial<NormalizedEvent>) => void) {
    this.eventCallbacks.add(cb);
    return () => { this.eventCallbacks.delete(cb); };
  }

  onStateChange(cb: (state: ConnectionState) => void) {
    this.stateCallbacks.add(cb);
    return () => { this.stateCallbacks.delete(cb); };
  }

  onError(cb: (msg: string) => void) {
    this.errorCallbacks.add(cb);
    return () => { this.errorCallbacks.delete(cb); };
  }

  private setState(next: ConnectionState) {
    this.state = next;
    this.stateCallbacks.forEach((cb) => cb(next));
  }

  private emitError(msg: string) {
    this.errorCallbacks.forEach((cb) => cb(msg));
  }

  public getStreamerHandle(): string {
    return this.streamerHandle;
  }

  public getRelayUrl(): string {
    return this.relayUrl;
  }
}
