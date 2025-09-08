import type Phaser from "phaser";
import { CameraController } from "../controller/CameraController";
import type { UnitTeamType } from "../objects/Unit";
import { MapRenderer } from "../renderer/MapRenderer.ts";
import { GameState } from "../state/GameState.ts";
import { Pathfinding } from "./Pathfinding";
import { TileType } from "../objects/Tile.ts";


export type MapData = {
	width: number;
	height: number;
	groundLayer: TileType[][];
	objectsLayer: (TileType | null)[][];
	spawnPoints: {
		entente: { x: number; y: number }[];
		alliance: { x: number; y: number }[];
	};
};

export const TILE_SIZE = 32;
export const UNIT_SIZE = 48;

export class MapManager {
	private readonly scene: Phaser.Scene;
	readonly mapData: MapData;
	private objectSprites: Phaser.GameObjects.Sprite[][] = [];
	pathfinder: Pathfinding;
	private readonly camera: Phaser.Cameras.Scene2D.Camera;
	readonly tileRenderer: MapRenderer;

	constructor(scene: Phaser.Scene, mapData: MapData) {
		this.scene = scene;
		this.mapData = mapData;
		this.pathfinder = new Pathfinding(
			mapData.groundLayer,
			mapData.objectsLayer,
		);

		this.camera = scene.cameras.main;
		this.camera.setBounds(
			0,
			0,
			mapData.width * TILE_SIZE,
			mapData.height * TILE_SIZE,
		);
		this.tileRenderer = new MapRenderer(
			scene,
			this.mapData.groundLayer,
			this.mapData.objectsLayer,
		);

		CameraController.enable(scene, this.camera);
		GameState.camera = this.camera;
		this.createMapSprites();
	}

	private createMapSprites() {
		const { width, height, objectsLayer } = this.mapData;

		for (let y = 0; y < height; y++) {
			this.objectSprites[y] = [];
			for (let x = 0; x < width; x++) {
				if (!objectsLayer[y][x]) continue;
				this.objectSprites[y][x] = this.tileRenderer.drawObjectTile(
					objectsLayer[y][x] as TileType,
					x,
					y,
				) as Phaser.GameObjects.Sprite;
			}
		}

		this.drawTileGrid();
	}

	private drawTileGrid() {
		const graphics = this.scene.add.graphics();
		graphics.lineStyle(1, 0x000000, 0.3);

		const { width, height } = this.mapData;
		for (let x = 0; x <= width; x++) {
			graphics.moveTo(x * TILE_SIZE, 0);
			graphics.lineTo(x * TILE_SIZE, height * TILE_SIZE);
		}

		for (let y = 0; y <= height; y++) {
			graphics.moveTo(0, y * TILE_SIZE);
			graphics.lineTo(width * TILE_SIZE, y * TILE_SIZE);
		}

		graphics.strokePath();
	}

	public updateObjectTile(x: number, y: number, newType: TileType | null) {
		const oldSprite = this.objectSprites[y][x];
		if (oldSprite) oldSprite.destroy();

		this.mapData.objectsLayer[y][x] = newType;

		if (newType !== null) {
			this.objectSprites[y][x] = this.tileRenderer.drawObjectTile(
				newType,
				x,
				y,
			) as Phaser.GameObjects.Sprite;
		}
	}

	getSpawnPoints(team: UnitTeamType) {
		return this.mapData.spawnPoints[team];
	}
}

export function worldToGrid(x: number, y: number) {
	return { x: Math.floor(x / TILE_SIZE), y: Math.floor(y / TILE_SIZE) };
}

export function gridToWorld(gx: number, gy: number) {
	return {
		x: gx * TILE_SIZE + TILE_SIZE / 2,
		y: gy * TILE_SIZE + TILE_SIZE / 2,
	};
}
