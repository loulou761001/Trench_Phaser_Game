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
		(distance / shooter.weapons[shooter.equippedWeapon].range) *
		skillBonuses[shooter.skill].aimSeconds;
	return (baseAimTime + aimPenalty) * 1000;
}

export function checkWeaponCooldown(delta: number, shooter: Unit) {
	const weapon = shooter.weapons[shooter.equippedWeapon];
	if (!weapon) return;
	function reload() {
		let reloadTime: number;
		switch (weapon.type) {
			case "HMG":
				reloadTime = 14000;
				break;
			case "LMG":
				reloadTime = 12000;
				break;
			case "pistol":
				reloadTime = 6000;
				break;
			default:
				reloadTime = 8000;
		}
		weapon.activeState.fireCooldown = reloadTime;
		weapon.activeState.canFire = false;
		weapon.activeState.roundsFired = 0;
	}

	if (weapon.magSize && weapon.activeState.roundsFired >= weapon.magSize) {
		reload();
	}

	if (!weapon.activeState.canFire) {
		if (weapon.activeState.fireCooldown === null) {
			weapon.activeState.fireCooldown = 1000 / weapon.shotsPerSecond;
		} else {
			weapon.activeState.fireCooldown -= delta;
			if (weapon.activeState.fireCooldown <= 0) {
				weapon.activeState.canFire = true;
				weapon.activeState.fireCooldown = null;
			}
		}
	}
}

export function calculateMoraleLoss(unit: Unit, distance: number) {
	const clamped = Math.max(0, Math.min(distance, NEAR_MISS_THRESHOLD));
	const maxLoss = 12;
	const minLoss = 5;
	let loss = maxLoss - (clamped / NEAR_MISS_THRESHOLD) * minLoss;
	if (unit.getCurrentTerrain() === TileTypes.TRENCH) loss -= 5;
	else if (unit.getCurrentTerrain() === TileTypes.CRATER) loss -= 2;
	const experienceBonus = skillBonuses[unit.skill].moraleBonus ?? 0;
	loss -= experienceBonus;
	return loss > 0 ? Math.round(loss) : 0;
}

export function getTacticalRole(unit: Unit) {
	const coverTypes: WeaponTypeType[] = ["HMG", "LMG", "sniper"];
	const chanceToFire: number = 0.5;
	if (
		coverTypes.includes(unit.weapons[unit.equippedWeapon].type) ||
		unit.getCurrentTerrain() === TileTypes.TRENCH
	) {
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
