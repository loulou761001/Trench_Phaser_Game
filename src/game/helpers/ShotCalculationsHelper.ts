import Phaser from "phaser";
import type { Unit } from "../objects/Unit.ts";
import { GameState } from "../state/GameState.ts";

export const NEAR_MISS_THRESHOLD = 70;

export function detectBulletHit(
	bulletLine: Phaser.Geom.Line,
	firingUnit?: Unit,
	detectNearMisses = false,
) {
	let closestHit: {
		target: Unit;
		dist: number;
		point: Phaser.Geom.Point;
	} | null = null;

	const units = GameState.unitManager.getAllUnits();
	const nearMisses: { distance: number; unit: Unit }[] = [];

	for (const u of units) {
		if (!u.isAlive || u === firingUnit) continue;
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
		if (detectNearMisses && u.team !== firingUnit?.team) {
			// No hit → check for near-miss
			const shortestDistanceFromBullet = Phaser.Geom.Line.GetShortestDistance(
				bulletLine,
				bounds,
			);

			const dist = shortestDistanceFromBullet;
			if (typeof dist === "number") {
				if (dist <= NEAR_MISS_THRESHOLD) {
					nearMisses.push({ unit: u, distance: dist });
				}
			}
		}
	}

	return { closestHit, nearMisses };
}
