// core/UnitManager.ts

import { gridToWorld } from "../core/MapManager.ts";
import { type UNITS, Unit, type UnitTeamType } from "../objects/Unit";
import { GameState } from "../state/GameState";

export class UnitManager {
	private readonly units: Unit[] = [];

	spawnUnit(
		gridX: number,
		gridY: number,
		type: (typeof UNITS)[keyof typeof UNITS],
	) {
		if (!GameState.mapManager) return;
		const world = gridToWorld(gridX, gridY);
		const unit = new Unit(
			{
				x: world.x,
				y: world.y,
			},
			type.name,
			type.atlas,
			type.weapon,
			type.team,
		);

		this.units.push(unit);

		return unit;
	}

	getAllUnits(living: boolean = true) {
		return living ? this.units.filter((u) => u.isAlive) : this.units;
	}

	getAllEnemies(team: UnitTeamType, living: boolean = true) {
		return this.getAllUnits(living).filter((u) => u.team !== team);
	}
	getAllAllies(team: UnitTeamType, living: boolean = true) {
		return this.getAllUnits(living).filter((u) => u.team === team);
	}

	update(delta: number) {
		this.units.forEach((u) => {
			u.update(delta);
		});
	}

	moveSelectedTo(worldX: number, worldY: number) {
		const selected = GameState.selection.getSelected();
		selected.forEach(async (unit) => {
			unit.unitAi.currentState.isMoving = true
			unit.unitAi.currentState.isAttacking = false
			unit.unitAi.currentState.target = null
			await unit.findPath(worldX, worldY);
		});
	}

	findNearestEnemy(unit: Unit): Unit | null {
		let closest: Unit | null = null;
		const enemies = this.getAllEnemies(unit.team);
		let minDist = Infinity;
		for (const e of enemies) {
			const d = Phaser.Math.Distance.Between(unit.x, unit.y, e.x, e.y);
			if (d < minDist) {
				minDist = d;
				closest = e;
			}
		}
		return closest;
	}
}
