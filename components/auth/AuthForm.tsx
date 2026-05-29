"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, Thermometer, Users } from "lucide-react";
import { createClientSafe } from "@/lib/supabase/client";

type AuthMode = "login" | "signup";

export default function AuthForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Google OAuth 실패 시 URL 파라미터로 에러 표시
  useEffect(() => {
    const authError = searchParams.get("error");
    if (authError === "google") {
      setError(
        "Google 로그인에 실패했습니다. Supabase Redirect URL 설정을 확인해 주세요.",
      );
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const supabase = createClientSafe();
    if (!supabase) {
      setError("Supabase 설정이 필요합니다. 관리자에게 문의하세요.");
      setLoading(false);
      return;
    }

    try {
      if (mode === "login") {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) {
          setError("이메일 또는 비밀번호가 올바르지 않습니다.");
          return;
        }
        router.push("/generate");
        router.refresh();
      } else {
        const { error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });
        if (signUpError) {
          setError(signUpError.message);
          return;
        }
        setSuccess("회원가입 완료! 이메일 확인 후 로그인해 주세요.");
        setMode("login");
      }
    } catch {
      setError("오류가 발생했습니다. 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  /** Google OAuth 로그인 */
  async function handleGoogleLogin() {
    const supabase = createClientSafe();
    if (!supabase) {
      setError("Supabase 설정이 필요합니다.");
      return;
    }
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/callback?next=/generate`,
      },
    });
    if (error) {
      setError("Google 로그인에 실패했습니다. 설정을 확인해 주세요.");
    }
  }

  return (
    <div className="flex w-full flex-col justify-center px-10 py-12 sm:px-14">
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900">
          {mode === "login" ? "팀 계정으로 로그인" : "팀 계정 만들기"}
        </h2>
        <p className="mt-1.5 text-sm text-gray-500">
          {mode === "login"
            ? "이메일과 비밀번호를 입력해주세요"
            : "이메일과 비밀번호로 가입하세요"}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label
            htmlFor="email"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            이메일
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="team@example.com"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="mb-2 block text-sm font-medium text-gray-700"
          >
            비밀번호
          </label>
          <input
            id="password"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-900 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/15"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-500">
            {error}
          </p>
        )}
        {success && (
          <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-600">
            {success}
          </p>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-lg border border-gray-300 bg-white py-3 text-sm font-semibold text-gray-900 transition-colors hover:bg-gray-50 disabled:opacity-60"
        >
          {loading
            ? "처리 중..."
            : mode === "login"
              ? "로그인"
              : "회원가입"}
        </button>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-gray-200" />
        <span className="text-xs text-gray-400">또는</span>
        <div className="h-px flex-1 bg-gray-200" />
      </div>

      <button
        type="button"
        onClick={handleGoogleLogin}
        className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-white py-3 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden>
          <path
            fill="#4285F4"
            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
          />
          <path
            fill="#34A853"
            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
          />
          <path
            fill="#FBBC05"
            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
          />
          <path
            fill="#EA4335"
            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
          />
        </svg>
        Google로 계속하기
      </button>

      <p className="mt-8 text-center text-sm text-gray-500">
        {mode === "login" ? "계정이 없으신가요? " : "이미 계정이 있으신가요? "}
        <button
          type="button"
          onClick={() => {
            setMode(mode === "login" ? "signup" : "login");
            setError(null);
            setSuccess(null);
          }}
          className="font-semibold text-indigo-600 hover:text-indigo-700"
        >
          {mode === "login" ? "회원가입" : "로그인"}
        </button>
      </p>
    </div>
  );
}

/** 로그인 페이지 좌측 브랜딩 패널 */
export function LoginBrandPanel() {
  const features = [
    { icon: Sparkles, text: "Gemini AI 기반 콘텐츠 생성" },
    { icon: Users, text: "팀원과 히스토리 공유" },
    { icon: Thermometer, text: "3가지 톤 선택 가능" },
  ];

  return (
    <div className="flex flex-col items-center justify-center bg-indigo-600 px-10 py-14 text-center text-white">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20">
        <Sparkles className="h-6 w-6" />
      </div>
      <h1 className="text-2xl font-bold">AI 블로그 생성기</h1>
      <p className="mt-4 max-w-xs text-sm leading-relaxed text-indigo-100">
        주제 하나로 네이버 블로그와
        <br />
        쓰레드 글을 동시에 생성해요
      </p>
      <div className="mt-10 w-full max-w-xs space-y-3">
        {features.map(({ icon: Icon, text }) => (
          <div
            key={text}
            className="flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 text-left text-sm font-medium"
          >
            <Icon className="h-4 w-4 shrink-0 text-indigo-200" />
            {text}
          </div>
        ))}
      </div>
    </div>
  );
}
