import { GamePhase, GameState, PlayerState, BattleZoneCard } from "./types";
import { Card, CARDS_INFO } from "./Card";

export class Game {
  private gameState: GameState;

  constructor(
    player1Id: string,
    player2Id: string,
    player1Name = "Jugador 1",
    player2Name = "Jugador 2"
  ) {
    this.gameState = {
      phase: "draw_phase",
      currentPlayer: player1Id,
      players: {
        [player1Id]: this.initializePlayer(player1Id, player1Name),
        [player2Id]: this.initializePlayer(player2Id, player2Name),
      },
      battleZone: [],
      turn: 1,
    };
  }

  private initializePlayer(playerId: string, playerName: string): PlayerState {
    // Crear mazo de 12 cartas (sin repetir la misma instancia)
    const deck: Card[] = [];
    const numCardsNeeded = 12;
    const cardIndices = this.selectRandomCards(CARDS_INFO.length, numCardsNeeded);

    cardIndices.forEach((index) => {
      const cardInfo = CARDS_INFO[index];
      deck.push(new Card(`${playerId}-card-${deck.length}`, cardInfo));
    });

    return {
      id: playerId,
      name: playerName,
      hand: [],
      battleZone: [],
      graveyard: [],
      deck: deck,
      lifePoints: 8000,
    };
  }

  private selectRandomCards(totalCards: number, numToSelect: number): number[] {
    const indices: number[] = [];
    for (let i = 0; i < totalCards; i++) {
      indices.push(i);
    }
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }
    return indices.slice(0, numToSelect);
  }

  getCurrentPhase(): GamePhase {
    return this.gameState.phase;
  }

  nextPhase(): void {
    const phases: GamePhase[] = ["draw_phase", "main_phase", "battle_phase", "end_phase"];
    const currentIndex = phases.indexOf(this.gameState.phase);
    const nextIndex = (currentIndex + 1) % phases.length;
    this.gameState.phase = phases[nextIndex];

    // Si es fin de turno, cambiar de jugador
    if (this.gameState.phase === "draw_phase") {
      this.switchPlayer();
      this.gameState.turn++;
    }
  }

  private switchPlayer(): void {
    const playerIds = Object.keys(this.gameState.players);
    this.gameState.currentPlayer =
      this.gameState.currentPlayer === playerIds[0] ? playerIds[1] : playerIds[0];
  }

  getCurrentPlayer(): PlayerState {
    return this.gameState.players[this.gameState.currentPlayer];
  }

  getGameState(): GameState {
    return this.gameState;
  }

  playCard(playerId: string, cardId: string): boolean {
    const player = this.gameState.players[playerId];
    if (
      !player ||
      this.gameState.currentPlayer !== playerId ||
      this.gameState.phase !== "main_phase" ||
      player.battleZone.length >= 5
    ) {
      return false;
    }

    const cardIndex = player.hand.findIndex((c) => c.cardId === cardId);
    if (cardIndex === -1) return false;

    const card = player.hand[cardIndex];
    player.hand.splice(cardIndex, 1);
    player.battleZone.push(card);

    return true;
  }

  attack(attackerId: string, attackingCardId: string, defendingCardId: string): boolean {
    const attacker = this.gameState.players[attackerId];
    if (
      !attacker ||
      this.gameState.currentPlayer !== attackerId ||
      this.gameState.phase !== "battle_phase"
    ) {
      return false;
    }

    const attackingCard = attacker.battleZone.find((c) => c.cardId === attackingCardId);
    if (!attackingCard) return false;

    // Encontrar defensor (el otro jugador)
    const defenderIds = Object.keys(this.gameState.players).filter((id) => id !== attackerId);
    const defender = this.gameState.players[defenderIds[0]];
    if (!defender) return false;

    const defendingCard = defender.battleZone.find((c) => c.cardId === defendingCardId);
    if (!defendingCard) return false;

    // Calcular daño
    const attackDamage = attackingCard.getTotalAtk();
    const defensePower = defendingCard.getTotalDef();
    const damage = Math.max(0, attackDamage - defensePower);

    // Aplicar daño
    defender.lifePoints -= damage;

    // Destruir cartas si es necesario (simplificar: destruir si daño > defensa)
    if (damage > 0) {
      defender.battleZone = defender.battleZone.filter((c) => c.cardId !== defendingCardId);
      defender.graveyard.push(defendingCard);
    }

    return true;
  }

  drawCard(playerId: string): boolean {
    const player = this.gameState.players[playerId];
    if (!player || player.deck.length === 0) return false;

    const card = player.deck.pop()!;
    player.hand.push(card);
    return true;
  }

  endTurn(playerId: string): boolean {
    if (this.gameState.currentPlayer !== playerId) return false;
    if (this.isGameOver()) return false;

    if (this.gameState.phase === "draw_phase") {
      this.drawCard(playerId);
    }
    this.nextPhase();
    return true;
  }

  isGameOver(): boolean {
    return Object.values(this.gameState.players).some((p) => p.lifePoints <= 0);
  }

  getWinner(): string | null {
    if (!this.isGameOver()) return null;
    const alive = Object.entries(this.gameState.players).find(([_, p]) => p.lifePoints > 0);
    return alive ? alive[0] : null;
  }
}
