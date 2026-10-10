/**
 * ARYA GM - Platform Type Definitions (Audit & Hardened Production Spec v2.0)
 * Compliant with TikTok LIVE integration requirements and Supabase backend architecture.
 */

export type ConnectionState = 
  | 'DISCONNECTED'
  | 'CONNECTING'
  | 'CONNECTED'
  | 'DEGRADED'
  | 'RECONNECTING'
  | 'ERROR';

export type EventType = 'comment' | 'gift' | 'like' | 'follow' | 'share';

export interface NormalizedEvent {
  eventId: string; // Genuine ID or deterministic payload hash
  hasGenuineId: boolean; // True if from official TikTok/connector, false if generated via fallback hash
  eventType: EventType;
  streamId: string;
  user: {
    id: string;
    displayName: string;
    avatarUrl?: string;
    secUid?: string;
  };
  gift?: {
    id: string;
    name: string;
    coins: number;
    repeatCount: number; // For gift combos
    repeatEnd?: boolean;
    isFinal: boolean;
  };
  commentText?: string;
  receivedAt: string;
  processedAt?: string;
  source: 'tiktok_websocket' | 'tiktok_webhook' | 'simulator' | 'manual';
  rawPayloadHash?: string;
}

export interface DeduplicationStats {
  receivedCount: number;
  acceptedCount: number;
  duplicateCount: number;
  invalidCount: number;
  discardedCount: number;
}

export interface RuleMapping {
  id: string;
  eventType: EventType;
  matchPattern?: string;
  minCoins?: number;
  gameTarget: 'pipas' | 'avatar' | 'both';
  action: 
    // Pipas actions
    | 'spawn_kite' 
    | 'boost_turbo' 
    | 'activate_cerol' 
    | 'activate_shield' 
    | 'wind_gust' 
    | 'cut_random'
    // Avatar actions
    | 'spawn_avatar' 
    | 'vip_spotlight' 
    | 'confetti_shower' 
    | 'giant_scale' 
    | 'super_dance_solo'
    | 'fireworks';
  description: string;
  userCooldownMs: number; // Cooldown per unique viewer
  globalCooldownMs: number; // Global rate limit
  lastTriggeredGlobal?: number;
  lastTriggeredByUser?: Record<string, number>;
  isEnabled: boolean;
}

export interface ResolvedRobloxAvatar {
  username: string;
  robloxId?: number;
  displayName?: string;
  avatarThumbnailUrl?: string;
  headshotThumbnailUrl?: string;
  isRealRoblox: boolean;
  status: 'RESOLVED_ROBLOX' | 'DEMO_PROCEDURAL' | 'FETCHING' | 'FAILED';
  fetchedAt: number;
}

export interface KitePlayer {
  id: string;
  username: string;
  avatarUrl: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  angle: number;
  lineTension: number;
  model: 'raia' | 'biquinho' | 'brit' | 'carrapeta';
  color: string;
  tailLength: number;
  isCut: boolean;
  cutTimestamp?: number;
  cerolActiveUntil?: number;
  shieldActiveUntil?: number;
  turboActiveUntil?: number;
  score: number;
  cutsMade: number;
  coinsGifted: number;
}

export interface AvatarPlayer {
  id: string;
  username: string;
  robloxUsername: string;
  robloxData: ResolvedRobloxAvatar;
  avatarColor: string;
  x: number;
  y: number;
  danceStyle: 'floss' | 'breakdance' | 'disco' | 'robot' | 'salsa';
  scale: number;
  spotlightUntil?: number;
  giantUntil?: number;
  soloUntil?: number;
  joinedAt: number;
  totalGifts: number;
}

export interface StreamTelemetry {
  fps: number;
  latencyMs: number | null; // null if no real events received yet
  eventsPerSec: number;
  totalEventsProcessed: number;
  eventsDeduped: number;
  totalGiftsCoins: number;
  activePlayers: number;
  lastEventTimestamp: number | null;
}

export type LicenseStatus = 
  | 'UNLICENSED'
  | 'ACTIVE'
  | 'TRIAL'
  | 'EXPIRED'
  | 'REVOKED'
  | 'OFFLINE_GRACE'
  | 'SERVER_UNREACHABLE';

export interface LicenseValidationResult {
  status: LicenseStatus;
  key: string;
  streamerName: string;
  plan: 'single_pipas' | 'single_avatar' | 'duo_bundle' | 'pro_agency';
  expiresAt: string;
  hardwareSeatId: string;
  allowedSeats: number;
  activeSeats: number;
  gracePeriodRemainingHours?: number;
  signatureVerified: boolean;
  message: string;
}

export interface AcceptanceTestResult {
  id: string;
  title: string;
  category: 'Conexão' | 'Deduplicação' | 'Regras & Cooldown' | 'Jogos' | 'Roblox Avatar' | 'Telemetria & OBS' | 'Licença';
  passed: boolean;
  latencyMs: number;
  details: string;
  evidence: string;
}

export interface AcceptanceChecklistItem {
  id: string;
  category: 'Integração' | 'Pipas Combate' | 'Avatar Dance' | 'Produto e Segurança';
  title: string;
  passed: boolean;
  notes: string;
}

