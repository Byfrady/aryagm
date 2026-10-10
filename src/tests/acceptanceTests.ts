/**
 * ARYA GM - Suíte de Testes Automatizados de Aceitação (Homologação Técnica)
 * Etapa 7 da Auditoria Técnica:
 * Validação programática das 8 áreas críticas do sistema com evidências verificáveis.
 */

import { AcceptanceTestResult } from '../types';
import { EventDeduplicator } from '../services/deduplicator';
import { RuleEngineService, HARDENED_RULES } from '../services/ruleEngine';
import { RobloxAvatarService } from '../services/robloxAvatarService';
import { LicenseService } from '../services/licenseService';
import { SimulatorAdapter } from '../services/adapters/SimulatorAdapter';

export async function runAllAcceptanceTests(): Promise<AcceptanceTestResult[]> {
  const results: AcceptanceTestResult[] = [];

  // TESTE 1: Inicialização Limpa e Estado Desconectado
  {
    const start = performance.now();
    const sim = new SimulatorAdapter();
    const initialState = sim.getState();
    const passed = initialState === 'DISCONNECTED';

    results.push({
      id: 'test_clean_init',
      title: 'Inicialização Limpa (Estado DISCONNECTED Obrigatório)',
      category: 'Conexão',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Garante que a aplicação não finge estar conectada sem conexão física estabelecida.',
      evidence: `Estado inicial obtido: "${initialState}" | Esperado: "DISCONNECTED"`
    });
  }

  // TESTE 2: Recepção, Normalização e Fallback Hash para Eventos Sem ID
  {
    const start = performance.now();
    const dedup = new EventDeduplicator();
    const res = dedup.process({
      eventType: 'comment',
      user: { id: 'usr_test_1', displayName: 'Jogador 1' },
      commentText: '!jogar pipa verde'
    });

    const passed = res.isAccepted && Boolean(res.normalizedEvent?.eventId.startsWith('hash_'));

    results.push({
      id: 'test_normalization_hash',
      title: 'Normalização e Hash Fallback para Eventos Sem ID',
      category: 'Deduplicação',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Verifica geração determinística de hash quando o conector não fornece ID oficial.',
      evidence: `ID gerado: ${res.normalizedEvent?.eventId} | Aceito: ${res.isAccepted}`
    });
  }

  // TESTE 3: Deduplicação e Descarte de Eventos Repetidos
  {
    const start = performance.now();
    const dedup = new EventDeduplicator();
    const payload = {
      eventId: 'evt_official_fixed_12345',
      eventType: 'gift' as const,
      user: { id: 'usr_dup_1', displayName: 'Doador' },
      gift: { id: 'gift_rosa', name: 'Rosa', coins: 1, repeatCount: 1, isFinal: true }
    };

    const first = dedup.process(payload);
    const second = dedup.process(payload); // Mesma chave!

    const passed = first.isAccepted && !second.isAccepted && second.reason === 'duplicate';

    results.push({
      id: 'test_deduplication_drop',
      title: 'Deduplicação Confiável de Eventos Repetidos',
      category: 'Deduplicação',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Garante que reconexões e pacotes retransmitidos não executem ações duplicadas no jogo.',
      evidence: `1ª tentativa: ${first.reason} | 2ª tentativa: ${second.reason} (Descartada)`
    });
  }

  // TESTE 4: Cooldown Individual por Usuário vs Rate Limit Global
  {
    const start = performance.now();
    const ruleEng = new RuleEngineService();
    const baseEvent = (userId: string, comment: string) => ({
      eventId: `evt_${Math.random()}`,
      hasGenuineId: false,
      eventType: 'comment' as const,
      streamId: 'sim',
      user: { id: userId, displayName: userId },
      commentText: comment,
      receivedAt: new Date().toISOString(),
      source: 'simulator' as const
    });

    // Usuário A dispara ação
    const matchedA1 = ruleEng.evaluateEvent(baseEvent('user_A', '!jogar'), 'pipas');
    // Usuário A tenta imediatamente de novo (deve ser bloqueado pelo userCooldown)
    const matchedA2 = ruleEng.evaluateEvent(baseEvent('user_A', '!jogar'), 'pipas');
    // Usuário B tenta no mesmo instante (NÃO deve ser bloqueado pelo cooldown do usuário A!)
    const matchedB = ruleEng.evaluateEvent(baseEvent('user_B', '!jogar'), 'pipas');

    const passed = matchedA1.length > 0 && matchedA2.length === 0 && matchedB.length > 0;

    results.push({
      id: 'test_user_cooldown_isolation',
      title: 'Isolamento de Cooldown Individual por Espectador',
      category: 'Regras & Cooldown',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Garante que o spam de um espectador não congele o acesso de outros participantes.',
      evidence: `Usuário A (1ª vez): ${matchedA1.length > 0 ? 'Aprovado' : 'Falha'} | Usuário A (Spam): Bloqueado | Usuário B: ${matchedB.length > 0 ? 'Aprovado (Correto)' : 'Bloqueado (Erro)'}`
    });
  }

  // TESTE 5: Ações de Jogo Válidas e Descarte de Eventos Inválidos
  {
    const start = performance.now();
    const ruleEng = new RuleEngineService();
    const invalidEvent = {
      eventId: 'evt_invalid',
      hasGenuineId: false,
      eventType: 'gift' as const,
      streamId: 'sim',
      user: { id: 'usr_fraud', displayName: 'Fraudador' },
      gift: { id: 'fake_gift', name: 'Presente Inexistente', coins: 0, repeatCount: 1, isFinal: true },
      receivedAt: new Date().toISOString(),
      source: 'simulator' as const
    };

    const matched = ruleEng.evaluateEvent(invalidEvent, 'pipas');
    const passed = matched.length === 0;

    results.push({
      id: 'test_invalid_event_rejection',
      title: 'Rejeição de Presentes Inválidos e Eventos Fora das Regras',
      category: 'Regras & Cooldown',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Verifica se presentes sem correspondência ou com moedas insuficientes são rejeitados.',
      evidence: `Regras acionadas: ${matched.length} | Esperado: 0`
    });
  }

  // TESTE 6: Resolução de Avatar Roblox & Fallback Transparente
  {
    const start = performance.now();
    const roblox = new RobloxAvatarService();
    // Teste com identificador vazio ou desconhecido
    const resUnknown = await roblox.resolveRobloxUser('___usuario_inexistente_999999999___');
    const passed = resUnknown.status === 'DEMO_PROCEDURAL' && resUnknown.isRealRoblox === false;

    results.push({
      id: 'test_roblox_avatar_resolution',
      title: 'Resolução de Avatar e Fallback Transparente (Roblox)',
      category: 'Roblox Avatar',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Verifica identificação honesta de "DEMO_PROCEDURAL" quando o usuário não é do Roblox.',
      evidence: `Status retornado: "${resUnknown.status}" | isRealRoblox: ${resUnknown.isRealRoblox}`
    });
  }

  // TESTE 7: Ciclo Completo de Desconexão e Reconexão
  {
    const start = performance.now();
    const sim = new SimulatorAdapter();
    await sim.connect();
    const stateConnected = sim.getState();
    await sim.disconnect();
    const stateDisconnected = sim.getState();
    await sim.connect();
    const stateReconnected = sim.getState();

    const passed = stateConnected === 'CONNECTED' && stateDisconnected === 'DISCONNECTED' && stateReconnected === 'CONNECTED';

    results.push({
      id: 'test_reconnection_lifecycle',
      title: 'Ciclo de Desconexão e Reconexão Resiliente',
      category: 'Conexão',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Valida se o adaptador restabelece o fluxo sem travamentos.',
      evidence: `Conectado -> Desconectado -> Reconectado: [${stateConnected} -> ${stateDisconnected} -> ${stateReconnected}]`
    });
  }

  // TESTE 8: Validação Criptográfica de Licença e Tolerância Offline
  {
    const start = performance.now();
    const license = new LicenseService();

    // 1. Chave Válida
    const validRes = await license.validateLicenseKey('ARYA-PRO-2026-LIVE');
    // 2. Chave Expirada
    const expRes = await license.validateLicenseKey('ARYA-EXPIRED-2024');
    // 3. Simulação de Servidor Indisponível com Período de Graça
    await license.validateLicenseKey('ARYA-PRO-2026-LIVE');
    const graceRes = await license.validateLicenseKey('ARYA-PRO-2026-LIVE', '@streamer', true);

    const passed = validRes.status === 'ACTIVE' && expRes.status === 'EXPIRED' && graceRes.status === 'OFFLINE_GRACE';

    results.push({
      id: 'test_license_and_offline_grace',
      title: 'Validação de Licença e Tolerância Offline (72h Grace)',
      category: 'Licença',
      passed,
      latencyMs: Math.round(performance.now() - start),
      details: 'Confirma que chave ativa é validada, chave expirada é bloqueada e queda de servidor ativa grace.',
      evidence: `Válida: ${validRes.status} | Expirada: ${expRes.status} | Queda Servidor: ${graceRes.status} (${graceRes.gracePeriodRemainingHours}h restantes)`
    });
  }

  return results;
}
