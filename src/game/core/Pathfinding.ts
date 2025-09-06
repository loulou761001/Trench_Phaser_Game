import EasyStar from "easystarjs";
import { type TileType, TileTypes } from "./MapManager.ts";

export class Pathfinding {
	private readonly easystar: EasyStar.js;
	grid: number[][] = [];

	constructor(groundLayer: TileType[][], objectsLayer: (TileType | null)[][]) {
		this.easystar = new EasyStar.js();
		this.grid = this.mergeLayers(groundLayer, objectsLayer);

		const acceptableTiles: TileType[] = [
			TileTypes.GROUND,
			TileTypes.TRENCH,
			TileTypes.CRATER,
			TileTypes.BARBED_WIRE,
		];

		this.easystar.setGrid(this.grid);
		this.easystar.enableDiagonals();
		this.easystar.disableCornerCutting();
		this.easystar.setAcceptableTiles(acceptableTiles);

		// movement costs
		this.easystar.setTileCost(TileTypes.BARBED_WIRE, 12);
		this.easystar.setTileCost(TileTypes.GROUND, 4);
		this.easystar.setTileCost(TileTypes.CRATER, 2);
		this.easystar.setTileCost(TileTypes.TRENCH, 1);
	}

	/** Merge ground + object layers into a single grid */
	private mergeLayers(
		ground: number[][],
		objects: (TileType | null)[][],
	): number[][] {
		const height = ground.length;
		const width = ground[0].length;
		const merged: number[][] = Array.from({ length: height }, () =>
			Array(width).fill(TileTypes.GROUND),
		);

		for (let y = 0; y < height; y++) {
			if (!objects[y]) continue;
			for (let x = 0; x < width; x++) {
				if (!objects[y][x]) continue;
				const obj = objects[y][x];
				if (obj !== null) {
					merged[y][x] = obj;
				} else {
					merged[y][x] = ground[y][x];
				}
			}
		}
		return merged;
	}

	/** Update the pathfinding grid after changes */
	setLayers(ground: number[][], objects: (TileType | null)[][]) {
		this.grid = this.mergeLayers(ground, objects);
		this.easystar.setGrid(this.grid);
	}

	/** Request a path (async with callback) */
	findPath(
		startX: number,
		startY: number,
		endX: number,
		endY: number,
	): Promise<{ x: number; y: number }[] | null> {
		return new Promise((resolve) => {
			this.easystar.findPath(startX, startY, endX, endY, (path) => {
				resolve(path);
			});
			this.easystar.calculate();
		});
	}

	/** Should be called every frame in your update loop */
	update() {
		this.easystar.calculate();
	}
}
