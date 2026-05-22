// Google 등 OAuth 로그인 후 세션 교환 — 쿠키는 Response에 반드시 설정
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  let next = searchParams.get("next") ?? "/generate";

  if (!next.startsWith("/")) {
    next = "/generate";
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=google`);
  }

  // Vercel 등 프로덕션에서 올바른 도메인으로 리다이렉트
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  let redirectBase = origin;
  if (!isLocalEnv && forwardedHost) {
    redirectBase = `https://${forwardedHost}`;
  }

  let supabaseResponse = NextResponse.redirect(`${redirectBase}${next}`);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.redirect(`${redirectBase}${next}`);
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("OAuth callback error:", error.message);
    return NextResponse.redirect(`${redirectBase}/login?error=google`);
  }

  return supabaseResponse;
}
