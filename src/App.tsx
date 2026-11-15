import { type DragEvent, useEffect, useMemo, useRef, useState } from "react";
import { Chess, type Move, type Square } from "chess.js";
import {
  ArrowLeft,
  BarChart3,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Clock3,
  Flag,
  Lightbulb,
  Menu,
  RotateCcw,
  Settings,
  Sparkles,
  Swords,
  Target,
  Trophy,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

type Bot = {
  id: number;
  name: string;
  elo: string;
  depth: number;
  accuracy: number;
  description: string;
};

const BOTS: Bot[] = [
  {
    id: 0,
    name: "Beginner",
    elo: "200",
    depth: 1,
    accuracy: 0.12,
    description: "Learning the basics",
  },
  {
    id: 1,
    name: "Novice",
    elo: "700",
    depth: 1,
    accuracy: 0.42,
    description: "Spots simple tactics",
  },
  {
    id: 2,
    name: "Intermediate",
    elo: "1200",
    depth: 2,
    accuracy: 0.7,
    description: "A balanced challenge",
  },
  {
    id: 3,
    name: "Master",
    elo: "2000",
    depth: 3,
    accuracy: 0.93,
    description: "Precise and unforgiving",
  },
  { id: 4, name: "Inventor", elo: "∞", depth: 3, accuracy: 1, description: "Finds the best move" },
];

const PIECES: Record<string, string> = {
  wp: "♙",
  wn: "♘",
  wb: "♗",
  wr: "♖",
  wq: "♕",
  wk: "♔",
  bp: "♟",
  bn: "♞",
  bb: "♝",
  br: "♜",
  bq: "♛",
  bk: "♚",
};

const VALUES: Record<string, number> = { p: 100, n: 320, b: 330, r: 500, q: 900, k: 20000 };
const FILES = ["a", "b", "c", "d", "e", "f", "g", "h"];
const TIME_OPTIONS = [1, 3, 5, 10, 15];

function formatClock(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
}

type PreviousGame = {
  id: number;
  opponent: string;
  opponentElo: string;
  date: string;
  result: "Win" | "Loss" | "Draw";
  resultScore: string;
  opening: string;
  accuracy: number;
  duration: string;
  moves: string[];
  note: string;
  highlights: Record<number, { label: string; tone: string; note: string }>;
};

const PREVIOUS_GAMES: PreviousGame[] = [
  {
    id: 1,
    opponent: "Intermediate Bot",
    opponentElo: "1200",
    date: "Today, 9:42 AM",
    result: "Win",
    resultScore: "1–0",
    opening: "Italian Game",
    accuracy: 91,
    duration: "8 min",
    moves: ["e4", "e5", "Bc4", "Nc6", "Qh5", "Nf6", "Qxf7#"],
    note: "You kept the initiative and spotted a clean mating pattern.",
    highlights: {
      2: {
        label: "Strong development",
        tone: "great",
        note: "Bc4 develops with tempo and immediately targets the weak f7 square.",
      },
      4: {
        label: "Critical moment",
        tone: "warn",
        note: "Qh5 is aggressive, but bringing the queen out early can be risky against precise defense.",
      },
      6: {
        label: "Best move",
        tone: "great",
        note: "Qxf7# ends the game. You correctly combined the bishop and queen on f7.",
      },
    },
  },
  {
    id: 2,
    opponent: "Master Bot",
    opponentElo: "2000",
    date: "Yesterday, 6:18 PM",
    result: "Loss",
    resultScore: "0–1",
    opening: "Queen's Gambit Declined",
    accuracy: 74,
    duration: "19 min",
    moves: [
      "d4",
      "d5",
      "c4",
      "e6",
      "Nc3",
      "Nf6",
      "Bg5",
      "Be7",
      "e3",
      "O-O",
      "Nf3",
      "h6",
      "Bh4",
      "b6",
      "cxd5",
      "exd5",
      "Bd3",
      "Bb7",
      "O-O",
      "Nbd7",
    ],
    note: "A solid opening slipped after you released the central tension too early.",
    highlights: {
      6: {
        label: "Good move",
        tone: "great",
        note: "Bg5 creates a useful pin and increases the pressure on Black's center.",
      },
      14: {
        label: "Inaccuracy",
        tone: "warn",
        note: "cxd5 resolves the tension. Keeping more options with Rc1 would have been stronger.",
      },
      18: {
        label: "Missed chance",
        tone: "bad",
        note: "Castling is safe, but Qc2 first would have prepared a more active kingside plan.",
      },
    },
  },
  {
    id: 3,
    opponent: "Novice Bot",
    opponentElo: "700",
    date: "May 18, 3:07 PM",
    result: "Draw",
    resultScore: "½–½",
    opening: "Sicilian Defense",
    accuracy: 83,
    duration: "14 min",
    moves: [
      "e4",
      "c5",
      "Nf3",
      "d6",
      "d4",
      "cxd4",
      "Nxd4",
      "Nf6",
      "Nc3",
      "a6",
      "Be3",
      "e5",
      "Nf3",
      "Be7",
      "Bc4",
      "O-O",
      "O-O",
    ],
    note: "You developed naturally, but missed a chance to claim more space in the center.",
    highlights: {
      4: {
        label: "Theory",
        tone: "great",
        note: "d4 is the principled central break and leads to an open Sicilian position.",
      },
      10: {
        label: "Good move",
        tone: "great",
        note: "Be3 develops and supports a future queenside attack.",
      },
      12: {
        label: "Inaccuracy",
        tone: "warn",
        note: "Retreating to f3 is safe, though Nb3 kept more pressure on the center.",
      },
    },
  },
];

function evaluate(game: Chess) {
  if (game.isCheckmate()) return game.turn() === "w" ? -100000 : 100000;
  if (game.isDraw()) return 0;
  let score = 0;
  game.board().forEach((row, rank) =>
    row.forEach((piece, file) => {
      if (!piece) return;
      let value = VALUES[piece.type];
      const center = 3.5 - Math.abs(3.5 - file) + (3.5 - Math.abs(3.5 - rank));
      if (piece.type === "p") value += center * 3;
      if (piece.type === "n" || piece.type === "b") value += center * 4;
      score += piece.color === "w" ? value : -value;
    }),
  );
  return score;
}

function search(game: Chess, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || game.isGameOver()) return evaluate(game);
  const moves = game.moves();
  if (game.turn() === "w") {
    let best = -Infinity;
    for (const move of moves) {
      game.move(move);
      best = Math.max(best, search(game, depth - 1, alpha, beta));
      game.undo();
      alpha = Math.max(alpha, best);
      if (beta <= alpha) break;
    }
    return best;
  }
  let best = Infinity;
  for (const move of moves) {
    game.move(move);
    best = Math.min(best, search(game, depth - 1, alpha, beta));
    game.undo();
    beta = Math.min(beta, best);
    if (beta <= alpha) break;
  }
  return best;
}

function rankedMoves(fen: string, bot: Bot) {
  const game = new Chess(fen);
  const isWhite = game.turn() === "w";
  return game
    .moves({ verbose: true })
    .map((move) => {
      game.move(move);
      const score = search(game, bot.depth - 1, -Infinity, Infinity);
      game.undo();
      return { move, score };
    })
    .sort((a, b) => (isWhite ? b.score - a.score : a.score - b.score));
}

function chooseBotMove(fen: string, bot: Bot) {
  const ranked = rankedMoves(fen, bot);
  if (!ranked.length) return null;
  if (Math.random() < bot.accuracy) return ranked[0].move;
  const poolSize =
    bot.id === 0 ? ranked.length : Math.max(2, Math.ceil(ranked.length * (1 - bot.accuracy)));
  return ranked[Math.floor(Math.random() * Math.min(poolSize, ranked.length))].move;
}

function moveQuality(beforeFen: string, move: Move, analyst: Bot) {
  const before = new Chess(beforeFen);
  const best = rankedMoves(beforeFen, { ...analyst, depth: Math.min(analyst.depth, 2) })[0];
  before.move(move);
  const actual = evaluate(before);
  if (!best)
    return {
      label: "Book move",
      tone: "good",
      note: "A natural move that keeps the position balanced.",
    };
  const bestGame = new Chess(beforeFen);
  bestGame.move(best.move);
  const bestScore = evaluate(bestGame);
  const loss = Math.abs(bestScore - actual);
  if (best.move.san === move.san || loss < 18)
    return {
      label: "Best move",
      tone: "great",
      note: "Excellent. This was the engine’s first choice.",
    };
  if (loss < 65)
    return {
      label: "Good move",
      tone: "good",
      note: "A solid choice that keeps your position healthy.",
    };
  if (loss < 160)
    return {
      label: "Inaccuracy",
      tone: "warn",
      note: `There was a more precise idea: ${best.move.san}.`,
    };
  return {
    label: "Mistake",
    tone: "bad",
    note: `${best.move.san} was stronger and avoided losing material.`,
  };
}

function Logo() {
  return (
    <div className="brand">
      <div className="brand-mark">
        <span>♞</span>
      </div>
      <div>
        <strong>Chessalistic</strong>
        <small>PLAY · THINK · WIN</small>
      </div>
    </div>
  );
}

function ReviewBoard({ moves, ply }: { moves: string[]; ply: number }) {
  const review = useMemo(() => {
    const position = new Chess();
    moves.slice(0, ply).forEach((move) => position.move(move));
    return position;
  }, [moves, ply]);

  return (
    <div className="review-board" role="grid" aria-label="Analysis chess board">
      {review.board().flatMap((row, rank) =>
        row.map((piece, file) => {
          const square = `${FILES[file]}${8 - rank}`;
          const dark = (rank + file) % 2 === 1;
          return (
            <div
              key={square}
              role="gridcell"
              className={`review-square ${dark ? "dark" : "light"}`}
            >
              {file === 0 && <span className="rank-label">{8 - rank}</span>}
              {rank === 7 && <span className="file-label">{FILES[file]}</span>}
              {piece && (
                <span className={`piece ${piece.color === "w" ? "white-piece" : "black-piece"}`}>
                  {PIECES[piece.color + piece.type]}
                </span>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

function AnalysisPage({ onBack }: { onBack: () => void }) {
  const [selectedId, setSelectedId] = useState(PREVIOUS_GAMES[0].id);
  const selectedGame = PREVIOUS_GAMES.find((item) => item.id === selectedId) ?? PREVIOUS_GAMES[0];
  const [ply, setPly] = useState(selectedGame.moves.length);
  const activeNote = selectedGame.highlights[ply];

  const selectGame = (gameItem: PreviousGame) => {
    setSelectedId(gameItem.id);
    setPly(gameItem.moves.length);
  };

  return (
    <main className="analysis-page">
      <div className="analysis-heading">
        <div>
          <button className="back-link" onClick={onBack}>
            <ArrowLeft size={15} /> Back to game
          </button>
          <h1>Analysis</h1>
        </div>
        <div className="analysis-summary">
          <span>Last 3 games</span>
          <strong>83%</strong>
          <small>average accuracy</small>
        </div>
      </div>

      <section className="review-layout">
        <div className="games-library">
          <div className="library-head">
            <div>
              <span className="panel-label">RECENT GAMES</span>
              <strong>Previous matches</strong>
            </div>
            <span>{PREVIOUS_GAMES.length} games</span>
          </div>
          <div className="game-cards">
            {PREVIOUS_GAMES.map((gameItem) => (
              <button
                key={gameItem.id}
                className={`game-card ${selectedId === gameItem.id ? "selected-game" : ""}`}
                onClick={() => selectGame(gameItem)}
              >
                <span className={`result-stamp ${gameItem.result.toLowerCase()}`}>
                  {gameItem.resultScore}
                </span>
                <span className="game-card-copy">
                  <strong>{gameItem.opponent}</strong>
                  <small>
                    {gameItem.opening} · {gameItem.date}
                  </small>
                </span>
                <span className="game-accuracy">
                  <b>{gameItem.accuracy}%</b>
                  <small>accuracy</small>
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="review-workspace">
          <div className="review-topline">
            <div>
              <span className="panel-label">GAME REVIEW</span>
              <h2>You vs. {selectedGame.opponent}</h2>
              <p>
                {selectedGame.opening} · {selectedGame.result}
              </p>
            </div>
            <span className={`review-result ${selectedGame.result.toLowerCase()}`}>
              {selectedGame.result}
            </span>
          </div>

          <div className="review-content">
            <div className="review-board-wrap">
              <ReviewBoard moves={selectedGame.moves} ply={ply} />
              <div className="review-controls">
                <button
                  aria-label="Previous move"
                  onClick={() => setPly((value) => Math.max(0, value - 1))}
                >
                  <ChevronLeft />
                </button>
                <span>
                  {ply === 0
                    ? "Starting position"
                    : `Move ${Math.ceil(ply / 2)} · ${ply % 2 ? "White" : "Black"}`}
                </span>
                <button
                  aria-label="Next move"
                  onClick={() => setPly((value) => Math.min(selectedGame.moves.length, value + 1))}
                >
                  <ChevronRight />
                </button>
              </div>
            </div>

            <div className="review-details">
              <div className="review-stats">
                <div>
                  <Target />
                  <span>
                    <strong>{selectedGame.accuracy}%</strong>
                    Accuracy
                  </span>
                </div>
                <div>
                  <Clock3 />
                  <span>
                    <strong>{selectedGame.duration}</strong>
                    Duration
                  </span>
                </div>
                <div>
                  <Trophy />
                  <span>
                    <strong>{selectedGame.resultScore}</strong>
                    Result
                  </span>
                </div>
              </div>

              <div className="evaluation-card">
                <div className="evaluation-head">
                  <span>POSITION EVALUATION</span>
                  <strong>{ply === selectedGame.moves.length ? "Final" : "In review"}</strong>
                </div>
                <div className="evaluation-bars" aria-label="Position evaluation timeline">
                  {selectedGame.moves.map((_, index) => (
                    <button
                      key={index}
                      aria-label={`Go to move ${index + 1}`}
                      className={index < ply ? "viewed" : ""}
                      style={{ height: `${30 + ((index * 17 + selectedGame.id * 9) % 60)}%` }}
                      onClick={() => setPly(index + 1)}
                    />
                  ))}
                </div>
              </div>

              <div className={`review-insight ${activeNote?.tone ?? "neutral"}`}>
                <span>
                  <Sparkles size={14} /> {activeNote?.label ?? "Coach summary"}
                </span>
                <p>{activeNote?.note ?? selectedGame.note}</p>
              </div>

              <div className="review-moves">
                <span className="panel-label">MOVES</span>
                <div>
                  {Array.from({ length: Math.ceil(selectedGame.moves.length / 2) }).map(
                    (_, index) => (
                      <span key={index} className="review-move-row">
                        <i>{index + 1}.</i>
                        {[0, 1].map((side) => {
                          const moveIndex = index * 2 + side;
                          const move = selectedGame.moves[moveIndex];
                          return move ? (
                            <button
                              key={side}
                              className={ply === moveIndex + 1 ? "current-move" : ""}
                              onClick={() => setPly(moveIndex + 1)}
                            >
                              {move}
                            </button>
                          ) : (
                            <b key={side}>—</b>
                          );
                        })}
                      </span>
                    ),
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [page, setPage] = useState<"play" | "analysis">("play");
  const [fen, setFen] = useState(() => new Chess().fen());
  const [botId, setBotId] = useState(2);
  const [analystId, setAnalystId] = useState(2);
  const [selected, setSelected] = useState<Square | null>(null);
  const [dragging, setDragging] = useState<Square | null>(null);
  const [lastMove, setLastMove] = useState<{ from: string; to: string } | null>(null);
  const [history, setHistory] = useState<Move[]>([]);
  const [analysis, setAnalysis] = useState<{ label: string; tone: string; note: string } | null>(
    null,
  );
  const [thinking, setThinking] = useState(false);
  const [sound, setSound] = useState(true);
  const [timeMinutes, setTimeMinutes] = useState(10);
  const [whiteTime, setWhiteTime] = useState(10 * 60);
  const [blackTime, setBlackTime] = useState(10 * 60);
  const [gameStarted, setGameStarted] = useState(false);
  const [timeoutLoser, setTimeoutLoser] = useState<"w" | "b" | null>(null);
  const [showBots, setShowBots] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const botTimer = useRef<number | null>(null);
  const game = useMemo(() => new Chess(fen), [fen]);
  const bot = BOTS[botId];
  const analyst = BOTS[analystId];

  const legalTargets = useMemo(() => {
    if (!selected) return new Set<string>();
    return new Set(game.moves({ square: selected, verbose: true }).map((m) => m.to));
  }, [game, selected]);

  const playSound = () => {
    if (!sound) return;
    const AudioCtx =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 220;
    gain.gain.setValueAtTime(0.08, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.08);
  };

  const makeMove = (from: Square, to: Square) => {
    if (timeoutLoser) return;
    const next = new Chess(fen);
    const beforeFen = next.fen();
    try {
      const move = next.move({ from, to, promotion: "q" });
      setFen(next.fen());
      setHistory((h) => [...h, move]);
      setLastMove({ from, to });
      setSelected(null);
      setAnalysis(moveQuality(beforeFen, move, analyst));
      if (!gameStarted) setGameStarted(true);
      playSound();
    } catch {
      setSelected(null);
    }
  };

  const clickSquare = (square: Square) => {
    if (thinking || game.isGameOver() || timeoutLoser || game.turn() !== "w") return;
    const piece = game.get(square);
    if (selected && legalTargets.has(square)) return makeMove(selected, square);
    setSelected(piece?.color === "w" ? square : null);
  };

  const startDrag = (event: DragEvent<HTMLSpanElement>, square: Square) => {
    const piece = game.get(square);
    if (
      thinking ||
      game.isGameOver() ||
      timeoutLoser ||
      game.turn() !== "w" ||
      piece?.color !== "w"
    ) {
      event.preventDefault();
      return;
    }
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", square);
    setSelected(square);
    setDragging(square);
  };

  const dropPiece = (event: DragEvent<HTMLButtonElement>, square: Square) => {
    event.preventDefault();
    const from = event.dataTransfer.getData("text/plain") as Square;
    const isLegal = game.moves({ square: from, verbose: true }).some((move) => move.to === square);
    if (isLegal) makeMove(from, square);
    setDragging(null);
  };

  useEffect(() => {
    if (game.turn() !== "b" || game.isGameOver() || timeoutLoser) return;
    setThinking(true);
    botTimer.current = window.setTimeout(() => {
      const move = chooseBotMove(fen, bot);
      if (move) {
        const next = new Chess(fen);
        const played = next.move(move);
        setFen(next.fen());
        setHistory((h) => [...h, played]);
        setLastMove({ from: played.from, to: played.to });
        playSound();
      }
      setThinking(false);
    }, 650);
    return () => {
      if (botTimer.current) window.clearTimeout(botTimer.current);
    };
    // The bot should only react to a new position.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fen, botId, timeoutLoser]);

  useEffect(() => {
    if (!gameStarted || game.isGameOver() || timeoutLoser) return;
    const clockTimer = window.setInterval(() => {
      if (game.turn() === "w") {
        setWhiteTime((remaining) => {
          if (remaining <= 1) {
            setTimeoutLoser("w");
            return 0;
          }
          return remaining - 1;
        });
      } else {
        setBlackTime((remaining) => {
          if (remaining <= 1) {
            setTimeoutLoser("b");
            return 0;
          }
          return remaining - 1;
        });
      }
    }, 1000);
    return () => window.clearInterval(clockTimer);
  }, [game, gameStarted, timeoutLoser]);

  const reset = (minutes = timeMinutes) => {
    if (botTimer.current) window.clearTimeout(botTimer.current);
    setFen(new Chess().fen());
    setHistory([]);
    setLastMove(null);
    setSelected(null);
    setDragging(null);
    setAnalysis(null);
    setThinking(false);
    setWhiteTime(minutes * 60);
    setBlackTime(minutes * 60);
    setGameStarted(false);
    setTimeoutLoser(null);
  };

  const resign = () => {
    if (!game.isGameOver() && window.confirm("Resign this game and start a new one?")) reset();
  };

  const chooseTimeControl = (minutes: number) => {
    if (minutes === timeMinutes) return;
    if (
      history.length > 0 &&
      !window.confirm("Changing the time control will start a new game. Continue?")
    )
      return;
    setTimeMinutes(minutes);
    reset(minutes);
  };

  const board = game.board();
  const status = timeoutLoser
    ? timeoutLoser === "w"
      ? `${bot.name} wins on time`
      : "You win on time"
    : game.isCheckmate()
      ? game.turn() === "w"
        ? `${bot.name} wins`
        : "You win"
      : game.isDraw()
        ? "Drawn game"
        : game.inCheck()
          ? "Check"
          : thinking
            ? `${bot.name} is thinking…`
            : gameStarted
              ? "Your turn"
              : "Make a move to start the clock";
  const gameEnded = game.isGameOver() || Boolean(timeoutLoser);

  return (
    <div className="app-shell">
      <header>
        <button
          className="logo-button"
          onClick={() => setPage("play")}
          aria-label="Go to play page"
        >
          <Logo />
        </button>
        <nav className={mobileMenu ? "open" : ""}>
          <button
            className={page === "play" ? "active" : ""}
            onClick={() => {
              setPage("play");
              setMobileMenu(false);
            }}
          >
            <Swords size={17} /> Play
          </button>
          <button
            className={page === "analysis" ? "active" : ""}
            onClick={() => {
              setPage("analysis");
              setMobileMenu(false);
            }}
          >
            <Lightbulb size={17} /> Analysis
          </button>
          <button onClick={() => setShowBots(true)}>
            <BarChart3 size={17} /> Bots
          </button>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" aria-label="Toggle sound" onClick={() => setSound(!sound)}>
            {sound ? <Volume2 /> : <VolumeX />}
          </button>
          <button className="icon-btn" aria-label="Settings" onClick={() => setShowSettings(true)}>
            <Settings />
          </button>
          <button className="menu-btn" aria-label="Menu" onClick={() => setMobileMenu(!mobileMenu)}>
            {mobileMenu ? <X /> : <Menu />}
          </button>
        </div>
      </header>

      {page === "analysis" ? (
        <AnalysisPage onBack={() => setPage("play")} />
      ) : (
        <main>
          <section className="game-column">
            <div className="game-heading">
              <button className="new-game" onClick={() => reset()}>
                <RotateCcw size={16} /> New game
              </button>
            </div>

            <div className="player-row opponent">
              <div className="avatar bot-avatar">
                ♞<span className={thinking ? "online pulse" : "online"} />
              </div>
              <div className="player-meta">
                <strong>{bot.name} Bot</strong>
                <span>
                  {bot.elo} ELO · {thinking ? "Thinking" : "Online"}
                </span>
              </div>
              <div
                className={`clock ${gameStarted && game.turn() === "b" && !gameEnded ? "active-clock" : ""} ${blackTime <= 30 ? "low-time" : ""}`}
              >
                {formatClock(blackTime)}
              </div>
            </div>

            <div className="board-wrap">
              <div className="chessboard" role="grid" aria-label="Chess board">
                {board.flatMap((row, rank) =>
                  row.map((piece, file) => {
                    const square = `${FILES[file]}${8 - rank}` as Square;
                    const dark = (rank + file) % 2 === 1;
                    const isSelected = selected === square;
                    const target = legalTargets.has(square);
                    const recent = lastMove?.from === square || lastMove?.to === square;
                    return (
                      <button
                        key={square}
                        role="gridcell"
                        aria-label={`${square}${piece ? ` ${piece.color === "w" ? "white" : "black"} ${piece.type}` : ""}`}
                        className={`square ${dark ? "dark" : "light"} ${isSelected ? "selected" : ""} ${recent ? "recent" : ""}`}
                        onClick={() => clickSquare(square)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          event.dataTransfer.dropEffect = target ? "move" : "none";
                        }}
                        onDrop={(event) => dropPiece(event, square)}
                      >
                        {file === 0 && <span className="rank-label">{8 - rank}</span>}
                        {rank === 7 && <span className="file-label">{FILES[file]}</span>}
                        {target && <span className={piece ? "capture-target" : "move-target"} />}
                        {piece && (
                          <span
                            className={`piece ${piece.color === "w" ? "white-piece draggable-piece" : "black-piece"} ${dragging === square ? "dragging" : ""}`}
                            draggable={piece.color === "w" && game.turn() === "w" && !thinking}
                            onDragStart={(event) => startDrag(event, square)}
                            onDragEnd={() => {
                              setDragging(null);
                              setSelected(null);
                            }}
                          >
                            {PIECES[piece.color + piece.type]}
                          </span>
                        )}
                      </button>
                    );
                  }),
                )}
              </div>
              {gameEnded && (
                <div className="game-over">
                  <span>GAME OVER</span>
                  <h2>{status}</h2>
                  <button onClick={() => reset()}>Play again</button>
                </div>
              )}
            </div>

            <div className="player-row">
              <div className="avatar user-avatar">Y</div>
              <div className="player-meta">
                <strong>You</strong>
                <span>Guest player · White</span>
              </div>
              <div
                className={`clock ${gameStarted && game.turn() === "w" && !gameEnded ? "active-clock" : ""} ${whiteTime <= 30 ? "low-time" : ""}`}
              >
                {formatClock(whiteTime)}
              </div>
            </div>

            <div className="game-actions">
              <button onClick={resign}>
                <Flag size={16} /> Resign
              </button>
              <span>{status}</span>
              <button
                onClick={() =>
                  setAnalysis({
                    label: "Hint",
                    tone: "good",
                    note: rankedMoves(fen, { ...analyst, depth: Math.min(2, analyst.depth) })[0]
                      ?.move.san
                      ? `Consider ${rankedMoves(fen, { ...analyst, depth: Math.min(2, analyst.depth) })[0].move.san}. Look for the idea behind it.`
                      : "No legal moves remain.",
                  })
                }
              >
                <CircleHelp size={16} /> Hint
              </button>
            </div>
          </section>

          <aside>
            <div className="panel bot-panel">
              <div className="panel-label">YOUR OPPONENT</div>
              <button className="bot-select" onClick={() => setShowBots(!showBots)}>
                <div className="avatar bot-avatar large">♞</div>
                <div>
                  <strong>{bot.name}</strong>
                  <span>{bot.elo} ELO</span>
                </div>
                <ChevronDown size={18} />
              </button>
              {showBots && (
                <div className="bot-menu">
                  {BOTS.map((option) => (
                    <button
                      key={option.id}
                      className={option.id === botId ? "chosen" : ""}
                      onClick={() => {
                        setBotId(option.id);
                        setShowBots(false);
                        reset();
                      }}
                    >
                      <span className="level-dot">{option.id + 1}</span>
                      <span>
                        <strong>{option.name}</strong>
                        <small>{option.description}</small>
                      </span>
                      <b>{option.elo}</b>
                    </button>
                  ))}
                </div>
              )}
              <div className="difficulty">
                <span>Difficulty</span>
                <div className="level-track">
                  {BOTS.map((b) => (
                    <i key={b.id} className={b.id <= botId ? "filled" : ""} />
                  ))}
                </div>
                <strong>Level {botId + 1} of 5</strong>
              </div>
              <p className="bot-quote">
                “
                {bot.id === 4
                  ? "I see every possibility. Show me something new."
                  : bot.id > 2
                    ? "Accuracy is built one careful move at a time."
                    : "Let’s learn the board together, one move at a time."}
                ”
              </p>
            </div>

            <div className="panel coach-panel" id="coach">
              <div className="coach-head">
                <div>
                  <span className="spark">
                    <Sparkles size={16} />
                  </span>
                  <strong>Live Coach</strong>
                </div>
                <span className="live">ON</span>
              </div>
              {analysis ? (
                <div className={`analysis-card ${analysis.tone}`}>
                  <span>{analysis.label}</span>
                  <p>{analysis.note}</p>
                </div>
              ) : (
                <div className="empty-analysis">
                  <div className="mini-board">♙</div>
                  <strong>Make your first move</strong>
                  <p>Your coach will review every decision as you play.</p>
                </div>
              )}
              <label>
                Analysis strength
                <select value={analystId} onChange={(e) => setAnalystId(Number(e.target.value))}>
                  {BOTS.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} · {b.elo} ELO
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="panel moves-panel">
              <div className="panel-label">MOVE HISTORY</div>
              {history.length ? (
                <div className="move-list">
                  {Array.from({ length: Math.ceil(history.length / 2) }).map((_, i) => (
                    <div key={i}>
                      <span>{i + 1}.</span>
                      <b>{history[i * 2]?.san}</b>
                      <b>{history[i * 2 + 1]?.san || "—"}</b>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No moves yet. White to play.</p>
              )}
            </div>
          </aside>
        </main>
      )}

      {showSettings && (
        <div className="modal-backdrop" onClick={() => setShowSettings(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowSettings(false)}>
              <X />
            </button>
            <span className="eyebrow">PREFERENCES</span>
            <h2>Game settings</h2>
            <div className="time-setting">
              <div>
                <strong>Time control</strong>
                <p>The countdown starts after your first move.</p>
              </div>
              <div className="time-options">
                {TIME_OPTIONS.map((minutes) => (
                  <button
                    key={minutes}
                    className={minutes === timeMinutes ? "selected-time" : ""}
                    onClick={() => chooseTimeControl(minutes)}
                  >
                    <b>{minutes}</b>
                    <span>min</span>
                  </button>
                ))}
              </div>
            </div>
            <div className="setting-row">
              <div>
                <strong>Move sounds</strong>
                <p>Play a subtle sound after each move</p>
              </div>
              <button className={`toggle ${sound ? "on" : ""}`} onClick={() => setSound(!sound)}>
                <i />
              </button>
            </div>
            <div className="setting-row">
              <div>
                <strong>Board coordinates</strong>
                <p>Show ranks and files on the board</p>
              </div>
              <button className="toggle on">
                <i />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
