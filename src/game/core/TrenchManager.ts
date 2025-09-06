import { Trench } from "../objects/Trench";
import { type TileType, worldToGrid } from "./MapManager.ts";

export class TrenchManager {
	private trenches: Trench[] = [];

	constructor(private readonly tiles: TileType[][]) {
		this.extractTrenches();
	}

	private extractTrenches() {
		for (let y = 0; y < this.tiles.length; y++) {
			for (let x = 0; x < this.tiles[y].length; x++) {
				if (this.tiles[y][x] === 1) {
					this.trenches.push(new Trench(x, y));
				}
			}
		}
	}

	getTrenches() {
		return this.trenches;
	}

	getClosestTrench(px: number, py: number): Trench | null {
		const gridCoords = worldToGrid(px, py); // convert world → grid

		return this.trenches.reduce(
			(closest, t) => {
				const dist = Phaser.Math.Distance.Between(
					gridCoords.gx,
					gridCoords.gy,
					t.x,
					t.y,
				);
				if (!closest) return t;
				const closestDist = Phaser.Math.Distance.Between(
					gridCoords.gx,
					gridCoords.gy,
					closest.x,
					closest.y,
				);
				return dist < closestDist ? t : closest;
			},
			null as Trench | null,
		);
	}
}
