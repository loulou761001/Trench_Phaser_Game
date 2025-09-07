import Phaser from "phaser";
import type { AiStateType } from "../core/ai/UnitAi.ts";
import { gridToWorld, TILE_SIZE, TileTypes, UNIT_SIZE, worldToGrid, } from "../core/MapManager";
import { detectBulletHit } from "../helpers/ShotCalculationsHelper.ts";
import { calculateMoraleLoss, checkWeaponCooldown, getAimTime, getCoverBonus, } from "../helpers/UnitHelper.ts";
import { GameState } from "../state/GameState.ts";
import type { PathType } from "./Path";
import type { Trench } from "./Trench.ts";
import { Weapon, type WeaponConfigType, WEAPONS } from "./Weapon";

export type UnitTeamType = "entente" | "alliance";

type StanceType = "standing" | "suppressed" | "prone" | "crouching";
type SkillType = "militia" | "trained" | "wellTrained" | "elite";

export type UnitConfig = {
  name: string;
  atlas: string;
  weapon: WeaponConfigType;
  team: UnitTeamType;
  skill?: SkillType;
  speed?: number;
};

export const skillBonuses = {
  militia: { accuracy: 0.7, aimSeconds: 1.8, melee: 0.6 },
  trained: { accuracy: 1.0, aimSeconds: 1.5, melee: 0.8 },
  wellTrained: { accuracy: 1.1, aimSeconds: 1.2, melee: 1 },
  elite: { accuracy: 1.3, aimSeconds: 0.8, melee: 1.2 },
};

const SuppressionThresholds = Object.freeze({
  CROUCH: 75,
  PRONE: 50,
  SUPPRESSED: 30,
  RETREAT: 10,
});

export class Unit extends Phaser.GameObjects.Sprite {
  // --- Fields ---
  stance: StanceType = "standing";
  morale = 100;
  isAlive = true;
  isCalculatingPath = false;
  path: PathType = [];
  aiState: AiStateType = "idle";
  targetTrench: Trench | null = null;

  weapon: Weapon;
  team: UnitTeamType;
  skill: SkillType;
  name: string;
  textureAtlas: string;
  originalSpeed: number;
  speed: number;
  selectionCircle?: Phaser.GameObjects.Arc;

  // --- Constructor ---
  constructor(
    pos: { x: number; y: number },
    name: string,
    atlas: string,
    weapon: WeaponConfigType,
    team: UnitTeamType,
    skill?: SkillType,
    speed?: number,
  ) {
    super(GameState.scene, pos.x, pos.y, atlas, "standing");

    this.textureAtlas = atlas;
    this.weapon = new Weapon(weapon);
    this.team = team;
    this.name = name;
    this.skill = skill ?? "trained";
    this.originalSpeed = speed ?? 120;
    this.speed = this.originalSpeed;

    this.scene.add.existing(this);
    this.setScale(this.getSpriteScale());
    this.setDepth(2);
    this.setInteractive({ cursor: "pointer" });
  }

  // --- Update & Checks ---
  update(delta: number) {
    if (!this.isAlive) return;

    checkWeaponCooldown(delta, this);
    this.checkMorale();

    const moraleIncrement = parseFloat((delta / 1000).toFixed(3));
    if (this.morale < 100) {
      this.morale += moraleIncrement;
    }

    if (this.stance !== "suppressed") {
      this.move(delta);
    }

    if (this.selectionCircle?.visible) {
      this.selectionCircle.x = this.x;
      this.selectionCircle.y = this.y;
    }
  }

  checkMorale() {
    if (this.morale < SuppressionThresholds.SUPPRESSED)
      this.changeStance("suppressed");
    else if (
      this.morale < SuppressionThresholds.PRONE &&
      this.checkCurrentTerrain() !== TileTypes.TRENCH
    )
      this.changeStance("prone");
    else if (this.morale < SuppressionThresholds.CROUCH)
      this.changeStance("crouching");
    else this.changeStance("standing");
  }

  private checkCurrentTerrain() {
    const gridCoods = worldToGrid(this.x, this.y);
    return (
      GameState.mapManager?.mapData.objectsLayer[gridCoods.gy][gridCoods.gx] ??
      TileTypes.GROUND
    );
  }

  select() {
    const isSelected = GameState.selection.getSelected().includes(this);
    if (!this.selectionCircle) {
      this.selectionCircle = this.scene.add
        .circle(this.x, this.y, 12, 0xffff00, 0)
        .setStrokeStyle(2, 0xffff00)
        .setDepth(this.depth);
    }
    this.selectionCircle.setVisible(isSelected);
  }

  // --- Movement & Pathfinding ---
  async findPath(worldX: number, worldY: number) {
    this.isCalculatingPath = true;
    const startX = Math.floor(this.x / TILE_SIZE);
    const startY = Math.floor(this.y / TILE_SIZE);
    const endX = Math.floor(worldX / TILE_SIZE);
    const endY = Math.floor(worldY / TILE_SIZE);

    const path = await GameState.pathfinder?.findPath(
      startX,
      startY,
      endX,
      endY,
    );
    if (path) this.path = path.map((p) => gridToWorld(p.x, p.y));
    this.isCalculatingPath = false;
  }

  private move(delta: number) {
    if (!this.path.length) return;

    this.aiState = "moving";
    const target = this.path[0];
    const dx = target.x - this.x;
    const dy = target.y - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    this.rotation = Phaser.Math.Angle.Between(
      this.x,
      this.y,
      target.x,
      target.y,
    );

    if (dist < 2) this.path.shift();
    else {
      let speedModifier = 1
      switch (this.checkCurrentTerrain()) {
        case TileTypes.BARBED_WIRE:
          speedModifier = 4;
          break;
        case TileTypes.CRATER:
          speedModifier = 1.5;
          break;
      }
      const moveSpeed
        = this.speed / speedModifier
      const move = (moveSpeed * delta) / 1000;
      this.x += (dx / dist) * move;
      this.y += (dy / dist) * move;
    }
  }

  changeStance(st: StanceType) {
    this.stance = st;
    switch (st) {
      case "standing":
        this.speed = this.originalSpeed;
        break;
      case "suppressed":
      case "prone":
        this.speed = this.originalSpeed / 3;
        break;
      case "crouching":
        this.speed = this.originalSpeed / 2;
        break;
    }
    const newFrame = st === "suppressed" ? "prone" : st;
    this.setTexture(this.textureAtlas, newFrame);
  }

  // --- Combat & Shooting ---
  fireShot(target: Unit) {
    if (!this.weapon.activeState.canFire) return;
    this.weapon.activeState.canFire = false;
    this.aiState = "attacking";
    this.path = [];

    const aimTimeMs = this.weapon.activeState.isFirstShot
      ? getAimTime(target, this)
      : 0;

    this.scene.time.delayedCall(aimTimeMs, () => {
      if (!this.isAlive) return;

      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const angle = Math.atan2(dy, dx);
      this.rotation = angle;

      const baseAngle = 60

      const spreadAngle = Phaser.Math.DegToRad(
        baseAngle * this.weapon.accuracy * skillBonuses[this.skill].accuracy,
      );
      const finalAngle = angle + (Math.random() - 0.5) * spreadAngle;

      const bulletLine = new Phaser.Geom.Line(
        this.x,
        this.y,
        this.x + Math.cos(finalAngle) * this.weapon.range,
        this.y + Math.sin(finalAngle) * this.weapon.range,
      );

      const { closestHit, nearMisses } = detectBulletHit(
        bulletLine,
        this,
        true,
      );
      if (closestHit) {
        closestHit.target.receiveHit(this.weapon);
        bulletLine.x2 = closestHit.point.x;
        bulletLine.y2 = closestHit.point.y;
      }

      for (const nearMiss of nearMisses) {
        if (nearMiss.unit.isAlive) {
          nearMiss.unit.morale -= calculateMoraleLoss(nearMiss.distance);
        }
      }

      this.weapon.drawTracer(
        bulletLine.x1,
        bulletLine.y1,
        bulletLine.x2,
        bulletLine.y2,
      );
      this.weapon.playSound();

      this.aiState = "idle";
      this.weapon.activeState.isFirstShot = !target.isAlive;
    });
  }

  receiveHit(weapon: Weapon) {
    if (Math.random() < weapon.lethality / getCoverBonus(this)) {
      this.die();
    }
  }

  die() {
    this.select();
    const frameIndex = Math.floor(Math.random() * 3) + 1;
    const blood = this.scene.add.sprite(
      this.x,
      this.y,
      "blood",
      `blood${frameIndex}`,
    );
    blood
      .setDepth(this.depth - 0.1)
      .setAlpha(0.7)
      .setAngle(Math.random() * 360 + 1)
      .setScale(Math.random() * 0.2 + 0.2);
    this.disableInteractive(true);
    this.isAlive = false;
    this.setTexture(this.textureAtlas, `dead0${frameIndex}`);
  }

  // --- Helpers / Utilities ---

  private getSpriteScale() {
    const frame = this.frame;
    return Math.min(UNIT_SIZE / frame.width, UNIT_SIZE / frame.height);
  }
}

export const UNITS: { [index: string]: UnitConfig } = {
  EarlyFrenchRifle: {
    name: "Rifleman",
    atlas: "french_early_rifle",
    weapon: WEAPONS.Lebel,
    team: "entente",
  },
  EarlyFrenchMg: {
    name: "Machine-gunner",
    atlas: "french_early_rifle",
    weapon: WEAPONS.StEtienne1907,
    team: "entente",
    speed: 100,
  },
  EarlyGermanRifle: {
    name: "Rifleman",
    atlas: "german_early_rifle",
    weapon: WEAPONS.G98,
    team: "alliance",
  },
  EarlyGermanMg: {
    name: "Machine-gunner",
    atlas: "german_early_rifle",
    weapon: WEAPONS.Mg08,
    team: "alliance",
    speed: 100,
  },
};
