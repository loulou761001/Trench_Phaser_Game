import { TileTypes, worldToGrid } from "../core/MapManager.ts";
import { skillBonuses, type Unit } from "../objects/Unit";
import type { WeaponTypeType } from "../objects/Weapon.ts";
import { GameState } from "../state/GameState.ts";
import { NEAR_MISS_THRESHOLD } from "./ShotCalculationsHelper.ts";

export function getAimTime(target: Unit, shooter: Unit) {
	const dx = target.x - shooter.x;
	const dy = target.y - shooter.y;
	const distance = Math.sqrt(dx * dx + dy * dy);
	const baseAimTime = 0.1;
	const aimPenalty =
		(distance / shooter.weapon.range) * skillBonuses[shooter.skill].aimSeconds;
	return (baseAimTime + aimPenalty) * 1000;
}

export function checkWeaponCooldown(delta: number, shooter: Unit) {
	if (shooter.weapon.magSize && shooter.weapon.activeState.roundsFired >= shooter.weapon.magSize) {
		shooter.weapon.activeState.fireCooldown = 5000
		shooter.weapon.activeState.canFire = false
	}

	if (!shooter.weapon.activeState.canFire) {
		if (shooter.weapon.activeState.fireCooldown === null) {
			shooter.weapon.activeState.fireCooldown =
				1000 / shooter.weapon.shotsPerSecond;
		} else {
			shooter.weapon.activeState.fireCooldown -= delta;
			if (shooter.weapon.activeState.fireCooldown <= 0) {
				shooter.weapon.activeState.canFire = true;
				shooter.weapon.activeState.fireCooldown = null;
			}
		}
	}
}

export function calculateMoraleLoss(distance: number) {
	const clamped = Math.max(0, Math.min(distance, NEAR_MISS_THRESHOLD));
	const loss = 10 - (clamped / NEAR_MISS_THRESHOLD) * 5;
	return Math.round(loss); // 5–10
}

export function getTacticalRole(unit: Unit) {
	const coverTypes: WeaponTypeType[] = ["HMG", "LMG", "sniper"];
	const chanceToFire: number = 0.4;
	if (coverTypes.includes(unit.weapon.type)) {
		return "fire";
	}
	return Math.random() < chanceToFire ? "fire" : "advance";
}

export function getCoverBonus(unit: Unit, inSameTrench = false) {
	const gridPos = worldToGrid(unit.x, unit.y);
	const currentTile =
		GameState.mapManager?.mapData.objectsLayer[gridPos.y][gridPos.x];
	let coverBonus = 1;
	if (currentTile) {
		switch (currentTile) {
			case TileTypes.CRATER:
				coverBonus += 0.5;
				break;
			case TileTypes.TRENCH:
				if (!inSameTrench) {
					coverBonus += 2;
				}
				break;
		}
	}

	switch (unit.stance) {
		case "suppressed":
		case "prone":
			coverBonus += 1;
			break;
		case "crouching":
			coverBonus += 0.5;
			break;
	}
	return coverBonus;
}
