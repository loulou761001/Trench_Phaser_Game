import type { Scene } from "phaser";
import type { MapManager } from "../core/MapManager";
import type { Pathfinding } from "../core/Pathfinding";
import { SelectionManager } from "../core/SelectionManager";
import { UnitManager } from "../core/UnitManager";

export const GameState = {
	selection: new SelectionManager(),
	unitManager: new UnitManager(),
	mapManager: null as MapManager | null,
	// @ts-expect-error
	scene: null as Scene,
	pathfinder: null as Pathfinding | null,
	camera: null as Phaser.Cameras.Scene2D.Camera | null,
};
