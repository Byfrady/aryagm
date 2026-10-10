/**
 * ARYA GM - Motor de Regras de Interação (Rule Engine)
 * Etapa 2 da Auditoria Técnica:
 * - Cooldown individual por espectador (evita que um usuário bloqueie outros).
 * - Rate limit global por regra (protege a integridade da taxa de quadros e física).
 * - Validação rigorosa de comandos de chat e tipos de presentes.
 * - Descarte de eventos inválidos antes da execução.
 */

import { NormalizedEvent, RuleMapping } from '../types';

export const HARDENED_RULES: RuleMapping[] = [
  // PIPAS COMBATE RULES
  {
    id: 'rule_pipa_spawn',
    eventType: 'comment',
    matchPattern: '!jogar',
    gameTarget: 'pipas',
    action: 'spawn_kite',
    description: 'Comando !jogar adiciona a pipa do espectador na arena',
    userCooldownMs: 5000,   // O mesmo espectador só pode criar a cada 5s
    globalCooldownMs: 200,  // Máximo 5 entradas por segundo globalmente
    isEnabled: true
  },
  {
    id: 'rule_pipa_turbo',
    eventType: 'gift',
    matchPattern: 'Rosa',
    minCoins: 1,
    gameTarget: 'pipas',
    action: 'boost_turbo',
    description: 'Rosa (1 moeda): Ativa impulso turbo na pipa do doador',
    userCooldownMs: 1000,
    globalCooldownMs: 150,
    isEnabled: true
  },
  {
    id: 'rule_pipa_cerol',
    eventType: 'gift',
    matchPattern: 'Coração',
    minCoins: 10,
    gameTarget: 'pipas',
    action: 'activate_cerol',
    description: 'Coração (10 moedas): Aplica Linha Chilena com poder de corte x2',
    userCooldownMs: 3000,
    globalCooldownMs: 400,
    isEnabled: true
  },
  {
    id: 'rule_pipa_shield',
    eventType: 'gift',
    matchPattern: 'Boné ARYA',
    minCoins: 99,
    gameTarget: 'pipas',
    action: 'activate_shield',
    description: 'Boné (99 moedas): Escudo temporário contra cortes',
    userCooldownMs: 4000,
    globalCooldownMs: 500,
    isEnabled: true
  },
  {
    id: 'rule_pipa_storm',
    eventType: 'gift',
    matchPattern: 'Galáxia 3D',
    minCoins: 1000,
    gameTarget: 'pipas',
    action: 'wind_gust',
    description: 'Galáxia (1.000 moedas): Tempestade de vento desestabilizadora',
    userCooldownMs: 8000,
    globalCooldownMs: 2000,
    isEnabled: true
  },
  {
    id: 'rule_pipa_lion',
    eventType: 'gift',
    matchPattern: 'Leão Lendário',
    minCoins: 29999,
    gameTarget: 'pipas',
    action: 'cut_random',
    description: 'Leão (29.999 moedas): Raio Dourado corta pipas rivais',
    userCooldownMs: 15000,
    globalCooldownMs: 5000,
    isEnabled: true
  },

  // AVATAR DANCE RULES
  {
    id: 'rule_avatar_spawn',
    eventType: 'comment',
    matchPattern: '!entrar',
    gameTarget: 'avatar',
    action: 'spawn_avatar',
    description: 'Comando !entrar @roblox coloca o avatar do espectador no palco',
    userCooldownMs: 6000,
    globalCooldownMs: 250,
    isEnabled: true
  },
  {
    id: 'rule_avatar_confetti',
    eventType: 'gift',
    matchPattern: 'Rosa',
    minCoins: 1,
    gameTarget: 'avatar',
    action: 'confetti_shower',
    description: 'Rosa (1 moeda): Chuva de confetes coloridos',
    userCooldownMs: 800,
    globalCooldownMs: 200,
    isEnabled: true
  },
  {
    id: 'rule_avatar_spotlight',
    eventType: 'gift',
    matchPattern: 'Boné ARYA',
    minCoins: 99,
    gameTarget: 'avatar',
    action: 'vip_spotlight',
    description: 'Boné (99 moedas): Holofote VIP seguindo o dançarino',
    userCooldownMs: 4000,
    globalCooldownMs: 1000,
    isEnabled: true
  },
  {
    id: 'rule_avatar_giant',
    eventType: 'gift',
    matchPattern: 'Galáxia 3D',
    minCoins: 1000,
    gameTarget: 'avatar',
    action: 'giant_scale',
    description: 'Galáxia (1.000 moedas): Avatar gigante no centro do palco',
    userCooldownMs: 8000,
    globalCooldownMs: 2500,
    isEnabled: true
  },
  {
    id: 'rule_avatar_solo',
    eventType: 'gift',
    matchPattern: 'Leão Lendário',
    minCoins: 29999,
    gameTarget: 'avatar',
    action: 'super_dance_solo',
    description: 'Leão (29.999 moedas): Solo de Breakdance lendário com lasers',
    userCooldownMs: 20000,
    globalCooldownMs: 5000,
    isEnabled: true
  }
];

export class RuleEngineService {
  private rules: RuleMapping[] = [...HARDENED_RULES];

  public getRules(): RuleMapping[] {
    return [...this.rules];
  }

  public updateRule(id: string, updates: Partial<RuleMapping>) {
    this.rules = this.rules.map((r) => (r.id === id ? { ...r, ...updates } : r));
  }

  public addRule(rule: RuleMapping) {
    this.rules.push(rule);
  }

  public resetToDefaults() {
    this.rules = [...HARDENED_RULES];
  }

  /**
   * Avalia um evento normalizado aplicando validação estrita,
   * rate-limiting global e cooldown por usuário.
   */
  public evaluateEvent(
    event: NormalizedEvent,
    currentGame: 'pipas' | 'avatar'
  ): RuleMapping[] {
    const matched: RuleMapping[] = [];
    const now = Date.now();
    const userId = event.user.id;

    for (const rule of this.rules) {
      if (!rule.isEnabled) continue;

      if (rule.gameTarget !== 'both' && rule.gameTarget !== currentGame) {
        continue;
      }

      if (rule.eventType !== event.eventType) {
        continue;
      }

      // 1. Verificação de Rate Limit Global
      if (rule.lastTriggeredGlobal && now - rule.lastTriggeredGlobal < rule.globalCooldownMs) {
        continue;
      }

      // 2. Verificação de Cooldown por Usuário
      if (!rule.lastTriggeredByUser) {
        rule.lastTriggeredByUser = {};
      }
      const lastUserTrigger = rule.lastTriggeredByUser[userId];
      if (lastUserTrigger && now - lastUserTrigger < rule.userCooldownMs) {
        continue;
      }

      // 3. Validação de Comentário
      if (event.eventType === 'comment') {
        const text = (event.commentText || '').trim().toLowerCase();
        const pattern = (rule.matchPattern || '').trim().toLowerCase();
        if (pattern && !text.includes(pattern)) {
          continue;
        }
      }

      // 4. Validação de Presente (Gift)
      if (event.eventType === 'gift') {
        if (!event.gift) continue;

        const giftName = event.gift.name.toLowerCase();
        const pattern = (rule.matchPattern || '').toLowerCase();
        const coins = event.gift.coins;

        const nameMatches = !pattern || giftName.includes(pattern);
        const coinsMatch = !rule.minCoins || coins >= rule.minCoins;

        if (!nameMatches || !coinsMatch) {
          continue;
        }
      }

      // Regra aprovada: atualiza timestamps
      rule.lastTriggeredGlobal = now;
      rule.lastTriggeredByUser[userId] = now;
      matched.push(rule);
    }

    return matched;
  }
}

export const ruleEngine = new RuleEngineService();
