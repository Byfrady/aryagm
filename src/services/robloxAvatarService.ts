/**
 * ARYA GM - Serviço de Resolução de Avatares do Roblox
 * Etapa 4 da Auditoria Técnica:
 * - Consulta endpoints públicos oficiais da API do Roblox (users.roblox.com e thumbnails.roblox.com).
 * - Extrai ID oficial e thumbnail de corpo inteiro renderizado do avatar real.
 * - Gerencia cache em memória e localStorage para evitar limite de requisições (rate-limit 429).
 * - Diferencia com honestidade rigorosa: 'RESOLVED_ROBLOX' (Avatar real) vs 'DEMO_PROCEDURAL' (Modo Demonstração).
 */

import { ResolvedRobloxAvatar } from '../types';

export class RobloxAvatarService {
  private cache: Map<string, ResolvedRobloxAvatar> = new Map();
  private inFlightRequests: Map<string, Promise<ResolvedRobloxAvatar>> = new Map();
  private lastRequestTime: number = 0;
  private minIntervalMs: number = 400; // Rate limit: ~2.5 requisições por segundo

  constructor() {
    this.loadCachedAvatars();
  }

  private loadCachedAvatars() {
    try {
      const stored = localStorage.getItem('__arya_roblox_avatar_cache');
      if (stored) {
        const parsed = JSON.parse(stored) as Record<string, ResolvedRobloxAvatar>;
        Object.entries(parsed).forEach(([k, v]) => this.cache.set(k.toLowerCase(), v));
      }
    } catch {
      // Ignora falha de parse no sandbox
    }
  }

  private saveCache() {
    try {
      const obj: Record<string, ResolvedRobloxAvatar> = {};
      this.cache.forEach((v, k) => {
        // Guarda apenas avatares resolvidos com menos de 24h
        if (Date.now() - v.fetchedAt < 24 * 60 * 60 * 1000) {
          obj[k] = v;
        }
      });
      localStorage.setItem('__arya_roblox_avatar_cache', JSON.stringify(obj));
    } catch {
      // Ignora erro de quota
    }
  }

  /**
   * Resolve o nome de usuário do Roblox.
   * Tenta a API oficial do Roblox; caso haja restrição de CORS no browser ou erro,
   * categoriza honestamente como DEMO_PROCEDURAL.
   */
  public async resolveRobloxUser(rawUsername: string): Promise<ResolvedRobloxAvatar> {
    const cleanUsername = rawUsername.replace('@', '').trim().toLowerCase();

    if (!cleanUsername) {
      return {
        username: 'desconhecido',
        isRealRoblox: false,
        status: 'DEMO_PROCEDURAL',
        fetchedAt: Date.now()
      };
    }

    // 1. Verifica Cache
    const cached = this.cache.get(cleanUsername);
    if (cached && Date.now() - cached.fetchedAt < 2 * 60 * 60 * 1000) {
      return cached;
    }

    // 2. Coalescência de requisições em voo (deduplica requests para o mesmo username)
    if (this.inFlightRequests.has(cleanUsername)) {
      return this.inFlightRequests.get(cleanUsername)!;
    }

    const fetchPromise = this.executeRobloxLookup(cleanUsername);
    this.inFlightRequests.set(cleanUsername, fetchPromise);

    try {
      const result = await fetchPromise;
      this.cache.set(cleanUsername, result);
      this.saveCache();
      return result;
    } finally {
      this.inFlightRequests.delete(cleanUsername);
    }
  }

  private async executeRobloxLookup(username: string): Promise<ResolvedRobloxAvatar> {
    // Respeita intervalo mínimo entre chamadas
    const now = Date.now();
    const waitTime = Math.max(0, this.minIntervalMs - (now - this.lastRequestTime));
    if (waitTime > 0) {
      await new Promise((r) => setTimeout(r, waitTime));
    }
    this.lastRequestTime = Date.now();

    try {
      // Passo 1: Busca o ID do usuário na API oficial do Roblox
      const userRes = await fetch('https://users.roblox.com/v1/usernames/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          usernames: [username],
          excludeBannedUsers: true
        })
      });

      if (!userRes.ok) {
        throw new Error(`Roblox API users status: ${userRes.status}`);
      }

      const userData = await userRes.json();
      if (!userData?.data || userData.data.length === 0) {
        // Usuário não existe no Roblox
        return {
          username,
          isRealRoblox: false,
          status: 'DEMO_PROCEDURAL',
          fetchedAt: Date.now()
        };
      }

      const robloxUser = userData.data[0];
      const robloxId = robloxUser.id;
      const displayName = robloxUser.displayName || robloxUser.name;

      // Passo 2: Busca o thumbnail oficial de corpo inteiro (420x420)
      const thumbRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar?userIds=${robloxId}&size=420x420&format=Png&isCircular=false`
      );

      let avatarUrl: string | undefined;
      if (thumbRes.ok) {
        const thumbData = await thumbRes.json();
        if (thumbData?.data && thumbData.data.length > 0 && thumbData.data[0].state === 'Completed') {
          avatarUrl = thumbData.data[0].imageUrl;
        }
      }

      // Passo 3: Busca o headshot (150x150)
      const headRes = await fetch(
        `https://thumbnails.roblox.com/v1/users/avatar-headshot?userIds=${robloxId}&size=150x150&format=Png`
      );
      let headUrl: string | undefined;
      if (headRes.ok) {
        const headData = await headRes.json();
        if (headData?.data && headData.data.length > 0) {
          headUrl = headData.data[0].imageUrl;
        }
      }

      return {
        username: robloxUser.name,
        robloxId,
        displayName,
        avatarThumbnailUrl: avatarUrl,
        headshotThumbnailUrl: headUrl,
        isRealRoblox: Boolean(avatarUrl || headUrl),
        status: 'RESOLVED_ROBLOX',
        fetchedAt: Date.now()
      };
    } catch {
      // Em caso de bloqueio por CORS no ambiente do navegador ou falha de rede externa,
      // cai com honestidade transparente para o fallback procedural
      return {
        username,
        isRealRoblox: false,
        status: 'DEMO_PROCEDURAL',
        fetchedAt: Date.now()
      };
    }
  }

  public getCachedCount(): number {
    return this.cache.size;
  }
}

export const robloxAvatarService = new RobloxAvatarService();
