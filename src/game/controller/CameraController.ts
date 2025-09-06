import Phaser from "phaser";

import Pointer = Phaser.Input.Pointer;

export class CameraController {
	static enable(scene: Phaser.Scene, cam: Phaser.Cameras.Scene2D.Camera) {
		cam.setScroll(0, 0);
		let isDragging = false;
		let dragStart = { x: 0, y: 0 };

		scene.input.on("pointerdown", (p: Pointer) => {
			if (p.button === 1) {
				isDragging = true;
				dragStart = { x: p.x + cam.scrollX, y: p.y + cam.scrollY };
			}
		});
		scene.input.on("pointerup", (p: Pointer) => {
			if (p.button === 1) {
				isDragging = false;
			}
		});
		scene.input.on("pointermove", (p: Pointer) => {
			if (isDragging) {
				cam.scrollX = dragStart.x - p.x;
				cam.scrollY = dragStart.y - p.y;
			}
		});
		scene.input.on(
			"wheel",
			(
				_p: Pointer,
				_objs: (typeof Phaser.GameObjects)[],
				_dx: number,
				dy: number,
			) => {
				cam.setZoom(Phaser.Math.Clamp(cam.zoom - dy * 0.001, 0.5, 2));
			},
		);
	}
}
