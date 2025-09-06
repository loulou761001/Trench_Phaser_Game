import { Scene } from "phaser";
import { UnitInputController } from "../controller/UnitInputController.ts";
import { generateMap } from "../core/MapGenerator";
import { MapManager } from "../core/MapManager";
import { UnitBrainManager } from "../core/UnitBrainManager.ts";
import { UNITS } from "../objects/Unit";
import { GameState } from "../state/GameState.ts";

export class Battle extends Scene {
	unitBrainManager: UnitBrainManager;

	constructor() {
		super("Battle");
	}

	create() {
		this.initGameState();
		UnitInputController.init();
		if (!GameState.mapManager) return;

		// Spawn player unitManager at spawn points
		const spawns = GameState.mapManager.getSpawnPoints("entente");
		spawns.forEach((p) => {
			GameState.unitManager.spawnUnit(
				p.x,
				p.y,
				Math.random() < 0.8 ? UNITS.EarlyFrenchRifle : UNITS.EarlyFrenchMg,
			);
		});

		// Spawn enemies
		const enemySpawns = GameState.mapManager.getSpawnPoints("alliance");
		enemySpawns.forEach((p) => {
			GameState.unitManager.spawnUnit(
				p.x,
				p.y,
				Math.random() < 0.8 ? UNITS.EarlyGermanRifle : UNITS.EarlyGermanMg,
			);
		});

		this.unitBrainManager = new UnitBrainManager();
	}

	private initGameState() {
		GameState.mapManager = new MapManager(this, generateMap());
		GameState.scene = this;
		GameState.pathfinder = GameState.mapManager.pathfinder;
	}

	update(_time: number, delta: number) {
		GameState.unitManager.update(delta);
		GameState.mapManager?.pathfinder.update();
		this.unitBrainManager.update();
	}
}
