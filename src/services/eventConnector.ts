/**
 * ARYA GM - Gerenciador Central de Conexão e Ingestão de Eventos
 * Etapas 1 e 3 da Auditoria Técnica:
 * - Inicia rigorosamente em DISCONNECTED.
 * - Suporta alternância entre Adaptador de Produção e Simulador de Desenvolvimento.
 * - Integração direta com EventDeduplicator para descarte de duplicatas e combos.
 * - Zero dados falsos de sucesso.
 */

import { ConnectionState, NormalizedEvent } from '../types';
import { IEventAdapter } from './adapters/IEventAdapter';
import { SimulatorAdapter } from './adapters/SimulatorAdapter';
import { TikTokLiveAdapter } from './adapters/TikTokLiveAdapter';
import { eventDeduplicator } from './deduplicator';

type EventListener = (event: NormalizedEvent) => void;
type StateListener = (state: ConnectionState) => void;
type ErrorListener = (errorMsg: string) => void;

export class EventConnectorService {
  private activeAdapterType: 'simulator' | 'tiktok_production' = 'simulator';
  private simulatorAdapter: SimulatorAdapter;
  private tiktokAdapter: TikTokLiveAdapter;
  private currentAdapter: IEventAdapter;

  private eventListeners: Set<EventListener> = new Set();
  private stateListeners: Set<StateListener> = new Set();
  private errorListeners: Set<ErrorListener> = new Set();
  private eventHistory: NormalizedEvent[] = [];

  constructor() {
    this.simulatorAdapter = new SimulatorAdapter();
    this.tiktokAdapter = new TikTokLiveAdapter();
    this.currentAdapter = this.simulatorAdapter;

    this.bindAdapter(this.currentAdapter);
  }

  private bindAdapter(adapter: IEventAdapter) {
    adapter.onRawEvent((raw) => {
      this.handleIncomingRaw(raw);
    });

    adapter.onStateChange((st) => {
      this.stateListeners.forEach((fn) => fn(st));
    });

    adapter.onError((err) => {
      this.errorListeners.forEach((fn) => fn(err));
    });
  }

  public getActiveAdapterType(): 'simulator' | 'tiktok_production' {
    return this.activeAdapterType;
  }

  public async switchAdapter(type: 'simulator' | 'tiktok_production', config?: { streamerHandle?: string; relayUrl?: string }) {
    await this.currentAdapter.disconnect();

    this.activeAdapterType = type;
    this.currentAdapter = type === 'tiktok_production' ? this.tiktokAdapter : this.simulatorAdapter;
    this.bindAdapter(this.currentAdapter);

    if (config?.streamerHandle) {
      await this.currentAdapter.connect(config);
    }
  }

  public async connect(config?: { streamerHandle?: string; relayUrl?: string }) {
    await this.currentAdapter.connect(config);
  }

  public async disconnect() {
    await this.currentAdapter.disconnect();
  }

  public getState(): ConnectionState {
    return this.currentAdapter.getState();
  }

  public onEvent(fn: EventListener) {
    this.eventListeners.add(fn);
    return () => {
      this.eventListeners.delete(fn);
    };
  }

  public onStateChange(fn: StateListener) {
    this.stateListeners.add(fn);
    return () => {
      this.stateListeners.delete(fn);
    };
  }

  public onError(fn: ErrorListener) {
    this.errorListeners.add(fn);
    return () => {
      this.errorListeners.delete(fn);
    };
  }

  public getHistory(): NormalizedEvent[] {
    return [...this.eventHistory];
  }

  public getDeduplicationStats() {
    return eventDeduplicator.getStats();
  }

  /**
   * Processamento e Ingestão com Deduplicação Rigorosa
   */
  private handleIncomingRaw(raw: Partial<NormalizedEvent>) {
    const result = eventDeduplicator.process(raw);

    if (result.isAccepted && result.normalizedEvent) {
      const normalized = result.normalizedEvent;
      this.eventHistory.unshift(normalized);
      if (this.eventHistory.length > 150) {
        this.eventHistory.pop();
      }

      this.eventListeners.forEach((listener) => listener(normalized));
    }
  }

  /**
   * Disparo manual direto pelo operador (Console)
   */
  public ingestManualEvent(raw: Partial<NormalizedEvent>) {
    this.handleIncomingRaw({
      ...raw,
      source: 'manual',
      receivedAt: raw.receivedAt || new Date().toISOString()
    });
  }

  /**
   * Presets do Simulador
   */
  public triggerPreset(preset: 'rose_barrage' | 'chat_wave' | 'galaxy_boss' | 'lion_legend' | 'disconnect_reconnect') {
    if (preset === 'disconnect_reconnect') {
      this.currentAdapter.disconnect();
      setTimeout(() => this.currentAdapter.connect(), 1500);
      return;
    }

    if (this.currentAdapter.getState() !== 'CONNECTED') {
      this.currentAdapter.connect();
    }

    if (preset === 'rose_barrage') {
      for (let i = 0; i < 5; i++) {
        setTimeout(() => {
          this.simulatorAdapter.emitRaw({
            eventId: `rose_combo_${Date.now()}_${i}`,
            eventType: 'gift',
            user: { id: `fan_combo_1`, displayName: `Torcedor_Combo` },
            gift: {
              id: 'gift_rose',
              name: 'Rosa',
              coins: 1,
              repeatCount: i + 1,
              isFinal: i === 4
            },
            source: 'simulator',
            receivedAt: new Date().toISOString()
          });
        }, i * 150);
      }
    } else if (preset === 'chat_wave') {
      const names = ['Carlinhos_Pipas', 'Bia_Roblox', 'GamerBR_99', 'Pipa_Voadora', 'Dança_Top'];
      names.forEach((name, i) => {
        setTimeout(() => {
          this.simulatorAdapter.emitRaw({
            eventId: `chat_msg_${Date.now()}_${i}`,
            eventType: 'comment',
            user: { id: `usr_${name.toLowerCase()}`, displayName: name },
            commentText: i % 2 === 0 ? '!jogar pipa' : '!entrar @' + name.toLowerCase(),
            source: 'simulator',
            receivedAt: new Date().toISOString()
          });
        }, i * 160);
      });
    } else if (preset === 'galaxy_boss') {
      this.simulatorAdapter.emitRaw({
        eventId: `galaxy_${Date.now()}`,
        eventType: 'gift',
        user: { id: 'vip_999', displayName: 'Imperador_Do_TikTok' },
        gift: {
          id: 'gift_galaxy',
          name: 'Galáxia 3D',
          coins: 1000,
          repeatCount: 1,
          isFinal: true
        },
        source: 'simulator',
        receivedAt: new Date().toISOString()
      });
    } else if (preset === 'lion_legend') {
      this.simulatorAdapter.emitRaw({
        eventId: `lion_${Date.now()}`,
        eventType: 'gift',
        user: { id: 'legend_1', displayName: 'Sheik_Das_Lives' },
        gift: {
          id: 'gift_lion',
          name: 'Leão Lendário',
          coins: 29999,
          repeatCount: 1,
          isFinal: true
        },
        source: 'simulator',
        receivedAt: new Date().toISOString()
      });
    }
  }

  public toggleSimulatorFeed(): boolean {
    return this.simulatorAdapter.toggleContinuousFeed();
  }

  public getTikTokAdapter(): TikTokLiveAdapter {
    return this.tiktokAdapter;
  }
}

export const eventConnector = new EventConnectorService();
