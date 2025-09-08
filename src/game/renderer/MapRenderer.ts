import type Phaser from "phaser";
import { gridToWorld, TILE_SIZE, } from "../core/MapManager";
import { type TileType, TileTypes } from "../objects/Tile.ts";

export class MapRenderer {
  // private readonly groundTiles: TileType[][];
  private readonly objectTiles: (TileType | null)[][];
  private readonly scene: Phaser.Scene;

  constructor(
    scene: Phaser.Scene,
    _groundTiles: TileType[][],
    objectTiles: (TileType | null)[][],
  ) {
    this.scene = scene;
    // this.groundTiles = groundTiles;
    this.objectTiles = objectTiles;
  }

  public drawGroundTile(tileType: TileType, x: number, y: number) {
    switch (tileType) {
      case TileTypes.GROUND:
        return this.drawGround(x, y);
      default:
        return this.drawGround(x, y);
    }
  }

  public drawObjectTile(tileType: TileType, x: number, y: number) {
    switch (tileType) {
      case TileTypes.BARBED_WIRE:
        return this.drawBarbedWire(x, y);
      case TileTypes.TRENCH:
      case (TileTypes.PARAPET):
        return this.drawTrench(x, y);
      case TileTypes.CRATER:
        // simplified crater drawing: always center on this tile
        return this.drawCrater(x, y);
      default:
        return null;
    }
  }

  private drawGround(x: number, y: number) {
    return this.scene.add.rectangle(
      x * TILE_SIZE + TILE_SIZE / 2,
      y * TILE_SIZE + TILE_SIZE / 2,
      TILE_SIZE,
      TILE_SIZE,
      0x37692f,
    );
  }

  private drawTrench(x: number, y: number) {
    const trenchTiles = [TileTypes.TRENCH, TileTypes.PARAPET]
    const connectedSides = {
      right:
        x < this.objectTiles[0].length - 1 &&
        trenchTiles.includes(this.objectTiles[y][x + 1] as TileType),
      left: x > 0 && trenchTiles.includes(this.objectTiles[y][x - 1] as TileType),
      top: y > 0 && trenchTiles.includes(this.objectTiles[y - 1][x] as TileType),
      bottom:
        y < this.objectTiles.length - 1 &&
        trenchTiles.includes(this.objectTiles[y + 1][x] as TileType),
    };

    const sides = Object.values(connectedSides);
    const count = sides.filter(Boolean).length;

    let sprite: string;
    let angle = 0;

    if (count === 4) {
      sprite = "trench_cross";
    } else if (count === 0) {
      sprite = "trench_square";
    } else if (count === 3) {
      sprite = "trench_t";
      if (!connectedSides.right) {
        angle = -90;
      } else if (!connectedSides.left) {
        angle = 90;
      } else if (!connectedSides.top) {
        angle = 180;
      }
    } else if (
      (connectedSides.right && connectedSides.left) ||
      (connectedSides.top && connectedSides.bottom)
    ) {
      sprite = "trench_straight";
      if (connectedSides.top && connectedSides.bottom) angle = 90;
    } else if (
      (connectedSides.right && connectedSides.bottom) ||
      (connectedSides.left && connectedSides.top)
    ) {
      sprite = "trench_turn_left";
      if (connectedSides.left) angle = 180;
    } else if (
      (connectedSides.right && connectedSides.top) ||
      (connectedSides.left && connectedSides.bottom)
    ) {
      sprite = "trench_turn_right";
      if (connectedSides.left) angle = 180;
    } else {
      sprite = "trench_end";
      if (connectedSides.left) {
        angle = 180;
      } else if (connectedSides.bottom) {
        angle = 90;
      } else if (connectedSides.top) {
        angle = -90;
      }
    }
    const gridPos = gridToWorld(x, y);
    const groundSprite = this.objectTiles[y][x]?.type === "parapet" ? "parapet" : "dirt"
    this.scene.add
      .sprite(gridPos.x, gridPos.y, groundSprite)
      .setDisplaySize(TILE_SIZE, TILE_SIZE)
      .setDepth(-1)

    return this.scene.add
      .sprite(gridPos.x, gridPos.y, sprite)
      .setAngle(angle)
      .setDisplaySize(TILE_SIZE, TILE_SIZE);
  }

  private drawBarbedWire(x: number, y: number) {
    return this.scene.add
      .sprite(
        x * TILE_SIZE + TILE_SIZE / 2,
        y * TILE_SIZE + TILE_SIZE / 2,
        "barbed_wire",
      )
      .setDisplaySize(TILE_SIZE, TILE_SIZE / 1.5)
      .setAngle(Math.random() * 20 - 10);
  }

  private drawCrater(x: number, y: number) {
    const isMiddle = this.isMiddleCrater(x, y);
    if (!isMiddle) return null;

    return this.scene.add
      .sprite(
        x * TILE_SIZE + TILE_SIZE / 2,
        y * TILE_SIZE + TILE_SIZE / 2,
        "crater",
      )
      .setDisplaySize(TILE_SIZE * 3, TILE_SIZE * 3)
      .setOrigin(0.5)
      .setAngle(Math.random() * 360);
  }

  private isMiddleCrater(x: number, y: number) {
    const tiles = this.objectTiles;
    if (x === 0 || y === 0 || x >= tiles[0].length - 1 || y >= tiles.length - 1)
      return false;

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (tiles[y + dy][x + dx] !== TileTypes.CRATER) return false;
      }
    }
    return true;
  }
}
