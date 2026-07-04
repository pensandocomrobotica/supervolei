import React, { useState, useEffect, useCallback } from "react";
import { Trophy, Users, ClipboardList, Plus, ChevronRight, Waves, Check, ArrowLeft, Loader2, X, UserMinus, UserPlus, ClipboardPaste, Share2, Copy } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Configuração dos formatos                                          */
/* ------------------------------------------------------------------ */

const TYPE_CONFIG = {
  super8: {
    key: "super8",
    label: "Super 8",
    players: 8,
    courts: 2,
    rounds: 7,
    resting: 0,
    duration: "2h a 2h30",
    desc: "Modelo normal do Super 8. São sete jogos com duplas e adversários alternados a cada jogo.",
  },
  super10: {
    key: "super10",
    label: "Super 10",
    players: 10,
    courts: 2,
    rounds: 9,
    resting: 2,
    duration: "2h15 a 2h45",
    desc: "Adaptação do Super 8 para 10 jogadores. São nove jogos em 2 quadras fixas; a cada rodada, 2 jogadores revezam o descanso para manter duplas e adversários sempre alternados.",
  },
  super12: {
    key: "super12",
    label: "Super 12",
    players: 12,
    courts: 3,
    rounds: 11,
    resting: 0,
    duration: "2h30 a 3h",
    desc: "Isso aqui é loucura!! São 11 jogos com duplas e adversários alternados a cada jogo.",
  },
};

const VICTORY_OPTIONS = [
  { key: "vitoria", label: "Vitória" },
  { key: "games_favor", label: "Games a favor" },
  { key: "saldo_games", label: "Saldo de games" },
];

const TIEBREAK_OPTIONS = [
  { key: "vitoria", label: "Vitória" },
  { key: "games_favor", label: "Games a favor" },
  { key: "saldo_games", label: "Saldo de games" },
  { key: "confronto_direto", label: "Confronto Direto" },
];

/* ------------------------------------------------------------------ */
/* Utilidades                                                          */
/* ------------------------------------------------------------------ */

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function makeMatrix(n) {
  return Array.from({ length: n }, () => new Array(n).fill(0));
}

/* Gera o calendário de rodadas: rodízio de duplas e adversários */
function generateSchedule({ numPlayers, numCourts, numRounds, resting }) {
  const ids = Array.from({ length: numPlayers }, (_, i) => i);
  const partner = makeMatrix(numPlayers);
  const opponent = makeMatrix(numPlayers);
  const restCount = new Array(numPlayers).fill(0);
  const rounds = [];

  for (let r = 0; r < numRounds; r++) {
    let restingIds = [];
    let playing = ids;

    if (resting > 0) {
      const sorted = [...ids].sort((a, b) => restCount[a] - restCount[b] || Math.random() - 0.5);
      restingIds = sorted.slice(0, resting);
      restingIds.forEach((id) => (restCount[id] += 1));
      const restSet = new Set(restingIds);
      playing = ids.filter((id) => !restSet.has(id));
    }

    let bestPenalty = Infinity;
    let bestGrouping = null;

    for (let attempt = 0; attempt < 600; attempt++) {
      const shuffled = shuffle(playing);
      const groups = chunk(shuffled, 4);
      let totalPenalty = 0;
      const grouping = [];

      for (const g of groups) {
        if (g.length < 4) continue;
        const [a, b, c, d] = g;
        const options = [
          [[a, b], [c, d]],
          [[a, c], [b, d]],
          [[a, d], [b, c]],
        ];
        let bestOpt = null;
        let bestOptPenalty = Infinity;
        for (const [t1, t2] of options) {
          const p =
            partner[t1[0]][t1[1]] * 10 +
            partner[t2[0]][t2[1]] * 10 +
            opponent[t1[0]][t2[0]] +
            opponent[t1[0]][t2[1]] +
            opponent[t1[1]][t2[0]] +
            opponent[t1[1]][t2[1]];
          if (p < bestOptPenalty) {
            bestOptPenalty = p;
            bestOpt = [t1, t2];
          }
        }
        totalPenalty += bestOptPenalty;
        grouping.push(bestOpt);
      }

      if (totalPenalty < bestPenalty) {
        bestPenalty = totalPenalty;
        bestGrouping = grouping;
      }
    }

    const matches = bestGrouping.map(([t1, t2], idx) => {
      partner[t1[0]][t1[1]]++;
      partner[t1[1]][t1[0]]++;
      partner[t2[0]][t2[1]]++;
      partner[t2[1]][t2[0]]++;
      t1.forEach((x) => t2.forEach((y) => {
        opponent[x][y]++;
        opponent[y][x]++;
      }));
      return { court: idx + 1, teamA: t1, teamB: t2, scoreA: null, scoreB: null };
    });

    rounds.push({ roundNumber: r + 1, resting: restingIds, matches });
  }

  return rounds;
}

/* ------------------------------------------------------------------ */
/* Classificação                                                       */
/* ------------------------------------------------------------------ */

function computeStandings(tournament) {
  const stats = tournament.players.map((p) => ({
    id: p.id,
    name: p.name,
    wins: 0,
    played: 0,
    gf: 0,
    ga: 0,
  }));

  tournament.rounds.forEach((round) => {
    round.matches.forEach((m) => {
      if (m.scoreA == null || m.scoreB == null) return;
      const allIds = [...m.teamA, ...m.teamB];
      allIds.forEach((id) => (stats[id].played += 1));
      m.teamA.forEach((id) => {
        stats[id].gf += m.scoreA;
        stats[id].ga += m.scoreB;
      });
      m.teamB.forEach((id) => {
        stats[id].gf += m.scoreB;
        stats[id].ga += m.scoreA;
      });
      if (m.scoreA > m.scoreB) m.teamA.forEach((id) => (stats[id].wins += 1));
      else if (m.scoreB > m.scoreA) m.teamB.forEach((id) => (stats[id].wins += 1));
    });
  });

  stats.forEach((s) => (s.saldo = s.gf - s.ga));
  return stats;
}

function headToHead(tournament, idA, idB) {
  let winsA = 0;
  let winsB = 0;
  tournament.rounds.forEach((round) => {
    round.matches.forEach((m) => {
      if (m.scoreA == null || m.scoreB == null) return;
      const aInTeamA = m.teamA.includes(idA);
      const aInTeamB = m.teamB.includes(idA);
      const bInTeamA = m.teamA.includes(idB);
      const bInTeamB = m.teamB.includes(idB);
      const opponents = (aInTeamA && bInTeamB) || (aInTeamB && bInTeamA);
      if (!opponents) return;
      const aTeam = aInTeamA ? "A" : "B";
      const winner = m.scoreA > m.scoreB ? "A" : m.scoreB > m.scoreA ? "B" : null;
      if (!winner) return;
      if (winner === aTeam) winsA += 1;
      else winsB += 1;
    });
  });
  return { winsA, winsB };
}

function critValue(stat, crit) {
  if (crit === "vitoria") return stat.wins;
  if (crit === "games_favor") return stat.gf;
  if (crit === "saldo_games") return stat.saldo;
  return 0;
}

function sortStandings(stats, tournament, primary, tiebreakers) {
  const order = [primary, ...tiebreakers.filter((t) => t !== primary)];
  return [...stats].sort((a, b) => {
    for (const crit of order) {
      if (crit === "confronto_direto") {
        const { winsA, winsB } = headToHead(tournament, a.id, b.id);
        if (winsA !== winsB) return winsB - winsA;
        continue;
      }
      const va = critValue(a, crit);
      const vb = critValue(b, crit);
      if (vb !== va) return vb - va;
    }
    return 0;
  });
}

/* ------------------------------------------------------------------ */
/* Exportação em texto (WhatsApp)                                      */
/* ------------------------------------------------------------------ */

function formatMatchBlock(m, tournament) {
  const teamA = m.teamA.map((id) => tournament.players[id].name).join(" / ");
  const teamB = m.teamB.map((id) => tournament.players[id].name).join(" / ");
  const scoreLine =
    m.scoreA != null && m.scoreB != null ? `\n_Placar: ${m.scoreA} x ${m.scoreB}_` : "";
  return `🎾 *Quadra ${m.court}*\n${teamA}\n🆚\n${teamB}${scoreLine}`;
}

function buildRoundText(tournament, roundIdx) {
  const round = tournament.rounds[roundIdx];
  const lines = [];
  lines.push(`🏖️ *${tournament.name}*`);
  lines.push(`${tournament.typeLabel} · Rodada ${round.roundNumber} de ${tournament.rounds.length}`);
  lines.push("");
  round.matches.forEach((m, i) => {
    lines.push(formatMatchBlock(m, tournament));
    if (i < round.matches.length - 1) lines.push("");
  });
  if (round.resting.length > 0) {
    lines.push("");
    lines.push(`_Descansando: ${round.resting.map((id) => tournament.players[id].name).join(", ")}_`);
  }
  return lines.join("\n");
}

function buildFullScheduleText(tournament) {
  const lines = [];
  lines.push(`🏖️ *${tournament.name}*`);
  lines.push(`${tournament.typeLabel} · ${tournament.rounds.length} rodadas`);
  tournament.rounds.forEach((round) => {
    lines.push("");
    lines.push(`━━━ *Rodada ${round.roundNumber}* ━━━`);
    round.matches.forEach((m) => {
      lines.push("");
      lines.push(formatMatchBlock(m, tournament));
    });
    if (round.resting.length > 0) {
      lines.push("");
      lines.push(`_Descansando: ${round.resting.map((id) => tournament.players[id].name).join(", ")}_`);
    }
  });
  return lines.join("\n");
}

function buildStandingsText(tournament, sorted) {
  const lines = [];
  lines.push(`🏆 *${tournament.name}*`);
  lines.push(`${tournament.typeLabel} · Classificação`);
  lines.push("");
  sorted.forEach((s, i) => {
    const medal = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : `${i + 1}º`;
    lines.push(`${medal} *${s.name}* — ${s.wins}V | ${s.gf}TP | ${s.saldo >= 0 ? "+" : ""}${s.saldo}SP`);
  });
  lines.push("");
  lines.push("_J=Jogos · V=Vitórias · TP=Total de Pontos · SP=Saldo de Pontos_");
  return lines.join("\n");
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

async function loadIndex() {
  try {
    const raw = localStorage.getItem("tournament-index");
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error("loadIndex falhou:", e);
    return [];
  }
}

async function saveIndex(list) {
  try {
    localStorage.setItem("tournament-index", JSON.stringify(list));
  } catch (e) {
    console.error("saveIndex falhou:", e);
  }
}

async function saveTournament(t) {
  try {
    localStorage.setItem(`tournament:${t.id}`, JSON.stringify(t));
  } catch (e) {
    console.error("saveTournament falhou:", e);
  }
}

async function loadTournament(id) {
  try {
    const raw = localStorage.getItem(`tournament:${id}`);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    console.error("loadTournament falhou:", e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Estilos                                                             */
/* ------------------------------------------------------------------ */

const Styles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Archivo+Black&family=Inter:wght@400;500;600;700&family=DM+Mono:wght@500&display=swap');

    .tp-root { font-family:'Inter',sans-serif; background:#0E4B5A; min-height:100vh; color:#16262B; }
    .tp-shell { max-width:480px; margin:0 auto; min-height:100vh; background:#F3E7C9; display:flex; flex-direction:column; }
    .tp-topbar { background:#0E4B5A; padding:20px 20px 28px; color:#F3E7C9; position:relative; overflow:hidden; }
    .tp-topbar::after { content:''; position:absolute; bottom:0; left:0; right:0; height:14px; background:
      radial-gradient(circle at 10px 0, transparent 9px, #F3E7C9 10px) repeat-x; background-size:20px 14px; }
    .tp-eyebrow { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:.14em; text-transform:uppercase; opacity:.75; }
    .tp-title { font-family:'Archivo Black',sans-serif; font-size:30px; line-height:1.05; margin-top:6px; }
    .tp-sub { font-size:14px; opacity:.85; margin-top:6px; }
    .tp-body { flex:1; padding:20px; padding-bottom:48px; }

    .tp-back { display:inline-flex; align-items:center; gap:6px; background:none; border:none; color:#F3E7C9; font-size:14px; font-weight:600; padding:0; margin-bottom:14px; cursor:pointer; }

    .tp-card { background:#FFFFFF; border-radius:18px; padding:18px; margin-bottom:16px; box-shadow:0 2px 0 rgba(16,38,43,.06); border:1px solid rgba(16,38,43,.08); }
    .tp-card-title { font-family:'Archivo Black',sans-serif; font-size:16px; color:#0E4B5A; margin-bottom:12px; }

    .tp-menu-btn { width:100%; display:flex; align-items:center; gap:14px; background:#FFFFFF; border:2px solid #0E4B5A; border-radius:16px; padding:18px 16px; margin-bottom:14px; cursor:pointer; text-align:left; transition:transform .12s ease; }
    .tp-menu-btn:active { transform:scale(.98); }
    .tp-menu-icon { width:42px; height:42px; border-radius:12px; background:#0E4B5A; color:#F3E7C9; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
    .tp-menu-label { font-family:'Archivo Black',sans-serif; font-size:16px; color:#0E4B5A; }
    .tp-menu-desc { font-size:12.5px; color:#54666B; margin-top:2px; }

    .tp-type-card { border:2px solid #D8CBA3; background:#FFFDF6; border-radius:16px; padding:16px; margin-bottom:12px; cursor:pointer; }
    .tp-type-card.active { border-color:#E85D3F; background:#FFF3EE; }
    .tp-type-name { font-family:'Archivo Black',sans-serif; font-size:17px; color:#0E4B5A; }
    .tp-type-meta { display:flex; gap:16px; margin-top:10px; }
    .tp-type-meta-item { display:flex; flex-direction:column; align-items:center; gap:4px; font-family:'DM Mono',monospace; font-size:13px; color:#0E4B5A; }
    .tp-type-desc { font-size:13px; color:#54666B; margin-top:10px; line-height:1.45; }

    .tp-input { width:100%; border:2px solid #D8CBA3; background:#FFFDF6; border-radius:12px; padding:12px 14px; font-size:15px; color:#16262B; font-family:'Inter',sans-serif; }
    .tp-input:focus { outline:none; border-color:#0E4B5A; }
    .tp-label { font-size:12.5px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#54666B; margin-bottom:6px; display:block; }

    .tp-chip { display:inline-flex; align-items:center; gap:6px; border:2px solid #D8CBA3; background:#FFFDF6; border-radius:999px; padding:9px 16px; font-size:14px; font-weight:600; color:#0E4B5A; cursor:pointer; margin:0 8px 8px 0; }
    .tp-chip.selected { background:#0E4B5A; border-color:#0E4B5A; color:#F3E7C9; }
    .tp-chip-row { display:flex; flex-wrap:wrap; }

    .tp-tiebreak-item { display:flex; align-items:center; justify-content:space-between; background:#FFFDF6; border:1px solid #D8CBA3; border-radius:10px; padding:8px 12px; margin-bottom:8px; font-size:14px; }
    .tp-tiebreak-num { font-family:'DM Mono',monospace; color:#E85D3F; font-weight:700; margin-right:8px; }
    .tp-remove-btn { background:none; border:none; color:#54666B; cursor:pointer; }

    .tp-btn { width:100%; border:none; border-radius:14px; padding:15px; font-family:'Archivo Black',sans-serif; font-size:15px; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:8px; }
    .tp-btn-primary { background:#E85D3F; color:#FFFDF6; }
    .tp-btn-primary:disabled { background:#D8CBA3; color:#8A7F63; cursor:not-allowed; }
    .tp-btn-outline { background:transparent; border:2px solid #0E4B5A; color:#0E4B5A; }
    .tp-btn-ghost { background:#F3E7C9; color:#0E4B5A; }

    .tp-player-row { display:flex; align-items:center; gap:10px; margin-bottom:10px; }
    .tp-player-num { font-family:'DM Mono',monospace; font-size:13px; color:#8A7F63; width:20px; }

    .tp-progress-wrap { display:flex; gap:5px; margin-bottom:16px; }
    .tp-progress-dot { flex:1; height:6px; border-radius:3px; background:#D8CBA3; }
    .tp-progress-dot.done { background:#4FA89B; }
    .tp-progress-dot.current { background:#E85D3F; }

    .tp-round-tabs { display:flex; overflow-x:auto; border-bottom:2px solid #D8CBA3; margin-bottom:18px; -webkit-overflow-scrolling:touch; }
    .tp-round-tab { flex:0 0 auto; padding:10px 18px 12px; font-family:'DM Mono',monospace; font-size:17px; color:#B9AE8C; cursor:pointer; border-bottom:3px solid transparent; margin-bottom:-2px; }
    .tp-round-tab.active { color:#0E4B5A; font-weight:700; border-bottom-color:#0E4B5A; }
    .tp-round-tab.done { color:#4FA89B; }
    .tp-round-tab.active.done { color:#0E4B5A; }

    .tp-round-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:14px; }
    .tp-round-title { font-family:'Archivo Black',sans-serif; font-size:19px; color:#0E4B5A; }
    .tp-round-nav-btn { background:#0E4B5A; color:#F3E7C9; border:none; border-radius:10px; width:38px; height:38px; display:flex; align-items:center; justify-content:center; cursor:pointer; }
    .tp-round-nav-btn:disabled { opacity:.3; cursor:not-allowed; }

    .tp-resting { background:#FFF3EE; border:1px dashed #E85D3F; border-radius:12px; padding:10px 14px; font-size:13px; color:#9A3A24; margin-bottom:14px; }

    .tp-court-card { background:#FFFFFF; border-radius:16px; padding:14px; margin-bottom:14px; border:1px solid rgba(16,38,43,.1); }
    .tp-court-label { font-family:'DM Mono',monospace; font-size:11px; letter-spacing:.1em; text-transform:uppercase; color:#4FA89B; font-weight:700; margin-bottom:10px; }
    .tp-team-row { display:flex; align-items:center; justify-content:space-between; padding:6px 0; }
    .tp-team-names { font-size:14.5px; font-weight:600; color:#16262B; line-height:1.35; flex:1; }
    .tp-score-input { width:52px; text-align:center; border:2px solid #D8CBA3; border-radius:10px; padding:8px 0; font-family:'DM Mono',monospace; font-size:17px; font-weight:700; color:#0E4B5A; }
    .tp-score-input:disabled { background:#F0EAD9; color:#8A7F63; border-color:#E7DFC6; }
    .tp-vs-divider { display:flex; align-items:center; gap:8px; margin:4px 0; }
    .tp-vs-line { flex:1; border-top:1px dashed #D8CBA3; }
    .tp-vs-text { font-family:'DM Mono',monospace; font-size:11px; color:#8A7F63; }

    .tp-list-item { background:#FFFFFF; border-radius:14px; padding:14px 16px; margin-bottom:10px; border:1px solid rgba(16,38,43,.1); cursor:pointer; display:flex; align-items:center; justify-content:space-between; }
    .tp-list-name { font-weight:700; font-size:15px; color:#0E4B5A; }
    .tp-list-meta { font-size:12px; color:#54666B; margin-top:2px; }
    .tp-badge { font-family:'DM Mono',monospace; font-size:11px; padding:4px 10px; border-radius:999px; font-weight:700; }
    .tp-badge-progress { background:#FFF3EE; color:#E85D3F; }
    .tp-badge-ready { background:#FFF8E1; color:#B8860B; }
    .tp-badge-done { background:#E7F3EE; color:#2F8464; }

    .tp-modal-overlay { position:fixed; inset:0; background:rgba(16,38,43,.55); display:flex; align-items:center; justify-content:center; z-index:50; padding:24px; }
    .tp-modal-card { background:#FFFDF6; border-radius:18px; padding:24px; max-width:340px; width:100%; }
    .tp-modal-title { font-family:'Archivo Black',sans-serif; font-size:19px; color:#0E4B5A; margin-bottom:10px; }
    .tp-modal-text { font-size:14px; color:#54666B; line-height:1.5; margin-bottom:20px; }
    .tp-modal-actions { display:flex; gap:10px; }

    .tp-standings-table { width:100%; border-collapse:collapse; }
    .tp-standings-table th { font-family:'DM Mono',monospace; font-size:10.5px; text-transform:uppercase; color:#8A7F63; text-align:center; padding:8px 4px; border-bottom:2px solid #0E4B5A; }
    .tp-standings-table th:first-child, .tp-standings-table td:first-child { text-align:left; }
    .tp-standings-table td { padding:10px 4px; font-size:13.5px; text-align:center; border-bottom:1px solid #EEE2C6; }
    .tp-pos { font-family:'Archivo Black',sans-serif; color:#E85D3F; }
    .tp-pos-1 { color:#C9962C; }

    .tp-empty { text-align:center; padding:40px 20px; color:#54666B; }
    .tp-error-banner { display:flex; align-items:center; justify-content:space-between; gap:10px; background:#FDEBEB; color:#9A2F2F; border-bottom:2px solid #E85D3F; padding:12px 16px; font-size:13px; }
    .tp-error-btn { background:none; border:1px solid #9A2F2F; color:#9A2F2F; border-radius:8px; padding:5px 10px; font-size:12.5px; font-weight:700; cursor:pointer; display:flex; align-items:center; }
    .tp-legend { display:flex; flex-wrap:wrap; gap:6px 14px; font-size:12px; color:#54666B; margin:10px 2px 18px; }
    .tp-legend strong { color:#0E4B5A; font-family:'DM Mono',monospace; margin-right:3px; }
    .tp-spin { animation: tp-spin-anim 1s linear infinite; }
    @keyframes tp-spin-anim { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  `}</style>
);

/* ------------------------------------------------------------------ */
/* Componente principal                                                */
/* ------------------------------------------------------------------ */

export default function App() {
  const [screen, setScreen] = useState("home");
  const [loading, setLoading] = useState(true);
  const [index, setIndex] = useState([]);
  const [current, setCurrent] = useState(null);
  const [roundIdx, setRoundIdx] = useState(0);
  const [listMode, setListMode] = useState("tracking"); // 'tracking' | 'results'
  const [generating, setGenerating] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [exportRequest, setExportRequest] = useState(null); // { mode: 'round'|'full', roundIdx? }
  const [openError, setOpenError] = useState(null);
  const [lastOpenAttempt, setLastOpenAttempt] = useState(null);
  const cacheRef = React.useRef({});

  const [draft, setDraft] = useState({
    name: "",
    type: null,
    victoryCondition: "vitoria",
    tiebreakers: ["saldo_games", "confronto_direto"],
    playerNames: [],
  });
  const [newPlayerName, setNewPlayerName] = useState("");
  const [pasteMode, setPasteMode] = useState(false);
  const [pasteText, setPasteText] = useState("");

  useEffect(() => {
    (async () => {
      const idx = await loadIndex();
      setIndex(idx);
      setLoading(false);
    })();
  }, []);

  const goHome = () => {
    setScreen("home");
    setCurrent(null);
    setNewPlayerName("");
    setPasteMode(false);
    setPasteText("");
    setDraft({ name: "", type: null, victoryCondition: "vitoria", tiebreakers: ["saldo_games", "confronto_direto"], playerNames: [] });
  };

  const startNewTournament = () => {
    const today = new Date();
    const dstr = today.toLocaleDateString("pt-BR");
    setNewPlayerName("");
    setPasteMode(false);
    setPasteText("");
    setDraft({
      name: `Torneio de Praia - ${dstr}`,
      type: null,
      victoryCondition: "vitoria",
      tiebreakers: ["saldo_games", "confronto_direto"],
      playerNames: [],
    });
    setScreen("new-type");
  };

  const chooseType = (typeKey) => {
    setDraft((d) => ({ ...d, type: typeKey, playerNames: [] }));
  };

  const toggleTiebreak = (key) => {
    setDraft((d) => {
      if (d.tiebreakers.includes(key)) {
        return { ...d, tiebreakers: d.tiebreakers.filter((k) => k !== key) };
      }
      return { ...d, tiebreakers: [...d.tiebreakers, key] };
    });
  };

  const addPlayer = () => {
    const name = newPlayerName.trim();
    if (!name) return;
    const cfg = TYPE_CONFIG[draft.type];
    if (draft.playerNames.length >= cfg.players) return;
    setDraft((d) => ({ ...d, playerNames: [...d.playerNames, name] }));
    setNewPlayerName("");
  };

  const removePlayer = (i) => {
    setDraft((d) => ({ ...d, playerNames: d.playerNames.filter((_, idx) => idx !== i) }));
  };

  const pastePlayers = () => {
    const cfg = TYPE_CONFIG[draft.type];
    const names = pasteText
      .split(/[\n,;]+/)
      .map((n) => n.trim())
      .filter((n) => n.length > 0);
    setDraft((d) => {
      const merged = [...d.playerNames, ...names].slice(0, cfg.players);
      return { ...d, playerNames: merged };
    });
    setPasteText("");
    setPasteMode(false);
  };

  const canGenerate =
    draft.type &&
    draft.playerNames.length === TYPE_CONFIG[draft.type].players &&
    draft.playerNames.every((n) => n.trim().length > 0);

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setGenerating(true);
    const cfg = TYPE_CONFIG[draft.type];
    const players = draft.playerNames.map((name, i) => ({ id: i, name: name.trim() }));
    const rounds = generateSchedule({
      numPlayers: cfg.players,
      numCourts: cfg.courts,
      numRounds: cfg.rounds,
      resting: cfg.resting,
    });
    const tournament = {
      id: `t_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: draft.name.trim() || `Torneio ${cfg.label}`,
      type: draft.type,
      typeLabel: cfg.label,
      victoryCondition: draft.victoryCondition,
      tiebreakers: draft.tiebreakers,
      players,
      rounds,
      status: "in_progress",
      createdAt: Date.now(),
    };
    await saveTournament(tournament);
    cacheRef.current[tournament.id] = tournament;
    const newIndex = [
      { id: tournament.id, name: tournament.name, typeLabel: cfg.label, status: "in_progress", createdAt: tournament.createdAt },
      ...index,
    ];
    setIndex(newIndex);
    await saveIndex(newIndex);
    setCurrent(tournament);
    setRoundIdx(0);
    setGenerating(false);
    setScreen("tracking");
  };

  const openTournament = async (id, mode) => {
    setListMode(mode);
    setOpenError(null);
    setLastOpenAttempt({ id, mode });
    let t = cacheRef.current[id] || null;
    if (!t) {
      t = await loadTournament(id);
    }
    if (!t) {
      setOpenError("Não foi possível abrir esse torneio agora.");
      return;
    }
    cacheRef.current[id] = t;
    setOpenError(null);
    setCurrent(t);
    setRoundIdx(0);
    setScreen(mode === "results" ? "results" : "tracking");
  };

  const updateScore = useCallback(
    async (rIdx, mIdx, side, value) => {
      setCurrent((prev) => {
        if (!prev || prev.status === "closed") return prev;
        const clone = JSON.parse(JSON.stringify(prev));
        const v = value === "" ? null : Math.max(0, parseInt(value, 10) || 0);
        if (side === "A") clone.rounds[rIdx].matches[mIdx].scoreA = v;
        else clone.rounds[rIdx].matches[mIdx].scoreB = v;

        const allDone = clone.rounds.every((r) => r.matches.every((m) => m.scoreA != null && m.scoreB != null));
        clone.status = allDone ? "completed" : "in_progress";

        saveTournament(clone);
        cacheRef.current[clone.id] = clone;
        setIndex((idx) => {
          const next = idx.map((e) => (e.id === clone.id ? { ...e, status: clone.status } : e));
          saveIndex(next);
          return next;
        });
        return clone;
      });
    },
    []
  );

  const closeTournament = useCallback(async () => {
    setCurrent((prev) => {
      if (!prev) return prev;
      const clone = JSON.parse(JSON.stringify(prev));
      const stats = computeStandings(clone);
      const sorted = sortStandings(stats, clone, clone.victoryCondition, clone.tiebreakers);
      clone.status = "closed";
      clone.closedAt = Date.now();
      clone.finalStandings = sorted;
      saveTournament(clone);
      cacheRef.current[clone.id] = clone;
      setIndex((idx) => {
        const next = idx.map((e) => (e.id === clone.id ? { ...e, status: "closed", closedAt: clone.closedAt } : e));
        saveIndex(next);
        return next;
      });
      return clone;
    });
    setShowCloseConfirm(false);
  }, []);

  if (loading) {
    return (
      <div className="tp-root">
        <Styles />
        <div className="tp-shell" style={{ alignItems: "center", justifyContent: "center" }}>
          <Loader2 className="tp-spin" size={28} color="#0E4B5A" />
        </div>
      </div>
    );
  }

  return (
    <div className="tp-root">
      <Styles />
      <div className="tp-shell">
        {openError && (
          <div className="tp-error-banner">
            <span>{openError}</span>
            <div style={{ display: "flex", gap: 8 }}>
              {lastOpenAttempt && (
                <button
                  className="tp-error-btn"
                  onClick={() => openTournament(lastOpenAttempt.id, lastOpenAttempt.mode)}
                >
                  Tentar novamente
                </button>
              )}
              <button className="tp-error-btn" onClick={() => setOpenError(null)}><X size={14} /></button>
            </div>
          </div>
        )}
        {screen === "home" && (
          <HomeScreen
            index={index}
            onNew={startNewTournament}
            onTracking={() => setScreen("list-tracking")}
            onResults={() => setScreen("list-results")}
            onOpenRecent={(id) => openTournament(id, "tracking")}
          />
        )}

        {screen === "new-type" && (
          <TypeScreen draft={draft} setDraft={setDraft} chooseType={chooseType} onBack={goHome} onNext={() => setScreen("new-rules")} />
        )}

        {screen === "new-rules" && (
          <RulesScreen draft={draft} setDraft={setDraft} toggleTiebreak={toggleTiebreak} onBack={() => setScreen("new-type")} onNext={() => setScreen("new-players")} />
        )}

        {screen === "new-players" && (
          <PlayersScreen
            draft={draft}
            newPlayerName={newPlayerName}
            setNewPlayerName={setNewPlayerName}
            addPlayer={addPlayer}
            removePlayer={removePlayer}
            pasteMode={pasteMode}
            setPasteMode={setPasteMode}
            pasteText={pasteText}
            setPasteText={setPasteText}
            pastePlayers={pastePlayers}
            canGenerate={canGenerate}
            generating={generating}
            onBack={() => setScreen("new-rules")}
            onGenerate={handleGenerate}
          />
        )}

        {(screen === "list-tracking" || screen === "list-results") && (
          <ListScreen
            index={index}
            mode={screen === "list-tracking" ? "tracking" : "results"}
            onOpen={openTournament}
            onBack={goHome}
          />
        )}

        {screen === "tracking" && current && (
          <TrackingScreen
            tournament={current}
            roundIdx={roundIdx}
            setRoundIdx={setRoundIdx}
            updateScore={updateScore}
            onBack={goHome}
            onResults={() => setScreen("results")}
            onRequestClose={() => setShowCloseConfirm(true)}
            onExport={(req) => setExportRequest(req)}
          />
        )}

        {screen === "results" && current && (
          <ResultsScreen
            tournament={current}
            onBack={goHome}
            onTracking={() => setScreen("tracking")}
            onRequestClose={() => setShowCloseConfirm(true)}
            onExport={(req) => setExportRequest(req)}
          />
        )}

        {showCloseConfirm && current && (
          <ConfirmCloseModal
            tournament={current}
            onCancel={() => setShowCloseConfirm(false)}
            onConfirm={closeTournament}
          />
        )}

        {exportRequest && current && (
          <ExportModal
            tournament={current}
            request={exportRequest}
            onClose={() => setExportRequest(null)}
          />
        )}
      </div>
    </div>
  );
}

function StatusBadge({ status }) {
  if (status === "closed") return <span className="tp-badge tp-badge-done">Encerrado</span>;
  if (status === "completed") return <span className="tp-badge tp-badge-ready">Pronto p/ encerrar</span>;
  return <span className="tp-badge tp-badge-progress">Em andamento</span>;
}

/* ------------------------------------------------------------------ */
/* Tela: Home                                                          */
/* ------------------------------------------------------------------ */

function HomeScreen({ index, onNew, onTracking, onResults, onOpenRecent }) {
  return (
    <>
      <div className="tp-topbar">
        <div className="tp-eyebrow">Rei & Rainha da Areia</div>
        <div className="tp-title">Torneio de<br />Praia</div>
        <div className="tp-sub">Super 8 · Super 10 · Super 12</div>
      </div>
      <div className="tp-body">
        <button className="tp-menu-btn" onClick={onNew}>
          <div className="tp-menu-icon"><Plus size={20} /></div>
          <div>
            <div className="tp-menu-label">Novo torneio</div>
            <div className="tp-menu-desc">Configure regras, duplas e jogadores</div>
          </div>
        </button>
        <button className="tp-menu-btn" onClick={onTracking}>
          <div className="tp-menu-icon"><ClipboardList size={20} /></div>
          <div>
            <div className="tp-menu-label">Acompanhamento</div>
            <div className="tp-menu-desc">Gerencie vários torneios e lance placares</div>
          </div>
        </button>
        <button className="tp-menu-btn" onClick={onResults}>
          <div className="tp-menu-icon"><Trophy size={20} /></div>
          <div>
            <div className="tp-menu-label">Resultados</div>
            <div className="tp-menu-desc">Classificação e histórico de torneios</div>
          </div>
        </button>

        {index.length > 0 && (
          <div style={{ marginTop: 28 }}>
            <div className="tp-label">Torneios recentes</div>
            {index.slice(0, 3).map((t) => (
              <div key={t.id} className="tp-list-item" onClick={() => onOpenRecent(t.id)}>
                <div>
                  <div className="tp-list-name">{t.name}</div>
                  <div className="tp-list-meta">{t.typeLabel}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: escolha do tipo                                               */
/* ------------------------------------------------------------------ */

function TypeScreen({ draft, setDraft, chooseType, onBack, onNext }) {
  return (
    <>
      <div className="tp-topbar">
        <button className="tp-back" onClick={onBack}><ArrowLeft size={16} /> Início</button>
        <div className="tp-eyebrow">Passo 1 de 3</div>
        <div className="tp-title" style={{ fontSize: 24 }}>Novo torneio</div>
        <div className="tp-sub">Escolha o formato</div>
      </div>
      <div className="tp-body">
        <div className="tp-label">Nome do torneio</div>
        <input
          className="tp-input"
          style={{ marginBottom: 18 }}
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          placeholder="Ex: Torneio de Praia - Sábado"
        />
        {Object.values(TYPE_CONFIG).map((cfg) => (
          <div
            key={cfg.key}
            className={`tp-type-card ${draft.type === cfg.key ? "active" : ""}`}
            onClick={() => chooseType(cfg.key)}
          >
            <div className="tp-type-name">{cfg.label} Individual</div>
            <div className="tp-type-meta">
              <div className="tp-type-meta-item"><Users size={16} />{cfg.players}</div>
              <div className="tp-type-meta-item"><Waves size={16} />{cfg.courts}</div>
              <div className="tp-type-meta-item">⏱ {cfg.duration}</div>
            </div>
            <div className="tp-type-desc">{cfg.desc}</div>
          </div>
        ))}
        <div style={{ height: 8 }} />
        <button className="tp-btn tp-btn-primary" disabled={!draft.type} onClick={onNext}>
          Continuar <ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: regras (vitória / desempate)                                  */
/* ------------------------------------------------------------------ */

function RulesScreen({ draft, setDraft, toggleTiebreak, onBack, onNext }) {
  return (
    <>
      <div className="tp-topbar">
        <button className="tp-back" onClick={onBack}><ArrowLeft size={16} /> Voltar</button>
        <div className="tp-eyebrow">Passo 2 de 3</div>
        <div className="tp-title" style={{ fontSize: 24 }}>Condições de vitória</div>
        <div className="tp-sub">{TYPE_CONFIG[draft.type]?.label} · defina os critérios</div>
      </div>
      <div className="tp-body">
        <div className="tp-card">
          <div className="tp-card-title">Selecione a condição de vitória</div>
          <div className="tp-chip-row">
            {VICTORY_OPTIONS.map((o) => (
              <div
                key={o.key}
                className={`tp-chip ${draft.victoryCondition === o.key ? "selected" : ""}`}
                onClick={() => setDraft((d) => ({ ...d, victoryCondition: o.key }))}
              >
                {draft.victoryCondition === o.key && <Check size={14} />} {o.label}
              </div>
            ))}
          </div>
        </div>

        <div className="tp-card">
          <div className="tp-card-title">Selecione os desempates</div>
          <div className="tp-chip-row">
            {TIEBREAK_OPTIONS.map((o) => (
              <div
                key={o.key}
                className={`tp-chip ${draft.tiebreakers.includes(o.key) ? "selected" : ""}`}
                onClick={() => toggleTiebreak(o.key)}
              >
                {draft.tiebreakers.includes(o.key) && <Check size={14} />} {o.label}
              </div>
            ))}
          </div>

          {draft.tiebreakers.length > 0 && (
            <div style={{ marginTop: 14 }}>
              <div className="tp-label">Ordem dos desempates</div>
              {draft.tiebreakers.map((key, i) => {
                const opt = TIEBREAK_OPTIONS.find((o) => o.key === key);
                return (
                  <div key={key} className="tp-tiebreak-item">
                    <span><span className="tp-tiebreak-num">{i + 1}.</span>{opt.label}</span>
                    <button className="tp-remove-btn" onClick={() => toggleTiebreak(key)}><X size={16} /></button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button className="tp-btn tp-btn-primary" onClick={onNext}>
          Continuar <ChevronRight size={18} />
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: cadastro de jogadores                                         */
/* ------------------------------------------------------------------ */

function PlayersScreen({ draft, newPlayerName, setNewPlayerName, addPlayer, removePlayer, pasteMode, setPasteMode, pasteText, setPasteText, pastePlayers, canGenerate, generating, onBack, onGenerate }) {
  const cfg = TYPE_CONFIG[draft.type];
  const filled = draft.playerNames.length;
  const pct = Math.round((filled / cfg.players) * 100);
  const full = filled >= cfg.players;

  return (
    <>
      <div className="tp-topbar">
        <button className="tp-back" onClick={onBack}><ArrowLeft size={16} /> Voltar</button>
        <div className="tp-eyebrow">Passo 3 de 3</div>
        <div className="tp-title" style={{ fontSize: 24 }}>Jogadores</div>
        <div className="tp-sub">({filled}/{cfg.players})</div>
      </div>
      <div className="tp-body">
        <div style={{ height: 8, borderRadius: 4, background: "#D8CBA3", marginBottom: 18, overflow: "hidden" }}>
          <div style={{ height: "100%", width: `${pct}%`, background: "#0E4B5A", transition: "width .2s ease" }} />
        </div>

        {!full && (
          <>
            <div className="tp-card" style={{ display: "flex", gap: 10, alignItems: "center", padding: 12 }}>
              <input
                className="tp-input"
                placeholder={`Nome do jogador ${filled + 1}`}
                value={newPlayerName}
                onChange={(e) => setNewPlayerName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addPlayer()}
              />
              <button
                onClick={addPlayer}
                style={{ background: "#0E4B5A", color: "#F3E7C9", border: "none", borderRadius: 12, width: 46, height: 46, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <UserPlus size={20} />
              </button>
            </div>

            <button
              className="tp-btn tp-btn-ghost"
              style={{ marginBottom: 16 }}
              onClick={() => setPasteMode((v) => !v)}
            >
              <ClipboardPaste size={17} /> {pasteMode ? "Cancelar" : "Colar lista de jogadores"}
            </button>

            {pasteMode && (
              <div className="tp-card">
                <div className="tp-label">Cole os nomes (um por linha ou separados por vírgula)</div>
                <textarea
                  className="tp-input"
                  style={{ minHeight: 120, resize: "vertical", fontFamily: "'Inter',sans-serif", marginBottom: 12 }}
                  placeholder={"Thalita\nBárbara\nGabriela\n..."}
                  value={pasteText}
                  onChange={(e) => setPasteText(e.target.value)}
                />
                <button className="tp-btn tp-btn-primary" onClick={pastePlayers} disabled={!pasteText.trim()}>
                  <Check size={17} /> Adicionar à lista
                </button>
              </div>
            )}
          </>
        )}

        <div className="tp-card" style={{ padding: filled ? "6px 18px" : 0 }}>
          {draft.playerNames.map((name, i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 0", borderBottom: i < filled - 1 ? "1px solid #EEE2C6" : "none" }}>
              <span style={{ fontSize: 15, color: "#16262B" }}><span style={{ fontFamily: "'DM Mono',monospace", color: "#8A7F63", marginRight: 10 }}>{i + 1}.</span>{name}</span>
              <button
                onClick={() => removePlayer(i)}
                style={{ background: "#E85D3F", color: "#FFFDF6", border: "none", borderRadius: 10, width: 34, height: 34, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}
              >
                <UserMinus size={16} />
              </button>
            </div>
          ))}
        </div>

        <button className="tp-btn tp-btn-primary" disabled={!canGenerate || generating} onClick={onGenerate}>
          {generating ? <Loader2 size={18} className="tp-spin" /> : <Trophy size={18} />}
          {generating ? "Gerando rodadas..." : "Criar torneio"}
        </button>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: lista de torneios                                             */
/* ------------------------------------------------------------------ */

function ListScreen({ index, mode, onOpen, onBack }) {
  const active = index.filter((t) => t.status !== "closed");
  const closed = index.filter((t) => t.status === "closed");

  return (
    <>
      <div className="tp-topbar">
        <button className="tp-back" onClick={onBack}><ArrowLeft size={16} /> Início</button>
        <div className="tp-title" style={{ fontSize: 24 }}>{mode === "tracking" ? "Acompanhamento" : "Resultados"}</div>
        <div className="tp-sub">{mode === "tracking" ? "Selecione um torneio para lançar placares" : "Selecione um torneio para ver a classificação"}</div>
      </div>
      <div className="tp-body">
        {index.length === 0 && (
          <div className="tp-empty">Nenhum torneio criado ainda. Toque em "Novo torneio" na tela inicial.</div>
        )}

        {active.length > 0 && (
          <>
            <div className="tp-label">Torneios ativos</div>
            {active.map((t) => (
              <div key={t.id} className="tp-list-item" onClick={() => onOpen(t.id, mode)}>
                <div>
                  <div className="tp-list-name">{t.name}</div>
                  <div className="tp-list-meta">{t.typeLabel}</div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </>
        )}

        {closed.length > 0 && (
          <>
            <div className="tp-label" style={{ marginTop: active.length > 0 ? 20 : 0 }}>Histórico (encerrados)</div>
            {closed.map((t) => (
              <div key={t.id} className="tp-list-item" onClick={() => onOpen(t.id, "results")}>
                <div>
                  <div className="tp-list-name">{t.name}</div>
                  <div className="tp-list-meta">
                    {t.typeLabel}
                    {t.closedAt ? ` · ${new Date(t.closedAt).toLocaleDateString("pt-BR")}` : ""}
                  </div>
                </div>
                <StatusBadge status={t.status} />
              </div>
            ))}
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: acompanhamento (lançar placares)                              */
/* ------------------------------------------------------------------ */

function TrackingScreen({ tournament, roundIdx, setRoundIdx, updateScore, onBack, onResults, onRequestClose, onExport }) {
  const round = tournament.rounds[roundIdx];
  const totalRounds = tournament.rounds.length;
  const isClosed = tournament.status === "closed";

  return (
    <>
      <div className="tp-topbar">
        <button className="tp-back" onClick={onBack}><ArrowLeft size={16} /> Início</button>
        <div className="tp-eyebrow">{tournament.name}</div>
        <div className="tp-title" style={{ fontSize: 24 }}>Jogos</div>
        <div className="tp-sub"><StatusBadge status={tournament.status} /></div>
      </div>
      <div className="tp-body">
        {isClosed && (
          <div className="tp-resting" style={{ borderColor: "#4FA89B", background: "#E7F3EE", color: "#2F8464" }}>
            Este torneio está encerrado. Os placares ficam salvos apenas para consulta e não podem mais ser alterados.
          </div>
        )}

        <div className="tp-round-tabs">
          {tournament.rounds.map((r, i) => {
            const done = r.matches.every((m) => m.scoreA != null && m.scoreB != null);
            return (
              <div
                key={i}
                className={`tp-round-tab ${i === roundIdx ? "active" : ""} ${done ? "done" : ""}`}
                onClick={() => setRoundIdx(i)}
              >
                {r.roundNumber}
              </div>
            );
          })}
        </div>

        {round.resting.length > 0 && (
          <div className="tp-resting">
            Descansando nesta rodada: {round.resting.map((id) => tournament.players[id].name).join(", ")}
          </div>
        )}

        {round.matches.map((m, mIdx) => (
          <div key={mIdx} className="tp-court-card">
            <div className="tp-court-label" style={{ textAlign: "center", fontFamily: "'Archivo Black',sans-serif", fontSize: 16, color: "#0E4B5A", letterSpacing: 0 }}>Quadra {m.court}</div>
            <div className="tp-team-row">
              <div className="tp-team-names">{m.teamA.map((id) => tournament.players[id].name).join(" / ")}</div>
              <input
                className="tp-score-input"
                type="number"
                min="0"
                placeholder="?"
                disabled={isClosed}
                value={m.scoreA == null ? "" : m.scoreA}
                onChange={(e) => updateScore(roundIdx, mIdx, "A", e.target.value)}
              />
            </div>
            <div className="tp-vs-divider"><div className="tp-vs-line" /><span className="tp-vs-text">VS</span><div className="tp-vs-line" /></div>
            <div className="tp-team-row">
              <div className="tp-team-names">{m.teamB.map((id) => tournament.players[id].name).join(" / ")}</div>
              <input
                className="tp-score-input"
                type="number"
                min="0"
                placeholder="?"
                disabled={isClosed}
                value={m.scoreB == null ? "" : m.scoreB}
                onChange={(e) => updateScore(roundIdx, mIdx, "B", e.target.value)}
              />
            </div>
          </div>
        ))}

        <button className="tp-btn tp-btn-outline" onClick={onResults} style={{ marginTop: 8, marginBottom: 10 }}>
          <Trophy size={18} /> Ver classificação
        </button>
        <div style={{ display: "flex", gap: 10, marginBottom: isClosed ? 0 : 10 }}>
          <button className="tp-btn tp-btn-ghost" style={{ flex: 1 }} onClick={() => onExport({ mode: "round", roundIdx })}>
            <Share2 size={17} /> Rodada
          </button>
          <button className="tp-btn tp-btn-ghost" style={{ flex: 1 }} onClick={() => onExport({ mode: "full" })}>
            <Share2 size={17} /> Torneio
          </button>
        </div>
        {!isClosed && (
          <button className="tp-btn tp-btn-ghost" onClick={onRequestClose}>
            <Check size={18} /> Encerrar torneio
          </button>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Tela: resultados / classificação                                    */
/* ------------------------------------------------------------------ */

function ResultsScreen({ tournament, onBack, onTracking, onRequestClose, onExport }) {
  const isClosed = tournament.status === "closed";
  const sorted = isClosed && tournament.finalStandings
    ? tournament.finalStandings
    : sortStandings(computeStandings(tournament), tournament, tournament.victoryCondition, tournament.tiebreakers);

  return (
    <>
      <div className="tp-topbar">
        <button className="tp-back" onClick={onBack}><ArrowLeft size={16} /> Início</button>
        <div className="tp-eyebrow">{tournament.typeLabel}</div>
        <div className="tp-title" style={{ fontSize: 22 }}>{tournament.name}</div>
        <div className="tp-sub" style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <StatusBadge status={tournament.status} />
          {isClosed && tournament.closedAt && (
            <span>Encerrado em {new Date(tournament.closedAt).toLocaleDateString("pt-BR")}</span>
          )}
        </div>
      </div>
      <div className="tp-body">
        <div className="tp-card" style={{ padding: 8 }}>
          <table className="tp-standings-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Jogador</th>
                <th>J</th>
                <th>V</th>
                <th>TP</th>
                <th>SP</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((s, i) => (
                <tr key={s.id}>
                  <td className={`tp-pos ${i === 0 ? "tp-pos-1" : ""}`}>{i + 1}</td>
                  <td>{s.name}</td>
                  <td>{s.played}</td>
                  <td>{s.wins}</td>
                  <td>{s.gf}</td>
                  <td>{s.saldo}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tp-legend">
          <span><strong>J</strong> Jogos</span>
          <span><strong>V</strong> Vitórias</span>
          <span><strong>TP</strong> Total de Pontos</span>
          <span><strong>SP</strong> Saldo de Pontos</span>
        </div>
        <div className="tp-list-meta" style={{ marginBottom: 16 }}>
          Critérios: {VICTORY_OPTIONS.find((o) => o.key === tournament.victoryCondition)?.label} · Desempates: {tournament.tiebreakers.map((k) => TIEBREAK_OPTIONS.find((o) => o.key === k)?.label).join(" → ")}
        </div>
        <button className="tp-btn tp-btn-ghost" onClick={() => onExport({ mode: "standings" })} style={{ marginBottom: 10 }}>
          <Share2 size={18} /> Compartilhar classificação
        </button>
        {!isClosed && (
          <>
            <button className="tp-btn tp-btn-outline" onClick={onTracking} style={{ marginBottom: 10 }}>
              <ClipboardList size={18} /> Lançar placares
            </button>
            <button className="tp-btn tp-btn-ghost" onClick={onRequestClose}>
              <Check size={18} /> Encerrar torneio
            </button>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Modal: confirmação de encerramento                                  */
/* ------------------------------------------------------------------ */

function ConfirmCloseModal({ tournament, onCancel, onConfirm }) {
  const totalMatches = tournament.rounds.reduce((acc, r) => acc + r.matches.length, 0);
  const scoredMatches = tournament.rounds.reduce(
    (acc, r) => acc + r.matches.filter((m) => m.scoreA != null && m.scoreB != null).length,
    0
  );
  const incomplete = scoredMatches < totalMatches;

  return (
    <div className="tp-modal-overlay" onClick={onCancel}>
      <div className="tp-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="tp-modal-title">Encerrar torneio?</div>
        <div className="tp-modal-text">
          {incomplete
            ? `Ainda faltam ${totalMatches - scoredMatches} de ${totalMatches} jogos com placar lançado. Ao encerrar, a classificação atual será registrada como resultado final e os placares não poderão mais ser editados.`
            : "Todos os jogos já têm placar lançado. Ao encerrar, a classificação será registrada como resultado final e os placares não poderão mais ser editados."}
        </div>
        <div className="tp-modal-actions">
          <button className="tp-btn tp-btn-outline" onClick={onCancel} style={{ flex: 1 }}>Cancelar</button>
          <button className="tp-btn tp-btn-primary" onClick={onConfirm} style={{ flex: 1 }}>Encerrar</button>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal: exportar texto (WhatsApp)                                    */
/* ------------------------------------------------------------------ */

function ExportModal({ tournament, request, onClose }) {
  const [copied, setCopied] = useState(false);
  const textareaRef = React.useRef(null);

  let text = "";
  let title = "Compartilhar";
  if (request.mode === "round") {
    text = buildRoundText(tournament, request.roundIdx);
    title = `Rodada ${tournament.rounds[request.roundIdx].roundNumber}`;
  } else if (request.mode === "full") {
    text = buildFullScheduleText(tournament);
    title = "Torneio completo";
  } else if (request.mode === "standings") {
    const sorted =
      tournament.status === "closed" && tournament.finalStandings
        ? tournament.finalStandings
        : sortStandings(computeStandings(tournament), tournament, tournament.victoryCondition, tournament.tiebreakers);
    text = buildStandingsText(tournament, sorted);
    title = "Classificação";
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      try {
        const el = textareaRef.current;
        el.focus();
        el.select();
        document.execCommand("copy");
        setCopied(true);
      } catch {
        setCopied(false);
      }
    }
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="tp-modal-overlay" onClick={onClose}>
      <div className="tp-modal-card" style={{ maxWidth: 400 }} onClick={(e) => e.stopPropagation()}>
        <div className="tp-modal-title">Exportar: {title}</div>
        <div className="tp-modal-text">Copie e cole no grupo do WhatsApp.</div>
        <textarea
          ref={textareaRef}
          readOnly
          value={text}
          style={{
            width: "100%",
            minHeight: 220,
            maxHeight: 320,
            border: "2px solid #D8CBA3",
            borderRadius: 12,
            padding: 12,
            fontSize: 13.5,
            fontFamily: "'DM Mono',monospace",
            color: "#16262B",
            background: "#FFFDF6",
            marginBottom: 14,
            resize: "vertical",
          }}
        />
        <div className="tp-modal-actions">
          <button className="tp-btn tp-btn-outline" onClick={onClose} style={{ flex: 1 }}>Fechar</button>
          <button className="tp-btn tp-btn-primary" onClick={handleCopy} style={{ flex: 1 }}>
            {copied ? <Check size={17} /> : <Copy size={17} />} {copied ? "Copiado!" : "Copiar"}
          </button>
        </div>
      </div>
    </div>
  );
}
