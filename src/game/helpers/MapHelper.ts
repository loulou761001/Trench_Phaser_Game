import { worldToGrid } from "../core/MapManager.ts";
import { GameState } from "../state/GameState.ts";
import { TileTypes } from "../objects/Tile.ts";

export type WorldCoordsType = { worldX: number; worldY: number };
export type GridCoordsType = { gridX: number; gridY: number };

export function isWorldCoords(
	obj: WorldCoordsType | GridCoordsType,
): obj is WorldCoordsType {
	return "worldX" in obj && "worldY" in obj;
}
export function isGridCoords(
	obj: WorldCoordsType | GridCoordsType,
): obj is WorldCoordsType {
	return "gridX" in obj && "gridY" in obj;
}

export function getAdjacentTiles(gx: number, gy: number, getMiddle = false) {
	const tiles = [];
	for (let dx = -1; dx <= 1; dx++) {
		for (let dy = -1; dy <= 1; dy++) {
			if (dx === 0 && dy === 0) continue; // skip the center tile
			tiles.push({ gx: gx + dx, gy: gy + dy });
		}
	}
	if (getMiddle) tiles.push({ gx, gy });
	return tiles;
}

export function areInSameTrench(
	object1: WorldCoordsType | GridCoordsType,
	object2: WorldCoordsType | GridCoordsType,
): boolean {
	const isInWorldCoords = isWorldCoords(object1) && isWorldCoords(object2);

	const g1 = isInWorldCoords
		? worldToGrid(object1.worldX, object1.worldY)
		: // @ts-expect-error
			{ x: object1.gridX, y: object1.gridY };
	const g2 = isInWorldCoords
		? worldToGrid(object2.worldX, object2.worldY)
		: // @ts-expect-error
			{ x: object2.gridX, y: object2.gridY };
	const objectsMap = GameState.mapManager?.mapData.objectsLayer;
	if (!objectsMap) return false;

	if (
		objectsMap[g1.y][g1.x] !== TileTypes.TRENCH ||
		objectsMap[g2.y][g2.x] !== TileTypes.TRENCH
	)
		return false;

	const lowerX = Math.min(g1.x, g2.x);
	const higherX = Math.max(g1.x, g2.x);
	const lowerY = Math.min(g1.y, g2.y);
	const higherY = Math.max(g1.y, g2.y);
	// Check X axis
	let sameXTrench = g1.y === g2.y;
	if (sameXTrench) {
		for (let i = lowerX; i <= higherX; i++) {
			if (objectsMap[g1.y][i] !== TileTypes.TRENCH) {
				sameXTrench = false;
				break;
			}
		}
	}

	// Check Y axis
	let sameYTrench = g1.x === g2.x;
	if (sameYTrench && !sameXTrench) {
		for (let i = lowerY; i <= higherY; i++) {
			if (objectsMap[i][g1.x] !== TileTypes.TRENCH) {
				sameYTrench = false;
				break;
			}
		}
	}

	return sameXTrench || sameYTrench;
}
