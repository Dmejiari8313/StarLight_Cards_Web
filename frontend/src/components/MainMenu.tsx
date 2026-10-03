
import { useState } from "react";
import { useGameStore } from "../store/gameStore";
import { useWebSocketStore } from "../store/wsStore";

function MainMenu() {
  const { playerId, setGameMode } = useGameStore();
  const send = useWebSocketStore((state) => state.send);
  const [playerName, setPlayerName] = useState("");
  const [player2Name, setPlayer2Name] = useState("");

  const handleJoinOnline = () => {
    setGameMode("online");

    send({
      type: "join",
      playerId,
      data: { name: playerName.trim() || "Jugador" },
    });
  };

  const handleLocal = () => {
    window.localStorage.setItem("localPlayer1Name", playerName || "Jugador 1");
    window.localStorage.setItem("localPlayer2Name", player2Name || "Jugador 2");
    setGameMode("local");
  };

  const handleAI = () => {
    window.localStorage.setItem("localPlayer1Name", playerName || "Jugador 1");
    window.localStorage.setItem("localPlayer2Name", "IA");
    setGameMode("ai");
  };

  return (
    <div className="flex items-center justify-center h-full">
      <div className="card p-8 max-w-md w-full">
        <h1 className="text-4xl font-bold text-center mb-2 bg-gradient-to-r from-indigo-400 to-purple-400 bg-clip-text text-transparent">
          StarLight Cards
        </h1>
        <p className="text-center text-slate-400 mb-6">Juego de Cartas 1v1</p>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Nombre Jugador 1"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none"
          />

          <input
            type="text"
            placeholder="Nombre Jugador 2 (local)"
            value={player2Name}
            onChange={(e) => setPlayer2Name(e.target.value)}
            className="w-full px-4 py-2 bg-slate-800 text-white border border-slate-600 rounded-lg focus:border-indigo-500 focus:outline-none"
          />

          <button onClick={handleJoinOnline} className="btn w-full">
            🎮 Buscar Partida Online
          </button>

          <button onClick={handleLocal} className="btn w-full">
            🧑‍🤝‍🧑 Jugar Local 1v1
          </button>

          <button onClick={handleAI} className="btn w-full">
            🤖 Jugar contra IA
          </button>
        </div>
      </div>
    </div>
  );
}

export default MainMenu;
