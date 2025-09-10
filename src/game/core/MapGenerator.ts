// core/MapGenerator.ts

import { type TileType, TileTypes } from "../objects/Tile.ts";
import type { MapData } from "./MapManager";

export function generateMap(
	width = 75,
	height = 150,
	numEntente = 30,
	numAlliance = 50,
): MapData {
	const groundLayer: TileType[][] = Array.from({ length: height }, () =>
		Array(width).fill(TileTypes.GROUND),
	);

	const objectsLayer: (TileType | null)[][] = Array.from(
		{ length: height },
		() => Array(width).fill(null),
	);

	// --- Object placement
	generateTrenches(width, height, objectsLayer);
	generateBarbedWire(width, height, objectsLayer);
	generateCraters(width, height, objectsLayer, 64);

	const spawnPoints = generateSpawnPoints(
		width,
		height,
		objectsLayer,
		numEntente,
		numAlliance,
	);

	return { width, height, groundLayer, objectsLayer, spawnPoints };
}

function generateSpawnPoints(
	width: number,
	height: number,
	objectsLayer: (TileType | null)[][],
	numEntente: number,
	numAlliance: number,
) {
	const allianceSpawns: { x: number; y: number }[] = [];
	const ententeSpawns: { x: number; y: number }[] = [];

	const trenchTiles: { x: number; y: number }[] = [];
	const openTiles: { x: number; y: number }[] = [];

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (objectsLayer[y][x] === TileTypes.TRENCH) {
				trenchTiles.push({ x, y });
			} else if (!objectsLayer[y][x]) {
				openTiles.push({ x, y });
			}
		}
	}

	// --- ENTENTE: trench spawns
	for (let i = 0; i < numEntente && trenchTiles.length > 0; i++) {
		const idx = Math.floor(Math.random() * trenchTiles.length);
		ententeSpawns.push(trenchTiles.splice(idx, 1)[0]);
	}

	// --- ALLIANCE: random near top
	for (let i = 0; i < numAlliance; i++) {
		const x = Math.floor(Math.random() * (width - 10)) + 5;
		const y = Math.floor(Math.random() * 10) + 2;
		allianceSpawns.push({ x, y });
	}

	return {
		alliance: allianceSpawns,
		entente: ententeSpawns,
	};
}

function generateTrenches(
	width: number,
	height: number,
	layer: (TileType | null)[][],
) {
	const numTrenches = 3 + Math.floor(Math.random() * 3);
	const usedRows: number[] = [];

	function pickStartRow(): number {
		let y: number,
			tries = 0;
		do {
			y = Math.floor(Math.random() * height * 0.6) + Math.floor(height * 0.2);
			tries++;
		} while (usedRows.some((row) => Math.abs(row - y) < 5) && tries < 20);
		usedRows.push(y);
		return y;
	}

	function drawHorizontal(y: number, startX: number, length: number): number {
		let x = startX;
		for (let i = 0; i < length && x < width; i++) {
			layer[y][x] = TileTypes.TRENCH;
			if (i < length - 1) x++;
		}
		return x;
	}

	function drawVertical(
		x: number,
		y: number,
		dir: number,
		length: number,
	): number {
		let newY = y;
		for (let j = 0; j < length; j++) {
			if (newY + dir >= 1 && newY + dir < height - 1) {
				newY += dir;
				layer[newY][x] = TileTypes.TRENCH;
			} else {
				dir *= -1; // bounce off border
			}
		}
		return newY;
	}

	for (let t = 0; t < numTrenches; t++) {
		let y = pickStartRow();
		let x = 0;
		let verticalDir = Math.random() < 0.5 ? -1 : 1;

		while (x < width) {
			const horizLength = Math.floor(Math.random() * 8) + 6;
			x = drawHorizontal(y, x, horizLength);

			const vertLength = Math.floor(Math.random() * 4) + 1;
			y = drawVertical(x, y, verticalDir, vertLength);

			verticalDir *= -1;
		}
	}
}

function generateBarbedWire(
	width: number,
	height: number,
	layer: (TileType | null)[][],
) {
	const mapMiddle = height / 2;

	function spawnChance(y: number): number {
		const distance = Math.abs(y - mapMiddle);
		const normalized = distance / mapMiddle;
		const maxChance = 0.01;
		return maxChance * (1 - normalized ** 2);
	}

	function placeCluster(x: number, y: number) {
		const clusterLength = 3 + Math.floor(Math.random() * 3);
		const clusterHeight = 1 + Math.floor(Math.random() * 2);
		for (let dx = 0; dx < clusterLength; dx++) {
			for (let dy = 0; dy < clusterHeight; dy++) {
				const nx = x + dx,
					ny = y + dy;
				if (nx < width && ny < height && layer[ny][nx] === null) {
					layer[ny][nx] = TileTypes.BARBED_WIRE;
				}
			}
		}
	}

	for (let y = 0; y < height; y++) {
		for (let x = 0; x < width; x++) {
			if (layer[y][x] === null && Math.random() < spawnChance(y)) {
				placeCluster(x, y);
			}
		}
	}
}

function generateCraters(
	width: number,
	height: number,
	layer: (TileType | null)[][],
	count = 200,
) {
	function areaHasCrater(x: number, y: number): boolean {
		for (let dy = 0; dy < 3; dy++) {
			for (let dx = 0; dx < 3; dx++) {
				if (layer[y + dy]?.[x + dx] === TileTypes.CRATER) return true;
			}
		}
		return false;
	}

	function placeCrater(x: number, y: number) {
		for (let dy = 0; dy < 3; dy++) {
			for (let dx = 0; dx < 3; dx++) {
				if (y + dy < height && x + dx < width) {
					layer[y + dy][x + dx] = TileTypes.CRATER;
				}
			}
		}
	}

	for (let i = 0; i < count; i++) {
		const startX = Math.floor(Math.random() * (width - 2));
		const startY = Math.floor(Math.random() * (height - 2));

		if (!areaHasCrater(startX, startY)) {
			placeCrater(startX, startY);
		}
	}
}
