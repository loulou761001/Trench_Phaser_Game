import Phaser from "phaser";
import { skillBonuses, type Unit } from "../objects/Unit.ts";
import type { Weapon } from "../objects/Weapon.ts";
import { GameState } from "../state/GameState.ts";
import { areInSameTrenchSection } from "./MapHelper.ts";
import { calculateMoraleLoss } from "./UnitHelper.ts";

export const NEAR_MISS_DISTANCE_THRESHOLD = 140;

type ClosestHitType = {
	target: Unit;
	dist: number;
	point: Phaser.Geom.Point;
};

export function calculateBulletTrajectory(
	weapon: Weapon,
	target: Unit,
	shooter: Unit,
) {
	const dx = target.x - shooter.x;
	const dy = target.y - shooter.y;
	shooter.rotation = Math.atan2(dy, dx);

	const baseAngle = 60;
	const spread = Phaser.Math.DegToRad(
		baseAngle *
			(shooter.unitAi.currentState.isMoving ? 2 : 1) *
			weapon.accuracy *
			skillBonuses[shooter.skill].accuracy,
	);

	const finalAngle = shooter.rotation + (Math.random() - 0.5) * spread;

	return new Phaser.Geom.Line(
		shooter.x,
		shooter.y,
		shooter.x + Math.cos(finalAngle) * weapon.range,
		shooter.y + Math.sin(finalAngle) * weapon.range,
	);
}

export function applyHit(
	shooter: Unit,
	weapon: Weapon,
	hit: ClosestHitType,
	bulletLine: Phaser.Geom.Line,
) {
	if (hit.target.team === shooter.team) {
		// Friendly fire safeguard
		weapon.activeState.canFire = true;
		weapon.activeState.fireCooldown = null;
		return;
	}

	const sameTrench = areInSameTrenchSection(
		{ worldX: hit.point.x, worldY: hit.point.y },
		{ worldX: bulletLine.x1, worldY: bulletLine.y1 },
	);

	hit.target.receiveHit(weapon.type, weapon.lethality, sameTrench);

	if (!hit.target.isAlive) {
		shooter.morale += 3 + skillBonuses[shooter.skill].moraleBonus;
	}

	bulletLine.x2 = hit.point.x;
	bulletLine.y2 = hit.point.y;
}

export function applyNearMissMorale(
	nearMisses: { distance: number; unit: Unit }[],
) {
	for (const nearMiss of nearMisses) {
		if (nearMiss.unit.isAlive) {
			nearMiss.unit.morale -= calculateMoraleLoss(
				nearMiss.unit,
				nearMiss.distance,
			);
		}
	}
}

export function detectBulletHit(
	bulletLine: Phaser.Geom.Line,
	firingUnit?: Unit,
	detectNearMisses = false,
) {
	let closestHit: ClosestHitType | null = null;

	const units = GameState.unitManager.getAllUnits();
	const nearMisses: { distance: number; unit: Unit }[] = [];

	for (const u of units) {
		if (
			!u.isAlive ||
			u === firingUnit ||
			(u.isInCover() &&
				!areInSameTrenchSection(
					{
						worldX: bulletLine.x1,
						worldY: bulletLine.y1,
					},
					{ worldX: u.x, worldY: u.y },
				))
		)
			continue;
		const bounds = u.getBounds();
		const points: Phaser.Geom.Point[] = [];
		if (Phaser.Geom.Intersects.GetLineToRectangle(bulletLine, bounds, points)) {
			for (const p of points) {
				const dist = Phaser.Math.Distance.Between(
					bulletLine.x1,
					bulletLine.y1,
					p.x,
					p.y,
				);
				if (!closestHit || dist < closestHit.dist) {
					closestHit = { target: u, dist, point: p };
				}
			}
		}
		if (detectNearMisses && (!firingUnit || u.team !== firingUnit.team)) {
			const shortestDistanceFromBullet = Phaser.Math.Distance.Between(
				bulletLine.x2,
				bulletLine.y2,
				bounds.centerX,
				bounds.centerY,
			);
			if (shortestDistanceFromBullet <= NEAR_MISS_DISTANCE_THRESHOLD) {
				nearMisses.push({ unit: u, distance: shortestDistanceFromBullet });
			}
		}
	}

	return { closestHit, nearMisses };
}
