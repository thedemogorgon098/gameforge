import type { RunnerConfig } from "@/lib/types";

export const RUNNER_WIDTH = 800;
export const RUNNER_HEIGHT = 360;

const GROUND_Y = RUNNER_HEIGHT - 44;

export interface RunnerHandle {
  destroy: () => void;
}

const hex = (color: string) => Number.parseInt(color.slice(1), 16);
const rand = (min: number, max: number) => min + Math.random() * (max - min);

/**
 * Boots a Phaser game into `parent`. Phaser (~350 KB gzipped) is imported here, so it only loads when an
 * Endless Runner is actually played. Calls `onEnd` exactly once when the run is over.
 */
export async function startRunner(
  parent: HTMLElement,
  cfg: RunnerConfig,
  onEnd: (score: number, reachedTarget: boolean) => void,
): Promise<RunnerHandle> {
  const { default: Phaser } = await import("phaser");
  type Body = Phaser.Physics.Arcade.Body;

  class RunScene extends Phaser.Scene {
    private hero!: Phaser.GameObjects.Text;
    private obstacles!: Phaser.Physics.Arcade.Group;
    private pickups!: Phaser.Physics.Arcade.Group;
    private grid!: Phaser.GameObjects.TileSprite;
    private hud!: Phaser.GameObjects.Text;
    private livesText!: Phaser.GameObjects.Text;
    private speed = cfg.base_speed;
    private elapsed = 0;
    private score = 0;
    private lives = cfg.lives;
    private nextSpawn = 600;
    private invulnerableUntil = 0;
    private over = false;

    create() {
      const g = this.add.graphics();
      g.lineStyle(1, hex(cfg.palette.primary), 0.35);
      g.strokeRect(0, 0, 64, 64);
      g.generateTexture("grid", 64, 64);
      g.destroy();
      this.grid = this.add.tileSprite(0, 0, RUNNER_WIDTH, GROUND_Y, "grid").setOrigin(0).setAlpha(0.35);

      const floor = this.add.graphics();
      floor.fillStyle(hex(cfg.palette.secondary), 0.12).fillRect(0, GROUND_Y, RUNNER_WIDTH, RUNNER_HEIGHT - GROUND_Y);
      floor.lineStyle(3, hex(cfg.palette.primary), 1).lineBetween(0, GROUND_Y, RUNNER_WIDTH, GROUND_Y);

      const ground = this.add.rectangle(RUNNER_WIDTH / 2, GROUND_Y + 20, RUNNER_WIDTH * 2, 40).setVisible(false);
      this.physics.add.existing(ground, true);

      this.hero = this.add.text(140, GROUND_Y - 40, cfg.hero, { fontSize: "46px" }).setOrigin(0.5).setFlipX(true);
      this.physics.add.existing(this.hero);
      const heroBody = this.hero.body as Body;
      heroBody.setGravityY(cfg.gravity).setSize(this.hero.width * 0.55, this.hero.height * 0.75);
      this.physics.add.collider(this.hero, ground);

      this.obstacles = this.physics.add.group({ allowGravity: false, immovable: true });
      this.pickups = this.physics.add.group({ allowGravity: false });
      this.physics.add.overlap(this.hero, this.obstacles, (_h, o) => this.hit(o as Phaser.GameObjects.Text));
      this.physics.add.overlap(this.hero, this.pickups, (_h, p) => this.collect(p as Phaser.GameObjects.Text));

      const style = { fontFamily: "ui-monospace, monospace", fontSize: "20px", color: "#e8ecff" };
      this.hud = this.add.text(16, 14, "0", style);
      this.livesText = this.add.text(RUNNER_WIDTH - 16, 14, "", { fontSize: "20px" }).setOrigin(1, 0);
      this.renderLives();

      const jump = () => {
        if (this.over) return;
        if (heroBody.blocked.down || heroBody.touching.down) heroBody.setVelocityY(-cfg.jump_velocity);
      };
      const cut = () => {
        if (heroBody.velocity.y < -cfg.jump_velocity * 0.4) heroBody.setVelocityY(heroBody.velocity.y * 0.5);
      };
      this.input.on("pointerdown", jump);
      this.input.on("pointerup", cut);
      const keyboard = this.input.keyboard;
      if (keyboard) {
        for (const code of ["SPACE", "UP", "W"]) {
          const key = keyboard.addKey(code);
          key.on("down", jump);
          key.on("up", cut);
        }
      }
    }

    private renderLives() {
      this.livesText.setText("❤️".repeat(this.lives) || "💀");
    }

    private spawn() {
      const emoji = Phaser.Utils.Array.GetRandom(cfg.obstacles);
      const obstacle = this.add.text(RUNNER_WIDTH + 40, GROUND_Y, emoji, { fontSize: "40px" }).setOrigin(0.5, 0.92);
      this.obstacles.add(obstacle);
      (obstacle.body as Body).setSize(obstacle.width * 0.55, obstacle.height * 0.6);

      if (Math.random() < 0.45) {
        const gem = this.add
          .text(RUNNER_WIDTH + rand(120, 260), GROUND_Y - rand(90, 175), Phaser.Utils.Array.GetRandom(cfg.collectibles), {
            fontSize: "30px",
          })
          .setOrigin(0.5);
        this.pickups.add(gem);
        this.tweens.add({ targets: gem, scale: 1.15, yoyo: true, repeat: -1, duration: 420 });
      }
    }

    private hit(obstacle: Phaser.GameObjects.Text) {
      if (this.over || this.time.now < this.invulnerableUntil) return;
      obstacle.destroy();
      this.lives -= 1;
      this.renderLives();
      this.cameras.main.shake(180, 0.012);
      if (this.lives <= 0) return this.finish(false);
      this.invulnerableUntil = this.time.now + 1200;
      this.tweens.add({ targets: this.hero, alpha: 0.25, yoyo: true, repeat: 5, duration: 100, onComplete: () => this.hero.setAlpha(1) });
    }

    private collect(pickup: Phaser.GameObjects.Text) {
      if (this.over) return;
      this.score += 50;
      const pop = this.add
        .text(pickup.x, pickup.y, "+50", { fontFamily: "ui-monospace, monospace", fontSize: "18px", color: cfg.palette.accent })
        .setOrigin(0.5);
      this.tweens.add({ targets: pop, y: pop.y - 40, alpha: 0, duration: 600, onComplete: () => pop.destroy() });
      pickup.destroy();
    }

    private finish(reachedTarget: boolean) {
      if (this.over) return;
      this.over = true;
      this.physics.pause();
      this.time.delayedCall(reachedTarget ? 300 : 700, () => onEnd(Math.floor(this.score), reachedTarget));
    }

    update(_time: number, deltaMs: number) {
      if (this.over) return;
      const dt = Math.min(deltaMs, 50) / 1000; // clamp so a background tab can't teleport obstacles
      this.elapsed += dt;
      this.speed = cfg.base_speed + (cfg.speed_increase_per_10s * this.elapsed) / 10;
      this.score += (this.speed * dt) / 10;
      this.hud.setText(String(Math.floor(this.score)));
      this.grid.tilePositionX += this.speed * dt * 0.35;

      this.nextSpawn -= deltaMs;
      if (this.nextSpawn <= 0) {
        this.spawn();
        const pace = Math.sqrt(cfg.base_speed / this.speed);
        this.nextSpawn = Math.max(450, cfg.spawn_interval_ms * rand(0.75, 1.35) * pace);
      }

      for (const group of [this.obstacles, this.pickups]) {
        for (const child of group.getChildren() as Phaser.GameObjects.Text[]) {
          (child.body as Body).setVelocityX(-this.speed);
          if (child.x < -80) child.destroy();
        }
      }

      if (this.hero.y > RUNNER_HEIGHT + 100) this.finish(false); // safety net
      if (cfg.target_score > 0 && this.score >= cfg.target_score) this.finish(true);
    }
  }

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: RUNNER_WIDTH,
    height: RUNNER_HEIGHT,
    transparent: true,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    physics: { default: "arcade", arcade: { gravity: { x: 0, y: 0 } } },
    input: { activePointers: 2 },
    audio: { noAudio: true },
    banner: false,
    scene: RunScene,
  });

  return { destroy: () => game.destroy(true) };
}
