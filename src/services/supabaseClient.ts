/**
 * ARYA GM - Integração Supabase / Vercel
 * Estrutura de dados para licenças, sessões de transmissão e contabilidade de eventos.
 */

export interface SupabaseLicenseRow {
  id: string;
  license_key: string;
  streamer_handle: string;
  plan_tier: 'single_pipas' | 'single_avatar' | 'duo_bundle' | 'pro_agency';
  status: 'ACTIVE' | 'TRIAL' | 'EXPIRED' | 'REVOKED';
  hardware_seats: number;
  active_hwids: string[];
  expires_at: string;
  created_at: string;
}

export const SUPABASE_SQL_SCHEMA = `
-- TABELA DE LICENÇAS ARYA GM (SUPABASE POSTGRESQL)
CREATE TABLE IF NOT EXISTS public.arya_licenses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_key TEXT UNIQUE NOT NULL,
  streamer_handle TEXT NOT NULL,
  plan_tier TEXT NOT NULL CHECK (plan_tier IN ('single_pipas', 'single_avatar', 'duo_bundle', 'pro_agency')),
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TRIAL', 'EXPIRED', 'REVOKED')),
  hardware_seats INT NOT NULL DEFAULT 1,
  active_hwids TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL
);

-- TABELA DE SESSÕES DE TRANSMISSÃO E AUDITORIA DE EVENTOS
CREATE TABLE IF NOT EXISTS public.arya_stream_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id UUID REFERENCES public.arya_licenses(id),
  streamer_handle TEXT NOT NULL,
  game_selected TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  total_events_received INT DEFAULT 0,
  total_events_accepted INT DEFAULT 0,
  total_duplicates_dropped INT DEFAULT 0,
  total_gift_coins INT DEFAULT 0,
  average_latency_ms NUMERIC(6,2)
);

-- RLS (ROW LEVEL SECURITY)
ALTER TABLE public.arya_licenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.arya_stream_sessions ENABLE ROW LEVEL SECURITY;
`;

export class SupabaseService {
  private supabaseUrl: string = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_URL || '';
  private supabaseAnonKey: string = (import.meta as unknown as { env: Record<string, string> }).env?.VITE_SUPABASE_ANON_KEY || '';

  public isConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseAnonKey);
  }

  public getStatusMessage(): string {
    if (this.isConfigured()) {
      return `Supabase conectado em ${this.supabaseUrl}`;
    }
    return 'Supabase em modo local de contingência (adicione VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env para sincronização remota).';
  }
}

export const supabaseService = new SupabaseService();
