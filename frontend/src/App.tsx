import { useCallback, useEffect } from "react";
import { useGameStore } from "./store/gameStore";
import { useWebSocketStore } from "./store/wsStore";
import { GameMessage } from "./types";
import MainMenu from "./components/MainMenu";
import GameBoard from "./components/GameBoard";

function App() {
  const { gameState, connected, setConnected, gameMode } = useGameStore();
  const connect = useWebSocketStore((state) => state.connect);
  const disconnect = useWebSocketStore((state) => state.disconnect);

  const handleMessage = useCallback((message: GameMessage) => {
    const { updateGameState, setPlayerId, setRoomId } = useGameStore.getState();

    switch (message.type) {
      case "join":
        setPlayerId(message.playerId);
        if (message.data?.roomId) {
          setRoomId(message.data.roomId);
        }
        break;

      case "game_state":
        updateGameState(message.data.gameState);
        break;

      case "error":
        console.error("Error:", message.message);
        alert(`Error: ${message.message}`);
        break;
    }
  }, []);

  useEffect(() => {
    connect("ws://localhost:8080", {
      onOpen: () => {
        setConnected(true);
        console.log("✅ Conectado al servidor");
      },
      onMessage: handleMessage,
      onError: () => {
        console.error("❌ Error WebSocket");
        setConnected(false);
      },
      onClose: () => {
        setConnected(false);
        console.log("❌ Desconectado del servidor");
      },
    });

    return disconnect;
  }, [connect, disconnect, handleMessage, setConnected]);

  return (
    <div className="w-full h-full bg-gradient-to-br from-slate-900 to-slate-800">
      {!connected && (
        <div className="flex items-center justify-center h-full">
          <div className="text-center">
            <div className="text-3xl mb-4">🔄</div>
            <p className="text-xl">Conectando al servidor...</p>
          </div>
        </div>
      )}

      {connected && gameMode === "online" && !gameState && <MainMenu />}
      {connected && (gameMode !== "online" || gameState) && <GameBoard />}
    </div>
  );
}

export default App;
