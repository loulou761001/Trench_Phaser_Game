import EasyStar from "easystarjs";
import { type TileType, TileTypes } from "../objects/Tile.ts";

export class Pathfinding {
	private readonly easystar: EasyStar.js;
	private readonly tileObjectToId: Record<string, number>;
	private readonly tileIdToCost: Record<number, number>;
	grid: number[][] = [];

	// TODO: convert objects to numerical IDs for EasyStar (using maps?)
	constructor(groundLayer: TileType[][], objectsLayer: (TileType | null)[][]) {
		this.easystar = new EasyStar.js();
		const tileEntries = Object.values(TileTypes);
		this.tileObjectToId = {};
		this.tileIdToCost = {};
		tileEntries.forEach((tile, i) => {
			this.tileObjectToId[tile.type] = i;
			this.tileIdToCost[i] = tile.movementCost;
		});
		this.grid = this.mergeLayers(groundLayer, objectsLayer);
		this.easystar.setGrid(this.grid);
		this.easystar.enableDiagonals();
		this.easystar.disableCornerCutting();
		this.easystar.setAcceptableTiles(Object.values(this.tileObjectToId));
		for (const [id, cost] of Object.entries(this.tileIdToCost)) {
			this.easystar.setTileCost(Number(id), cost);
		}
	}

	/** Merge ground + object layers into a single grid */
	private mergeLayers(
		ground: TileType[][],
		objects: (TileType | null)[][],
	): number[][] {
		return ground.map((row, y) =>
			row.map((tile, x) => {
				const obj = objects?.[y]?.[x];
				return this.tileObjectToId[obj?.type ?? tile.type];
			}),
		);
	}

	/** Request a path (async with callback) */
	findPath(
		startX: number,
		startY: number,
		endX: number,
		endY: number,
	): Promise<{ x: number; y: number }[] | null> {
		return new Promise((resolve) => {
			this.easystar.findPath(startX, startY, endX, endY, resolve);
			this.easystar.calculate();
		});
	}

	/** Should be called every frame in your update loop */
	update() {
		this.easystar.calculate();
	}
}
