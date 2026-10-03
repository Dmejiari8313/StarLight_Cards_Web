import express from "express";
import { Server, createServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import cors from "cors";
import { Game } from "./Game";
import { GameMessage, PlayerMove } from "./types";

const app = express();
app.use(cors());
app.use(express.json());

const server: Server = createServer(app);
const wss = new WebSocketServer({ server });

// Almacenamiento de salas de juego
interface GameRoom {
  id: string;
  game: Game;
  players: { [playerId: string]: WebSocket };
  playerNames: { [playerId: string]: string };
  status: "waiting" | "in_progress" | "finished";
}

const gameRooms: Map<string, GameRoom> = new Map();
const playerToRoom: Map<WebSocket, string> = new Map();

// Generar ID único
const generateId = () => Math.random().toString(36).substring(2, 11);

const sendError = (ws: WebSocket, message: string) => {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type: "error", playerId: "", message }));
  }
};

// Broadcast a ambos jugadores
const broadcastToRoom = (roomId: string, message: GameMessage) => {
  const room = gameRooms.get(roomId);
  if (room) {
    Object.values(room.players).forEach((ws) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      }
    });
  }
};

// Conexión WebSocket
wss.on("connection", (ws: WebSocket) => {
  console.log("Nuevo cliente conectado");

  ws.on("message", (data: Buffer) => {
    try {
      const message: GameMessage = JSON.parse(data.toString());
      const roomId = playerToRoom.get(ws);

      if (message.type === "join") {
        handleJoin(ws, message);
      } else if (roomId && gameRooms.has(roomId)) {
        handleGameMessage(ws, roomId, message);
      } else {
        sendError(ws, "Debes unirte a una partida antes de enviar movimientos.");
      }
    } catch (error) {
      console.error("Error procesando mensaje:", error);
      sendError(ws, "Mensaje inválido.");
    }
  });

  ws.on("close", () => {
    console.log("Cliente desconectado");
    const roomId = playerToRoom.get(ws);
    if (roomId) {
      const room = gameRooms.get(roomId);
      if (room) {
        // Notificar al otro jugador
        broadcastToRoom(roomId, {
          type: "error",
          playerId: "",
          message: "El otro jugador se desconectó",
        });
        gameRooms.delete(roomId);
      }
      playerToRoom.delete(ws);
    }
  });

  ws.on("error", (error) => {
    console.error("Error WebSocket:", error);
  });
});

function handleJoin(ws: WebSocket, message: GameMessage) {
  const requestedPlayerId = typeof message.playerId === "string" ? message.playerId.trim() : "";
  const playerId = requestedPlayerId || generateId();
  const playerName =
    typeof message.data?.name === "string" && message.data.name.trim()
      ? message.data.name.trim().slice(0, 32)
      : `Jugador ${playerId.slice(0, 4)}`;

  if (playerToRoom.has(ws)) {
    sendError(ws, "Este cliente ya está unido a una partida.");
    return;
  }
  const existingRoom = Array.from(gameRooms.values()).find(
    (room) => room.status === "waiting" && Object.keys(room.players).length === 1
  );

  let roomId: string;
  let room: GameRoom;

  if (existingRoom) {
    // Unirse a sala existente
    roomId = existingRoom.id;
    room = existingRoom;
    room.players[playerId] = ws;
    room.playerNames[playerId] = playerName;
    room.status = "in_progress";

    // Inicializar juego
    const playerIds = Object.keys(room.players);
    room.game = new Game(
      playerIds[0],
      playerIds[1],
      room.playerNames[playerIds[0]],
      room.playerNames[playerIds[1]]
    );

    // Repartir cartas iniciales (5 cartas)
    playerIds.forEach((pId) => {
      for (let i = 0; i < 5; i++) {
        room.game.drawCard(pId);
      }
    });

    // Notificar a ambos jugadores
    broadcastToRoom(roomId, {
      type: "game_state",
      playerId: "",
      data: {
        gameState: room.game.getGameState(),
        message: `¡Juego iniciado! Jugadores: ${playerIds.join(" vs ")}`,
      },
    });
  } else {
    // Crear nueva sala
    roomId = generateId();
    room = {
      id: roomId,
      game: new Game(playerId, "pending"),
      players: { [playerId]: ws },
      playerNames: { [playerId]: playerName },
      status: "waiting",
    };
    gameRooms.set(roomId, room);
  }

  playerToRoom.set(ws, roomId);

  ws.send(
    JSON.stringify({
      type: "join",
      playerId,
      data: { roomId, status: room.status },
    })
  );

  console.log(`Jugador ${playerId} en sala ${roomId}`);
}

function handleGameMessage(ws: WebSocket, roomId: string, message: GameMessage) {
  const room = gameRooms.get(roomId);
  if (!room) return;

  const playerId = message.playerId;
  if (!playerId || room.players[playerId] !== ws) {
    sendError(ws, "La identidad del jugador no coincide con la conexión.");
    return;
  }

  const move = message.data as PlayerMove | undefined;
  if (!move || typeof move.type !== "string") {
    sendError(ws, "Movimiento inválido.");
    return;
  }

  let accepted = false;

  switch (move.type) {
    case "play_card":
      if (move.cardId) {
        accepted = room.game.playCard(playerId, move.cardId);
      }
      break;

    case "attack":
      if (move.cardId && move.targetCardId) {
        accepted = room.game.attack(playerId, move.cardId, move.targetCardId);
      }
      break;

    case "next_phase":
      accepted = room.game.endTurn(playerId);
      break;

    case "surrender":
      room.status = "finished";
      accepted = true;
      break;
    default:
      sendError(ws, "Tipo de movimiento no soportado.");
      return;
  }

  if (!accepted) {
    sendError(ws, "Movimiento rechazado: revisa el turno, fase y carta seleccionada.");
    return;
  }

  // Enviar estado actualizado
  broadcastToRoom(roomId, {
    type: "game_state",
    playerId: "",
    data: {
      gameState: room.game.getGameState(),
      gameOver: room.game.isGameOver(),
      winner: room.game.getWinner(),
    },
  });
}

// Rutas HTTP
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/rooms", (req, res) => {
  const rooms = Array.from(gameRooms.values()).map((room) => ({
    id: room.id,
    status: room.status,
    players: Object.keys(room.players).length,
  }));
  res.json(rooms);
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🎮 Servidor WebSocket ejecutándose en puerto ${PORT}`);
});
