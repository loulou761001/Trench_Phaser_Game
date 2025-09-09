import Phaser from "phaser";
import { UnitAi } from "../core/ai/UnitAi.ts";
import { gridToWorld, TILE_SIZE, UNIT_SIZE, worldToGrid, } from "../core/MapManager";
import { areInSameTrench } from "../helpers/MapHelper.ts";
import { detectBulletHit } from "../helpers/ShotCalculationsHelper.ts";
import { calculateMoraleLoss, checkWeaponCooldown, getAimTime, getCoverBonus, } from "../helpers/UnitHelper.ts";
import { GameState } from "../state/GameState.ts";
import type { PathType } from "./Path";
import { Weapon, type WeaponConfigType, WEAPONS, WeaponTypeType } from "./Weapon";
import { TileTypes } from "./Tile.ts";
import { generateExplosion } from "../helpers/ExplosionHelper.ts";

export type UnitTeamType = "entente" | "alliance";

type StanceType = "standing" | "suppressed" | "prone" | "crouching";
type SkillType = "militia" | "trained" | "wellTrained" | "elite";

export type UnitConfig = {
  name: string;
  atlas: string;
  weapon: WeaponConfigType[];
  team: UnitTeamType;
  skill?: SkillType;
  speed?: number;
};

export const skillBonuses = {
  militia: { accuracy: 0.7, aimSeconds: 1.8, melee: 0.6, moraleBonus: -1 },
  trained: { accuracy: 1.0, aimSeconds: 1.5, melee: 0.8, moraleBonus: 0 },
  wellTrained: { accuracy: 1.1, aimSeconds: 1.2, melee: 1, moraleBonus: 1 },
  elite: { accuracy: 1.3, aimSeconds: 0.8, melee: 1.2, moraleBonus: 2 },
};

const SuppressionThresholds = Object.freeze({
  CROUCH: 75,
  PRONE: 50,
  SUPPRESSED: 15,
  RETREAT: 5,
});

export class Unit extends Phaser.GameObjects.Sprite {
  // --- Fields ---
  stance: StanceType = "standing";
  morale = 100;
  isAlive = true;
  path: PathType = [];
  unitAi: UnitAi;

  weapons: Weapon[] = [];
  equippedWeapon: number = 0;
  team: UnitTeamType;
  skill: SkillType;
  name: string;
  textureAtlas: string;
  originalSpeed: number;
  speed: number;
  underCircle?: Phaser.GameObjects.Arc;
  shadow: Phaser.GameObjects.Arc;

  // --- Constructor ---
  constructor(
    pos: { x: number; y: number },
    name: string,
    atlas: string,
    weapons: WeaponConfigType[],
    team: UnitTeamType,
    skill?: SkillType,
    speed?: number,
  ) {
    super(GameState.scene, pos.x, pos.y, atlas, "standing");

    this.textureAtlas = atlas;
    for (const weapon of weapons) {
      this.weapons.push(new Weapon(weapon));
    }
    this.team = team;
    this.name = name;
    this.skill = skill ?? "trained";
    this.originalSpeed = speed ?? 120;
    this.speed = this.originalSpeed;
    this.underCircle = this.scene.add
      .circle(this.x, this.y, 12, 0xffff00, 0)
      .setDepth(this.depth);
    this.shadow = this.scene.add
      .circle(this.x, this.y, 11, 0x000000, 0.15)
      .setDepth(this.depth - 0.05);


    this.unitAi = new UnitAi(this);

    this.scene.add.existing(this);
    this.setScale(this.getSpriteScale());
    this.setDepth(2);
    this.setInteractive({ cursor: "pointer" });
  }

  // --- Update & Checks ---
  update(delta: number) {
    if (!this.isAlive) {
      return
    }

    checkWeaponCooldown(delta, this);
    this.checkMorale();

    const moraleIncrement = parseFloat((delta / 800).toFixed(3));
    if (this.morale < 100) {
      this.morale += moraleIncrement;
    }

    if (this.unitAi.currentState.isMoving) {
      this.move(delta);
    }
    this.shadow.x = this.x;
    this.shadow.y = this.y;
    const isSelected = GameState.selection.getSelected().includes(this);
    const isSuppressed = this.morale < SuppressionThresholds.SUPPRESSED
    this.underCircle?.setVisible(isSuppressed || isSelected)
    if (this.underCircle?.visible) {

      const selectionColor = 0xffff00
      const suppressionColor = 0xffffff
      this.underCircle
        .setFillStyle(suppressionColor, isSuppressed ? 0.9 : 0)
        .setStrokeStyle(2, selectionColor, isSelected ? 1 : 0)
      this.underCircle.x = this.x;
      this.underCircle.y = this.y;
    }


    if (this.unitAi) {
      this.unitAi.update(delta);
      this.unitAi.currentState.isMoving =
        this.path.length > 0 && this.stance !== "suppressed";

      this.unitAi.currentState.isAttacking =
        !!this.unitAi.currentState.target && this.stance !== "suppressed";

      if (this.unitAi.currentState.isAttacking) {
        this.fireShot();
      }
    }
  }

  checkMorale() {
    if (this.morale < SuppressionThresholds.SUPPRESSED)
      this.changeStance("suppressed");
    else if (
      this.morale < SuppressionThresholds.PRONE &&
      this.getCurrentTerrain() !== TileTypes.TRENCH
    )
      this.changeStance("prone");
    else if (this.morale < SuppressionThresholds.CROUCH)
      this.changeStance("crouching");
    else this.changeStance("standing");
  }

  getCurrentTerrain() {
    const gridCoods = worldToGrid(this.x, this.y);
    return (
      GameState.mapManager?.mapData.objectsLayer[gridCoods.y][gridCoods.x] ??
      TileTypes.GROUND
    );
  }

  // --- Movement & Pathfinding ---
  async findPath(worldX: number, worldY: number) {
    this.unitAi.isCalculatingPath = true;
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
    this.unitAi.isCalculatingPath = false;
  }

  private move(delta: number) {
    if (!this.path.length) {
      return;
    }

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

    if (dist < 2) {
      this.path.shift();
    } else {
      let speedModifier = this.getCurrentTerrain().speedMultiplier;
      const moveSpeed = this.speed * speedModifier;
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
  targetEnemy(target: Unit | null) {
    if (target?.isAlive) {
      this.unitAi.currentState.target = target;
      this.weapons[this.equippedWeapon].activeState.isFirstShot = true;
    } else {
      this.unitAi.currentState.target = null;
    }
  }

  throwGrenade() {

    const currentTarget = this.unitAi.currentState.target
    const grenade = this.getGrenades()
    const canFireGrenade = (
      !!currentTarget &&
      grenade?.activeState.canFire &&
      grenade.totalAmmo > 0 &&
      Phaser.Math.Distance.Between(this.x, this.y, currentTarget.x, currentTarget.y) <= grenade.range &&
      Math.random() < 0.2
    )
    if (!canFireGrenade) return
    generateExplosion(120, 24, 0.8, { worldX: currentTarget.x, worldY: currentTarget.y })
    grenade.totalAmmo--
  }

  fireShot() {
    const equippedWeapon = this.getEquippedWeapon()
    const currentTarget = this.unitAi.currentState.target
    if (
      !equippedWeapon.activeState.canFire ||
      !currentTarget
    ) {
      return;
    }
    // TODO: clean up
    this.throwGrenade()

    equippedWeapon.activeState.canFire = false;

    const aimTimeMs = equippedWeapon.activeState.isFirstShot
      ? getAimTime(currentTarget, this)
      : 0;

    this.scene.time.delayedCall(aimTimeMs, () => {
      if (!this.isAlive || !this.unitAi.currentState.target) return;

      const dx = this.unitAi.currentState.target.x - this.x;
      const dy = this.unitAi.currentState.target.y - this.y;

      // Rotate sprite
      const angle = Math.atan2(dy, dx);
      this.rotation = angle;

      const baseAngle = 60;

      const spreadAngle = Phaser.Math.DegToRad(
        baseAngle *
        (this.unitAi.currentState.isMoving ? 2 : 1) *
        equippedWeapon.accuracy *
        skillBonuses[this.skill].accuracy,
      );
      const finalAngle = angle + (Math.random() - 0.5) * spreadAngle;

      const bulletLine = new Phaser.Geom.Line(
        this.x,
        this.y,
        this.x + Math.cos(finalAngle) * equippedWeapon.range,
        this.y + Math.sin(finalAngle) * equippedWeapon.range,
      );

      const { closestHit, nearMisses } = detectBulletHit(
        bulletLine,
        this,
        true,
      );
      if (closestHit && closestHit.target.team === this.team) {
        equippedWeapon.activeState.canFire = true;
        equippedWeapon.activeState.fireCooldown = null;
        return;
      }
      if (closestHit) {
        const sameTrench = areInSameTrench(
          { worldX: closestHit.point.x, worldY: closestHit.point.y },
          { worldX: bulletLine.x1, worldY: bulletLine.y1 },
        );
        closestHit.target.receiveHit(
          equippedWeapon.type,
          equippedWeapon.lethality,
          sameTrench,
        );
        if (!closestHit.target.isAlive) {
          // Slight morale boost when killing enemy
          this.morale += 3 + skillBonuses[this.skill].moraleBonus;
        }
        bulletLine.x2 = closestHit.point.x;
        bulletLine.y2 = closestHit.point.y;
      }

      for (const nearMiss of nearMisses) {
        if (nearMiss.unit.isAlive) {
          nearMiss.unit.morale -= calculateMoraleLoss(
            nearMiss.unit,
            nearMiss.distance,
          );
        }
      }

      equippedWeapon.drawTracer(
        bulletLine.x1,
        bulletLine.y1,
        bulletLine.x2,
        bulletLine.y2,
      );
      equippedWeapon.playSound();

      equippedWeapon.activeState.isFirstShot = false;
      equippedWeapon.activeState.roundsFired++;
    });
  }

  receiveHit(weaponType: WeaponTypeType, weaponLethality: number, inSameTrench = false) {
    const totalLethality =
      weaponType === "melee"
        ? weaponLethality
        : weaponLethality / getCoverBonus(this, inSameTrench);
    if (Math.random() < totalLethality) {
      this.die();
    }
  }

  die() {
    if (this.underCircle) {
      this.underCircle.destroy()
    }
    this.shadow.destroy()
    const frameIndex = Math.floor(Math.random() * 3) + 1;
    this.disableInteractive(true);
    this.isAlive = false;
    this.setTexture(this.textureAtlas, `dead0${frameIndex}`);
    this.setScale(this.scale * 1.1)
    this.setDepth(this.depth - 0.1)
    this.setAngle(Math.random() * 360 + 1)
    const blood = this.scene.add.sprite(
      this.getCenter().x,
      this.getCenter().y,
      "blood",
      `blood${frameIndex}`,
    );
    blood
      .setDepth(this.depth - 0.2)
      .setAlpha(0.6)
      .setAngle(Math.random() * 360 + 1)
      .setScale(Math.random() * 0.15 + 0.15);
  }

  // --- Helpers / Utilities ---

  private getSpriteScale() {
    const frame = this.frame;
    return Math.min(UNIT_SIZE / frame.width, UNIT_SIZE / frame.height);
  }

  getGridCoods() {
    return worldToGrid(this.x, this.y);
  }

  getEquippedWeapon() {
    return this.weapons[this.equippedWeapon] ?? this.weapons[0]
  }

  getGrenades() {
    return this.weapons.find(w => w.type === "explosive") ?? null
  }
}

export const UNITS: { [index: string]: UnitConfig } = {
  EarlyFrenchRifle: {
    name: "Rifleman",
    atlas: "french_early_rifle",
    weapon: [WEAPONS.Lebel, WEAPONS.grenadePack],
    team: "entente",
  },
  EarlyFrenchMg: {
    name: "Machine-gunner",
    atlas: "french_early_rifle",
    weapon: [WEAPONS.StEtienne1907],
    team: "entente",
    speed: 100,
  },
  EarlyGermanRifle: {
    name: "Rifleman",
    atlas: "german_early_rifle",
    weapon: [WEAPONS.G98, WEAPONS.grenadePack],
    team: "alliance",
  },
  EarlyGermanMg: {
    name: "Machine-gunner",
    atlas: "german_early_rifle",
    weapon: [WEAPONS.Mg08],
    team: "alliance",
    speed: 100,
  },
};
