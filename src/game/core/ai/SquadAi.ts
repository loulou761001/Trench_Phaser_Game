import { gridToWorld } from "../../core/MapManager.ts";
import { getTacticalRole } from "../../helpers/UnitHelper.ts";
import type { Unit } from "../../objects/Unit";
import { GameState } from "../../state/GameState.ts";

export type AiStateType = {
  isMoving: boolean;
  isAttacking: boolean;
  isReloading: boolean;
  target: Unit | null;
  tacticalRole: {
    role: "fire" | "advance" | undefined;
    timeSinceChange: number;
  };
};

export class SquadAi {
  private readonly unit: Unit;
  
  private readonly isAttacker: boolean;
  
  private readonly attackersObjective: { x: number; y: number };
  isCalculatingPath = false;
  currentState: AiStateType = {
    isAttacking: false,
    isMoving: false,
    isReloading: false,
    target: null,
    tacticalRole: {
      role: undefined,
      timeSinceChange: 0
    }
  }

  constructor(unit: Unit) {
    this.isAttacker = unit.team === "alliance";
    this.unit = unit;

    if (GameState.mapManager)
      this.attackersObjective = {
        x: this.unit.getGridCoods().x,
        y: GameState.mapManager.mapData.height - 5,
      };
    this.currentState.tacticalRole = {
      role: getTacticalRole(unit),
      timeSinceChange: 0,
    };
  }

  protected shouldTarget(enemy: Unit): boolean {
    if (!enemy.isAlive) return false;

    const dist = Phaser.Math.Distance.Between(
      this.unit.x,
      this.unit.y,
      enemy.x,
      enemy.y,
    );
    if (dist > this.unit.weapons[this.unit.equippedWeapon].range) return false;

    if (!this.isAttacker) {
      return true; // always shoot if in range
    } else {
      return this.currentState.tacticalRole.role === "fire";
    }
  }

  async update(delta: number) {
    this.currentState.tacticalRole.timeSinceChange += delta;
    // Temporary system: changes the role every 2 - 4 seconds. TODO: change this, maybe after each shot with a "burst" system?
    const maxTimeSinceChange =
      Math.floor(Math.random() * (4000 - 2000 + 1)) + 3000;
    if (
      this.isAttacker &&
      this.unit.stance !== "suppressed" &&
      this.currentState.tacticalRole.timeSinceChange > maxTimeSinceChange
    ) {
      this.currentState.tacticalRole.role = getTacticalRole(this.unit);
      this.currentState.tacticalRole.timeSinceChange = 0;
    }
    // Find nearest visible enemy
    const enemy = GameState.unitManager.findNearestEnemy(this.unit);
    if (enemy && this.shouldTarget(enemy)) {
      this.unit.path = [];
      if (this.currentState.target !== enemy) this.unit.targetEnemy(enemy);
    } else {
      this.unit.targetEnemy(null);
    }
    if (this.isAttacker && !this.currentState.isAttacking) {
      // If no target trench, assign one
      if (!this.unit.path.length && !this.isCalculatingPath && this.unit.stance !== "suppressed") {
        const worldCoords = gridToWorld(
          this.attackersObjective.x,
          this.attackersObjective.y,
        );
        await this.unit.findPath(worldCoords.x, worldCoords.y);
      }
    }
  }
}
