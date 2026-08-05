"use strict";

/* =========================================================
   CONFIGURAÇÃO
========================================================= */

const STORAGE_KEY = "orbit_luiz_thierry_dashboard_v1";

const STATUS_CONFIG = {
    scheduled: {
        label: "Agendada",
        color: "#7867a8"
    },

    attended: {
        label: "Compareceu",
        color: "#9b5cff"
    },

    process: {
        label: "Em processo",
        color: "#35d6e8"
    },

    closed: {
        label: "Fechada",
        color: "#3de6a3"
    },

    noshow: {
        label: "No-show",
        color: "#ff5e7a"
    },

    not_profile: {
        label: "Sem perfil",
        color: "#ff9f43"
    },

    lost: {
        label: "Perdida",
        color: "#7a7389"
    }
};

let state = loadState();

let revenueChart = null;
let statusChart = null;
let funnelChart = null;

let toastTimer = null;

/* =========================================================
   ELEMENTOS
========================================================= */

const elements = {
    liveClock: document.getElementById("liveClock"),
    currentDate: document.getElementById("currentDate"),

    sidebarMonth: document.getElementById("sidebarMonth"),
    sidebarMonthDays: document.getElementById("sidebarMonthDays"),

    goalValue: document.getElementById("goalValue"),
    revenueValue: document.getElementById("revenueValue"),
    remainingValue: document.getElementById("remainingValue"),
    goalPercentage: document.getElementById("goalPercentage"),
    progressRing: document.getElementById("progressRing"),
    goalProgressBar: document.getElementById("goalProgressBar"),
    monthProgressText: document.getElementById("monthProgressText"),
    projectionText: document.getElementById("projectionText"),
    chartProjection: document.getElementById("chartProjection"),
    paceBadge: document.getElementById("paceBadge"),

    metricCalls: document.getElementById("metricCalls"),
    metricAnswered: document.getElementById("metricAnswered"),
    metricAnswerRate: document.getElementById("metricAnswerRate"),
    answerRateBar: document.getElementById("answerRateBar"),

    metricMeetings: document.getElementById("metricMeetings"),
    metricTodayMeetings: document.getElementById("metricTodayMeetings"),

    metricShowRate: document.getElementById("metricShowRate"),
    metricShowups: document.getElementById("metricShowups"),
    showRateBar: document.getElementById("showRateBar"),

    metricNoShows: document.getElementById("metricNoShows"),
    metricNoShowRate: document.getElementById("metricNoShowRate"),

    metricNotProfile: document.getElementById("metricNotProfile"),
    metricProcess: document.getElementById("metricProcess"),
    metricDeals: document.getElementById("metricDeals"),
    averageTicket: document.getElementById("averageTicket"),

    legendScheduled: document.getElementById("legendScheduled"),
    legendProcess: document.getElementById("legendProcess"),
    legendClosed: document.getElementById("legendClosed"),
    legendNoShow: document.getElementById("legendNoShow"),
    legendNotProfile: document.getElementById("legendNotProfile"),
    legendLost: document.getElementById("legendLost"),

    conversionPill: document.getElementById("conversionPill"),
    insightsList: document.getElementById("insightsList"),

    agendaList: document.getElementById("agendaList"),
    dealsList: document.getElementById("dealsList"),
    meetingsTableBody: document.getElementById("meetingsTableBody"),

    meetingSearch: document.getElementById("meetingSearch"),
    meetingFilter: document.getElementById("meetingFilter"),

    callForm: document.getElementById("callForm"),
    callDate: document.getElementById("callDate"),
    callsMade: document.getElementById("callsMade"),
    callsAnswered: document.getElementById("callsAnswered"),

    meetingForm: document.getElementById("meetingForm"),
    meetingClient: document.getElementById("meetingClient"),
    meetingDate: document.getElementById("meetingDate"),
    meetingTime: document.getElementById("meetingTime"),
    meetingNiche: document.getElementById("meetingNiche"),
    meetingTicket: document.getElementById("meetingTicket"),
    meetingNotes: document.getElementById("meetingNotes"),

    dealForm: document.getElementById("dealForm"),
    dealClient: document.getElementById("dealClient"),
    dealAmount: document.getElementById("dealAmount"),
    dealDate: document.getElementById("dealDate"),
    dealMeeting: document.getElementById("dealMeeting"),
    dealNotes: document.getElementById("dealNotes"),

    goalForm: document.getElementById("goalForm"),
    goalAmount: document.getElementById("goalAmount"),

    exportBtn: document.getElementById("exportBtn"),
    importBtn: document.getElementById("importBtn"),
    importFile: document.getElementById("importFile"),
    resetMonthBtn: document.getElementById("resetMonthBtn"),

    mobileMenuButton: document.getElementById("mobileMenuButton"),
    sidebar: document.getElementById("sidebar"),

    toast: document.getElementById("toast"),
    toastTitle: document.getElementById("toastTitle"),
    toastMessage: document.getElementById("toastMessage"),

    confettiCanvas: document.getElementById("confettiCanvas")
};

/* =========================================================
   ESTADO
========================================================= */

function createEmptyState(period = getCurrentPeriod()) {
    return {
        version: 1,
        period,
        goal: 200000,
        callLogs: [],
        meetings: [],
        deals: [],
        activity: [],
        archives: []
    };
}

function loadState() {
    const empty = createEmptyState();

    try {
        const saved = localStorage.getItem(STORAGE_KEY);

        if (!saved) {
            return empty;
        }

        const parsed = JSON.parse(saved);

        const normalized = {
            ...empty,
            ...parsed,

            callLogs: Array.isArray(parsed.callLogs)
                ? parsed.callLogs
                : [],

            meetings: Array.isArray(parsed.meetings)
                ? parsed.meetings
                : [],

            deals: Array.isArray(parsed.deals)
                ? parsed.deals
                : [],

            activity: Array.isArray(parsed.activity)
                ? parsed.activity
                : [],

            archives: Array.isArray(parsed.archives)
                ? parsed.archives
                : []
        };

        if (normalized.period !== getCurrentPeriod()) {
            return moveToNewMonth(normalized);
        }

        return normalized;

    } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        return empty;
    }
}

function moveToNewMonth(previousState) {
    const archive = {
        period: previousState.period,
        goal: previousState.goal,
        revenue: sumDeals(previousState.deals),
        calls: sumCalls(previousState.callLogs),
        meetings: previousState.meetings.length,
        deals: previousState.deals.length,
        savedAt: new Date().toISOString()
    };

    const nextState = createEmptyState();

    nextState.goal =
        Number(previousState.goal) > 0
            ? Number(previousState.goal)
            : 200000;

    nextState.archives = [
        ...(previousState.archives || []),
        archive
    ].slice(-12);

    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(nextState)
    );

    return nextState;
}

function saveState() {
    localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(state)
    );
}

/* =========================================================
   UTILITÁRIOS
========================================================= */

function getCurrentPeriod() {
    const now = new Date();

    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0")
    ].join("-");
}

function getTodayISO() {
    const now = new Date();

    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function generateId(prefix = "item") {
    return `${prefix}_${Date.now()}_${Math.random()
        .toString(16)
        .slice(2)}`;
}

function currency(value) {
    const safeValue = Number(value) || 0;

    return safeValue.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL",
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    });
}

function percentage(value) {
    const safeValue = Number.isFinite(value)
        ? value
        : 0;

    return `${Math.round(safeValue)}%`;
}

function clamp(value, minimum, maximum) {
    return Math.min(
        Math.max(value, minimum),
        maximum
    );
}

function dateFromISO(date, time = "12:00") {
    return new Date(`${date}T${time}:00`);
}

function formatMeetingDate(date, time) {
    const parsed = dateFromISO(date, time);

    return parsed.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "short"
    }).replace(".", "");
}

function formatLongDate(date) {
    return date.toLocaleDateString("pt-BR", {
        weekday: "long",
        day: "numeric",
        month: "long"
    });
}

function formatMonth(date) {
    const formatted = date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });

    return formatted.charAt(0).toUpperCase() +
        formatted.slice(1);
}

function sumCalls(logs = state.callLogs) {
    return logs.reduce(
        (total, item) => total + Number(item.total || 0),
        0
    );
}

function sumAnsweredCalls(logs = state.callLogs) {
    return logs.reduce(
        (total, item) => total + Number(item.answered || 0),
        0
    );
}

function sumDeals(deals = state.deals) {
    return deals.reduce(
        (total, deal) => total + Number(deal.amount || 0),
        0
    );
}

function countMeetingsByStatus(status) {
    return state.meetings.filter(
        meeting => meeting.status === status
    ).length;
}

function getShowups() {
    const showStatuses = [
        "attended",
        "process",
        "closed",
        "not_profile",
        "lost"
    ];

    return state.meetings.filter(
        meeting => showStatuses.includes(meeting.status)
    ).length;
}

function getQualifiedMeetings() {
    const qualifiedStatuses = [
        "process",
        "closed",
        "lost"
    ];

    return state.meetings.filter(
        meeting => qualifiedStatuses.includes(meeting.status)
    ).length;
}

function getDaysInCurrentMonth() {
    const now = new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth() + 1,
        0
    ).getDate();
}

function getMonthProgress() {
    const now = new Date();
    const totalDays = getDaysInCurrentMonth();

    return {
        currentDay: now.getDate(),
        totalDays,
        percentage:
            (now.getDate() / totalDays) * 100,
        remainingDays:
            Math.max(totalDays - now.getDate(), 0)
    };
}

function addActivity(type, description) {
    state.activity.unshift({
        id: generateId("activity"),
        type,
        description,
        createdAt: new Date().toISOString()
    });

    state.activity = state.activity.slice(0, 100);
}

function escapeHTML(value) {
    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

/* =========================================================
   RELÓGIO
========================================================= */

function updateClock() {
    const now = new Date();

    elements.liveClock.textContent =
        now.toLocaleTimeString("pt-BR");

    elements.currentDate.textContent =
        formatLongDate(now);

    elements.sidebarMonth.textContent =
        formatMonth(now);

    const monthProgress = getMonthProgress();

    elements.sidebarMonthDays.textContent =
        `${monthProgress.remainingDays} dias restantes`;
}

/* =========================================================
   ANIMAÇÃO DE NÚMEROS
========================================================= */

function animateNumber(
    element,
    finalValue,
    formatter = value => String(Math.round(value))
) {
    if (!element) {
        return;
    }

    const previousValue =
        Number(element.dataset.rawValue || 0);

    const targetValue =
        Number(finalValue || 0);

    const duration = 650;
    const startTime = performance.now();

    element.classList.remove("value-flash");
    void element.offsetWidth;
    element.classList.add("value-flash");

    function frame(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = clamp(elapsed / duration, 0, 1);

        const eased =
            1 - Math.pow(1 - progress, 3);

        const currentValue =
            previousValue +
            (targetValue - previousValue) * eased;

        element.textContent =
            formatter(currentValue);

        if (progress < 1) {
            requestAnimationFrame(frame);
        } else {
            element.textContent =
                formatter(targetValue);

            element.dataset.rawValue =
                String(targetValue);
        }
    }

    requestAnimationFrame(frame);
}

/* =========================================================
   CÁLCULOS
========================================================= */

function calculateMetrics() {
    const calls = sumCalls();
    const answered = sumAnsweredCalls();

    const meetings = state.meetings.length;

    const showups = getShowups();
    const noShows = countMeetingsByStatus("noshow");
    const notProfile = countMeetingsByStatus("not_profile");
    const process = countMeetingsByStatus("process");

    const deals = state.deals.length;
    const revenue = sumDeals();

    const answerRate =
        calls > 0
            ? (answered / calls) * 100
            : 0;

    const showRate =
        meetings > 0
            ? (showups / meetings) * 100
            : 0;

    const noShowRate =
        meetings > 0
            ? (noShows / meetings) * 100
            : 0;

    const qualified = getQualifiedMeetings();

    const closeRate =
        qualified > 0
            ? (deals / qualified) * 100
            : 0;

    const averageTicket =
        deals > 0
            ? revenue / deals
            : 0;

    const goalPercentage =
        state.goal > 0
            ? (revenue / state.goal) * 100
            : 0;

    const today = getTodayISO();

    const todayMeetings = state.meetings.filter(
        meeting => meeting.date === today
    ).length;

    const month = getMonthProgress();

    const expectedRevenue =
        state.goal * (month.currentDay / month.totalDays);

    const projectedRevenue =
        month.currentDay > 0
            ? (revenue / month.currentDay) * month.totalDays
            : 0;

    return {
        calls,
        answered,
        meetings,
        showups,
        noShows,
        notProfile,
        process,
        deals,
        revenue,
        answerRate,
        showRate,
        noShowRate,
        closeRate,
        qualified,
        averageTicket,
        goalPercentage,
        todayMeetings,
        expectedRevenue,
        projectedRevenue,
        month
    };
}

/* =========================================================
   RENDERIZAÇÃO GERAL
========================================================= */

function renderAll() {
    const metrics = calculateMetrics();

    renderGoal(metrics);
    renderMetrics(metrics);
    renderMeetingOptions();
    renderAgenda();
    renderDeals();
    renderMeetingsTable();
    renderInsights(metrics);
    renderCharts(metrics);

    saveState();
}

function renderGoal(metrics) {
    animateNumber(
        elements.goalValue,
        state.goal,
        currency
    );

    animateNumber(
        elements.revenueValue,
        metrics.revenue,
        currency
    );

    animateNumber(
        elements.remainingValue,
        Math.max(state.goal - metrics.revenue, 0),
        currency
    );

    animateNumber(
        elements.goalPercentage,
        Math.min(metrics.goalPercentage, 999),
        value => percentage(value)
    );

    const progress =
        clamp(metrics.goalPercentage, 0, 100);

    elements.progressRing.style.setProperty(
        "--progress",
        `${progress * 3.6}deg`
    );

    elements.goalProgressBar.style.width =
        `${progress}%`;

    elements.monthProgressText.textContent =
        `${Math.round(metrics.month.percentage)}% do mês concluído`;

    elements.projectionText.textContent =
        `Projeção: ${currency(metrics.projectedRevenue)}`;

    elements.chartProjection.textContent =
        currency(metrics.projectedRevenue);

    renderPaceBadge(metrics);
}

function renderPaceBadge(metrics) {
    const difference =
        metrics.revenue - metrics.expectedRevenue;

    elements.paceBadge.className = "pace-badge";

    if (metrics.revenue === 0) {
        elements.paceBadge.classList.add("neutral");

        elements.paceBadge.innerHTML = `
            <i class="fa-solid fa-minus"></i>
            Aguardando resultados
        `;

        return;
    }

    if (difference >= state.goal * 0.05) {
        elements.paceBadge.classList.add("positive");

        elements.paceBadge.innerHTML = `
            <i class="fa-solid fa-arrow-trend-up"></i>
            ${currency(Math.abs(difference))} acima do ritmo
        `;

        return;
    }

    if (difference >= 0) {
        elements.paceBadge.classList.add("positive");

        elements.paceBadge.innerHTML = `
            <i class="fa-solid fa-check"></i>
            Meta no ritmo esperado
        `;

        return;
    }

    if (Math.abs(difference) <= state.goal * 0.08) {
        elements.paceBadge.classList.add("warning");

        elements.paceBadge.innerHTML = `
            <i class="fa-solid fa-bolt"></i>
            ${currency(Math.abs(difference))} abaixo do ritmo
        `;

        return;
    }

    elements.paceBadge.classList.add("negative");

    elements.paceBadge.innerHTML = `
        <i class="fa-solid fa-arrow-trend-down"></i>
        ${currency(Math.abs(difference))} abaixo do ritmo
    `;
}

function renderMetrics(metrics) {
    animateNumber(
        elements.metricCalls,
        metrics.calls
    );

    animateNumber(
        elements.metricAnswered,
        metrics.answered
    );

    animateNumber(
        elements.metricAnswerRate,
        metrics.answerRate,
        percentage
    );

    elements.answerRateBar.style.width =
        `${clamp(metrics.answerRate, 0, 100)}%`;

    animateNumber(
        elements.metricMeetings,
        metrics.meetings
    );

    animateNumber(
        elements.metricTodayMeetings,
        metrics.todayMeetings
    );

    animateNumber(
        elements.metricShowRate,
        metrics.showRate,
        percentage
    );

    animateNumber(
        elements.metricShowups,
        metrics.showups
    );

    elements.showRateBar.style.width =
        `${clamp(metrics.showRate, 0, 100)}%`;

    animateNumber(
        elements.metricNoShows,
        metrics.noShows
    );

    animateNumber(
        elements.metricNoShowRate,
        metrics.noShowRate,
        percentage
    );

    animateNumber(
        elements.metricNotProfile,
        metrics.notProfile
    );

    animateNumber(
        elements.metricProcess,
        metrics.process
    );

    animateNumber(
        elements.metricDeals,
        metrics.deals
    );

    animateNumber(
        elements.averageTicket,
        metrics.averageTicket,
        currency
    );

    animateNumber(
        elements.legendScheduled,
        countMeetingsByStatus("scheduled")
    );

    animateNumber(
        elements.legendProcess,
        countMeetingsByStatus("process")
    );

    animateNumber(
        elements.legendClosed,
        countMeetingsByStatus("closed")
    );

    animateNumber(
        elements.legendNoShow,
        countMeetingsByStatus("noshow")
    );

    animateNumber(
        elements.legendNotProfile,
        countMeetingsByStatus("not_profile")
    );

    animateNumber(
        elements.legendLost,
        countMeetingsByStatus("lost")
    );

    elements.conversionPill.textContent =
        `${percentage(metrics.closeRate)} de conversão`;
}

/* =========================================================
   AGENDA
========================================================= */

function renderAgenda() {
    const now = new Date();

    const upcoming = [...state.meetings]
        .filter(meeting => {
            const meetingDate =
                dateFromISO(meeting.date, meeting.time);

            return (
                meetingDate >= new Date(now.getTime() - 3600000) &&
                meeting.status === "scheduled"
            );
        })
        .sort((a, b) => {
            return (
                dateFromISO(a.date, a.time) -
                dateFromISO(b.date, b.time)
            );
        })
        .slice(0, 5);

    if (upcoming.length === 0) {
        elements.agendaList.innerHTML = `
            <div class="empty-state">
                Nenhuma reunião futura cadastrada.<br>
                Quando Luiz marcar uma call, ela aparecerá aqui.
            </div>
        `;

        return;
    }

    elements.agendaList.innerHTML =
        upcoming.map(meeting => {
            const isToday =
                meeting.date === getTodayISO();

            const dateLabel =
                isToday
                    ? "Hoje"
                    : formatMeetingDate(
                        meeting.date,
                        meeting.time
                    );

            return `
                <div class="agenda-item">

                    <div class="agenda-time">
                        ${escapeHTML(meeting.time)}
                    </div>

                    <div class="agenda-info">
                        <strong>
                            ${escapeHTML(meeting.client)}
                        </strong>

                        <span>
                            ${escapeHTML(meeting.niche)} •
                            ${dateLabel}
                        </span>
                    </div>

                    <span class="agenda-status">
                        Agendada
                    </span>

                </div>
            `;
        }).join("");
}

/* =========================================================
   FECHAMENTOS
========================================================= */

function renderDeals() {
    const sortedDeals = [...state.deals]
        .sort((a, b) => {
            return new Date(b.date) - new Date(a.date);
        })
        .slice(0, 6);

    if (sortedDeals.length === 0) {
        elements.dealsList.innerHTML = `
            <div class="empty-state">
                Nenhum fechamento registrado neste mês.<br>
                Quando Thierry fechar, registre o valor real aqui.
            </div>
        `;

        return;
    }

    elements.dealsList.innerHTML =
        sortedDeals.map(deal => {
            const formattedDate =
                new Date(`${deal.date}T12:00:00`)
                    .toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "short"
                    })
                    .replace(".", "");

            return `
                <div class="deal-item">

                    <div class="modal-icon gold">
                        <i class="fa-solid fa-trophy"></i>
                    </div>

                    <div class="deal-info">
                        <strong>
                            ${escapeHTML(deal.client)}
                        </strong>

                        <span>
                            Fechado por Thierry
                        </span>
                    </div>

                    <div class="deal-value">
                        <strong>
                            ${currency(deal.amount)}
                        </strong>

                        <span>
                            ${formattedDate}
                        </span>
                    </div>

                    <button
                        class="deal-delete"
                        data-action="delete-deal"
                        data-id="${deal.id}"
                        title="Excluir fechamento"
                    >
                        <i class="fa-solid fa-trash"></i>
                    </button>

                </div>
            `;
        }).join("");
}

/* =========================================================
   REUNIÕES
========================================================= */

function renderMeetingOptions() {
    const currentValue =
        elements.dealMeeting.value;

    const selectableMeetings =
        state.meetings.filter(meeting => {
            return meeting.status !== "closed";
        });

    elements.dealMeeting.innerHTML = `
        <option value="">
            Fechamento sem reunião cadastrada
        </option>

        ${selectableMeetings.map(meeting => `
            <option value="${meeting.id}">
                ${escapeHTML(meeting.client)} •
                ${formatMeetingDate(meeting.date, meeting.time)}
            </option>
        `).join("")}
    `;

    if (
        currentValue &&
        selectableMeetings.some(
            meeting => meeting.id === currentValue
        )
    ) {
        elements.dealMeeting.value = currentValue;
    }
}

function renderMeetingsTable() {
    const search =
        elements.meetingSearch.value
            .trim()
            .toLowerCase();

    const filter =
        elements.meetingFilter.value;

    const filtered = [...state.meetings]
        .filter(meeting => {
            const matchesSearch =
                !search ||
                meeting.client
                    .toLowerCase()
                    .includes(search) ||
                meeting.niche
                    .toLowerCase()
                    .includes(search);

            const matchesStatus =
                filter === "all" ||
                meeting.status === filter;

            return matchesSearch && matchesStatus;
        })
        .sort((a, b) => {
            return (
                dateFromISO(b.date, b.time) -
                dateFromISO(a.date, a.time)
            );
        });

    if (filtered.length === 0) {
        elements.meetingsTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="table-empty">
                    Nenhuma reunião encontrada.
                </td>
            </tr>
        `;

        return;
    }

    elements.meetingsTableBody.innerHTML =
        filtered.map(meeting => {
            const ticket =
                Number(meeting.ticket) > 0
                    ? currency(meeting.ticket)
                    : "Não informado";

            const statusOptions =
                Object.entries(STATUS_CONFIG)
                    .map(([value, config]) => `
                        <option
                            value="${value}"
                            ${meeting.status === value
                                ? "selected"
                                : ""}
                        >
                            ${config.label}
                        </option>
                    `)
                    .join("");

            return `
                <tr>

                    <td>
                        <div class="table-client">
                            <strong>
                                ${escapeHTML(meeting.client)}
                            </strong>

                            <span>
                                Marcada por Luiz
                            </span>
                        </div>
                    </td>

                    <td>
                        ${formatMeetingDate(
                            meeting.date,
                            meeting.time
                        )}

                        • ${escapeHTML(meeting.time)}
                    </td>

                    <td>
                        ${escapeHTML(meeting.niche)}
                    </td>

                    <td class="ticket-value">
                        ${ticket}
                    </td>

                    <td>
                        <select
                            class="meeting-status-select"
                            data-meeting-id="${meeting.id}"
                            style="
                                border-color:
                                ${STATUS_CONFIG[meeting.status].color}38;
                            "
                        >
                            ${statusOptions}
                        </select>
                    </td>

                    <td>
                        <div class="table-actions">

                            <button
                                class="table-action"
                                data-action="close-meeting"
                                data-id="${meeting.id}"
                                title="Registrar fechamento"
                            >
                                <i class="fa-solid fa-trophy"></i>
                            </button>

                            <button
                                class="table-action delete"
                                data-action="delete-meeting"
                                data-id="${meeting.id}"
                                title="Excluir reunião"
                            >
                                <i class="fa-solid fa-trash"></i>
                            </button>

                        </div>
                    </td>

                </tr>
            `;
        }).join("");
}

/* =========================================================
   INSIGHTS
========================================================= */

function renderInsights(metrics) {
    const insights = [];

    if (
        metrics.calls === 0 &&
        metrics.meetings === 0 &&
        metrics.deals === 0
    ) {
        insights.push({
            type: "neutral",
            icon: "fa-rocket",
            title: "Comece registrando o movimento",
            text:
                "Adicione as ligações, reuniões e fechamentos do mês para o painel gerar uma leitura real da operação."
        });
    }

    if (metrics.calls > 0) {
        if (metrics.answerRate < 25) {
            insights.push({
                type: "warning",
                icon: "fa-phone-slash",
                title: "Poucas ligações estão sendo atendidas",
                text:
                    `A taxa de atendimento está em ${percentage(metrics.answerRate)}. Testar outros horários e reforçar o primeiro contato pode melhorar o volume de conversas.`
            });
        } else {
            insights.push({
                type: "positive",
                icon: "fa-phone-volume",
                title: "Contato inicial saudável",
                text:
                    `${percentage(metrics.answerRate)} das ligações estão sendo atendidas. Preserve o ritmo e acompanhe quantas conversas viram reunião.`
            });
        }
    }

    if (metrics.meetings >= 3) {
        if (metrics.noShowRate > 25) {
            insights.push({
                type: "danger",
                icon: "fa-user-clock",
                title: "No-show acima do ideal",
                text:
                    `${percentage(metrics.noShowRate)} das reuniões não aconteceram. Luiz precisa aumentar o compromisso do lead e reforçar a confirmação antes da call.`
            });
        } else {
            insights.push({
                type: "positive",
                icon: "fa-calendar-check",
                title: "Comparecimento controlado",
                text:
                    `A taxa de comparecimento está em ${percentage(metrics.showRate)}. O processo de confirmação está sustentando a agenda.`
            });
        }
    }

    if (metrics.showups >= 3) {
        const profileRate =
            (
                (metrics.showups - metrics.notProfile) /
                metrics.showups
            ) * 100;

        if (profileRate < 60) {
            insights.push({
                type: "warning",
                icon: "fa-filter-circle-xmark",
                title: "Qualificação precisa apertar",
                text:
                    `${metrics.notProfile} leads compareceram sem perfil. Revise faturamento, estoque, urgência e capacidade de investimento antes de marcar a call.`
            });
        } else {
            insights.push({
                type: "positive",
                icon: "fa-filter",
                title: "Boa qualidade de qualificação",
                text:
                    `${percentage(profileRate)} dos leads que compareceram passaram pelo filtro de perfil. Isso protege a agenda do closer.`
            });
        }
    }

    if (metrics.qualified > 0) {
        if (metrics.closeRate < 20) {
            insights.push({
                type: "warning",
                icon: "fa-chart-line",
                title: "Conversão do closer pode subir",
                text:
                    `A conversão dos leads qualificados está em ${percentage(metrics.closeRate)}. Vale revisar objeções, proposta e acompanhamento dos processos abertos.`
            });
        } else {
            insights.push({
                type: "positive",
                icon: "fa-handshake",
                title: "Conversão comercial consistente",
                text:
                    `${percentage(metrics.closeRate)} dos leads qualificados viraram contrato. Luiz e Thierry estão conectando bem as duas etapas.`
            });
        }
    }

    if (metrics.revenue > 0) {
        if (
            metrics.projectedRevenue >= state.goal
        ) {
            insights.push({
                type: "positive",
                icon: "fa-bolt",
                title: "Projeção acima da meta",
                text:
                    `Mantendo o ritmo atual, a projeção é de ${currency(metrics.projectedRevenue)} no fechamento do mês.`
            });
        } else {
            const gap =
                state.goal - metrics.projectedRevenue;

            insights.push({
                type: "neutral",
                icon: "fa-bullseye",
                title: "Ritmo necessário para os 200K",
                text:
                    `A projeção atual está ${currency(Math.max(gap, 0))} abaixo da meta. Os próximos processos precisam ganhar velocidade.`
            });
        }
    }

    elements.insightsList.innerHTML =
        insights.slice(0, 4).map(insight => `
            <div class="insight-item ${insight.type}">

                <div class="insight-item-icon">
                    <i class="fa-solid ${insight.icon}"></i>
                </div>

                <div>
                    <strong>
                        ${insight.title}
                    </strong>

                    <p>
                        ${insight.text}
                    </p>
                </div>

            </div>
        `).join("");
}

/* =========================================================
   GRÁFICOS
========================================================= */

function renderCharts(metrics) {
    renderRevenueChart();
    renderStatusChart();
    renderFunnelChart(metrics);
}

function getRevenueSeries() {
    const totalDays =
        getDaysInCurrentMonth();

    const dailyRevenue =
        new Array(totalDays).fill(0);

    state.deals.forEach(deal => {
        const day =
            Number(deal.date.split("-")[2]);

        if (day >= 1 && day <= totalDays) {
            dailyRevenue[day - 1] +=
                Number(deal.amount || 0);
        }
    });

    let accumulated = 0;

    const cumulativeRevenue =
        dailyRevenue.map(value => {
            accumulated += value;
            return accumulated;
        });

    return {
        labels: Array.from(
            { length: totalDays },
            (_, index) => String(index + 1)
        ),

        values: cumulativeRevenue
    };
}

function renderRevenueChart() {
    const canvas =
        document.getElementById("revenueChart");

    const context =
        canvas.getContext("2d");

    const series =
        getRevenueSeries();

    const gradient =
        context.createLinearGradient(
            0,
            0,
            0,
            300
        );

    gradient.addColorStop(
        0,
        "rgba(155, 92, 255, 0.34)"
    );

    gradient.addColorStop(
        1,
        "rgba(155, 92, 255, 0)"
    );

    if (!revenueChart) {
        revenueChart = new Chart(context, {
            type: "line",

            data: {
                labels: series.labels,

                datasets: [{
                    label: "Receita acumulada",
                    data: series.values,

                    borderColor: "#a66cff",
                    backgroundColor: gradient,

                    borderWidth: 2.5,
                    fill: true,

                    tension: 0.42,
                    pointRadius: 0,
                    pointHoverRadius: 5,
                    pointHoverBackgroundColor: "#ffffff",
                    pointHoverBorderColor: "#9b5cff",
                    pointHoverBorderWidth: 3
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,

                interaction: {
                    intersect: false,
                    mode: "index"
                },

                animation: {
                    duration: 850,
                    easing: "easeOutQuart"
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor:
                            "rgba(12, 8, 25, 0.96)",

                        borderColor:
                            "rgba(155, 92, 255, 0.28)",

                        borderWidth: 1,
                        padding: 12,

                        titleColor: "#a9a2b6",
                        bodyColor: "#ffffff",

                        callbacks: {
                            title(items) {
                                return `Dia ${items[0].label}`;
                            },

                            label(item) {
                                return currency(item.raw);
                            }
                        }
                    }
                },

                scales: {
                    x: {
                        border: {
                            display: false
                        },

                        grid: {
                            display: false
                        },

                        ticks: {
                            color: "#635c72",
                            font: {
                                size: 8
                            },

                            maxTicksLimit: 11
                        }
                    },

                    y: {
                        beginAtZero: true,

                        border: {
                            display: false
                        },

                        grid: {
                            color:
                                "rgba(255,255,255,0.045)"
                        },

                        ticks: {
                            color: "#635c72",

                            font: {
                                size: 8
                            },

                            callback(value) {
                                if (value >= 1000) {
                                    return `R$ ${Math.round(
                                        value / 1000
                                    )}k`;
                                }

                                return `R$ ${value}`;
                            }
                        }
                    }
                }
            }
        });

        return;
    }

    revenueChart.data.labels =
        series.labels;

    revenueChart.data.datasets[0].data =
        series.values;

    revenueChart.update();
}

function renderStatusChart() {
    const context =
        document
            .getElementById("statusChart")
            .getContext("2d");

    const values = [
        countMeetingsByStatus("scheduled"),
        countMeetingsByStatus("process"),
        countMeetingsByStatus("closed"),
        countMeetingsByStatus("noshow"),
        countMeetingsByStatus("not_profile"),
        countMeetingsByStatus("lost")
    ];

    const chartValues =
        values.some(value => value > 0)
            ? values
            : [1, 0, 0, 0, 0, 0];

    if (!statusChart) {
        statusChart = new Chart(context, {
            type: "doughnut",

            data: {
                labels: [
                    "Agendadas",
                    "Em processo",
                    "Fechadas",
                    "No-show",
                    "Sem perfil",
                    "Perdidas"
                ],

                datasets: [{
                    data: chartValues,

                    backgroundColor: [
                        "#7867a8",
                        "#35d6e8",
                        "#3de6a3",
                        "#ff5e7a",
                        "#ff9f43",
                        "#5d566a"
                    ],

                    borderColor: "#100a20",
                    borderWidth: 4,
                    hoverOffset: 6
                }]
            },

            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: "72%",

                animation: {
                    duration: 750
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor:
                            "rgba(12, 8, 25, 0.96)",

                        borderColor:
                            "rgba(155, 92, 255, 0.25)",

                        borderWidth: 1,
                        padding: 10
                    }
                }
            }
        });

        return;
    }

    statusChart.data.datasets[0].data =
        chartValues;

    statusChart.update();
}

function renderFunnelChart(metrics) {
    const context =
        document
            .getElementById("funnelChart")
            .getContext("2d");

    const values = [
        metrics.calls,
        metrics.answered,
        metrics.meetings,
        metrics.showups,
        metrics.qualified,
        metrics.deals
    ];

    if (!funnelChart) {
        funnelChart = new Chart(context, {
            type: "bar",

            data: {
                labels: [
                    "Ligações",
                    "Atendidas",
                    "Reuniões",
                    "Compareceram",
                    "Qualificadas",
                    "Fechadas"
                ],

                datasets: [{
                    data: values,

                    backgroundColor: [
                        "rgba(155,92,255,.34)",
                        "rgba(135,88,255,.43)",
                        "rgba(108,88,255,.52)",
                        "rgba(72,130,255,.58)",
                        "rgba(53,214,232,.62)",
                        "rgba(61,230,163,.72)"
                    ],

                    borderColor: [
                        "#9b5cff",
                        "#8b58ff",
                        "#6c58ff",
                        "#4882ff",
                        "#35d6e8",
                        "#3de6a3"
                    ],

                    borderWidth: 1,
                    borderRadius: 10,
                    borderSkipped: false
                }]
            },

            options: {
                indexAxis: "y",
                responsive: true,
                maintainAspectRatio: false,

                animation: {
                    duration: 850,
                    easing: "easeOutQuart"
                },

                plugins: {
                    legend: {
                        display: false
                    },

                    tooltip: {
                        backgroundColor:
                            "rgba(12, 8, 25, 0.96)",

                        borderColor:
                            "rgba(155, 92, 255, 0.25)",

                        borderWidth: 1,
                        padding: 10
                    }
                },

                scales: {
                    x: {
                        beginAtZero: true,

                        border: {
                            display: false
                        },

                        grid: {
                            color:
                                "rgba(255,255,255,0.04)"
                        },

                        ticks: {
                            color: "#635c72",
                            precision: 0,
                            font: {
                                size: 8
                            }
                        }
                    },

                    y: {
                        border: {
                            display: false
                        },

                        grid: {
                            display: false
                        },

                        ticks: {
                            color: "#a9a2b6",
                            font: {
                                size: 9,
                                weight: "600"
                            }
                        }
                    }
                }
            }
        });

        return;
    }

    funnelChart.data.datasets[0].data =
        values;

    funnelChart.update();
}

/* =========================================================
   MODAIS
========================================================= */

function openModal(modalId) {
    const modal =
        document.getElementById(modalId);

    if (!modal) {
        return;
    }

    if (modalId === "goalModal") {
        elements.goalAmount.value =
            state.goal;
    }

    if (modalId === "callModal") {
        elements.callDate.value =
            getTodayISO();
    }

    if (modalId === "meetingModal") {
        elements.meetingDate.value =
            getTodayISO();

        if (!elements.meetingTime.value) {
            elements.meetingTime.value =
                "10:00";
        }
    }

    if (modalId === "dealModal") {
        elements.dealDate.value =
            getTodayISO();

        renderMeetingOptions();
    }

    modal.classList.add("open");
    modal.setAttribute("aria-hidden", "false");

    document.body.style.overflow = "hidden";

    const focusable =
        modal.querySelector(
            "input, select, textarea, button"
        );

    setTimeout(() => {
        focusable?.focus();
    }, 120);
}

function closeModal(modal) {
    if (!modal) {
        return;
    }

    modal.classList.remove("open");
    modal.setAttribute("aria-hidden", "true");

    document.body.style.overflow = "";
}

/* =========================================================
   TOAST
========================================================= */

function showToast(
    title,
    message,
    type = "success"
) {
    clearTimeout(toastTimer);

    elements.toast.classList.remove(
        "show",
        "error"
    );

    if (type === "error") {
        elements.toast.classList.add("error");
        elements.toast.querySelector("i").className =
            "fa-solid fa-triangle-exclamation";
    } else {
        elements.toast.querySelector("i").className =
            "fa-solid fa-check";
    }

    elements.toastTitle.textContent = title;
    elements.toastMessage.textContent = message;

    requestAnimationFrame(() => {
        elements.toast.classList.add("show");
    });

    toastTimer = setTimeout(() => {
        elements.toast.classList.remove("show");
    }, 3500);
}

/* =========================================================
   CONFETE
========================================================= */

function launchConfetti() {
    const canvas = elements.confettiCanvas;
    const context = canvas.getContext("2d");

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const colors = [
        "#9b5cff",
        "#c69cff",
        "#4f8cff",
        "#35d6e8",
        "#3de6a3",
        "#ffc857",
        "#ffffff"
    ];

    const particles = Array.from(
        { length: 160 },
        () => ({
            x:
                window.innerWidth * 0.5 +
                (Math.random() - 0.5) * 220,

            y:
                window.innerHeight * 0.26,

            size:
                Math.random() * 7 + 4,

            speedX:
                (Math.random() - 0.5) * 12,

            speedY:
                Math.random() * -10 - 4,

            gravity:
                Math.random() * 0.18 + 0.12,

            rotation:
                Math.random() * Math.PI,

            rotationSpeed:
                (Math.random() - 0.5) * 0.3,

            color:
                colors[
                    Math.floor(
                        Math.random() * colors.length
                    )
                ],

            opacity: 1
        })
    );

    let frame = 0;

    function animate() {
        context.clearRect(
            0,
            0,
            canvas.width,
            canvas.height
        );

        particles.forEach(particle => {
            particle.speedY += particle.gravity;
            particle.x += particle.speedX;
            particle.y += particle.speedY;
            particle.rotation += particle.rotationSpeed;

            if (frame > 70) {
                particle.opacity -= 0.014;
            }

            context.save();

            context.globalAlpha =
                Math.max(particle.opacity, 0);

            context.translate(
                particle.x,
                particle.y
            );

            context.rotate(particle.rotation);

            context.fillStyle =
                particle.color;

            context.fillRect(
                -particle.size / 2,
                -particle.size / 3,
                particle.size,
                particle.size * 0.65
            );

            context.restore();
        });

        frame += 1;

        if (
            frame < 150 &&
            particles.some(
                particle => particle.opacity > 0
            )
        ) {
            requestAnimationFrame(animate);
        } else {
            context.clearRect(
                0,
                0,
                canvas.width,
                canvas.height
            );
        }
    }

    requestAnimationFrame(animate);
}

/* =========================================================
   FORMULÁRIOS
========================================================= */

elements.callForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const total =
            Number(elements.callsMade.value);

        const answered =
            Number(elements.callsAnswered.value);

        if (
            !Number.isFinite(total) ||
            total <= 0
        ) {
            showToast(
                "Valor inválido",
                "Informe a quantidade de ligações realizadas.",
                "error"
            );

            return;
        }

        if (
            !Number.isFinite(answered) ||
            answered < 0 ||
            answered > total
        ) {
            showToast(
                "Atendidas inválidas",
                "A quantidade atendida não pode superar o total de ligações.",
                "error"
            );

            return;
        }

        state.callLogs.push({
            id: generateId("call"),
            date: elements.callDate.value,
            total,
            answered,
            createdAt: new Date().toISOString()
        });

        addActivity(
            "calls",
            `${total} ligações registradas por Luiz`
        );

        elements.callForm.reset();

        closeModal(
            document.getElementById("callModal")
        );

        renderAll();

        showToast(
            "Ligações registradas",
            `${total} ligações adicionadas ao mês.`
        );
    }
);

elements.meetingForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const client =
            elements.meetingClient.value.trim();

        const niche =
            elements.meetingNiche.value.trim();

        if (!client || !niche) {
            showToast(
                "Campos incompletos",
                "Informe o cliente e o nicho.",
                "error"
            );

            return;
        }

        state.meetings.push({
            id: generateId("meeting"),
            client,
            date: elements.meetingDate.value,
            time: elements.meetingTime.value,
            niche,
            ticket:
                Number(elements.meetingTicket.value) || 0,
            notes:
                elements.meetingNotes.value.trim(),
            status: "scheduled",
            createdAt: new Date().toISOString()
        });

        addActivity(
            "meeting",
            `Reunião com ${client} marcada por Luiz`
        );

        elements.meetingForm.reset();

        closeModal(
            document.getElementById("meetingModal")
        );

        renderAll();

        showToast(
            "Reunião agendada",
            `${client} entrou na agenda de Thierry.`
        );
    }
);

elements.dealForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const client =
            elements.dealClient.value.trim();

        const amount =
            Number(elements.dealAmount.value);

        const meetingId =
            elements.dealMeeting.value || null;

        if (
            !client ||
            !Number.isFinite(amount) ||
            amount <= 0
        ) {
            showToast(
                "Fechamento inválido",
                "Informe o cliente e o valor real vendido.",
                "error"
            );

            return;
        }

        const deal = {
            id: generateId("deal"),
            client,
            amount,
            date: elements.dealDate.value,
            meetingId,
            notes:
                elements.dealNotes.value.trim(),
            createdAt: new Date().toISOString()
        };

        state.deals.push(deal);

        if (meetingId) {
            const meeting =
                state.meetings.find(
                    item => item.id === meetingId
                );

            if (meeting) {
                meeting.status = "closed";
            }
        }

        addActivity(
            "deal",
            `${client} fechou ${currency(amount)}`
        );

        elements.dealForm.reset();

        closeModal(
            document.getElementById("dealModal")
        );

        renderAll();
        launchConfetti();

        showToast(
            "Fechamento confirmado",
            `${currency(amount)} adicionados à meta mensal.`
        );
    }
);

elements.goalForm.addEventListener(
    "submit",
    event => {
        event.preventDefault();

        const goal =
            Number(elements.goalAmount.value);

        if (
            !Number.isFinite(goal) ||
            goal <= 0
        ) {
            showToast(
                "Meta inválida",
                "Informe uma meta maior que zero.",
                "error"
            );

            return;
        }

        state.goal = goal;

        addActivity(
            "goal",
            `Meta atualizada para ${currency(goal)}`
        );

        closeModal(
            document.getElementById("goalModal")
        );

        renderAll();

        showToast(
            "Meta atualizada",
            `O objetivo mensal agora é ${currency(goal)}.`
        );
    }
);

/* =========================================================
   EVENTOS GERAIS
========================================================= */

document.addEventListener(
    "click",
    event => {
        const openButton =
            event.target.closest("[data-open-modal]");

        if (openButton) {
            openModal(
                openButton.dataset.openModal
            );

            return;
        }

        const closeButton =
            event.target.closest("[data-close-modal]");

        if (closeButton) {
            closeModal(
                closeButton.closest(".modal")
            );

            return;
        }

        const actionButton =
            event.target.closest("[data-action]");

        if (!actionButton) {
            return;
        }

        const action =
            actionButton.dataset.action;

        const id =
            actionButton.dataset.id;

        if (action === "delete-meeting") {
            deleteMeeting(id);
        }

        if (action === "close-meeting") {
            prepareDealFromMeeting(id);
        }

        if (action === "delete-deal") {
            deleteDeal(id);
        }
    }
);

document.addEventListener(
    "keydown",
    event => {
        if (event.key !== "Escape") {
            return;
        }

        document
            .querySelectorAll(".modal.open")
            .forEach(closeModal);

        elements.sidebar.classList.remove("open");
    }
);

document.addEventListener(
    "change",
    event => {
        const statusSelect =
            event.target.closest(
                ".meeting-status-select"
            );

        if (!statusSelect) {
            return;
        }

        const meetingId =
            statusSelect.dataset.meetingId;

        const newStatus =
            statusSelect.value;

        const meeting =
            state.meetings.find(
                item => item.id === meetingId
            );

        if (!meeting) {
            return;
        }

        if (newStatus === "closed") {
            statusSelect.value =
                meeting.status;

            prepareDealFromMeeting(meetingId);
            return;
        }

        meeting.status = newStatus;

        addActivity(
            "status",
            `${meeting.client}: ${STATUS_CONFIG[newStatus].label}`
        );

        renderAll();

        showToast(
            "Status atualizado",
            `${meeting.client}: ${STATUS_CONFIG[newStatus].label}.`
        );
    }
);

elements.meetingSearch.addEventListener(
    "input",
    renderMeetingsTable
);

elements.meetingFilter.addEventListener(
    "change",
    renderMeetingsTable
);

elements.dealMeeting.addEventListener(
    "change",
    () => {
        const meeting =
            state.meetings.find(
                item =>
                    item.id ===
                    elements.dealMeeting.value
            );

        if (meeting) {
            elements.dealClient.value =
                meeting.client;

            if (
                Number(meeting.ticket) > 0 &&
                !elements.dealAmount.value
            ) {
                elements.dealAmount.value =
                    meeting.ticket;
            }
        }
    }
);

/* =========================================================
   AÇÕES DE REUNIÕES E FECHAMENTOS
========================================================= */

function prepareDealFromMeeting(meetingId) {
    const meeting =
        state.meetings.find(
            item => item.id === meetingId
        );

    if (!meeting) {
        return;
    }

    openModal("dealModal");

    setTimeout(() => {
        elements.dealMeeting.value =
            meeting.id;

        elements.dealClient.value =
            meeting.client;

        if (Number(meeting.ticket) > 0) {
            elements.dealAmount.value =
                meeting.ticket;
        }
    }, 80);
}

function deleteMeeting(meetingId) {
    const meeting =
        state.meetings.find(
            item => item.id === meetingId
        );

    if (!meeting) {
        return;
    }

    const confirmed = window.confirm(
        `Excluir a reunião de ${meeting.client}?`
    );

    if (!confirmed) {
        return;
    }

    state.meetings =
        state.meetings.filter(
            item => item.id !== meetingId
        );

    addActivity(
        "delete",
        `Reunião de ${meeting.client} removida`
    );

    renderAll();

    showToast(
        "Reunião excluída",
        `${meeting.client} foi removido da agenda.`
    );
}

function deleteDeal(dealId) {
    const deal =
        state.deals.find(
            item => item.id === dealId
        );

    if (!deal) {
        return;
    }

    const confirmed = window.confirm(
        `Excluir o fechamento de ${deal.client} no valor de ${currency(deal.amount)}?`
    );

    if (!confirmed) {
        return;
    }

    state.deals =
        state.deals.filter(
            item => item.id !== dealId
        );

    if (deal.meetingId) {
        const meeting =
            state.meetings.find(
                item => item.id === deal.meetingId
            );

        if (meeting) {
            meeting.status = "process";
        }
    }

    addActivity(
        "delete",
        `Fechamento de ${deal.client} removido`
    );

    renderAll();

    showToast(
        "Fechamento removido",
        `${currency(deal.amount)} foram retirados da meta.`
    );
}

/* =========================================================
   EXPORTAR E IMPORTAR
========================================================= */

elements.exportBtn.addEventListener(
    "click",
    () => {
        const fileContent =
            JSON.stringify(state, null, 2);

        const blob =
            new Blob(
                [fileContent],
                { type: "application/json" }
            );

        const url =
            URL.createObjectURL(blob);

        const link =
            document.createElement("a");

        link.href = url;
        link.download =
            `value-luis-thierry-${state.period}.json`;

        document.body.appendChild(link);
        link.click();
        link.remove();

        URL.revokeObjectURL(url);

        showToast(
            "Dados exportados",
            "O arquivo de segurança foi criado."
        );
    }
);

elements.importBtn.addEventListener(
    "click",
    () => {
        elements.importFile.click();
    }
);

elements.importFile.addEventListener(
    "change",
    async event => {
        const file =
            event.target.files?.[0];

        if (!file) {
            return;
        }

        try {
            const text =
                await file.text();

            const imported =
                JSON.parse(text);

            if (
                !imported ||
                !Array.isArray(imported.meetings) ||
                !Array.isArray(imported.deals) ||
                !Array.isArray(imported.callLogs)
            ) {
                throw new Error(
                    "Estrutura de arquivo inválida."
                );
            }

            const confirmed = window.confirm(
                "Importar este arquivo substituirá os dados atuais. Continuar?"
            );

            if (!confirmed) {
                return;
            }

            state = {
                ...createEmptyState(),
                ...imported,

                period:
                    imported.period ||
                    getCurrentPeriod(),

                goal:
                    Number(imported.goal) > 0
                        ? Number(imported.goal)
                        : 200000,

                callLogs:
                    imported.callLogs,

                meetings:
                    imported.meetings,

                deals:
                    imported.deals,

                activity:
                    Array.isArray(imported.activity)
                        ? imported.activity
                        : [],

                archives:
                    Array.isArray(imported.archives)
                        ? imported.archives
                        : []
            };

            if (
                state.period !== getCurrentPeriod()
            ) {
                state.period =
                    getCurrentPeriod();
            }

            renderAll();

            showToast(
                "Dados importados",
                "O painel foi atualizado com o arquivo."
            );

        } catch (error) {
            console.error(error);

            showToast(
                "Arquivo inválido",
                "Não foi possível importar esse arquivo.",
                "error"
            );
        } finally {
            elements.importFile.value = "";
        }
    }
);

/* =========================================================
   REINICIAR MÊS
========================================================= */

elements.resetMonthBtn.addEventListener(
    "click",
    () => {
        const confirmed = window.confirm(
            "Isso apagará ligações, reuniões e fechamentos do mês atual. Deseja continuar?"
        );

        if (!confirmed) {
            return;
        }

        const secondConfirmation =
            window.confirm(
                "Última confirmação: reiniciar completamente o painel deste mês?"
            );

        if (!secondConfirmation) {
            return;
        }

        const previousArchives =
            state.archives || [];

        const currentGoal =
            state.goal;

        state =
            createEmptyState();

        state.goal =
            currentGoal;

        state.archives =
            previousArchives;

        renderAll();

        showToast(
            "Mês reiniciado",
            "O painel atual voltou para zero."
        );
    }
);

/* =========================================================
   MENU E NAVEGAÇÃO
========================================================= */

elements.mobileMenuButton.addEventListener(
    "click",
    () => {
        elements.sidebar.classList.toggle("open");
    }
);

document
    .querySelectorAll(".nav-link")
    .forEach(link => {
        link.addEventListener("click", () => {
            document
                .querySelectorAll(".nav-link")
                .forEach(item => {
                    item.classList.remove("active");
                });

            link.classList.add("active");
            elements.sidebar.classList.remove("open");
        });
    });

/* =========================================================
   INICIALIZAÇÃO
========================================================= */

function initialize() {
    const today =
        getTodayISO();

    elements.callDate.value = today;
    elements.meetingDate.value = today;
    elements.meetingTime.value = "10:00";
    elements.dealDate.value = today;

    updateClock();
    setInterval(updateClock, 1000);

    renderAll();

    window.addEventListener(
        "resize",
        () => {
            elements.confettiCanvas.width =
                window.innerWidth;

            elements.confettiCanvas.height =
                window.innerHeight;
        }
    );
}

initialize();