/**
 * JB스포츠 AI 블로그 생성기 — 공유 클라이언트 (데스크톱·확장·로컬 서버 공용)
 */
(function (global) {
  const STORAGE_KEY = "jbai_client_session";

  const state = {
    apiBaseUrl: "",
    supabaseUrl: "",
    supabaseAnonKey: "",
    supabase: null,
    session: null,
    configLoaded: false,
  };

  function $(id) {
    return document.getElementById(id);
  }

  function showStatus(el, message, type) {
    if (!el) return;
    el.textContent = message;
    el.className = `status show ${type}`;
  }

  function hideStatus(el) {
    if (!el) el.className = "status";
  }

  async function loadConfig() {
    let apiBaseUrl = "https://jbai-three.vercel.app";
    const configPaths = [
      "lib/config.default.json",
      "../lib/config.default.json",
      "./config.default.json",
    ];
    for (const p of configPaths) {
      try {
        const res = await fetch(p);
        if (res.ok) {
          const cfg = await res.json();
          if (cfg.apiBaseUrl) apiBaseUrl = cfg.apiBaseUrl.replace(/\/$/, "");
          break;
        }
      } catch {
        /* 다음 경로 시도 */
      }
    }

    state.apiBaseUrl = apiBaseUrl;

    try {
      const pub = await fetch(`${apiBaseUrl}/api/public-config`);
      if (!pub.ok) throw new Error("서버 설정을 불러올 수 없습니다.");
      const data = await pub.json();
      if (data.apiBaseUrl) state.apiBaseUrl = data.apiBaseUrl.replace(/\/$/, "");
      state.supabaseUrl = data.supabaseUrl || "";
      state.supabaseAnonKey = data.supabaseAnonKey || "";
    } catch (err) {
      throw new Error(
        `API 연결 실패 (${apiBaseUrl}): ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    if (!state.supabaseUrl || !state.supabaseAnonKey) {
      throw new Error("Supabase 공개 키가 서버에 설정되지 않았습니다.");
    }

    state.supabase = global.supabase.createClient(
      state.supabaseUrl,
      state.supabaseAnonKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: global.localStorage,
        },
      },
    );

    state.configLoaded = true;
  }

  function saveSessionHint(email) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ email }));
    } catch {
      /* ignore */
    }
  }

  function loadSessionHint() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function clearSessionHint() {
    localStorage.removeItem(STORAGE_KEY);
  }

  async function restoreSession() {
    if (!state.supabase) return null;
    const { data } = await state.supabase.auth.getSession();
    state.session = data.session;
    return state.session;
  }

  async function signIn(email, password) {
    const { data, error } = await state.supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw new Error("이메일 또는 비밀번호가 올바르지 않습니다.");
    state.session = data.session;
    saveSessionHint(email);
    return data.session;
  }

  async function signOut() {
    await state.supabase.auth.signOut();
    state.session = null;
    clearSessionHint();
  }

  async function generatePost({ keyword, topic, customCta, tone }) {
    if (!state.session?.access_token) {
      throw new Error("로그인이 필요합니다.");
    }

    const res = await fetch(
      `${state.apiBaseUrl}/api/blog-automation/generate-post`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${state.session.access_token}`,
        },
        body: JSON.stringify({
          keyword,
          topic,
          customCta,
          tone: tone || "friendly",
        }),
      },
    );

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || `생성 실패 (${res.status})`);
    }
    return data;
  }

  function formatCost(pipeline) {
    if (!pipeline?.total_cost_usd) return "";
    const usd = Number(pipeline.total_cost_usd);
    const krw = Math.round(usd * 1400);
    return `비용 약 $${usd.toFixed(4)} (₩${krw.toLocaleString()})`;
  }

  function bindApp(options) {
    const isPopup = Boolean(options?.popup);
    if (isPopup) document.body.classList.add("popup-mode");

    const loginSection = $("login-section");
    const generateSection = $("generate-section");
    const sessionEmail = $("session-email");
    const statusEl = $("app-status");
    const resultBox = $("result-box");
    const resultTitle = $("result-title");
    const resultMeta = $("result-meta");
    const resultContent = $("result-content");

    function showLogin() {
      loginSection?.classList.remove("hidden");
      generateSection?.classList.add("hidden");
    }

    function showGenerate(email) {
      loginSection?.classList.add("hidden");
      generateSection?.classList.remove("hidden");
      if (sessionEmail) sessionEmail.textContent = email || "로그인됨";
    }

    async function init() {
      try {
        showStatus(statusEl, "서버 연결 중...", "info");
        await loadConfig();
        hideStatus(statusEl);

        const hint = loadSessionHint();
        if (hint?.email && $("login-email")) {
          $("login-email").value = hint.email;
        }

        const session = await restoreSession();
        if (session?.user?.email) {
          showGenerate(session.user.email);
        } else {
          showLogin();
        }
      } catch (err) {
        showStatus(
          statusEl,
          err instanceof Error ? err.message : String(err),
          "error",
        );
      }
    }

    $("login-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email = $("login-email")?.value?.trim();
      const password = $("login-password")?.value ?? "";
      const btn = $("login-btn");
      if (!email || !password) return;

      btn.disabled = true;
      showStatus(statusEl, "로그인 중...", "info");
      try {
        const session = await signIn(email, password);
        hideStatus(statusEl);
        showGenerate(session.user?.email || email);
      } catch (err) {
        showStatus(
          statusEl,
          err instanceof Error ? err.message : String(err),
          "error",
        );
      } finally {
        btn.disabled = false;
      }
    });

    $("logout-btn")?.addEventListener("click", async () => {
      await signOut();
      resultBox?.classList.remove("show");
      showLogin();
    });

    $("generate-form")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const keyword = $("input-keyword")?.value?.trim();
      const topic = $("input-topic")?.value?.trim();
      const customCta = $("input-cta")?.value?.trim();
      const tone = $("input-tone")?.value || "friendly";
      const btn = $("generate-btn");

      if (!keyword || !topic) {
        showStatus(statusEl, "키워드와 주제를 입력해 주세요.", "error");
        return;
      }

      btn.disabled = true;
      btn.innerHTML = '<span class="spinner"></span> 생성 중 (1~3분)...';
      resultBox?.classList.remove("show");
      showStatus(
        statusEl,
        "1단계 Gemini 연구·초안 → 2단계 GPT 정돈 진행 중입니다. 잠시만 기다려 주세요.",
        "info",
      );

      try {
        const data = await generatePost({ keyword, topic, customCta, tone });
        hideStatus(statusEl);
        if (resultTitle) resultTitle.textContent = data.title || topic;
        if (resultMeta) {
          const tags = Array.isArray(data.naver_hashtags)
            ? data.naver_hashtags.join(" ")
            : "";
          resultMeta.textContent = [
            formatCost(data.pipeline),
            tags ? `태그: ${tags}` : "",
            data.pipeline?.char_count
              ? `${data.pipeline.char_count}자`
              : "",
          ]
            .filter(Boolean)
            .join(" · ");
        }
        if (resultContent) {
          resultContent.textContent = data.naver_content || "";
        }
        resultBox?.classList.add("show");
        showStatus(statusEl, "생성이 완료되었습니다.", "success");
      } catch (err) {
        showStatus(
          statusEl,
          err instanceof Error ? err.message : String(err),
          "error",
        );
      } finally {
        btn.disabled = false;
        btn.textContent = "블로그 글 생성";
      }
    });

    $("copy-btn")?.addEventListener("click", async () => {
      const text = resultContent?.textContent || "";
      try {
        await navigator.clipboard.writeText(text);
        showStatus(statusEl, "본문이 클립보드에 복사되었습니다.", "success");
      } catch {
        showStatus(statusEl, "복사에 실패했습니다.", "error");
      }
    });

    $("open-web-btn")?.addEventListener("click", () => {
      if (state.apiBaseUrl) {
        global.open(`${state.apiBaseUrl}/generate`, "_blank");
      }
    });

    init();
  }

  global.JbaiApp = { bindApp, loadConfig, signIn, signOut, generatePost };
})(window);
