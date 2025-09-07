import { Scene } from "phaser";
import { UnitInputController } from "../controller/UnitInputController.ts";
import { generateMap } from "../core/MapGenerator";
import { MapManager } from "../core/MapManager";
import { UNITS } from "../objects/Unit";
import { GameState } from "../state/GameState.ts";

export class Battle extends Scene {
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
				Math.random() < 0.95 ? UNITS.EarlyFrenchRifle : UNITS.EarlyFrenchMg,
			);
		});

		// Spawn enemies
		const enemySpawns = GameState.mapManager.getSpawnPoints("alliance");
		enemySpawns.forEach((p) => {
			GameState.unitManager.spawnUnit(
				p.x,
				p.y,
				Math.random() < 0.95 ? UNITS.EarlyGermanRifle : UNITS.EarlyGermanMg,
			);
		});
	}

	private initGameState() {
		GameState.mapManager = new MapManager(this, generateMap(40, 80, 20, 25));
		GameState.scene = this;
		GameState.pathfinder = GameState.mapManager.pathfinder;
	}

	private debugSelectedUnits() {
		const selected = GameState.selection.getSelected();
		for (const unit of selected) {
			console.log(unit);
		}
	}

	update(_time: number, delta: number) {
		this.debugSelectedUnits();
		GameState.unitManager.update(delta);
		GameState.mapManager?.pathfinder.update();
	}
}
