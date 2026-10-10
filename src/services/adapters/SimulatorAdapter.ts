/**
 * ARYA GM - Adaptador de Simulação (Ambiente de Desenvolvimento)
 * Preserva o gerador de eventos para testes locais, presets e homologação.
 */

import { ConnectionState, NormalizedEvent } from '../../types';
import { IEventAdapter } from './IEventAdapter';

export class SimulatorAdapter implements IEventAdapter {
  readonly id = 'simulator';
  readonly name = 'Simulador de Desenvolvimento ARYA';
  readonly isProduction = false;

  private state: ConnectionState = 'DISCONNECTED';
  private eventCallbacks: Set<(raw: Partial<NormalizedEvent>) => void> = new Set();
  private stateCallbacks: Set<(state: ConnectionState) => void> = new Set();
  private errorCallbacks: Set<(msg: string) => void> = new Set();
  private intervalTimer: number | null = null;

  async connect(): Promise<void> {
    this.setState('CONNECTING');
    await new Promise((r) => setTimeout(r, 600));
    this.setState('CONNECTED');
  }

  async disconnect(): Promise<void> {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
    }
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

  public emitRaw(raw: Partial<NormalizedEvent>) {
    if (this.state !== 'CONNECTED' && this.state !== 'DEGRADED') return;
    this.eventCallbacks.forEach((cb) => cb(raw));
  }

  public toggleContinuousFeed(): boolean {
    if (this.intervalTimer) {
      clearInterval(this.intervalTimer);
      this.intervalTimer = null;
      return false;
    }

    if (this.state !== 'CONNECTED') {
      this.connect();
    }

    this.intervalTimer = window.setInterval(() => {
      const rand = Math.random();
      if (rand < 0.45) {
        const names = ['KitePro_BR', 'RobloxQueen_SP', 'MestreDoCerol', 'Pipinha10', 'Bailarino99', 'TikTokFan'];
        const chosen = names[Math.floor(Math.random() * names.length)];
        this.emitRaw({
          eventType: 'comment',
          user: { id: `u_${chosen}`, displayName: chosen },
          commentText: Math.random() > 0.5 ? '!jogar' : '!entrar @' + chosen.toLowerCase(),
          source: 'simulator',
          receivedAt: new Date().toISOString()
        });
      } else if (rand < 0.8) {
        const gifts = [
          { name: 'Rosa', coins: 1 },
          { name: 'Boné ARYA', coins: 99 },
          { name: 'Coração', coins: 10 }
        ];
        const g = gifts[Math.floor(Math.random() * gifts.length)];
        this.emitRaw({
          eventType: 'gift',
          user: { id: `u_gift_${Date.now()}`, displayName: `Doador_${Math.floor(Math.random() * 899 + 100)}` },
          gift: {
            id: `gift_${g.name.toLowerCase()}`,
            name: g.name,
            coins: g.coins,
            repeatCount: 1,
            isFinal: true
          },
          source: 'simulator',
          receivedAt: new Date().toISOString()
        });
      } else {
        this.emitRaw({
          eventType: 'like',
          user: { id: `u_like_${Date.now()}`, displayName: 'Espectador_Curtiu' },
          source: 'simulator',
          receivedAt: new Date().toISOString()
        });
      }
    }, 1800);

    return true;
  }
}
