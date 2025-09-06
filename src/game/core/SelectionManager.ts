// core/SelectionManager.ts
import type { Unit } from "../objects/Unit";

export class SelectionManager {
	private selected: Unit[] = [];

	select(unit: Unit) {
		if (!this.selected.includes(unit)) {
			this.add(unit);
		} else {
			this.remove(unit);
		}
	}

	private add(unit: Unit) {
		this.selected.push(unit);
		unit.select();
	}

	private remove(unit: Unit) {
		this.selected = this.selected.filter((u) => u !== unit);
		unit.select();
	}

	clear() {
		const previouslySelectedUnits = this.selected;
		this.selected = [];
		previouslySelectedUnits.forEach((u) => {
			u.select();
		});
	}

	getSelected(): Unit[] {
		return this.selected;
	}
}
