// objects/Trench.ts
import type { UnitTeamType } from "./Unit.ts";

export class Trench {
	constructor(
		public x: number,
		public y: number,
		public capturedBy: UnitTeamType | null = null,
	) {}

	capture(team: UnitTeamType) {
		this.capturedBy = team;
	}
}
