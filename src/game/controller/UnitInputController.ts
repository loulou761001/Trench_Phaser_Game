import { Unit } from "../objects/Unit";
import { GameState } from "../state/GameState.ts";

import Pointer = Phaser.Input.Pointer;

import { ArtilleryShell } from "../objects/ArtilleryShell.ts";

export class UnitInputController {
	constructor() {
		this.initMouseControls();
	}

	static init() {
		return new UnitInputController();
	}

	private initMouseControls() {
		for (const unit of GameState.unitManager.getAllUnits()) {
			unit.on("pointerdown", (pointer: Pointer) => {
				if (!unit.isAlive) return;
				pointer.event.stopPropagation();
				if (pointer.button === 0) {
					GameState.selection.select(unit);
				}
			});
		}

		GameState.scene.input.keyboard?.on("keydown-SPACE", () => {
			this.handleSpacebar();
		});

		GameState.scene.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
			pointer.event.stopPropagation();
			if (pointer.button === 2) {
				// right click
				this.handleRightClick(pointer);
			} else if (pointer.button === 0) {
				// left click
				this.handleLeftClick(pointer);
			}
		});
	}

	private handleLeftClick(pointer: Pointer) {
		const clickedObjects = GameState.scene.input.hitTestPointer(pointer);
		if (clickedObjects.length === 0) {
			GameState.selection.clear();
		} else {
			const clickedObject = clickedObjects[0];
			if (clickedObject instanceof Unit && clickedObject.isAlive) {
				GameState.selection.select(clickedObject);
			}
		}
	}

	private handleSpacebar() {
		const pointer = GameState.scene.input.activePointer; // current mouse position

		const artilleryShell = new ArtilleryShell(
			{ worldX: pointer.worldX, worldY: pointer.worldY },
			75,
			"HE",
		);
		artilleryShell.explode();
	}

	private handleRightClick(pointer: Pointer) {
		if (GameState.selection.getSelected().length === 0) return;
		const clickedObjects = GameState.scene.input.hitTestPointer(pointer);
		if (clickedObjects.length > 0) {
			const clickedObject = clickedObjects[0];
			if (clickedObject instanceof Unit && clickedObject.isAlive) {
				GameState.selection.getSelected()[0].fireShot();
			}
		} else {
			GameState.unitManager.moveSelectedTo(pointer.worldX, pointer.worldY);
		}
	}
}
