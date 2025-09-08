import Phaser from "phaser";
import { worldToGrid } from "../core/MapManager.ts";
import { areInSameTrench } from "../helpers/MapHelper.ts";
import { detectBulletHit } from "../helpers/ShotCalculationsHelper.ts";
import { GameState } from "../state/GameState.ts";
import { Weapon } from "./Weapon.ts";
import { calculateMoraleLoss } from "../helpers/UnitHelper.ts";
import { TileTypes } from "./Tile.ts";

export class ArtilleryShell {
	targetPos: {
		x: number;
		y: number;
	};
	caliber: number;
	type: "HE" | "airburst";

	constructor(
		targetPos: {
			x: number;
			y: number;
		},
		caliber: number,
		type: "HE" | "airburst",
	) {
		this.targetPos = targetPos;
		this.caliber = caliber;
		this.caliber = caliber;
		this.type = type;
	}

	explode() {
		if (this.type === "HE") this.explodeHe();
	}

	private explodeHe() {
		this.generateCrater();

		const shrapnels = 25;
		const explosionRange = this.caliber * 3;

		for (let i = 0; i < shrapnels; i++) {
			const randomAngle = Math.round(Math.random() * 360);
			const bulletDestinationX =
				this.targetPos.x + Math.cos(randomAngle) * explosionRange;
			const bulletDestinationY =
				this.targetPos.y + Math.sin(randomAngle) * explosionRange;
			const bulletLine = new Phaser.Geom.Line(
				this.targetPos.x,
				this.targetPos.y,
				bulletDestinationX,
				bulletDestinationY,
			);

			const { closestHit, nearMisses } = detectBulletHit(bulletLine, undefined, true);
			if (closestHit) {
				const artyWeapon = new Weapon({
					name: "Artillery shell",
					type: "rifle",
					lethality: 0.95,
					range: 1,
					shotsPerSecond: 1,
				});
				const sameTrench = areInSameTrench(
					{ worldX: closestHit.target.x, worldY: closestHit.target.y },
					{ worldX: bulletLine.x1, worldY: bulletLine.y1 },
				);
				closestHit.target.receiveHit(artyWeapon, sameTrench);
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
			setTimeout(() => graphics.destroy(), 100);
		}
	}

	private generateCrater() {
		const gridPos = worldToGrid(this.targetPos.x, this.targetPos.y);
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
}
