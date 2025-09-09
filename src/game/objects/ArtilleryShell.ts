import { WorldCoordsType } from "../helpers/MapHelper.ts";
import { generateExplosion } from "../helpers/ExplosionHelper.ts";

export class ArtilleryShell {
	targetPos: WorldCoordsType
	caliber: number;
	type: "HE" | "airburst";

	constructor(
		targetPos: WorldCoordsType,
		caliber: number,
		type: "HE" | "airburst",
	) {
		this.targetPos = targetPos;
		this.caliber = caliber;
		this.caliber = caliber;
		this.type = type;
	}

	explode() {
		if (this.type === "HE") this.explodeHe();
	}

	private explodeHe() {
		const shrapnels = 25;
		const explosionRange = this.caliber * 3;

		generateExplosion(explosionRange, shrapnels, 0.95, this.targetPos, true)
	}
}
