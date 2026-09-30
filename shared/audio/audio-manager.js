export class AudioManager {
  constructor({ enabled = true } = {}) {
    this.enabled = enabled; this.bgm = null; this.pendingBgm = null; this.sfxVolume = 1; this.bgmVolume = 1; this.unlocked = false;
    this.unlock = () => { this.unlocked = true; window.removeEventListener('pointerdown', this.unlock); window.removeEventListener('keydown', this.unlock); if (this.pendingBgm) { const pending = this.pendingBgm; this.pendingBgm = null; this.playBgm(pending.src, pending.options); } };
    window.addEventListener('pointerdown', this.unlock, { once: true }); window.addEventListener('keydown', this.unlock, { once: true });
  }
  playSfx(src, options = {}) { if (!this.enabled) return null; const audio = new Audio(src); audio.volume = Math.min(1, this.sfxVolume * (options.volume ?? 1)); audio.play().catch(() => {}); return audio; }
  playBgm(src, options = { loop: true }) { this.stopBgm(); if (!this.enabled) return null; if (!this.unlocked) { this.pendingBgm = { src, options }; return null; } this.bgm = new Audio(src); this.bgm.loop = options.loop ?? true; this.bgm.volume = this.bgmVolume; this.bgm.play().catch(() => {}); return this.bgm; }
  stopBgm() { this.pendingBgm = null; this.bgm?.pause(); this.bgm = null; }
  setSfxVolume(value) { this.sfxVolume = Math.max(0, Math.min(1, value)); }
  setBgmVolume(value) { this.bgmVolume = Math.max(0, Math.min(1, value)); if (this.bgm) this.bgm.volume = this.bgmVolume; }
  mute() { this.enabled = false; this.stopBgm(); }
  destroy() { this.stopBgm(); window.removeEventListener('pointerdown', this.unlock); window.removeEventListener('keydown', this.unlock); }
}
