/**
 * Supabase 클라이언트 싱글턴.
 * NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_URL 환경변수가 없으면 null을 반환한다.
 * 호출부에서 null 체크 후 JSON fallback으로 전환한다.
 */
import { createClient, SupabaseClient } from "@supabase/supabase-js";

let _client: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (_client) return _client;

  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;

  if (!url || !key) return null;

  _client = createClient(url, key);
  return _client;
}

/** Supabase가 설정되어 있는지 확인한다 */
export function isSupabaseEnabled(): boolean {
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL;
  const key =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.SUPABASE_ANON_KEY;
  return Boolean(url && key);
}
