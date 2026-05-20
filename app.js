(() => {
  const STORAGE_KEY = "plano-certo-state-v1";

  const navItems = [
    { id: "dashboard", label: "Painel", icon: "layout-dashboard" },
    { id: "edital", label: "Edital", icon: "clipboard-list" },
    { id: "semana", label: "Semana", icon: "calendar-days" },
    { id: "mes", label: "Mês", icon: "calendar-range" },
    { id: "materias", label: "Matérias", icon: "book-open-check" },
    { id: "revisoes", label: "Revisões", icon: "repeat-2" },
    { id: "foco", label: "Foco", icon: "timer" },
  ];

  const viewMeta = {
    dashboard: {
      eyebrow: "Rotina do dia",
      title: "Seu estudo organizado em tempo real",
      subtitle:
        "Planeje o edital, execute as sessões, acompanhe revisões e ajuste a semana sem depender de planilhas soltas.",
    },
    edital: {
      eyebrow: "Concurso ativo",
      title: "Edital, banca e metas",
      subtitle:
        "Centralize o concurso, a data de prova, o local de foco e as metas líquidas de estudo.",
    },
    semana: {
      eyebrow: "Ciclo semanal",
      title: "Semana equilibrada por prioridade",
      subtitle:
        "Distribua blocos de estudo conforme peso, dificuldade e progresso de cada matéria.",
    },
    mes: {
      eyebrow: "Visão mensal",
      title: "Calendário de estudos e revisões",
      subtitle:
        "Veja sessões, tarefas planejadas e revisões em uma grade mensal enxuta.",
    },
    materias: {
      eyebrow: "Edital verticalizado",
      title: "Matérias, assuntos e avanço",
      subtitle:
        "Cadastre disciplinas, pesos, dificuldades, assuntos e progresso por tópico.",
    },
    revisoes: {
      eyebrow: "Retenção",
      title: "Revisões programadas",
      subtitle:
        "Controle vencidas, previstas e concluídas com ciclos automáticos depois de cada sessão.",
    },
    foco: {
      eyebrow: "Execução",
      title: "Modo foco com Pomodoro e música",
      subtitle:
        "Escolha matéria, tipo de estudo, local de foco, áudio ambiente e registre horas líquidas.",
    },
  };

  const studyTypes = [
    { id: "teoria", label: "Teoria", icon: "book-open" },
    { id: "questoes", label: "Questões", icon: "circle-help" },
    { id: "revisao", label: "Revisão", icon: "repeat-2" },
    { id: "simulado", label: "Simulado", icon: "file-check-2" },
  ];

  const weekDays = [
    { key: 1, short: "Seg", label: "Segunda" },
    { key: 2, short: "Ter", label: "Terça" },
    { key: 3, short: "Qua", label: "Quarta" },
    { key: 4, short: "Qui", label: "Quinta" },
    { key: 5, short: "Sex", label: "Sexta" },
    { key: 6, short: "Sáb", label: "Sábado" },
    { key: 0, short: "Dom", label: "Domingo" },
  ];

  const soundOptions = [
    { id: "silence", label: "Silêncio", icon: "volume-x" },
    { id: "rain", label: "Chuva leve", icon: "cloud-rain" },
    { id: "lofi", label: "Lo-fi pulse", icon: "radio" },
    { id: "library", label: "Biblioteca", icon: "library" },
  ];

  const colors = ["#346da6", "#2f7d5b", "#c98a16", "#d65f45", "#7057a3", "#287c8e"];

  let activeView = "dashboard";
  let hasLocalStoredState = localStorage.getItem(STORAGE_KEY) !== null;
  let state = loadState();
  let calendarCursor = toDate(todayISO());
  let toastTimer = null;

  const timer = {
    duration: 25 * 60,
    remaining: 25 * 60,
    running: false,
    interval: null,
    subjectId: state.subjects[0]?.id || "",
    topicId: state.subjects[0]?.topics[0]?.id || "",
    type: "teoria",
    planBlockId: null,
  };

  const audio = {
    ctx: null,
    nodes: [],
    playing: false,
    current: "silence",
  };

  const cloudSync = {
    enabled: false,
    docRef: null,
    unsubscribe: null,
    saveTimer: null,
    status: "Local",
    clientId: uid("client"),
    applyingRemote: false,
    loadedOnce: false,
  };

  document.addEventListener("DOMContentLoaded", async () => {
    if (window.studyAuth?.enabled) {
      const allowed = await window.studyAuth.ready;
      if (!allowed) return;
    }
    await initializeCloudState();
    ensureWeekPlan();
    render();
  });

  function createDefaultState() {
    const subjects = [
      {
        id: uid("mat"),
        name: "Português",
        color: colors[0],
        weight: 5,
        difficulty: 3,
        topics: [
          topic("Interpretação de textos", 64),
          topic("Sintaxe do período", 42),
          topic("Pontuação e concordância", 36),
        ],
      },
      {
        id: uid("mat"),
        name: "Direito Constitucional",
        color: colors[1],
        weight: 4,
        difficulty: 4,
        topics: [
          topic("Direitos e garantias fundamentais", 58),
          topic("Organização do Estado", 30),
          topic("Controle de constitucionalidade", 18),
        ],
      },
      {
        id: uid("mat"),
        name: "Direito Administrativo",
        color: colors[2],
        weight: 4,
        difficulty: 4,
        topics: [
          topic("Atos administrativos", 52),
          topic("Licitações e contratos", 26),
          topic("Responsabilidade civil do Estado", 21),
        ],
      },
      {
        id: uid("mat"),
        name: "Raciocínio Lógico",
        color: colors[3],
        weight: 3,
        difficulty: 5,
        topics: [
          topic("Proposições", 45),
          topic("Porcentagem", 55),
          topic("Análise combinatória", 15),
        ],
      },
    ];

    const sessions = [
      session(subjects[0], subjects[0].topics[0], -6, 70, "teoria", 18, 14),
      session(subjects[1], subjects[1].topics[0], -5, 55, "questoes", 22, 17),
      session(subjects[2], subjects[2].topics[1], -4, 50, "teoria", 12, 9),
      session(subjects[3], subjects[3].topics[0], -3, 45, "questoes", 20, 13),
      session(subjects[0], subjects[0].topics[1], -2, 60, "revisao", 15, 12),
      session(subjects[1], subjects[1].topics[1], -1, 50, "teoria", 10, 8),
    ];

    const reviews = [
      review(subjects[0], subjects[0].topics[1], 0, "7 dias"),
      review(subjects[1], subjects[1].topics[0], 1, "15 dias"),
      review(subjects[2], subjects[2].topics[1], -1, "24 horas"),
      review(subjects[3], subjects[3].topics[0], 3, "30 dias"),
    ];

    const defaultState = {
      exam: {
        contestName: "Concurso do Tribunal",
        name: "Analista Judiciário",
        board: "FGV",
        status: "open",
        examDate: addDaysISO(todayISO(), 82),
        dailyGoalHours: 4,
        weeklyGoalHours: 24,
        focusPlace: "Biblioteca",
        studyMode: "Ciclo inteligente",
      },
      subjects,
      sessions,
      reviews,
      weekPlan: [],
      settings: {
        startTime: "08:00",
        blockMinutes: 50,
        breakMinutes: 10,
        dailyBlocks: 4,
        weekDays: [1, 2, 3, 4, 5, 6],
        reviewDays: [1, 7, 15, 30],
        soundVolume: 0.22,
        youtubeUrl: "",
      },
    };

    defaultState.weekPlan = buildWeekPlan(defaultState);
    return defaultState;
  }

  function topic(title, progress) {
    return { id: uid("top"), title, progress, completed: progress >= 100 };
  }

  function session(subject, topicItem, offset, minutes, type, questions, correct) {
    return {
      id: uid("ses"),
      subjectId: subject.id,
      topicId: topicItem.id,
      date: addDaysISO(todayISO(), offset),
      minutes,
      type,
      questions,
      correct,
      notes: "",
      createdAt: new Date().toISOString(),
    };
  }

  function review(subject, topicItem, offset, cycle) {
    return {
      id: uid("rev"),
      subjectId: subject.id,
      topicId: topicItem.id,
      dueDate: addDaysISO(todayISO(), offset),
      cycle,
      status: "pending",
      completedAt: "",
      createdAt: new Date().toISOString(),
    };
  }

  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      const parsed = JSON.parse(raw);
      return normalizeState(parsed);
    } catch (error) {
      console.warn("Falha ao carregar estado salvo", error);
      return createDefaultState();
    }
  }

  function normalizeState(input, options = {}) {
    const fallback = createDefaultState();
    const normalized = {
      ...fallback,
      ...input,
      exam: { ...fallback.exam, ...(input.exam || {}) },
      subjects: Array.isArray(input.subjects) ? input.subjects : fallback.subjects,
      sessions: Array.isArray(input.sessions) ? input.sessions : fallback.sessions,
      reviews: Array.isArray(input.reviews) ? input.reviews : fallback.reviews,
      weekPlan: Array.isArray(input.weekPlan) ? input.weekPlan : [],
      settings: { ...fallback.settings, ...(input.settings || {}) },
    };
    const cleaned = cleanupOrphanedData(normalized);
    return options.withMeta ? cleaned : cleaned.state;
  }

  function cleanupOrphanedData(targetState = state) {
    const subjectIds = new Set(targetState.subjects.map((subject) => subject.id));
    const topicIds = new Set(
      targetState.subjects.flatMap((subject) => (subject.topics || []).map((topicItem) => topicItem.id)),
    );
    const hasTopic = (item) => !item.topicId || topicIds.has(item.topicId);
    const filterLinked = (item) => subjectIds.has(item.subjectId) && hasTopic(item);

    const sessions = targetState.sessions.filter(filterLinked);
    const reviews = targetState.reviews.filter(filterLinked);
    const weekPlan = targetState.weekPlan.filter(filterLinked);
    const changed =
      sessions.length !== targetState.sessions.length ||
      reviews.length !== targetState.reviews.length ||
      weekPlan.length !== targetState.weekPlan.length;

    return {
      changed,
      state: {
        ...targetState,
        sessions,
        reviews,
        weekPlan,
      },
    };
  }

  function saveLocalState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    hasLocalStoredState = true;
  }

  function saveState(options = {}) {
    const cleaned = cleanupOrphanedData(state);
    if (cleaned.changed) {
      state = cleaned.state;
      syncTimerSelection();
    }
    saveLocalState();
    if (cloudSync.applyingRemote) return Promise.resolve();
    if (options.immediate) return saveCloudStateNow().catch(handleCloudSaveError);
    scheduleCloudSave();
    return Promise.resolve();
  }

  async function initializeCloudState() {
    if (!window.studyAuth?.enabled) return;

    cloudSync.enabled = true;
    if (!window.studyAuth.user) {
      cloudSync.status = "Sem login";
      return;
    }
    if (!window.firebase?.firestore) {
      cloudSync.status = "Sem Firebase";
      return;
    }

    cloudSync.status = "Conectando";
    const userId = window.studyAuth.user.uid;
    cloudSync.docRef = window.firebase
      .firestore()
      .collection("users")
      .doc(userId)
      .collection("studyState")
      .doc("main");

    try {
      const snapshot = await cloudSync.docRef.get();
      if (snapshot.exists && snapshot.data()?.state) {
        const normalized = normalizeState(snapshot.data().state, { withMeta: true });
        state = normalized.state;
        saveLocalState();
        syncTimerSelection();
        cloudSync.status = "Firebase";
        if (normalized.changed) await saveCloudStateNow();
        startCloudRealtimeSync();
        cloudSync.loadedOnce = true;
        return;
      }

      if (hasLocalStoredState) {
        await saveCloudStateNow();
      }
      startCloudRealtimeSync();
      cloudSync.loadedOnce = true;
      cloudSync.status = hasLocalStoredState ? "Firebase" : "Novo";
    } catch (error) {
      console.error("Falha ao carregar dados do Firestore", error);
      cloudSync.status = "Offline";
    }
  }

  function syncTimerSelection() {
    const subject = getSubject(timer.subjectId) || state.subjects[0];
    timer.subjectId = subject?.id || "";
    timer.topicId = subject?.topics.some((topicItem) => topicItem.id === timer.topicId)
      ? timer.topicId
      : subject?.topics[0]?.id || "";
  }

  function scheduleCloudSave() {
    if (!cloudSync.enabled || !cloudSync.docRef) return;
    cloudSync.status = "Salvando";
    updateCloudStatus();
    window.clearTimeout(cloudSync.saveTimer);
    cloudSync.saveTimer = window.setTimeout(() => {
      saveCloudStateNow().catch(handleCloudSaveError);
    }, 250);
  }

  function handleCloudSaveError(error) {
    console.error("Falha ao salvar dados no Firestore", error);
    cloudSync.status = "Offline";
    updateCloudStatus();
    showToast("Não consegui salvar no Firebase. Confira o login e as regras.");
  }

  async function saveCloudStateNow() {
    if (!cloudSync.docRef || !window.studyAuth?.user) return;
    await cloudSync.docRef.set(
      {
        app: "plano-certo",
        clientId: cloudSync.clientId,
        ownerUid: window.studyAuth.user.uid,
        state: JSON.parse(JSON.stringify(state)),
        clientUpdatedAt: new Date().toISOString(),
        updatedAt: window.firebase.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true },
    );
    cloudSync.status = "Firebase";
    updateCloudStatus();
  }

  function startCloudRealtimeSync() {
    if (!cloudSync.docRef || cloudSync.unsubscribe) return;

    cloudSync.unsubscribe = cloudSync.docRef.onSnapshot(
      { includeMetadataChanges: true },
      (snapshot) => {
        if (!snapshot.exists || !snapshot.data()?.state) return;
        if (snapshot.metadata.hasPendingWrites) return;
        if (snapshot.data().clientId === cloudSync.clientId) return;

        cloudSync.applyingRemote = true;
        state = normalizeState(snapshot.data().state);
        saveLocalState();
        syncTimerSelection();
        cloudSync.applyingRemote = false;
        cloudSync.status = "Firebase";

        if (cloudSync.loadedOnce) {
          render();
          showToast("Dados atualizados pelo Firebase.");
        }
        cloudSync.loadedOnce = true;
        updateCloudStatus();
      },
      (error) => {
        console.error("Falha no realtime do Firestore", error);
        cloudSync.status = "Offline";
        updateCloudStatus();
      },
    );
  }

  function updateCloudStatus() {
    const status = document.querySelector("#cloud-status");
    if (!status) return;
    status.textContent = cloudSync.status;
    status.className = `pill ${cloudSync.status === "Offline" ? "coral" : ["Salvando", "Novo", "Sem Firebase", "Sem login"].includes(cloudSync.status) ? "amber" : "green"}`;
  }

  function render() {
    const app = document.querySelector("#app");
    const meta = viewMeta[activeView];
    app.innerHTML = `
      <div class="app-layout">
        <aside class="sidebar">
          ${renderBrand()}
          <nav class="nav-list" aria-label="Navegação principal">
            ${navItems
              .map(
                (item) => `
                  <button class="nav-button ${activeView === item.id ? "is-active" : ""}" data-view="${item.id}" type="button">
                    ${icon(item.icon)}
                    <span>${item.label}</span>
                  </button>
                `,
              )
              .join("")}
          </nav>
          <div class="sidebar-footer">
            <div class="exam-mini">
              <span>Concurso ativo</span>
              <strong>${escapeHtml(state.exam.contestName || state.exam.name)}</strong>
              <span>${sidebarExamMeta()}</span>
            </div>
            <button class="button primary" type="button" data-view="foco">
              ${icon("play")} Iniciar foco
            </button>
            ${
              window.studyAuth?.enabled
                ? `<button class="button ghost" type="button" data-action="sign-out">
                    ${icon("log-out")} Sair
                  </button>`
                : ""
            }
          </div>
        </aside>

        <div>
          <div class="mobile-nav">
            <div class="brand-mark">PC</div>
            <select id="mobile-view" aria-label="Selecionar tela">
              ${navItems.map((item) => `<option value="${item.id}" ${activeView === item.id ? "selected" : ""}>${item.label}</option>`).join("")}
            </select>
          </div>

          <main class="main">
            <div class="topbar">
              <div>
                <p class="eyebrow">${meta.eyebrow}</p>
                <h1 class="page-title">${meta.title}</h1>
                <p class="page-subtitle">${meta.subtitle}</p>
              </div>
              <div class="top-actions">
                ${
                  cloudSync.enabled
                    ? `<span id="cloud-status" class="pill ${cloudSync.status === "Offline" ? "coral" : ["Salvando", "Novo", "Sem Firebase", "Sem login"].includes(cloudSync.status) ? "amber" : "green"}">${cloudSync.status}</span>`
                    : ""
                }
              </div>
            </div>

            ${renderCurrentView()}
          </main>
        </div>
      </div>
      <div id="toast" class="toast hidden" role="status"></div>
    `;

    bindEvents();
    drawIcons();
    updateTimerFace();
    window.setTimeout(setYouTubeVolume, 350);
  }

  function renderBrand() {
    return `
      <div class="brand">
        <div class="brand-mark">PC</div>
        <div>
          <h1>Plano Certo</h1>
          <p>Concursos e revisões</p>
        </div>
      </div>
    `;
  }

  function renderCurrentView() {
    const views = {
      dashboard: renderDashboard,
      edital: renderEdital,
      semana: renderSemana,
      mes: renderMes,
      materias: renderMaterias,
      revisoes: renderRevisoes,
      foco: renderFoco,
    };
    return views[activeView]();
  }

  function renderDashboard() {
    const metrics = computeMetrics();
    const todayTasks = getTodayPlan();
    const dueReviews = getDueReviews();
    return `
      <div class="summary-grid">
        ${metricCard("calendar-clock", "Prova", examCountdownText(), examDateCaption(), "--accent: var(--coral)")}
        ${metricCard("hourglass", "Horas na semana", `${formatNumber(metrics.weekHours)}h`, `meta de ${state.exam.weeklyGoalHours}h`, "--accent: var(--blue)")}
        ${metricCard("trending-up", "Avanço geral", `${metrics.progress}%`, `${metrics.completedTopics} assuntos concluídos`, "--accent: var(--green)")}
        ${metricCard("repeat-2", "Revisões", `${dueReviews.length}`, "pendentes até hoje", "--accent: var(--amber)")}
      </div>

      <div class="content-grid">
        <div class="content-stack">
          <section class="section surface surface-pad">
            <div class="section-header">
              <div>
                <h2>Progresso por matéria</h2>
                <p>Tempo, peso e avanço do edital.</p>
              </div>
              <button class="button" type="button" data-view="materias">${icon("book-open-check")} Matérias</button>
            </div>
            ${renderSubjectBars()}
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2>Planejamento de hoje</h2>
                <p>${formatDateLong(todayISO())}</p>
              </div>
              <button class="button" type="button" data-view="semana">${icon("calendar-days")} Semana</button>
            </div>
            <div class="today-list">
              ${
                todayTasks.length
                  ? todayTasks.map(renderPlanBlockItem).join("")
                  : `<div class="empty-state">Nenhum bloco para hoje. Gere a semana ou cadastre um novo ciclo.</div>`
              }
            </div>
          </section>
        </div>

        <div class="content-stack">
          <section class="section surface surface-pad">
            <div class="progress-ring" style="--progress: ${metrics.progress}%">
              <div>
                <strong>${metrics.progress}%</strong>
                <span>do edital</span>
              </div>
            </div>
            <div class="item-meta">
              <span class="pill green">${formatNumber(metrics.totalHours)}h líquidas</span>
              <span class="pill blue">${metrics.totalQuestions} questões</span>
              <span class="pill amber">${metrics.accuracy}% acerto</span>
            </div>
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2>Revisões urgentes</h2>
                <p>Vencidas e previstas para hoje.</p>
              </div>
              <button class="button" type="button" data-view="revisoes">${icon("repeat-2")} Revisões</button>
            </div>
            <div class="review-list">
              ${
                dueReviews.length
                  ? dueReviews.slice(0, 4).map(renderReviewItem).join("")
                  : `<div class="empty-state">Revisões em dia.</div>`
              }
            </div>
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2>Histórico recente</h2>
                <p>Últimos registros salvos.</p>
              </div>
            </div>
            ${renderHistoryList(5)}
          </section>
        </div>
      </div>
    `;
  }

  function renderEdital() {
    const examStatus = state.exam.status || "open";
    const hasExamDate = Boolean(state.exam.examDate);
    const dateLabel =
      examStatus === "open" ? "Data da prova" : examStatus === "not-open" ? "Data prevista" : "Previsão opcional";
    return `
      <div class="content-stack">
        <section class="section surface surface-pad">
          <form id="exam-form" class="form-grid">
            <div class="field">
              <label for="contest-name">Nome do concurso</label>
              <input id="contest-name" value="${escapeAttr(state.exam.contestName || "")}" placeholder="Ex.: TJ SP, TRT, Prefeitura" />
            </div>
            <div class="field">
              <label for="exam-name">Cargo ou área</label>
              <input id="exam-name" value="${escapeAttr(state.exam.name)}" placeholder="Ex.: Técnico Judiciário, TI, Fiscal" />
            </div>
            <div class="field">
              <label for="exam-board">Banca</label>
              <input id="exam-board" value="${escapeAttr(state.exam.board)}" placeholder="Ex.: Cebraspe, FGV, FCC" />
            </div>
            <div class="field">
              <label for="exam-status">Situação</label>
              <select id="exam-status">
                ${[
                  ["open", "Edital aberto"],
                  ["not-open", "Edital ainda não aberto"],
                  ["no-date", "Sem data definida"],
                ]
                  .map(([value, label]) => `<option value="${value}" ${examStatus === value ? "selected" : ""}>${label}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="exam-date">${dateLabel}</label>
              <input id="exam-date" type="date" value="${hasExamDate ? state.exam.examDate : ""}" />
            </div>
            <div class="field">
              <label for="study-mode">Modo de estudo</label>
              <select id="study-mode">
                ${["Ciclo inteligente", "Reta final", "Revisão intensiva", "Questões primeiro", "Teoria guiada"]
                  .map((mode) => `<option ${state.exam.studyMode === mode ? "selected" : ""}>${mode}</option>`)
                  .join("")}
              </select>
            </div>
            <div class="field">
              <label for="daily-goal">Meta diária líquida</label>
              <input id="daily-goal" type="number" min="1" step="0.5" value="${state.exam.dailyGoalHours}" />
            </div>
            <div class="field">
              <label for="weekly-goal">Meta semanal líquida</label>
              <input id="weekly-goal" type="number" min="1" step="0.5" value="${state.exam.weeklyGoalHours}" />
            </div>
            <div class="field span-2">
              <label for="focus-place">Local de foco</label>
              <input id="focus-place" value="${escapeAttr(state.exam.focusPlace)}" placeholder="Ex.: biblioteca, quarto, sala silenciosa" />
            </div>
            <div class="field span-2">
              <button class="button primary" type="submit">${icon("save")} Salvar edital</button>
            </div>
          </form>
          <div class="info-note">
            ${icon("info")}
            <span>Use "edital ainda não aberto" quando a banca ou a data forem previsão. Quando o edital sair, altere a situação e gere novamente a semana.</span>
          </div>
        </section>

        <section class="section">
          <div class="summary-grid">
            ${metricCard("clipboard-list", "Concurso", escapeHtml(state.exam.contestName || state.exam.name), examStatusLabel(), "--accent: var(--green)")}
            ${metricCard("landmark", "Banca", escapeHtml(state.exam.board), "perfil e estilo de cobrança", "--accent: var(--blue)")}
            ${metricCard("map-pin", "Local de foco", escapeHtml(state.exam.focusPlace), state.exam.studyMode, "--accent: var(--green)")}
            ${metricCard("target", "Meta diária", `${state.exam.dailyGoalHours}h`, "horas líquidas", "--accent: var(--amber)")}
          </div>
        </section>
      </div>
    `;
  }

  function renderSemana() {
    const weekStart = startOfWeek(toDate(todayISO()));
    return `
      <section class="section surface surface-pad">
        <form id="week-settings" class="week-toolbar">
          <div class="field">
            <label for="start-time">Início</label>
            <input id="start-time" type="time" value="${state.settings.startTime}" />
          </div>
          <div class="field">
            <label for="block-minutes">Bloco</label>
            <input id="block-minutes" type="number" min="20" max="180" value="${state.settings.blockMinutes}" />
          </div>
          <div class="field">
            <label for="break-minutes">Pausa</label>
            <input id="break-minutes" type="number" min="0" max="60" value="${state.settings.breakMinutes}" />
          </div>
          <div class="field">
            <label for="daily-blocks">Blocos por dia</label>
            <input id="daily-blocks" type="number" min="1" max="10" value="${state.settings.dailyBlocks}" />
          </div>
          <button class="button primary" type="submit">${icon("sparkles")} Gerar semana</button>
        </form>
        <div class="segmented" aria-label="Dias disponíveis">
          ${weekDays
            .map(
              (day) => `
                <button type="button" class="${state.settings.weekDays.includes(day.key) ? "is-active" : ""}" data-action="toggle-weekday" data-day="${day.key}">
                  ${day.short}
                </button>
              `,
            )
            .join("")}
        </div>
        <div class="info-note">
          ${icon("info")}
          <span>Defina horário inicial, tamanho dos blocos, pausas e dias disponíveis. O botão "Gerar semana" distribui as matérias pela prioridade do edital: peso, dificuldade e avanço atual.</span>
        </div>
      </section>

      <section class="section" style="margin-top: 22px">
        <div class="section-header">
          <div>
            <h2>${formatDate(isoFromDate(weekStart))} a ${formatDate(addDaysISO(isoFromDate(weekStart), 6))}</h2>
            <p>Blocos gerados com base na prioridade do edital.</p>
          </div>
          <button class="button" type="button" data-action="generate-week">${icon("refresh-cw")} Recalcular</button>
        </div>
        <div class="week-grid">
          ${weekDays.map(renderWeekDayColumn).join("")}
        </div>
      </section>
    `;
  }

  function renderMes() {
    const monthLabel = new Intl.DateTimeFormat("pt-BR", {
      month: "long",
      year: "numeric",
    }).format(calendarCursor);

    return `
      <section class="section">
        <div class="calendar-toolbar">
          <button class="button" type="button" data-action="prev-month">${icon("chevron-left")} Anterior</button>
          <button class="button" type="button" data-action="current-month">${icon("calendar")} Hoje</button>
          <button class="button" type="button" data-action="next-month">Próximo ${icon("chevron-right")}</button>
          <div class="pill green">${capitalize(monthLabel)}</div>
        </div>
        <div class="calendar-scroll">
          ${renderCalendarGrid(calendarCursor)}
        </div>
      </section>
    `;
  }

  function renderMaterias() {
    return `
      <div class="content-stack">
        <section class="section surface surface-pad">
          <form id="subject-form" class="form-grid three">
            <div class="field">
              <label for="subject-name">Nova matéria</label>
              <input id="subject-name" placeholder="Ex.: Informática" />
            </div>
            <div class="field">
              <label for="subject-weight">Peso</label>
              <input id="subject-weight" type="number" min="1" max="5" value="3" />
            </div>
            <div class="field">
              <label for="subject-difficulty">Dificuldade</label>
              <input id="subject-difficulty" type="number" min="1" max="5" value="3" />
            </div>
            <div class="field">
              <label for="subject-color">Cor</label>
              <input id="subject-color" type="color" value="${colors[state.subjects.length % colors.length]}" />
            </div>
            <div class="field">
              <label for="topic-subject">Adicionar assunto em</label>
              <select id="topic-subject">
                ${state.subjects.map((subject) => `<option value="${subject.id}">${escapeHtml(subject.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="topic-title">Assunto</label>
              <input id="topic-title" placeholder="Ex.: Crase" />
            </div>
            <div class="field span-2">
              <button class="button primary" type="submit">${icon("plus")} Adicionar matéria</button>
            </div>
            <div class="field">
              <button class="button" type="button" data-action="add-topic">${icon("list-plus")} Adicionar assunto</button>
            </div>
          </form>
        </section>

        <section class="section">
          <div class="subjects-grid">
            ${state.subjects.map(renderSubjectCard).join("")}
          </div>
        </section>
      </div>
    `;
  }

  function renderRevisoes() {
    const due = getDueReviews();
    const upcoming = state.reviews
      .filter((item) => item.status === "pending" && compareISO(item.dueDate, todayISO()) > 0)
      .sort((a, b) => compareISO(a.dueDate, b.dueDate));
    const done = state.reviews.filter((item) => item.status === "done").length;

    return `
      <div class="review-columns">
        <section class="section">
          <div class="section-header">
            <div>
              <h2>Pendentes</h2>
              <p>${due.length} revisão(ões) vencidas ou para hoje.</p>
            </div>
            <button class="button" type="button" data-action="schedule-missing-reviews">${icon("calendar-plus")} Programar tópicos</button>
          </div>
          <div class="review-list">
            ${due.length ? due.map(renderReviewItem).join("") : `<div class="empty-state">Nada pendente para hoje.</div>`}
          </div>
        </section>

        <div class="content-stack">
          <section class="section surface surface-pad">
            <div class="section-header">
              <div>
                <h2>Ciclos ativos</h2>
                <p>Após cada sessão com assunto selecionado.</p>
              </div>
            </div>
            <div class="segmented">
              ${[1, 7, 15, 30, 45, 60]
                .map(
                  (days) => `
                    <button type="button" class="${state.settings.reviewDays.includes(days) ? "is-active" : ""}" data-action="toggle-review-day" data-day="${days}">
                      ${days === 1 ? "24h" : `${days}d`}
                    </button>
                  `,
                )
                .join("")}
            </div>
            <div class="info-note">
              ${icon("info")}
              <span>Esses ciclos criam revisões automáticas depois que você estuda um assunto. Exemplo: 24h gera uma revisão para o dia seguinte; 7d, 15d e 30d reforçam a retenção ao longo do mês.</span>
            </div>
          </section>

          <section class="section">
            <div class="summary-grid">
              ${metricCard("repeat-2", "Pendentes", `${due.length}`, "até hoje", "--accent: var(--amber)")}
              ${metricCard("check-circle-2", "Concluídas", `${done}`, "histórico", "--accent: var(--green)")}
            </div>
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2>Próximas</h2>
                <p>Agenda de revisão.</p>
              </div>
            </div>
            <div class="review-list">
              ${upcoming.length ? upcoming.slice(0, 6).map(renderReviewItem).join("") : `<div class="empty-state">Sem revisões futuras.</div>`}
            </div>
          </section>
        </div>
      </div>
    `;
  }

  function renderFoco() {
    const selectedSubject = getSubject(timer.subjectId) || state.subjects[0];
    if (!timer.subjectId && selectedSubject) timer.subjectId = selectedSubject.id;
    const selectedTopic = selectedSubject?.topics.find((item) => item.id === timer.topicId) || selectedSubject?.topics[0];
    if (selectedTopic && timer.topicId !== selectedTopic.id && !selectedSubject.topics.some((item) => item.id === timer.topicId)) {
      timer.topicId = selectedTopic.id;
    }

    return `
      <div class="focus-layout">
        <section class="timer-console">
          <div class="timer-face">
            <div>
              <strong id="timer-display">${formatSeconds(timer.remaining)}</strong>
              <span id="timer-caption">${timer.running ? "Sessão em andamento" : "Pronto para começar"}</span>
            </div>
          </div>

          <div class="duration-controls">
            ${[15, 25, 50, 75]
              .map(
                (minutes) => `
                  <button type="button" class="${timer.duration === minutes * 60 ? "is-active" : ""}" data-action="set-duration" data-minutes="${minutes}">
                    ${minutes} min
                  </button>
                `,
              )
              .join("")}
          </div>

          <form id="focus-form" class="form-grid">
            <div class="field">
              <label for="focus-subject">Matéria</label>
              <select id="focus-subject">
                ${state.subjects.map((subject) => `<option value="${subject.id}" ${subject.id === timer.subjectId ? "selected" : ""}>${escapeHtml(subject.name)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="focus-topic">Assunto</label>
              <select id="focus-topic">
                ${(selectedSubject?.topics || []).map((topicItem) => `<option value="${topicItem.id}" ${topicItem.id === timer.topicId ? "selected" : ""}>${escapeHtml(topicItem.title)}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="focus-type">Tipo</label>
              <select id="focus-type">
                ${studyTypes.map((type) => `<option value="${type.id}" ${type.id === timer.type ? "selected" : ""}>${type.label}</option>`).join("")}
              </select>
            </div>
            <div class="field">
              <label for="focus-place-input">Local</label>
              <input id="focus-place-input" value="${escapeAttr(state.exam.focusPlace)}" />
            </div>
            <div class="field">
              <label for="focus-questions">Questões</label>
              <input id="focus-questions" type="number" min="0" value="0" />
            </div>
            <div class="field">
              <label for="focus-correct">Acertos</label>
              <input id="focus-correct" type="number" min="0" value="0" />
            </div>
            <div class="field span-2">
              <label for="focus-notes">Notas da sessão</label>
              <textarea id="focus-notes" placeholder="Pontos fracos, páginas, questões erradas, próximos passos"></textarea>
            </div>
          </form>

          <div class="timer-controls">
            <button class="button primary" type="button" data-action="toggle-timer">
              ${icon(timer.running ? "pause" : "play")} ${timer.running ? "Pausar" : "Iniciar"}
            </button>
            <button class="button" type="button" data-action="reset-timer">${icon("rotate-ccw")} Reiniciar</button>
            <button class="button" type="button" data-action="save-session">${icon("save")} Salvar sessão</button>
          </div>
        </section>

        <div class="content-stack">
          <section class="section surface surface-pad">
            <div class="section-header">
              <div>
                <h2>Música</h2>
                <p>Áudio gerado no navegador.</p>
              </div>
              <div class="field" style="min-width: 120px">
                <label for="volume">Volume <span id="volume-value">${getVolumePercent()}%</span></label>
                <input id="volume" type="range" min="0" max="100" step="1" value="${getVolumePercent()}" />
              </div>
            </div>
            <div class="sound-list">
              ${soundOptions.map(renderSoundItem).join("")}
            </div>
            <div class="youtube-panel">
              <div class="field">
                <label for="youtube-url">YouTube</label>
                <input id="youtube-url" value="${escapeAttr(state.settings.youtubeUrl || "")}" placeholder="Cole um link de vÃ­deo ou playlist" />
              </div>
              <div class="item-meta">
                <button class="button" type="button" data-action="save-youtube">${icon("save")} Salvar link</button>
                <button class="button" type="button" data-action="clear-youtube">${icon("x")} Limpar</button>
              </div>
              ${renderYouTubePlayer()}
            </div>
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2>Ritual de foco</h2>
                <p id="focus-ritual-caption">${escapeHtml(state.exam.focusPlace)} · ${escapeHtml(state.exam.studyMode)}</p>
              </div>
            </div>
            <div class="task-list">
              ${["Celular longe", "Aba de questões aberta", "Material da matéria separado", "Água por perto"]
                .map(
                  (text) => `
                    <label class="task-item">
                      <span class="item-meta"><input type="checkbox" /> ${text}</span>
                    </label>
                  `,
                )
                .join("")}
            </div>
          </section>

          <section class="section">
            <div class="section-header">
              <div>
                <h2>Sessões recentes</h2>
                <p>Registro líquido de estudo.</p>
              </div>
            </div>
            <div id="focus-history">${renderHistoryList(4)}</div>
          </section>
        </div>
      </div>
    `;
  }

  function metricCard(iconName, label, value, caption, style) {
    return `
      <article class="metric-card" style="${style || ""}">
        <header>
          <span>${label}</span>
          ${icon(iconName)}
        </header>
        <div>
          <div class="metric-value">${value}</div>
          <p class="metric-caption">${caption}</p>
        </div>
      </article>
    `;
  }

  function renderSubjectBars() {
    if (!state.subjects.length) return `<div class="empty-state">Cadastre matérias para acompanhar o avanço.</div>`;
    return `
      <div class="subject-bar-list">
        ${state.subjects
          .map((subject) => {
            const progress = subjectProgress(subject);
            const hours = subjectHours(subject.id);
            return `
              <div class="subject-row">
                <header>
                  <strong>${escapeHtml(subject.name)}</strong>
                  <span>${progress}% · ${formatNumber(hours)}h</span>
                </header>
                <div class="bar"><i style="--value: ${progress}%; --color: ${subject.color}"></i></div>
              </div>
            `;
          })
          .join("")}
      </div>
    `;
  }

  function renderPlanBlockItem(block) {
    const subject = getSubject(block.subjectId);
    const topicItem = getTopic(block.subjectId, block.topicId);
    const typeLabel = getStudyType(block.type)?.label || block.type;
    return `
      <article class="study-item">
        <div class="item-head">
          <div>
            <p class="item-title">${escapeHtml(subject?.name || "Matéria removida")}</p>
            <div class="item-meta">
              <span>${escapeHtml(topicItem?.title || "Assunto geral")}</span>
              <span>${block.time}</span>
              <span>${block.duration} min</span>
            </div>
          </div>
          <span class="pill ${block.status === "done" ? "green" : "blue"}">${block.status === "done" ? "feito" : typeLabel}</span>
        </div>
        <div class="item-meta">
          <button class="button" type="button" data-action="start-block" data-id="${block.id}">${icon("play")} Foco</button>
          <button class="button" type="button" data-action="complete-block" data-id="${block.id}">${icon("check")} Estudei</button>
        </div>
      </article>
    `;
  }

  function renderReviewItem(item) {
    const subject = getSubject(item.subjectId);
    const topicItem = getTopic(item.subjectId, item.topicId);
    const late = compareISO(item.dueDate, todayISO()) < 0;
    const today = item.dueDate === todayISO();
    return `
      <article class="review-item ${late ? "is-late" : ""} ${today ? "is-today" : ""}">
        <div class="item-head">
          <div>
            <p class="item-title">${escapeHtml(topicItem?.title || "Assunto removido")}</p>
            <div class="item-meta">
              <span>${escapeHtml(subject?.name || "Matéria removida")}</span>
              <span>${formatDate(item.dueDate)}</span>
              <span>${escapeHtml(item.cycle)}</span>
            </div>
          </div>
          <span class="pill ${late ? "coral" : today ? "amber" : "violet"}">${late ? "vencida" : today ? "hoje" : "prevista"}</span>
        </div>
        <div class="item-meta">
          <button class="button" type="button" data-action="review-focus" data-id="${item.id}">${icon("play")} Revisar</button>
          <button class="button" type="button" data-action="complete-review" data-id="${item.id}">${icon("check")} Concluir</button>
          <button class="button" type="button" data-action="snooze-review" data-id="${item.id}">${icon("clock-3")} +2 dias</button>
        </div>
      </article>
    `;
  }

  function renderHistoryList(limit) {
    const items = [...state.sessions].sort((a, b) => compareISO(b.date, a.date)).slice(0, limit);
    return `
      <div class="history-list">
        ${
          items.length
            ? items
                .map((item) => {
                  const subject = getSubject(item.subjectId);
                  const topicItem = getTopic(item.subjectId, item.topicId);
                  return `
                    <article class="history-item">
                      <div class="item-head">
                        <div>
                          <p class="item-title">${escapeHtml(subject?.name || "Matéria removida")}</p>
                          <div class="item-meta">
                            <span>${escapeHtml(topicItem?.title || "Assunto geral")}</span>
                            <span>${formatDate(item.date)}</span>
                            <span>${item.minutes} min</span>
                          </div>
                        </div>
                        <span class="pill blue">${getStudyType(item.type)?.label || item.type}</span>
                      </div>
                      ${
                        item.questions
                          ? `<div class="item-meta"><span>${item.correct}/${item.questions} questões</span><span>${Math.round((item.correct / item.questions) * 100)}% acerto</span></div>`
                          : ""
                      }
                    </article>
                  `;
                })
                .join("")
            : `<div class="empty-state">Nenhuma sessão registrada.</div>`
        }
      </div>
    `;
  }

  function renderWeekDayColumn(day) {
    const date = weekDateForDay(day.key);
    const blocks = state.weekPlan
      .filter((block) => block.date === date)
      .sort((a, b) => a.time.localeCompare(b.time));
    return `
      <div class="day-column">
        <header>
          <div>
            <h3>${day.label}</h3>
            <small>${formatDate(date)}</small>
          </div>
          <span class="pill ${date === todayISO() ? "green" : ""}">${blocks.length}</span>
        </header>
        <div>
          ${
            blocks.length
              ? blocks
                  .map((block) => {
                    const subject = getSubject(block.subjectId);
                    const topicItem = getTopic(block.subjectId, block.topicId);
                    return `
                      <article class="plan-block ${block.status === "done" ? "is-done" : ""}" style="--color: ${subject?.color || "var(--green)"}">
                        <small>${block.time} · ${block.duration} min · ${getStudyType(block.type)?.label || block.type}</small>
                        <strong>${escapeHtml(subject?.name || "Matéria removida")}</strong>
                        <small>${escapeHtml(topicItem?.title || "Assunto geral")}</small>
                        <div class="item-meta">
                          <button class="icon-button tooltip" type="button" data-action="start-block" data-id="${block.id}" data-tip="Iniciar no foco">${icon("play")}</button>
                          <button class="icon-button tooltip" type="button" data-action="complete-block" data-id="${block.id}" data-tip="Marcar estudado">${icon("check")}</button>
                          <button class="icon-button tooltip" type="button" data-action="delete-block" data-id="${block.id}" data-tip="Remover bloco">${icon("trash-2")}</button>
                        </div>
                      </article>
                    `;
                  })
                  .join("")
              : `<div class="empty-state">Sem blocos.</div>`
          }
        </div>
      </div>
    `;
  }

  function renderCalendarGrid(cursor) {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const startOffset = (first.getDay() + 6) % 7;
    const gridStart = new Date(first);
    gridStart.setDate(first.getDate() - startOffset);
    const heads = weekDays.map((day) => `<div class="calendar-head">${day.short}</div>`).join("");
    const days = Array.from({ length: 42 }, (_, index) => {
      const date = new Date(gridStart);
      date.setDate(gridStart.getDate() + index);
      const iso = isoFromDate(date);
      const muted = date.getMonth() !== cursor.getMonth();
      const events = getCalendarEvents(iso);
      return `
        <div class="calendar-day ${muted ? "is-muted" : ""} ${iso === todayISO() ? "is-today" : ""}">
          <div class="day-number">${date.getDate()}</div>
          <div class="day-events">
            ${events
              .slice(0, 4)
              .map(
                (event) => `
                  <span class="calendar-chip" style="--color: ${event.color || "var(--green)"}" title="${escapeAttr(event.title)}">
                    ${escapeHtml(event.title)}
                  </span>
                `,
              )
              .join("")}
            ${events.length > 4 ? `<span class="calendar-chip">+${events.length - 4}</span>` : ""}
          </div>
        </div>
      `;
    }).join("");
    return `<div class="calendar-grid">${heads}${days}</div>`;
  }

  function renderSubjectCard(subject) {
    const progress = subjectProgress(subject);
    return `
      <article class="subject-card" style="--color: ${subject.color}">
        <header>
          <div class="subject-name">
            <span class="color-dot"></span>
            <h3>${escapeHtml(subject.name)}</h3>
          </div>
          <div class="subject-actions">
            <button class="icon-button tooltip" type="button" data-action="delete-subject" data-id="${subject.id}" data-tip="Remover matéria">${icon("trash-2")}</button>
          </div>
        </header>

        <div class="form-grid">
          <div class="field">
            <label>Nome</label>
            <input value="${escapeAttr(subject.name)}" data-action="subject-field" data-id="${subject.id}" data-field="name" />
          </div>
          <div class="field">
            <label>Cor</label>
            <input type="color" value="${subject.color}" data-action="subject-field" data-id="${subject.id}" data-field="color" />
          </div>
          <div class="field">
            <label>Peso</label>
            <input type="number" min="1" max="5" value="${subject.weight}" data-action="subject-field" data-id="${subject.id}" data-field="weight" />
          </div>
          <div class="field">
            <label>Dificuldade</label>
            <input type="number" min="1" max="5" value="${subject.difficulty}" data-action="subject-field" data-id="${subject.id}" data-field="difficulty" />
          </div>
        </div>

        <div class="subject-row">
          <header><strong>Avanço</strong><span>${progress}%</span></header>
          <div class="bar"><i style="--value: ${progress}%; --color: ${subject.color}"></i></div>
        </div>

        <div class="topic-list">
          ${
            subject.topics.length
              ? subject.topics
                  .map(
                    (topicItem) => `
                      <div class="topic-item">
                        <div class="item-head">
                          <p class="item-title">${escapeHtml(topicItem.title)}</p>
                          <button class="icon-button tooltip" type="button" data-action="delete-topic" data-subject="${subject.id}" data-id="${topicItem.id}" data-tip="Remover assunto">${icon("x")}</button>
                        </div>
                        <div class="range-line">
                          <input type="range" min="0" max="100" value="${topicItem.progress}" data-action="topic-progress" data-subject="${subject.id}" data-id="${topicItem.id}" />
                          <span class="pill">${topicItem.progress}%</span>
                        </div>
                      </div>
                    `,
                  )
                  .join("")
              : `<div class="empty-state">Sem assuntos cadastrados.</div>`
          }
        </div>
      </article>
    `;
  }

  function renderSoundItem(item) {
    const active = audio.current === item.id && audio.playing;
    return `
      <article class="sound-item">
        <div class="sound-icon">${icon(item.icon)}</div>
        <div>
          <p class="item-title">${item.label}</p>
          <div class="item-meta">${item.id === "silence" ? "sem áudio" : "ambiente contínuo"}</div>
        </div>
        <button class="icon-button tooltip" type="button" data-action="toggle-sound" data-sound="${item.id}" data-tip="${active ? "Parar" : "Tocar"}">
          ${icon(active ? "square" : "play")}
        </button>
      </article>
    `;
  }

  function renderYouTubePlayer() {
    if (!state.settings.youtubeUrl) return `<div class="empty-state">Nenhum link do YouTube salvo.</div>`;
    const embed = getYouTubeEmbed(state.settings.youtubeUrl);
    if (!embed) return `<div class="empty-state">Link do YouTube invÃ¡lido.</div>`;

    return `
      <div class="youtube-frame">
        <iframe
          id="youtube-player"
          src="${escapeAttr(embed)}"
          title="YouTube"
          loading="lazy"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerpolicy="strict-origin-when-cross-origin"
          allowfullscreen>
        </iframe>
      </div>
    `;
  }

  function bindEvents() {
    document.querySelectorAll("[data-view]").forEach((button) => {
      button.addEventListener("click", () => {
        activeView = button.dataset.view;
        render();
      });
    });

    const mobileView = document.querySelector("#mobile-view");
    if (mobileView) {
      mobileView.addEventListener("change", () => {
        activeView = mobileView.value;
        render();
      });
    }

    document.querySelectorAll("[data-action]").forEach((element) => {
      element.addEventListener("click", handleAction);
      if (element.matches("input")) {
        element.addEventListener("change", handleInputAction);
      }
    });

    document.querySelector("#import-file")?.addEventListener("change", importData);
    document.querySelector("#exam-form")?.addEventListener("submit", saveExam);
    document.querySelector("#week-settings")?.addEventListener("submit", saveWeekSettings);
    document.querySelector("#subject-form")?.addEventListener("submit", addSubject);
    document.querySelector("#focus-subject")?.addEventListener("change", updateFocusSubject);
    document.querySelector("#focus-topic")?.addEventListener("change", (event) => {
      timer.topicId = event.target.value;
    });
    document.querySelector("#focus-type")?.addEventListener("change", (event) => {
      timer.type = event.target.value;
    });
    document.querySelector("#focus-place-input")?.addEventListener("change", (event) => {
      state.exam.focusPlace = event.target.value.trim() || "Local de foco";
      saveState();
      updateFocusRitualCaption();
      showToast("Local de foco atualizado.");
    });
    document.querySelector("#volume")?.addEventListener("input", (event) => {
      state.settings.soundVolume = clamp(Number(event.target.value), 0, 100) / 100;
      const label = document.querySelector("#volume-value");
      if (label) label.textContent = `${getVolumePercent()}%`;
      saveState();
      if (audio.playing) setAudioVolume();
      setYouTubeVolume();
    });
    document.querySelector("#youtube-player")?.addEventListener("load", () => {
      window.setTimeout(setYouTubeVolume, 350);
    });

    document.querySelectorAll('[data-action="subject-field"]').forEach((input) => {
      input.addEventListener("change", updateSubjectField);
    });
    document.querySelectorAll('[data-action="topic-progress"]').forEach((input) => {
      input.addEventListener("change", updateTopicProgress);
    });
  }

  function handleAction(event) {
    const action = event.currentTarget.dataset.action;
    const id = event.currentTarget.dataset.id;
    const day = Number(event.currentTarget.dataset.day);
    const sound = event.currentTarget.dataset.sound;
    const minutes = Number(event.currentTarget.dataset.minutes);

    const actions = {
      export: exportData,
      "reset-demo": resetDemo,
      "generate-week": () => {
        state.weekPlan = buildWeekPlan(state);
        saveState();
        render();
        showToast("Semana recalculada.");
      },
      "toggle-weekday": () => toggleWeekday(day),
      "prev-month": () => moveMonth(-1),
      "next-month": () => moveMonth(1),
      "current-month": () => {
        calendarCursor = toDate(todayISO());
        render();
      },
      "add-topic": addTopic,
      "delete-subject": () => deleteSubject(id),
      "delete-topic": () => deleteTopic(event.currentTarget.dataset.subject, id),
      "start-block": () => startBlock(id),
      "complete-block": () => completeBlock(id),
      "delete-block": () => deleteBlock(id),
      "complete-review": () => completeReview(id),
      "snooze-review": () => snoozeReview(id),
      "review-focus": () => reviewFocus(id),
      "toggle-review-day": () => toggleReviewDay(day),
      "schedule-missing-reviews": scheduleMissingReviews,
      "set-duration": () => setDuration(minutes),
      "toggle-timer": toggleTimer,
      "reset-timer": resetTimer,
      "save-session": saveFocusSession,
      "toggle-sound": () => toggleSound(sound),
      "save-youtube": saveYoutubeLink,
      "clear-youtube": clearYoutubeLink,
      "sign-out": async () => {
        await window.studyAuth?.signOut?.();
        window.location.reload();
      },
    };

    if (actions[action]) actions[action]();
  }

  function handleInputAction(event) {
    if (event.currentTarget.dataset.action === "subject-field") updateSubjectField(event);
    if (event.currentTarget.dataset.action === "topic-progress") updateTopicProgress(event);
  }

  async function saveExam(event) {
    event.preventDefault();
    state.exam = {
      ...state.exam,
      contestName: valueOf("#contest-name") || valueOf("#exam-name") || "Concurso sem nome",
      name: valueOf("#exam-name") || "Concurso sem nome",
      board: valueOf("#exam-board") || "Banca não definida",
      status: valueOf("#exam-status") || "open",
      examDate: valueOf("#exam-date"),
      studyMode: valueOf("#study-mode") || "Ciclo inteligente",
      dailyGoalHours: Number(valueOf("#daily-goal")) || 1,
      weeklyGoalHours: Number(valueOf("#weekly-goal")) || 1,
      focusPlace: valueOf("#focus-place") || "Local de foco",
    };
    await saveState({ immediate: true });
    render();
    showToast(cloudSync.enabled && cloudSync.status === "Firebase" ? "Edital salvo no Firebase." : "Edital salvo localmente.");
  }

  function saveWeekSettings(event) {
    event.preventDefault();
    state.settings.startTime = valueOf("#start-time") || "08:00";
    state.settings.blockMinutes = clamp(Number(valueOf("#block-minutes")) || 50, 20, 180);
    state.settings.breakMinutes = clamp(Number(valueOf("#break-minutes")) || 10, 0, 60);
    state.settings.dailyBlocks = clamp(Number(valueOf("#daily-blocks")) || 4, 1, 10);
    state.weekPlan = buildWeekPlan(state);
    saveState();
    render();
    showToast("Ciclo semanal gerado.");
  }

  function addSubject(event) {
    event.preventDefault();
    const name = valueOf("#subject-name");
    if (!name) {
      showToast("Informe o nome da matéria.");
      return;
    }
    state.subjects.push({
      id: uid("mat"),
      name,
      color: valueOf("#subject-color") || colors[state.subjects.length % colors.length],
      weight: clamp(Number(valueOf("#subject-weight")) || 3, 1, 5),
      difficulty: clamp(Number(valueOf("#subject-difficulty")) || 3, 1, 5),
      topics: [],
    });
    saveState();
    render();
    showToast("Matéria adicionada.");
  }

  function addTopic() {
    const subjectId = valueOf("#topic-subject");
    const title = valueOf("#topic-title");
    if (!subjectId || !title) {
      showToast("Escolha a matéria e informe o assunto.");
      return;
    }
    const subject = getSubject(subjectId);
    if (!subject) return;
    subject.topics.push(topic(title, 0));
    saveState();
    render();
    showToast("Assunto adicionado.");
  }

  function updateSubjectField(event) {
    const subject = getSubject(event.currentTarget.dataset.id);
    const field = event.currentTarget.dataset.field;
    if (!subject || !field) return;
    const numeric = ["weight", "difficulty"].includes(field);
    subject[field] = numeric ? clamp(Number(event.currentTarget.value) || 1, 1, 5) : event.currentTarget.value.trim();
    if (!subject.name) subject.name = "Matéria sem nome";
    saveState();
    render();
    showToast("Matéria atualizada.");
  }

  function updateTopicProgress(event) {
    const topicItem = getTopic(event.currentTarget.dataset.subject, event.currentTarget.dataset.id);
    if (!topicItem) return;
    const previous = topicItem.progress;
    topicItem.progress = clamp(Number(event.currentTarget.value), 0, 100);
    topicItem.completed = topicItem.progress >= 100;
    if (topicItem.completed && previous < 100) {
      scheduleReviews(event.currentTarget.dataset.subject, topicItem.id, todayISO());
    }
    saveState();
    render();
    showToast("Progresso atualizado.");
  }

  function deleteSubject(id) {
    if (!confirm("Remover esta matéria e seus assuntos?")) return;
    state.subjects = state.subjects.filter((subject) => subject.id !== id);
    state.weekPlan = state.weekPlan.filter((block) => block.subjectId !== id);
    state.reviews = state.reviews.filter((item) => item.subjectId !== id);
    state.sessions = state.sessions.filter((item) => item.subjectId !== id);
    syncTimerSelection();
    saveState();
    render();
    showToast("Matéria removida com histórico e revisões vinculados.");
  }

  function deleteTopic(subjectId, topicId) {
    const subject = getSubject(subjectId);
    if (!subject) return;
    subject.topics = subject.topics.filter((item) => item.id !== topicId);
    state.weekPlan = state.weekPlan.filter((block) => block.topicId !== topicId);
    state.reviews = state.reviews.filter((item) => item.topicId !== topicId);
    state.sessions = state.sessions.filter((item) => item.topicId !== topicId);
    syncTimerSelection();
    saveState();
    render();
    showToast("Assunto removido com histórico e revisões vinculados.");
  }

  function toggleWeekday(day) {
    const days = new Set(state.settings.weekDays);
    if (days.has(day)) days.delete(day);
    else days.add(day);
    state.settings.weekDays = [...days].sort((a, b) => dayOrder(a) - dayOrder(b));
    if (!state.settings.weekDays.length) state.settings.weekDays = [1];
    state.weekPlan = buildWeekPlan(state);
    saveState();
    render();
  }

  function moveMonth(delta) {
    calendarCursor = new Date(calendarCursor.getFullYear(), calendarCursor.getMonth() + delta, 1);
    render();
  }

  function startBlock(id) {
    const block = state.weekPlan.find((item) => item.id === id);
    if (!block) return;
    timer.subjectId = block.subjectId;
    timer.topicId = block.topicId;
    timer.type = block.type;
    timer.duration = block.duration * 60;
    timer.remaining = timer.duration;
    timer.planBlockId = block.id;
    activeView = "foco";
    render();
    showToast("Bloco carregado no modo foco.");
  }

  function completeBlock(id) {
    const block = state.weekPlan.find((item) => item.id === id);
    if (!block) return;
    block.status = "done";
    addSession({
      subjectId: block.subjectId,
      topicId: block.topicId,
      minutes: block.duration,
      type: block.type,
      date: block.date,
      questions: 0,
      correct: 0,
      notes: "Registro criado pelo planejamento semanal.",
    });
    saveState();
    render();
    showToast("Bloco marcado como estudado.");
  }

  function deleteBlock(id) {
    state.weekPlan = state.weekPlan.filter((block) => block.id !== id);
    saveState();
    render();
    showToast("Bloco removido.");
  }

  function completeReview(id) {
    const item = state.reviews.find((reviewItem) => reviewItem.id === id);
    if (!item) return;
    item.status = "done";
    item.completedAt = new Date().toISOString();
    addSession({
      subjectId: item.subjectId,
      topicId: item.topicId,
      minutes: 20,
      type: "revisao",
      date: todayISO(),
      questions: 0,
      correct: 0,
      notes: `Revisão concluída: ${item.cycle}.`,
      skipReviewSchedule: true,
    });
    saveState();
    render();
    showToast("Revisão concluída.");
  }

  function snoozeReview(id) {
    const item = state.reviews.find((reviewItem) => reviewItem.id === id);
    if (!item) return;
    item.dueDate = addDaysISO(item.dueDate, 2);
    saveState();
    render();
    showToast("Revisão remarcada para +2 dias.");
  }

  function reviewFocus(id) {
    const item = state.reviews.find((reviewItem) => reviewItem.id === id);
    if (!item) return;
    timer.subjectId = item.subjectId;
    timer.topicId = item.topicId;
    timer.type = "revisao";
    timer.duration = 25 * 60;
    timer.remaining = timer.duration;
    activeView = "foco";
    render();
    showToast("Revisão carregada no modo foco.");
  }

  function toggleReviewDay(day) {
    const days = new Set(state.settings.reviewDays);
    if (days.has(day)) days.delete(day);
    else days.add(day);
    state.settings.reviewDays = [...days].sort((a, b) => a - b);
    if (!state.settings.reviewDays.length) state.settings.reviewDays = [1, 7, 15, 30];
    saveState();
    render();
  }

  function scheduleMissingReviews() {
    state.subjects.forEach((subject) => {
      subject.topics
        .filter((item) => item.progress > 0)
        .forEach((item) => scheduleReviews(subject.id, item.id, todayISO()));
    });
    saveState();
    render();
    showToast("Revisões programadas para assuntos iniciados.");
  }

  function updateFocusSubject(event) {
    timer.subjectId = event.target.value;
    const subject = getSubject(timer.subjectId);
    timer.topicId = subject?.topics[0]?.id || "";
    updateFocusTopicOptions(subject);
  }

  function setDuration(minutes) {
    if (timer.running) return;
    timer.duration = minutes * 60;
    timer.remaining = timer.duration;
    updateFocusControls();
  }

  function toggleTimer() {
    syncFocusForm();
    if (timer.running) {
      pauseTimer();
    } else {
      timer.running = true;
      timer.interval = window.setInterval(() => {
        timer.remaining = Math.max(0, timer.remaining - 1);
        updateTimerFace();
        if (timer.remaining <= 0) {
          pauseTimer(false);
          notifyTimerDone();
        }
      }, 1000);
      updateFocusControls();
    }
  }

  function pauseTimer(shouldRender = true) {
    timer.running = false;
    window.clearInterval(timer.interval);
    timer.interval = null;
    if (shouldRender) updateFocusControls();
  }

  function resetTimer() {
    pauseTimer(false);
    timer.remaining = timer.duration;
    updateFocusControls();
  }

  function saveFocusSession() {
    syncFocusForm();
    const elapsed = timer.duration - timer.remaining;
    const minutes = Math.max(1, Math.round((elapsed > 0 ? elapsed : timer.duration) / 60));
    const questions = Number(valueOf("#focus-questions")) || 0;
    const correct = Math.min(Number(valueOf("#focus-correct")) || 0, questions);
    addSession({
      subjectId: timer.subjectId,
      topicId: timer.topicId,
      minutes,
      type: timer.type,
      date: todayISO(),
      questions,
      correct,
      notes: valueOf("#focus-notes"),
    });
    if (timer.planBlockId) {
      const block = state.weekPlan.find((item) => item.id === timer.planBlockId);
      if (block) block.status = "done";
      timer.planBlockId = null;
    }
    pauseTimer(false);
    timer.remaining = timer.duration;
    saveState();
    resetFocusSessionFields();
    updateFocusControls();
    updateFocusHistory();
    showToast("Sessão registrada.");
  }

  function syncFocusForm() {
    const subject = document.querySelector("#focus-subject");
    const topicSelect = document.querySelector("#focus-topic");
    const type = document.querySelector("#focus-type");
    const place = document.querySelector("#focus-place-input");
    if (subject) timer.subjectId = subject.value;
    if (topicSelect) timer.topicId = topicSelect.value;
    if (type) timer.type = type.value;
    if (place) {
      state.exam.focusPlace = place.value.trim() || state.exam.focusPlace;
      saveState();
    }
  }

  function addSession(payload) {
    state.sessions.unshift({
      id: uid("ses"),
      date: payload.date || todayISO(),
      subjectId: payload.subjectId,
      topicId: payload.topicId,
      minutes: Number(payload.minutes) || 1,
      type: payload.type || "teoria",
      questions: Number(payload.questions) || 0,
      correct: Number(payload.correct) || 0,
      notes: payload.notes || "",
      createdAt: new Date().toISOString(),
    });

    advanceTopic(payload.subjectId, payload.topicId, payload.type, payload.minutes);
    if (!payload.skipReviewSchedule && payload.topicId) {
      scheduleReviews(payload.subjectId, payload.topicId, payload.date || todayISO());
    }
  }

  function advanceTopic(subjectId, topicId, type, minutes) {
    const topicItem = getTopic(subjectId, topicId);
    if (!topicItem) return;
    const base = type === "revisao" ? 2 : type === "questoes" ? 4 : 6;
    const gain = Math.max(1, Math.round((Number(minutes) / 50) * base));
    topicItem.progress = clamp(topicItem.progress + gain, 0, 100);
    topicItem.completed = topicItem.progress >= 100;
  }

  function scheduleReviews(subjectId, topicId, baseDate) {
    state.settings.reviewDays.forEach((days) => {
      const dueDate = addDaysISO(baseDate, days);
      const cycle = days === 1 ? "24 horas" : `${days} dias`;
      const exists = state.reviews.some(
        (item) =>
          item.status === "pending" &&
          item.subjectId === subjectId &&
          item.topicId === topicId &&
          item.dueDate === dueDate &&
          item.cycle === cycle,
      );
      if (!exists) {
        state.reviews.push({
          id: uid("rev"),
          subjectId,
          topicId,
          dueDate,
          cycle,
          status: "pending",
          completedAt: "",
          createdAt: new Date().toISOString(),
        });
      }
    });
  }

  async function toggleSound(sound) {
    if (audio.playing && audio.current === sound) {
      stopSound();
      updateSoundButtons();
      return;
    }
    if (sound === "silence") {
      stopSound();
      audio.current = "silence";
      updateSoundButtons();
      return;
    }
    await startSound(sound);
    updateSoundButtons();
  }

  async function saveYoutubeLink() {
    const url = valueOf("#youtube-url");
    const nextEmbed = getYouTubeEmbed(url);
    const previousEmbed = getYouTubeEmbed(state.settings.youtubeUrl);
    if (url && !nextEmbed) {
      showToast("Cole um link vÃ¡lido do YouTube, sem Shorts.");
      return;
    }
    state.settings.youtubeUrl = url;
    await saveState({ immediate: true });
    if (nextEmbed !== previousEmbed) render();
    showToast(url ? "Link do YouTube salvo." : "Link do YouTube removido.");
  }

  async function clearYoutubeLink() {
    state.settings.youtubeUrl = "";
    await saveState({ immediate: true });
    render();
    showToast("Link do YouTube removido.");
  }

  function getYouTubeEmbed(input) {
    const raw = String(input || "").trim();
    if (!raw) return "";

    if (/^[A-Za-z0-9_-]{11}$/.test(raw)) {
      const params = new URLSearchParams({
        enablejsapi: "1",
        origin: getPlayerOrigin(),
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
      });
      return `https://www.youtube-nocookie.com/embed/${raw}?${params.toString()}`;
    }

    let url;
    try {
      url = new URL(raw);
    } catch (error) {
      return "";
    }

    const host = url.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (!["youtube.com", "youtu.be", "youtube-nocookie.com"].includes(host)) return "";

    const playlist = url.searchParams.get("list");
    let videoId = url.searchParams.get("v");

    if (host === "youtu.be") {
      videoId = url.pathname.split("/").filter(Boolean)[0] || videoId;
    }

    const pathParts = url.pathname.split("/").filter(Boolean);
    if (pathParts[0] === "shorts") return "";

    if (["embed", "live"].includes(pathParts[0]) && pathParts[1]) {
      videoId = pathParts[1];
    }

    if (videoId && /^[A-Za-z0-9_-]{11}$/.test(videoId)) {
      const params = new URLSearchParams({
        enablejsapi: "1",
        origin: getPlayerOrigin(),
        rel: "0",
        modestbranding: "1",
        playsinline: "1",
      });
      if (playlist) params.set("list", playlist);
      return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
    }

    if (playlist && /^[A-Za-z0-9_-]+$/.test(playlist)) {
      const params = new URLSearchParams({
        enablejsapi: "1",
        origin: getPlayerOrigin(),
        list: playlist,
        rel: "0",
        modestbranding: "1",
      });
      return `https://www.youtube-nocookie.com/embed/videoseries?${params.toString()}`;
    }

    return "";
  }

  async function startSound(sound) {
    stopSound();
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      showToast("Seu navegador não liberou áudio ambiente.");
      return;
    }
    audio.ctx = audio.ctx || new AudioContext();
    if (audio.ctx.state === "suspended") await audio.ctx.resume();
    const ctx = audio.ctx;
    const master = ctx.createGain();
    master.gain.value = getNativeVolume();
    master.connect(ctx.destination);
    audio.nodes = [master];

    if (sound === "rain") {
      const source = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = Math.random() * 2 - 1;
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = 900;
      const gain = ctx.createGain();
      gain.gain.value = 0.26;
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      audio.nodes.push(source, filter, gain);
    }

    if (sound === "lofi") {
      [130.81, 164.81, 196.0].forEach((frequency, index) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = index === 0 ? "sine" : "triangle";
        osc.frequency.value = frequency;
        gain.gain.value = 0.045;
        osc.connect(gain);
        gain.connect(master);
        osc.start();
        audio.nodes.push(osc, gain);
      });
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      lfo.frequency.value = 0.65;
      lfoGain.gain.value = 0.025;
      lfo.connect(lfoGain);
      lfoGain.connect(master.gain);
      lfo.start();
      audio.nodes.push(lfo, lfoGain);
    }

    if (sound === "library") {
      const source = ctx.createBufferSource();
      const buffer = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.35;
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.value = 420;
      const gain = ctx.createGain();
      gain.gain.value = 0.11;
      source.buffer = buffer;
      source.loop = true;
      source.connect(filter);
      filter.connect(gain);
      gain.connect(master);
      source.start();
      audio.nodes.push(source, filter, gain);
    }

    audio.current = sound;
    audio.playing = true;
  }

  function stopSound() {
    audio.nodes.forEach((node) => {
      try {
        if (typeof node.stop === "function") node.stop();
      } catch (error) {
        // Node may have been stopped already.
      }
      try {
        node.disconnect();
      } catch (error) {
        // Disconnect is best-effort for mixed audio node types.
      }
    });
    audio.nodes = [];
    audio.playing = false;
  }

  function setAudioVolume() {
    const master = audio.nodes[0];
    if (master?.gain) master.gain.value = getNativeVolume();
  }

  function notifyTimerDone() {
    updateTimerFace();
    showToast("Pomodoro concluído. Registre a sessão ou inicie outro bloco.");
    try {
      const ctx = audio.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = 880;
      gain.gain.value = 0.08;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      setTimeout(() => {
        osc.stop();
        osc.disconnect();
        gain.disconnect();
      }, 220);
    } catch (error) {
      // Silent fallback.
    }
  }

  function buildWeekPlan(sourceState) {
    if (!sourceState.subjects.length) return [];
    const start = startOfWeek(toDate(todayISO()));
    const queue = buildStudyQueue(sourceState.subjects);
    const blocks = [];
    let pointer = 0;

    sourceState.settings.weekDays.forEach((dayKey) => {
      const date = weekDateForDay(dayKey, start);
      let currentTime = sourceState.settings.startTime;
      const dailyReviews = sourceState.reviews
        .filter((item) => item.status === "pending" && compareISO(item.dueDate, date) <= 0)
        .slice(0, 1);

      for (let slot = 0; slot < sourceState.settings.dailyBlocks; slot += 1) {
        let subjectId;
        let topicId;
        let type = slot % 3 === 2 ? "questoes" : "teoria";

        if (slot < dailyReviews.length) {
          subjectId = dailyReviews[slot].subjectId;
          topicId = dailyReviews[slot].topicId;
          type = "revisao";
        } else {
          const next = queue[pointer % queue.length];
          pointer += 1;
          subjectId = next.subject.id;
          topicId = next.topic?.id || "";
        }

        blocks.push({
          id: uid("blk"),
          date,
          dayKey,
          time: currentTime,
          duration: sourceState.settings.blockMinutes,
          subjectId,
          topicId,
          type,
          status: "planned",
        });

        currentTime = addMinutesToTime(
          currentTime,
          sourceState.settings.blockMinutes + sourceState.settings.breakMinutes,
        );
      }
    });

    return blocks;
  }

  function buildStudyQueue(subjects) {
    const weighted = subjects
      .map((subject) => {
        const progress = subjectProgress(subject);
        const priority = (Number(subject.weight) + Number(subject.difficulty)) * (1 + (100 - progress) / 100);
        return { subject, priority };
      })
      .sort((a, b) => b.priority - a.priority);

    return weighted.flatMap(({ subject, priority }) => {
      const openTopics = subject.topics.filter((item) => item.progress < 100);
      const picked = openTopics.length ? openTopics : subject.topics;
      const repeats = Math.max(1, Math.round(priority / 3));
      return Array.from({ length: repeats }, (_, index) => ({
        subject,
        topic: picked[index % Math.max(1, picked.length)],
      }));
    });
  }

  function ensureWeekPlan() {
    const currentWeekStart = isoFromDate(startOfWeek(toDate(todayISO())));
    const hasCurrentWeek = state.weekPlan.some((block) => {
      const blockWeekStart = isoFromDate(startOfWeek(toDate(block.date)));
      return blockWeekStart === currentWeekStart;
    });
    if (!hasCurrentWeek) {
      state.weekPlan = buildWeekPlan(state);
      saveState();
    }
  }

  function computeMetrics() {
    const totalMinutes = state.sessions.reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const weekMinutes = state.sessions
      .filter((item) => isInCurrentWeek(item.date))
      .reduce((sum, item) => sum + Number(item.minutes || 0), 0);
    const topics = state.subjects.flatMap((subject) => subject.topics);
    const progress = topics.length
      ? Math.round(topics.reduce((sum, item) => sum + Number(item.progress || 0), 0) / topics.length)
      : 0;
    const totalQuestions = state.sessions.reduce((sum, item) => sum + Number(item.questions || 0), 0);
    const totalCorrect = state.sessions.reduce((sum, item) => sum + Number(item.correct || 0), 0);
    return {
      totalHours: totalMinutes / 60,
      weekHours: weekMinutes / 60,
      progress,
      completedTopics: topics.filter((item) => item.progress >= 100).length,
      totalQuestions,
      accuracy: totalQuestions ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
    };
  }

  function getDueReviews() {
    return state.reviews
      .filter((item) => item.status === "pending" && compareISO(item.dueDate, todayISO()) <= 0)
      .sort((a, b) => compareISO(a.dueDate, b.dueDate));
  }

  function getTodayPlan() {
    return state.weekPlan
      .filter((block) => block.date === todayISO())
      .sort((a, b) => a.time.localeCompare(b.time));
  }

  function getCalendarEvents(iso) {
    const planned = state.weekPlan
      .filter((block) => block.date === iso)
      .map((block) => {
        const subject = getSubject(block.subjectId);
        return {
          title: `${block.time} ${subject?.name || "Estudo"}`,
          color: subject?.color,
        };
      });
    const reviews = state.reviews
      .filter((item) => item.dueDate === iso && item.status === "pending")
      .map((item) => {
        const subject = getSubject(item.subjectId);
        return {
          title: `Rev. ${subject?.name || "assunto"}`,
          color: "var(--amber)",
        };
      });
    const sessions = state.sessions
      .filter((item) => item.date === iso)
      .map((item) => {
        const subject = getSubject(item.subjectId);
        return {
          title: `${item.minutes}m ${subject?.name || "sessão"}`,
          color: subject?.color,
        };
      });
    return [...reviews, ...planned, ...sessions];
  }

  function getSubject(id) {
    return state.subjects.find((subject) => subject.id === id);
  }

  function getTopic(subjectId, topicId) {
    return getSubject(subjectId)?.topics.find((item) => item.id === topicId);
  }

  function getStudyType(id) {
    return studyTypes.find((type) => type.id === id);
  }

  function subjectProgress(subject) {
    if (!subject?.topics?.length) return 0;
    return Math.round(subject.topics.reduce((sum, item) => sum + Number(item.progress || 0), 0) / subject.topics.length);
  }

  function subjectHours(subjectId) {
    return (
      state.sessions
        .filter((item) => item.subjectId === subjectId)
        .reduce((sum, item) => sum + Number(item.minutes || 0), 0) / 60
    );
  }

  function weekDateForDay(dayKey, start = startOfWeek(toDate(todayISO()))) {
    return addDaysISO(isoFromDate(start), dayOrder(dayKey));
  }

  function dayOrder(dayKey) {
    return dayKey === 0 ? 6 : dayKey - 1;
  }

  function startOfWeek(date) {
    const copy = new Date(date);
    const day = copy.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    copy.setDate(copy.getDate() + diff);
    copy.setHours(12, 0, 0, 0);
    return copy;
  }

  function isInCurrentWeek(iso) {
    return isoFromDate(startOfWeek(toDate(iso))) === isoFromDate(startOfWeek(toDate(todayISO())));
  }

  function examStatusLabel() {
    const labels = {
      open: "Edital aberto",
      "not-open": "Edital ainda não aberto",
      "no-date": "Sem data definida",
    };
    return labels[state.exam.status || "open"] || labels.open;
  }

  function sidebarExamMeta() {
    const board = escapeHtml(state.exam.board || "Banca não definida");
    const days = daysUntilExam();
    if (days === null) return `${board} · ${examStatusLabel()}`;
    return `${board} · ${days === 0 ? "prova hoje" : `${days} dias para a prova`}`;
  }

  function examCountdownText() {
    const days = daysUntilExam();
    if (days === null) return "Sem data";
    return days === 0 ? "Hoje" : `${days} dias`;
  }

  function examDateCaption() {
    if (!state.exam.examDate) return examStatusLabel();
    return state.exam.status === "open" ? formatDate(state.exam.examDate) : `previsão em ${formatDate(state.exam.examDate)}`;
  }

  function daysUntilExam() {
    if (!state.exam.examDate) return null;
    const diff = toDate(state.exam.examDate).getTime() - toDate(todayISO()).getTime();
    if (Number.isNaN(diff)) return null;
    return Math.max(0, Math.ceil(diff / 86400000));
  }

  function todayISO() {
    return isoFromDate(new Date());
  }

  function isoFromDate(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  function toDate(iso) {
    return new Date(`${iso}T12:00:00`);
  }

  function addDaysISO(iso, days) {
    const date = toDate(iso);
    date.setDate(date.getDate() + Number(days));
    return isoFromDate(date);
  }

  function compareISO(a, b) {
    return a.localeCompare(b);
  }

  function formatDate(iso) {
    if (!iso) return "Sem data";
    return new Intl.DateTimeFormat("pt-BR", {
      day: "2-digit",
      month: "2-digit",
    }).format(toDate(iso));
  }

  function formatDateLong(iso) {
    return new Intl.DateTimeFormat("pt-BR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
    }).format(toDate(iso));
  }

  function addMinutesToTime(time, minutes) {
    const [hour, minute] = time.split(":").map(Number);
    const date = new Date();
    date.setHours(hour, minute + minutes, 0, 0);
    return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
  }

  function formatSeconds(seconds) {
    const safe = Math.max(0, Number(seconds) || 0);
    const minutes = Math.floor(safe / 60);
    const rest = safe % 60;
    return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
  }

  function formatNumber(value) {
    return new Intl.NumberFormat("pt-BR", {
      maximumFractionDigits: 1,
    }).format(value);
  }

  function capitalize(text) {
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  function valueOf(selector) {
    return document.querySelector(selector)?.value.trim() || "";
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function uid(prefix) {
    return `${prefix}-${Math.random().toString(36).slice(2, 9)}-${Date.now().toString(36)}`;
  }

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  function icon(name) {
    return `<i data-lucide="${name}" aria-hidden="true"></i>`;
  }

  function drawIcons() {
    if (window.lucide) window.lucide.createIcons();
  }

  function updateTimerFace() {
    const display = document.querySelector("#timer-display");
    const caption = document.querySelector("#timer-caption");
    if (display) display.textContent = formatSeconds(timer.remaining);
    if (caption) caption.textContent = timer.running ? "Sessão em andamento" : "Pronto para começar";
  }

  function updateFocusControls() {
    updateTimerFace();
    updateDurationButtons();
    updateTimerButton();
    drawIcons();
  }

  function updateDurationButtons() {
    document.querySelectorAll('[data-action="set-duration"]').forEach((button) => {
      const minutes = Number(button.dataset.minutes);
      button.classList.toggle("is-active", timer.duration === minutes * 60);
    });
  }

  function updateTimerButton() {
    const button = document.querySelector('[data-action="toggle-timer"]');
    if (!button) return;
    button.innerHTML = `${icon(timer.running ? "pause" : "play")} ${timer.running ? "Pausar" : "Iniciar"}`;
  }

  function updateSoundButtons() {
    document.querySelectorAll('[data-action="toggle-sound"]').forEach((button) => {
      const active = audio.current === button.dataset.sound && audio.playing;
      button.dataset.tip = active ? "Parar" : "Tocar";
      button.innerHTML = icon(active ? "square" : "play");
    });
    drawIcons();
  }

  function updateFocusTopicOptions(subject = getSubject(timer.subjectId)) {
    const topicSelect = document.querySelector("#focus-topic");
    if (!topicSelect) return;
    const topics = subject?.topics || [];
    if (!topics.some((topicItem) => topicItem.id === timer.topicId)) {
      timer.topicId = topics[0]?.id || "";
    }
    topicSelect.innerHTML = topics
      .map((topicItem) => `<option value="${escapeAttr(topicItem.id)}" ${topicItem.id === timer.topicId ? "selected" : ""}>${escapeHtml(topicItem.title)}</option>`)
      .join("");
  }

  function updateFocusRitualCaption() {
    const caption = document.querySelector("#focus-ritual-caption");
    if (caption) caption.textContent = `${state.exam.focusPlace} · ${state.exam.studyMode}`;
  }

  function updateFocusHistory() {
    const history = document.querySelector("#focus-history");
    if (history) history.innerHTML = renderHistoryList(4);
  }

  function resetFocusSessionFields() {
    const questions = document.querySelector("#focus-questions");
    const correct = document.querySelector("#focus-correct");
    const notes = document.querySelector("#focus-notes");
    if (questions) questions.value = "0";
    if (correct) correct.value = "0";
    if (notes) notes.value = "";
  }

  function getVolumePercent() {
    const volume = Number(state.settings.soundVolume);
    if (!Number.isFinite(volume)) return 22;
    return volume <= 1 ? clamp(Math.round(volume * 100), 0, 100) : clamp(Math.round(volume), 0, 100);
  }

  function getNativeVolume() {
    return getVolumePercent() / 100;
  }

  function getPlayerOrigin() {
    return window.location.origin && window.location.origin !== "null"
      ? window.location.origin
      : "https://study-d421f.web.app";
  }

  function setYouTubeVolume() {
    const iframe = document.querySelector("#youtube-player");
    if (!iframe?.contentWindow) return;

    const volume = getVolumePercent();
    const sendCommand = (func, args = []) => {
      iframe.contentWindow.postMessage(
        JSON.stringify({ event: "command", func, args }),
        "https://www.youtube-nocookie.com",
      );
    };

    sendCommand("setVolume", [volume]);
    sendCommand(volume === 0 ? "mute" : "unMute");
  }

  function showToast(message) {
    const toast = document.querySelector("#toast");
    if (!toast) return;
    toast.textContent = message;
    toast.classList.remove("hidden");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toast.classList.add("hidden"), 2600);
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `plano-certo-${todayISO()}.json`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    showToast("Dados exportados.");
  }

  function importData(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = normalizeState(JSON.parse(String(reader.result)));
        if (!confirm("Importar este arquivo e substituir os dados atuais?")) return;
        state = imported;
        saveState();
        render();
        showToast("Dados importados.");
      } catch (error) {
        showToast("Arquivo inválido.");
      }
    };
    reader.readAsText(file);
  }

  function resetDemo() {
    if (!confirm("Restaurar os dados de demonstração?")) return;
    stopSound();
    pauseTimer(false);
    state = createDefaultState();
    timer.subjectId = state.subjects[0]?.id || "";
    timer.topicId = state.subjects[0]?.topics[0]?.id || "";
    timer.type = "teoria";
    timer.duration = 25 * 60;
    timer.remaining = timer.duration;
    activeView = "dashboard";
    saveState();
    render();
    showToast("Demonstração restaurada.");
  }
})();
