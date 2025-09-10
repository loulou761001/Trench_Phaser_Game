import { getTacticalRole } from "../../helpers/UnitHelper.ts";
import type { Unit } from "../../objects/Unit";
import { GameState } from "../../state/GameState.ts";
import { gridToWorld } from "../MapManager.ts";

export type TacticalRole = "fire" | "advance";

export type AiStateType = {
	isMoving: boolean;
	isAttacking: boolean;
	isReloading: boolean;
	target: Unit | null;
	tacticalRole: {
		role: TacticalRole | undefined;
		timeSinceChange: number;
		changeInterval: number; // store interval here instead of recalculating every frame
	};
};

export class UnitAi {
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
			timeSinceChange: 0,
			changeInterval: 3000, // default
		},
	};

	constructor(unit: Unit) {
		this.unit = unit;
		this.isAttacker = unit.team === "alliance";

		// Fallback objective (bottom of map) - could be replaced later by a dynamic system
		this.attackersObjective = GameState.mapManager
			? { x: unit.getGridCoods().x, y: GameState.mapManager.mapData.height - 5 }
			: { x: 0, y: 0 };

		this.resetTacticalRole();
	}

	/** --- Decision Making --- */

	private shouldTarget(enemy: Unit): boolean {
		if (!enemy.isAlive) return false;

		const dist = Phaser.Math.Distance.Between(
			this.unit.x,
			this.unit.y,
			enemy.x,
			enemy.y,
		);
		const weapon = this.unit.getEquippedWeapon();
		const grenade = this.unit.getGrenades();

		// Out of weapon range
		if (dist > weapon.range) return false;

		// Has grenades but enemy is only reachable with them
		if (
			enemy.isInCover() &&
			grenade &&
			grenade.totalAmmo > 0 &&
			dist <= grenade.range
		) {
			return true;
		}

		// Attackers decide based on tactical role, defenders always fire if exposed
		if (!this.isAttacker && !this.unit.isInCover()) return true;
		return this.currentState.tacticalRole.role === "fire";
	}

	/** --- Tactical Role --- */

	private resetTacticalRole() {
		this.currentState.tacticalRole.role = getTacticalRole(this.unit);
		this.currentState.tacticalRole.timeSinceChange = 0;
		this.currentState.tacticalRole.changeInterval = Phaser.Math.Between(
			2000,
			4000,
		);
	}

	private updateTacticalRole(delta: number) {
		const role = this.currentState.tacticalRole;
		role.timeSinceChange += delta;

		if (
			this.isAttacker &&
			this.unit.stance !== "suppressed" &&
			role.timeSinceChange > role.changeInterval
		) {
			this.resetTacticalRole();
		}
	}

	/** --- Targeting --- */

	private updateTargeting() {
		const enemy = GameState.unitManager.findNearestEnemy(this.unit);

		if (enemy && this.shouldTarget(enemy)) {
			this.unit.path = []; // stop moving to shoot
			if (this.currentState.target !== enemy) this.unit.targetEnemy(enemy);
		} else {
			this.unit.targetEnemy(null);
		}
	}

	/** --- Movement --- */

	private async updateMovement() {
		if (!this.isAttacker || this.currentState.isAttacking) return;

		if (
			!this.unit.path.length &&
			!this.isCalculatingPath &&
			this.unit.stance !== "suppressed"
		) {
			const worldCoords = gridToWorld(
				this.attackersObjective.x,
				this.attackersObjective.y,
			);
			await this.unit.findPath(worldCoords.x, worldCoords.y);
		}
	}

	/** --- Main update loop --- */

	async update(delta: number) {
		this.updateTacticalRole(delta);
		this.updateTargeting();
		await this.updateMovement();
	}
}
