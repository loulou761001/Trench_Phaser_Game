import { gridToWorld } from "../../core/MapManager.ts";
import { getTacticalRole } from "../../helpers/UnitHelper.ts";
import type { Unit } from "../../objects/Unit";
import { GameState } from "../../state/GameState.ts";

export type AiStateType = {
	isMoving: boolean;
	isAttacking: boolean;
	isReloading: boolean;
};

export class UnitAi {
	private readonly unit: Unit;
	readonly tacticalRole: {
		role: "fire" | "advance" | undefined;
		timeSinceChange: number;
	};
	private readonly isAttacker: boolean;
	currentTarget: Unit | null = null;
	private readonly attackersObjective: { x: number; y: number };
	isCalculatingPath = false;
	currentState: AiStateType = {
		isAttacking: false,
		isMoving: false,
		isReloading: false,
	};

	constructor(unit: Unit) {
		this.isAttacker = unit.team === "alliance";
		this.unit = unit;

		if (GameState.mapManager)
			this.attackersObjective = {
				x: this.unit.getGridCoods().x,
				y: GameState.mapManager.mapData.height - 5,
			};
		this.tacticalRole = {
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
		if (dist > this.unit.weapon.range) return false;

		if (!this.isAttacker) {
			return true; // always shoot if in range
		} else {
			return this.tacticalRole.role === "fire";
		}
	}

	async update(delta: number) {
		this.tacticalRole.timeSinceChange += delta;
		const maxTimeSinceChange =
			Math.floor(Math.random() * (5000 - 3000 + 1)) + 3000;
		if (
			this.isAttacker &&
			this.tacticalRole.timeSinceChange > maxTimeSinceChange
		) {
			this.tacticalRole.role = getTacticalRole(this.unit);
			this.tacticalRole.timeSinceChange = 0;
		}
		// Find nearest visible enemy
		const enemy = GameState.unitManager.findNearestEnemy(this.unit);
		if (enemy && this.shouldTarget(enemy)) {
			this.unit.path = [];
			if (this.currentTarget !== enemy) this.unit.targetEnemy(enemy);
		} else {
			this.unit.targetEnemy(null);
		}
		if (this.isAttacker && !this.currentState.isAttacking) {
			// If no target trench, assign one
			if (!this.unit.path.length && !this.isCalculatingPath) {
				const worldCoords = gridToWorld(
					this.attackersObjective.x,
					this.attackersObjective.y,
				);
				await this.unit.findPath(worldCoords.x, worldCoords.y);
			}
		}
	}
}
