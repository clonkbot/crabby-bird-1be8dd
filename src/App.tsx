import { useState, useEffect, useCallback, useRef } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../convex/_generated/api";

// Game constants
const GRAVITY = 0.4;
const JUMP_FORCE = -8;
const PIPE_SPEED = 3;
const PIPE_GAP = 150;
const PIPE_WIDTH = 60;
const CRAB_SIZE = 40;

interface Pipe {
  x: number;
  topHeight: number;
  passed: boolean;
}

function App() {
  const [username, setUsername] = useState<string | null>(() => {
    return localStorage.getItem("crabby_username");
  });
  const [inputUsername, setInputUsername] = useState("");
  const [gameState, setGameState] = useState<"menu" | "playing" | "gameover">("menu");
  const [score, setScore] = useState(0);
  const [crabY, setCrabY] = useState(250);
  const [crabVelocity, setCrabVelocity] = useState(0);
  const [pipes, setPipes] = useState<Pipe[]>([]);
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const gameLoopRef = useRef<number>();
  const canvasRef = useRef<HTMLDivElement>(null);

  const createPlayer = useMutation(api.players.createPlayer);
  const updateHighScore = useMutation(api.players.updateHighScore);
  const player = useQuery(api.players.getCurrentPlayer, username ? { username } : "skip");
  const leaderboard = useQuery(api.players.getLeaderboard);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (inputUsername.trim().length < 2) return;

    await createPlayer({ username: inputUsername.trim() });
    localStorage.setItem("crabby_username", inputUsername.trim());
    setUsername(inputUsername.trim());
  };

  const handleLogout = () => {
    localStorage.removeItem("crabby_username");
    setUsername(null);
    setGameState("menu");
  };

  const startGame = useCallback(() => {
    setGameState("playing");
    setScore(0);
    setCrabY(250);
    setCrabVelocity(0);
    setPipes([{ x: 400, topHeight: Math.random() * 200 + 100, passed: false }]);
  }, []);

  const jump = useCallback(() => {
    if (gameState === "playing") {
      setCrabVelocity(JUMP_FORCE);
    }
  }, [gameState]);

  const endGame = useCallback(async () => {
    setGameState("gameover");
    if (username && score > 0) {
      await updateHighScore({ username, score, coralsPassed: score });
    }
  }, [username, score, updateHighScore]);

  // Game loop
  useEffect(() => {
    if (gameState !== "playing") return;

    const gameLoop = () => {
      setCrabY((y) => {
        const newY = y + crabVelocity;
        if (newY < 0 || newY > 460) {
          endGame();
          return y;
        }
        return newY;
      });

      setCrabVelocity((v) => v + GRAVITY);

      setPipes((currentPipes) => {
        const newPipes = currentPipes
          .map((pipe) => ({
            ...pipe,
            x: pipe.x - PIPE_SPEED,
          }))
          .filter((pipe) => pipe.x > -PIPE_WIDTH);

        // Add new pipe
        if (newPipes.length === 0 || newPipes[newPipes.length - 1].x < 200) {
          newPipes.push({
            x: 400,
            topHeight: Math.random() * 200 + 100,
            passed: false,
          });
        }

        // Check collisions and scoring
        newPipes.forEach((pipe) => {
          const crabLeft = 50;
          const crabRight = crabLeft + CRAB_SIZE;
          const crabTop = crabY;
          const crabBottom = crabY + CRAB_SIZE;

          const pipeLeft = pipe.x;
          const pipeRight = pipe.x + PIPE_WIDTH;

          if (crabRight > pipeLeft && crabLeft < pipeRight) {
            if (crabTop < pipe.topHeight || crabBottom > pipe.topHeight + PIPE_GAP) {
              endGame();
            }
          }

          if (!pipe.passed && pipe.x + PIPE_WIDTH < crabLeft) {
            pipe.passed = true;
            setScore((s) => s + 1);
          }
        });

        return newPipes;
      });

      gameLoopRef.current = requestAnimationFrame(gameLoop);
    };

    gameLoopRef.current = requestAnimationFrame(gameLoop);

    return () => {
      if (gameLoopRef.current) {
        cancelAnimationFrame(gameLoopRef.current);
      }
    };
  }, [gameState, crabVelocity, crabY, endGame]);

  // Touch/click handler
  useEffect(() => {
    const handleInteraction = (e: TouchEvent | MouseEvent) => {
      e.preventDefault();
      if (gameState === "playing") {
        jump();
      } else if (gameState === "gameover") {
        startGame();
      }
    };

    const canvas = canvasRef.current;
    if (canvas) {
      canvas.addEventListener("touchstart", handleInteraction as EventListener);
      canvas.addEventListener("mousedown", handleInteraction as EventListener);
    }

    return () => {
      if (canvas) {
        canvas.removeEventListener("touchstart", handleInteraction as EventListener);
        canvas.removeEventListener("mousedown", handleInteraction as EventListener);
      }
    };
  }, [gameState, jump, startGame]);

  // Registration screen
  if (!username) {
    return (
      <div className="app-container">
        <div className="bubbles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="bubble" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
              width: `${10 + Math.random() * 20}px`,
              height: `${10 + Math.random() * 20}px`,
            }} />
          ))}
        </div>

        <div className="auth-card">
          <div className="crab-icon">🦀</div>
          <h1 className="title">Crabby Bird</h1>
          <p className="subtitle">Swim through the coral reef!</p>

          <form onSubmit={handleRegister} className="auth-form">
            <input
              type="text"
              value={inputUsername}
              onChange={(e) => setInputUsername(e.target.value)}
              placeholder="Choose a username"
              className="input-field"
              minLength={2}
              maxLength={20}
              required
            />
            <button type="submit" className="btn-primary">
              Dive In
            </button>
          </form>
        </div>

        <footer className="footer">
          Requested by @AiWithMike · Built by @clonkbot
        </footer>
      </div>
    );
  }

  // Leaderboard modal
  if (showLeaderboard) {
    return (
      <div className="app-container">
        <div className="bubbles">
          {[...Array(15)].map((_, i) => (
            <div key={i} className="bubble" style={{
              left: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${4 + Math.random() * 4}s`,
              width: `${10 + Math.random() * 20}px`,
              height: `${10 + Math.random() * 20}px`,
            }} />
          ))}
        </div>

        <div className="leaderboard-card">
          <h2 className="leaderboard-title">🏆 Top Swimmers</h2>
          <div className="leaderboard-list">
            {leaderboard?.map((p: { _id: string; username: string; highScore: number }, i: number) => (
              <div key={p._id} className={`leaderboard-item ${p.username === username ? 'current-player' : ''}`}>
                <span className="rank">#{i + 1}</span>
                <span className="player-name">{p.username}</span>
                <span className="player-score">{p.highScore}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setShowLeaderboard(false)} className="btn-secondary">
            Back
          </button>
        </div>

        <footer className="footer">
          Requested by @AiWithMike · Built by @clonkbot
        </footer>
      </div>
    );
  }

  // Main game
  return (
    <div className="app-container">
      <div className="bubbles">
        {[...Array(15)].map((_, i) => (
          <div key={i} className="bubble" style={{
            left: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${4 + Math.random() * 4}s`,
            width: `${10 + Math.random() * 20}px`,
            height: `${10 + Math.random() * 20}px`,
          }} />
        ))}
      </div>

      {gameState === "menu" && (
        <div className="menu-card">
          <div className="crab-icon animated">🦀</div>
          <h1 className="title">Crabby Bird</h1>
          <p className="welcome-text">Welcome, <span className="username">{username}</span>!</p>

          {player && (
            <div className="stats-row">
              <div className="stat">
                <span className="stat-label">High Score</span>
                <span className="stat-value">{player.highScore}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Games</span>
                <span className="stat-value">{player.gamesPlayed}</span>
              </div>
            </div>
          )}

          <button onClick={startGame} className="btn-primary">
            Start Swimming
          </button>
          <button onClick={() => setShowLeaderboard(true)} className="btn-secondary">
            Leaderboard
          </button>
          <button onClick={handleLogout} className="btn-logout">
            Switch Player
          </button>
        </div>
      )}

      {(gameState === "playing" || gameState === "gameover") && (
        <div className="game-wrapper">
          <div className="score-display">{score}</div>

          <div ref={canvasRef} className="game-canvas">
            {/* Coral decorations */}
            <div className="coral-bottom" />

            {/* Crab */}
            <div
              className={`crab ${gameState === "gameover" ? "dead" : ""}`}
              style={{
                top: `${crabY}px`,
                transform: `rotate(${Math.min(crabVelocity * 3, 45)}deg)`,
              }}
            >
              🦀
            </div>

            {/* Pipes (coral pillars) */}
            {pipes.map((pipe, i) => (
              <div key={i}>
                <div
                  className="pipe pipe-top"
                  style={{
                    left: `${pipe.x}px`,
                    height: `${pipe.topHeight}px`,
                  }}
                />
                <div
                  className="pipe pipe-bottom"
                  style={{
                    left: `${pipe.x}px`,
                    top: `${pipe.topHeight + PIPE_GAP}px`,
                    height: `${500 - pipe.topHeight - PIPE_GAP}px`,
                  }}
                />
              </div>
            ))}

            {/* Game over overlay */}
            {gameState === "gameover" && (
              <div className="gameover-overlay">
                <div className="gameover-card">
                  <h2>Game Over!</h2>
                  <p className="final-score">Score: {score}</p>
                  {player && score > player.highScore && (
                    <p className="new-record">🎉 New Record!</p>
                  )}
                  <p className="tap-text">Tap to play again</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="footer">
        Requested by @AiWithMike · Built by @clonkbot
      </footer>
    </div>
  );
}

export default App;
