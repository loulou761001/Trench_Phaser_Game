import { gridToWorld } from "../../core/MapManager.ts";
import type { TrenchManager } from "../../core/TrenchManager.ts";
import type { Unit } from "../../objects/Unit";
import { GameState } from "../../state/GameState.ts";

export type AiStateType = "idle" | "moving" | "attacking";

export class UnitAi {
	private readonly trenchManager: TrenchManager;
	private readonly isAttacker: boolean;
	constructor(trenchManager: TrenchManager, isAttacker: boolean) {
		this.isAttacker = isAttacker;
		this.trenchManager = trenchManager;
	}

	protected shouldShoot(unit: Unit, enemy: Unit): boolean {
		if (!unit.weapon.activeState.canFire) return false;
		const dist = Phaser.Math.Distance.Between(unit.x, unit.y, enemy.x, enemy.y);
		return dist < unit.weapon.range; // shooting threshold
	}

	async update(unit: Unit) {
		// Find nearest visible enemy
		const enemy = GameState.unitManager.findNearestEnemy(unit);

		if (enemy && this.shouldShoot(unit, enemy)) {
			unit.path = [];
			unit.fireShot(enemy);
			return;
		}

		if (this.isAttacker && unit.aiState !== "attacking") {
			// If no target trench, assign one
			if (!unit.targetTrench) {
				unit.targetTrench = this.trenchManager.getClosestTrench(unit.x, unit.y);
			}
			if (unit.targetTrench && !unit.path.length && !unit.isCalculatingPath) {
				const worldCoords = gridToWorld(
					unit.targetTrench.x,
					unit.targetTrench.y,
				);
				await unit.findPath(worldCoords.x, worldCoords.y);
			}
		}
	}
}
