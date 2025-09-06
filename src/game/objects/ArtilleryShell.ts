import Phaser from "phaser";
import { TileTypes, worldToGrid } from "../core/MapManager.ts";
import { detectBulletHit } from "../helpers/ShotCalculationsHelper.ts";
import { GameState } from "../state/GameState.ts";

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
		for (let i = 0; i < 25; i++) {
			const randomAngle = Math.round(Math.random() * 360);
			const bulletDestinationX =
				this.targetPos.x + Math.cos(randomAngle) * (this.caliber * 2);
			const bulletDestinationY =
				this.targetPos.y + Math.sin(randomAngle) * (this.caliber * 2);
			const bulletLine = new Phaser.Geom.Line(
				this.targetPos.x,
				this.targetPos.y,
				bulletDestinationX,
				bulletDestinationY,
			);

			const enemyHit = detectBulletHit(bulletLine).closestHit;
			if (enemyHit) {
				enemyHit.target.die();
				bulletLine.x2 = enemyHit.point.x;
				bulletLine.y2 = enemyHit.point.y;
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
		console.log(gridPos);
		const offsets = [
			{ x: 0, y: 0 },
			{ x: -1, y: 0 },
			{ x: 1, y: 0 },
			{ x: 0, y: -1 },
			{ x: 0, y: 1 },
			{ x: 1, y: -1 },
			{ x: -1, y: 1 },
			{ x: 1, y: 1 },
			{ x: -1, y: -1 },
		];

		for (const offset of offsets) {
			GameState.mapManager?.updateObjectTile(
				gridPos.gx + offset.x,
				gridPos.gy + offset.y,
				TileTypes.CRATER,
			);
		}
	}
}
