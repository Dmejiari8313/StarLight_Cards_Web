import type { Card } from "./Card";

// Tipos base del juego
export interface CardInfo {
  name: string;
  imagePath: string;
  backImagePath?: string;
  baseAtk: number;
  baseDef: number;
}

export interface CardStats {
  baseAtk: number;
  baseDef: number;
  dynamicAtk: number; // Buffs/debuffs
  dynamicDef: number;
  fixedAtk: number; // De habilidades
  fixedDef: number;
}

export type GamePhase = "draw_phase" | "main_phase" | "battle_phase" | "end_phase";

export interface BattleZoneCard {
  cardId: string;
  playerId: string;
  stats: CardStats;
}

export interface GameState {
  phase: GamePhase;
  currentPlayer: string; // "player1" | "player2"
  players: {
    [key: string]: PlayerState;
  };
  battleZone: BattleZoneCard[];
  turn: number;
}

export interface PlayerState {
  id: string;
  name: string;
  hand: Card[];
  battleZone: Card[];
  graveyard: Card[];
  deck: Card[];
  lifePoints: number;
}

export interface GameMessage {
  type: "join" | "play_card" | "attack" | "next_phase" | "game_state" | "error" | "chat";
  playerId: string;
  data?: any;
  message?: string;
}

export interface PlayerMove {
  type: "play_card" | "attack" | "next_phase" | "surrender";
  cardId?: string;
  targetCardId?: string;
}
