export type TileTypeType =
	| "crater"
	| "barbedWire"
	| "trench"
	| "ground"
	| "parapet";

export type TileType = {
	type: TileTypeType;
	walkable: boolean;
	coverBonus: number; // for adding
	movementCost: number; // for EasyStar
	speedMultiplier: number; // higher = faster
	destructible?: boolean;
};
export const TileTypes: Readonly<{ [index: string]: TileType }> = Object.freeze(
	{
		GROUND: {
			type: "ground",
			walkable: true,
			movementCost: 3,
			speedMultiplier: 1,
			destructible: false,
			coverBonus: 0,
		},
		TRENCH: {
			type: "trench",
			walkable: true,
			movementCost: 1,
			speedMultiplier: 0.8,
			destructible: false,
			coverBonus: 2,
		},
		PARAPET: {
			type: "parapet",
			walkable: true,
			movementCost: 2,
			speedMultiplier: 0.8,
			destructible: false,
			coverBonus: 2.5,
		},
		BARBED_WIRE: {
			type: "barbedWire",
			walkable: true,
			movementCost: 18,
			speedMultiplier: 0.25,
			destructible: false,
			coverBonus: -0.5,
		},
		CRATER: {
			type: "crater",
			walkable: true,
			movementCost: 3,
			speedMultiplier: 0.75,
			destructible: false,
			coverBonus: 1,
		},
	},
);
