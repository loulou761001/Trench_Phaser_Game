import { GameState } from "../state/GameState.ts";

export type WeaponTypeType =
	| "rifle"
	| "sniper"
	| "HMG"
	| "LMG"
	| "melee"
	| "pistol"
	| "grenade";

const lowAccuracyWeapons: WeaponTypeType[] = ["LMG", "HMG", "pistol"];

export type WeaponConfigType = {
	name: string;
	type: WeaponTypeType;
	lethality: number;
	range: number;
	shotsPerSecond: number;
	magSize?: number;
	totalAmmo?: number;
	accuracy?: number;
	sound?: Phaser.Sound.WebAudioSound;
};

export class Weapon {
	name: string;
	type: WeaponTypeType;
	lethality: number; // in decimal (0.0 -> 1.0)
	range: number; // in pixels
	accuracy: number; // in decimal (0.0 -> 1.0)
	shotsPerSecond: number;
	magSize: number | null;
	totalAmmo: number;
	sound?: Phaser.Sound.WebAudioSound;
	activeState: {
		canFire: boolean;
		roundsFired: number;
		fireCooldown: number | null;
		isFirstShot: boolean;
	};

	constructor(config: WeaponConfigType) {
		this.name = config.name;
		this.type = config.type;
		this.lethality = config.lethality;
		this.accuracy =
			config.accuracy ?? (lowAccuracyWeapons.includes(this.type) ? 0.7 : 1);
		this.range = config.range;
		this.shotsPerSecond = config.shotsPerSecond;
		this.magSize = config.magSize ?? null;
		this.totalAmmo = config.totalAmmo ?? Infinity;
		this.sound = config.sound;
		this.activeState = {
			canFire: true,
			roundsFired: 0,
			fireCooldown: null,
			isFirstShot: true,
		};
	}

	playSound() {
		if (this.type === "melee" || this.type === "grenade") return;
		if (!this.sound) {
			this.sound = GameState.scene.sound
				.add(this.getDefaultSound() as string)
				.setDetune(this.getSoundDetune()) as Phaser.Sound.WebAudioSound;
		}
		this.sound.play();
		if (this.type === "rifle" || this.type === "sniper") {
			setTimeout(
				() =>
					GameState.scene.sound.play("rifle_bolt", {
						detune: this.getSoundDetune(),
						volume: 0.1,
					}),
				500,
			);
		}
	}

	private getDefaultSound() {
		switch (this.type) {
			case "rifle":
			case "sniper":
				return "rifle_fire";
			case "HMG":
			case "LMG":
				return "mg_fire";
			case "melee":
				return "melee_hit";
			case "pistol":
				return "pistol_fire";
		}
	}

	private getSoundDetune() {
		return Math.floor(Math.random() * (50 - -50 + 1)) + -50;
	}

	drawTracer(x1: number, y1: number, x2: number, y2: number) {
		const graphics = GameState.scene.add.graphics();
		graphics.lineStyle(1, 0xf8ff75, 0.6).setDepth(2);
		graphics.beginPath();
		graphics.moveTo(x1, y1);
		graphics.lineTo(x2, y2);
		graphics.strokePath();
		setTimeout(() => graphics.destroy(), 100);
	}
}

// BASE RANGES:
// - RIFLE: 800
// - MG: 780
// - SNIPER: 1100
// - MELEE: 32
// - GRENADE: 120

enum WeaponBaseRange {
	RIFLE = 800,
	MG = 780,
	SNIPER = 1100,
	MELEE = 32,
	GRENADE = 120,
}

// --- Preset weapons ---
export const WEAPONS: { [index: string]: WeaponConfigType } = {
	Lebel: {
		name: "Lebel Mle1886",
		type: "rifle",
		lethality: 0.85,
		range: WeaponBaseRange.RIFLE,
		shotsPerSecond: 0.18,
		magSize: 8,
	},
	G98: {
		name: "Gewehr 98",
		type: "rifle",
		lethality: 0.85,
		range: WeaponBaseRange.RIFLE,
		shotsPerSecond: 0.25,
		magSize: 5,
	},
	Mg08: {
		name: "MG-08",
		type: "HMG",
		lethality: 0.75,
		range: WeaponBaseRange.MG,
		shotsPerSecond: 8,
		magSize: 250,
	},
	StEtienne1907: {
		name: "St-Etienne Mle1907",
		type: "HMG",
		lethality: 0.8,
		range: WeaponBaseRange.MG + 30,
		shotsPerSecond: 6,
		magSize: 20,
	},
	club: {
		name: "Trench club",
		type: "melee",
		lethality: 0.6,
		range: WeaponBaseRange.MELEE,
		shotsPerSecond: 0.5,
	},
	grenadePack: {
		name: "Grenade",
		type: "grenade",
		lethality: 0.8,
		range: WeaponBaseRange.GRENADE,
		shotsPerSecond: 0.1,
		totalAmmo: 3,
	},
};
