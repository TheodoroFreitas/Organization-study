(() => {
  const authConfig = window.STUDY_AUTH_CONFIG || {};
  const enabled = Boolean(authConfig.enabled);

  const studyAuth = {
    enabled,
    user: null,
    ready: Promise.resolve(true),
    signOut: () => Promise.resolve(),
  };

  window.studyAuth = studyAuth;

  if (!enabled) return;

  studyAuth.ready = new Promise((resolve) => {
    document.addEventListener("DOMContentLoaded", () => startAuth(resolve));
  });

  async function startAuth(resolve) {
    if (!window.firebase?.initializeApp || !window.firebase?.auth) {
      renderAuthScreen({
        title: "Firebase SDK não carregou",
        message: "Confira sua conexão e recarregue a página.",
        showButton: false,
      });
      resolve(false);
      return;
    }

    if (!hasFirebaseConfig(authConfig.firebase)) {
      renderAuthScreen({
        title: "Configure o Firebase",
        message:
          "Preencha apiKey, appId e demais dados em firebase-config.js para ativar o login por GitHub.",
        showButton: false,
      });
      resolve(false);
      return;
    }

    if (!window.firebase.apps.length) {
      window.firebase.initializeApp(authConfig.firebase);
    }

    const auth = window.firebase.auth();
    const provider = new window.firebase.auth.GithubAuthProvider();
    provider.addScope("read:user");
    provider.setCustomParameters({ allow_signup: "false" });
    studyAuth.signOut = () => auth.signOut();

    renderAuthScreen({
      title: "Acesso restrito",
      message: "Entre com o GitHub autorizado para abrir seu planejador.",
      showButton: true,
      loading: true,
    });

    document.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-auth-action]");
      if (!button) return;
      if (button.dataset.authAction === "login") {
        await signIn(auth, provider);
      }
      if (button.dataset.authAction === "logout") {
        await auth.signOut();
        window.location.reload();
      }
    });

    auth.onAuthStateChanged(async (user) => {
      if (!user) {
        studyAuth.user = null;
        renderAuthScreen({
          title: "Acesso restrito",
          message: "Entre com o GitHub autorizado para abrir seu planejador.",
          showButton: true,
        });
        return;
      }

      if (isAllowedUser(user)) {
        studyAuth.user = user;
        clearAuthScreen();
        resolve(true);
        return;
      }

      await auth.signOut();
      renderAuthScreen({
        title: "GitHub não autorizado",
        message: "Este app está liberado somente para o GitHub configurado.",
        showButton: true,
        error: true,
      });
      resolve(false);
    });
  }

  async function signIn(auth, provider) {
    try {
      renderAuthScreen({
        title: "Abrindo GitHub",
        message: "Conclua o login na janela do GitHub.",
        showButton: false,
        loading: true,
      });

      const result = await auth.signInWithPopup(provider);
      if (isAllowedUser(result.user, result.additionalUserInfo?.profile)) {
        studyAuth.user = result.user;
        clearAuthScreen();
        return;
      }

      const login = result.additionalUserInfo?.profile?.login || "";
      await auth.signOut();
      renderAuthScreen({
        title: "GitHub não autorizado",
        message: `O usuário ${login || "informado"} não está na lista permitida.`,
        showButton: true,
        error: true,
      });
    } catch (error) {
      renderAuthScreen({
        title: "Login cancelado",
        message: friendlyAuthError(error),
        showButton: true,
        error: true,
      });
    }
  }

  function isAllowedUser(user, githubProfile = null) {
    const emails = authConfig.allowedEmails || [];
    const uids = authConfig.allowedFirebaseUids || [];
    const githubLogins = (authConfig.allowedGithubLogins || []).map((item) => item.toLowerCase());
    const githubProviderUids = (authConfig.allowedGithubProviderUids || []).map(String);
    const githubProvider = user.providerData?.find((profile) => profile.providerId === "github.com");
    const githubLogin = githubProfile?.login || githubProvider?.displayName || "";
    const githubId = githubProfile?.id ? String(githubProfile.id) : String(githubProvider?.uid || "");

    return (
      uids.includes(user.uid) ||
      githubProviderUids.includes(githubId) ||
      (githubLogin && githubLogins.includes(githubLogin.toLowerCase())) ||
      (user.email && emails.some((email) => email.toLowerCase() === user.email.toLowerCase()))
    );
  }

  function hasFirebaseConfig(config = {}) {
    return Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);
  }

  function renderAuthScreen(options) {
    const app = document.querySelector("#app");
    if (!app) return;
    app.innerHTML = `
      <main class="auth-shell">
        <section class="auth-panel ${options.error ? "is-error" : ""}">
          <div class="brand auth-brand">
            <div class="brand-mark">PC</div>
            <div>
              <h1>Plano Certo</h1>
              <p>Concursos e revisões</p>
            </div>
          </div>
          <div>
            <p class="eyebrow">Login GitHub</p>
            <h2>${escapeHtml(options.title)}</h2>
            <p>${escapeHtml(options.message)}</p>
          </div>
          ${
            options.showButton
              ? `<button class="button primary" type="button" data-auth-action="login">
                  <span class="github-mark">GH</span>
                  Entrar com GitHub
                </button>`
              : ""
          }
          ${options.loading ? `<div class="auth-loader" aria-label="Carregando"></div>` : ""}
        </section>
      </main>
    `;
  }

  function clearAuthScreen() {
    const app = document.querySelector("#app");
    if (app) app.innerHTML = "";
  }

  function friendlyAuthError(error) {
    if (error?.code === "auth/popup-closed-by-user") return "A janela de login foi fechada antes de concluir.";
    if (error?.code === "auth/unauthorized-domain") {
      return "Adicione este domínio nos domínios autorizados do Firebase Authentication.";
    }
    return "Não foi possível concluir o login agora.";
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
})();
