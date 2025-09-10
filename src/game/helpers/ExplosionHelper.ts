import Phaser from "phaser";
import { worldToGrid } from "../core/MapManager.ts";
import { TileTypes } from "../objects/Tile.ts";
import { GameState } from "../state/GameState.ts";
import {
	areInSameTrenchSection,
	getGridTerrain,
	type WorldCoordsType,
} from "./MapHelper.ts";
import { detectBulletHit } from "./ShotCalculationsHelper.ts";
import { calculateMoraleLoss } from "./UnitHelper.ts";

export function generateExplosion(
	explosionRange: number,
	explosionLines: number,
	lethality: number,
	targetPos: WorldCoordsType,
	doGenerateCrater: boolean = false,
) {
	const gridPos = worldToGrid(targetPos.worldX, targetPos.worldY);
	const trenchTerrains = [TileTypes.TRENCH, TileTypes.PARAPET];
	const gridTerrain = getGridTerrain(gridPos.x, gridPos.y);
	const isExplosionInTrench = !!(
		gridTerrain && trenchTerrains.includes(gridTerrain)
	);
	for (let i = 0; i < explosionLines; i++) {
		const randomAngle = Math.random() * Math.PI * 2;
		const bulletDestinationX =
			targetPos.worldX + Math.cos(randomAngle) * explosionRange;
		const bulletDestinationY =
			targetPos.worldY + Math.sin(randomAngle) * explosionRange;
		const bulletLine = new Phaser.Geom.Line(
			targetPos.worldX,
			targetPos.worldY,
			bulletDestinationX,
			bulletDestinationY,
		);
		if (isExplosionInTrench) {
			const points = bulletLine.getPoints(Math.floor(explosionRange / 4));
			for (const point of points) {
				const pointGridCoods = worldToGrid(point.x, point.y);
				const pointGridTerrain = getGridTerrain(
					pointGridCoods.x,
					pointGridCoods.y,
				);
				if (!pointGridTerrain || !trenchTerrains.includes(pointGridTerrain)) {
					bulletLine.x2 = point.x;
					bulletLine.y2 = point.y;
					break;
				}
			}
		}

		const { closestHit, nearMisses } = detectBulletHit(
			bulletLine,
			undefined,
			true,
		);
		if (closestHit) {
			const sameTrench =
				isExplosionInTrench &&
				areInSameTrenchSection(
					{ worldX: closestHit.target.x, worldY: closestHit.target.y },
					{ worldX: bulletLine.x1, worldY: bulletLine.y1 },
				);
			closestHit.target.receiveHit("explosive", lethality, sameTrench);
			bulletLine.x2 = closestHit.point.x;
			bulletLine.y2 = closestHit.point.y;
		}

		for (const nearMiss of nearMisses) {
			if (nearMiss.unit.isAlive) {
				nearMiss.unit.morale -= calculateMoraleLoss(
					nearMiss.unit,
					nearMiss.distance,
				);
			}
		}

		const graphics = GameState.scene.add.graphics();
		graphics.lineStyle(1, 0xf8ff75, 0.6).setDepth(2);
		graphics.beginPath();
		graphics.moveTo(bulletLine.x1, bulletLine.y1);
		graphics.lineTo(bulletLine.x2, bulletLine.y2);
		graphics.strokePath();

		setTimeout(() => graphics.destroy(), 150);
	}
	if (doGenerateCrater && !isExplosionInTrench) {
		generateCrater(targetPos);
	}
}

export function generateCrater(targetPos: WorldCoordsType) {
	const gridPos = worldToGrid(targetPos.worldX, targetPos.worldY);
	const offsets = [
		{ x: -1, y: 0 },
		{ x: 1, y: 0 },
		{ x: 0, y: -1 },
		{ x: 0, y: 1 },
		{ x: 1, y: -1 },
		{ x: -1, y: 1 },
		{ x: 1, y: 1 },
		{ x: -1, y: -1 },
		{ x: 0, y: 0 },
	];

	for (const offset of offsets) {
		GameState.mapManager?.updateObjectTile(
			gridPos.x + offset.x,
			gridPos.y + offset.y,
			TileTypes.CRATER,
		);
	}
}
