import { createClient as createSupabaseJs } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface ApiAuthResult {
  user: User | null;
  supabase: SupabaseClient;
  authError?: string;
}

function requireEnv(name: string): string {
  const v = process.env[name]?.trim();
  if (!v) throw new Error(`${name}가 설정되지 않았습니다.`);
  return v;
}

/** Bearer 토큰(확장·데스크톱) 또는 쿠키(웹) 인증 */
export async function getApiAuth(
  request?: NextRequest,
): Promise<ApiAuthResult> {
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const anonKey = requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

  const bearer = request?.headers
    .get("authorization")
    ?.replace(/^Bearer\s+/i, "")
    .trim();

  if (bearer) {
    const supabase = createSupabaseJs(url, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await supabase.auth.getUser(bearer);
    return {
      user: data.user ?? null,
      supabase,
      authError: error?.message,
    };
  }

  const cookieStore = await cookies();
  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Server Component에서 set 호출 시 무시
        }
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return { user: user ?? null, supabase, authError: error?.message };
}
