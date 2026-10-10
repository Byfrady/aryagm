/**
 * ARYA GM - Deduplicação Confiável de Eventos
 * Etapa 3 da Auditoria Técnica:
 * - Deduplicação por identificador oficial quando disponível.
 * - Hashing determinístico como fallback para eventos sem ID.
 * - Tratamento de sequências/combos de presentes (repeatCount).
 * - Telemetria precisa de eventos recebidos, aceitos, duplicados, inválidos e descartados.
 */

import { NormalizedEvent, DeduplicationStats } from '../types';

export class EventDeduplicator {
  private seenIds: Map<string, number> = new Map(); // id -> timestamp
  private comboCache: Map<string, { lastCount: number; timestamp: number }> = new Map(); // comboKey -> info
  private maxCacheSize: number = 2000;
  private idTtlMs: number = 5 * 60 * 1000; // 5 minutos de retenção

  private stats: DeduplicationStats = {
    receivedCount: 0,
    acceptedCount: 0,
    duplicateCount: 0,
    invalidCount: 0,
    discardedCount: 0
  };

  /**
   * Simple deterministic hash string for fallback when eventId is missing
   */
  public generateFallbackHash(raw: Partial<NormalizedEvent>): string {
    const userId = raw.user?.id || 'anon';
    const type = raw.eventType || 'unknown';
    const content = raw.commentText || raw.gift?.name || '';
    const timeWindow = Math.floor(new Date(raw.receivedAt || Date.now()).getTime() / 1500); // Janela de 1.5s
    const repeat = raw.gift?.repeatCount || 1;

    // FNV-1a simple string hash
    const str = `${userId}:${type}:${content}:${repeat}:${timeWindow}`;
    let hash = 0x811c9dc5;
    for (let i = 0; i < str.length; i++) {
      hash ^= str.charCodeAt(i);
      hash = (hash * 0x01000193) >>> 0;
    }
    return `hash_${hash.toString(16)}`;
  }

  /**
   * Process and validate incoming raw event
   * Returns: { isAccepted: boolean, reason?: string, normalizedEvent?: NormalizedEvent }
   */
  public process(raw: Partial<NormalizedEvent>): {
    isAccepted: boolean;
    reason?: 'duplicate' | 'invalid' | 'discarded' | 'accepted';
    normalizedEvent?: NormalizedEvent;
  } {
    this.stats.receivedCount++;

    // 1. Validação estrutural básica
    if (!raw.eventType || (!raw.commentText && !raw.gift && raw.eventType !== 'like' && raw.eventType !== 'follow')) {
      this.stats.invalidCount++;
      return { isAccepted: false, reason: 'invalid' };
    }

    const now = Date.now();
    this.cleanupExpired(now);

    // 2. Determinação do Identificador Único
    let finalId = raw.eventId?.trim() || '';
    const hasGenuineId = Boolean(finalId && !finalId.startsWith('hash_') && !finalId.startsWith('sim_'));

    if (!finalId) {
      finalId = this.generateFallbackHash(raw);
    }

    // 3. Tratamento de Presentes em Sequência (Combos)
    if (raw.eventType === 'gift' && raw.gift) {
      const comboKey = `${raw.user?.id || 'anon'}_${raw.gift.name}`;
      const repeatCount = raw.gift.repeatCount || 1;
      const prevCombo = this.comboCache.get(comboKey);

      if (prevCombo && now - prevCombo.timestamp < 10000) {
        if (repeatCount <= prevCombo.lastCount && hasGenuineId && this.seenIds.has(finalId)) {
          // Pacote repetido de um mesmo estágio de combo já processado
          this.stats.duplicateCount++;
          return { isAccepted: false, reason: 'duplicate' };
        }
        // Avanço legítimo de combo
        this.comboCache.set(comboKey, { lastCount: repeatCount, timestamp: now });
      } else {
        this.comboCache.set(comboKey, { lastCount: repeatCount, timestamp: now });
      }
    }

    // 4. Verificação de Duplicata no Cache
    if (this.seenIds.has(finalId)) {
      this.stats.duplicateCount++;
      return { isAccepted: false, reason: 'duplicate' };
    }

    // 5. Aceite do Evento e Registro no Cache
    this.seenIds.set(finalId, now);
    if (this.seenIds.size > this.maxCacheSize) {
      const oldestKey = this.seenIds.keys().next().value;
      if (oldestKey) this.seenIds.delete(oldestKey);
    }

    this.stats.acceptedCount++;

    const normalized: NormalizedEvent = {
      eventId: finalId,
      hasGenuineId,
      eventType: raw.eventType,
      streamId: raw.streamId || 'session_default',
      user: {
        id: raw.user?.id || `usr_${finalId.substring(0, 8)}`,
        displayName: raw.user?.displayName || 'Espectador',
        avatarUrl: raw.user?.avatarUrl,
        secUid: raw.user?.secUid
      },
      gift: raw.gift,
      commentText: raw.commentText,
      receivedAt: raw.receivedAt || new Date().toISOString(),
      processedAt: new Date().toISOString(),
      source: raw.source || 'simulator',
      rawPayloadHash: finalId.startsWith('hash_') ? finalId : undefined
    };

    return { isAccepted: true, reason: 'accepted', normalizedEvent: normalized };
  }

  private cleanupExpired(now: number) {
    if (this.seenIds.size < 500) return;
    for (const [id, ts] of this.seenIds.entries()) {
      if (now - ts > this.idTtlMs) {
        this.seenIds.delete(id);
      }
    }
  }

  public getStats(): DeduplicationStats {
    return { ...this.stats };
  }

  public resetStats() {
    this.stats = {
      receivedCount: 0,
      acceptedCount: 0,
      duplicateCount: 0,
      invalidCount: 0,
      discardedCount: 0
    };
    this.seenIds.clear();
    this.comboCache.clear();
  }
}

export const eventDeduplicator = new EventDeduplicator();
