import { GameState } from "../state/GameState.ts";
import { UnitAi } from "./ai/UnitAi.ts";
import { TrenchManager } from "./TrenchManager";

export class UnitBrainManager {
	private readonly attackerAi: UnitAi;
	private readonly defenderAi: UnitAi;

	constructor() {
		if (!GameState.mapManager?.mapData.objectsLayer) return;
		const trenchManager = new TrenchManager(
			GameState.mapManager.mapData.objectsLayer,
		);
		this.attackerAi = new UnitAi(trenchManager, true);
		this.defenderAi = new UnitAi(trenchManager, false);
	}

	async update() {
		const attackers = GameState.unitManager
			.getAllUnits()
			.filter((u) => u.team === "alliance");
		const defenders = GameState.unitManager
			.getAllUnits()
			.filter((u) => u.team === "entente");
		for (const attacker of attackers) {
			await this.attackerAi.update(attacker);
		}
		for (const defender of defenders) {
			await this.defenderAi.update(defender);
		}
	}
}
