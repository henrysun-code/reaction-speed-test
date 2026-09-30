export class DebugPanel {
  constructor({ enabled = false, gameId, version, configVersion = 1, lifecycle, input, loadedAssets = [] } = {}) {
    this.element = null; if (!enabled) return;
    this.element = document.createElement('pre'); this.element.id = '012s-debug';
    Object.assign(this.element.style, { position:'fixed', left:'8px', bottom:'8px', margin:0, padding:'8px', background:'#000b', color:'#9f9', font:'12px monospace', pointerEvents:'none', textAlign:'left' }); document.body.append(this.element);
    this.start = performance.now(); this.lastFrame = this.start;
    this.update = () => {
      const now = performance.now(); const fps = Math.round(1000 / Math.max(1, now - this.lastFrame)); this.lastFrame = now;
      const pointer = input?.pointer || { x: 0, y: 0, type: 'unknown' };
      this.element.textContent = `${gameId} v${version}\nconfig: ${configVersion}\nstate: ${lifecycle?.state}\nFPS: ${fps}\nelapsed: ${Math.round(now - this.start)}ms\nscreen: ${innerWidth}×${innerHeight}\npointer: ${Math.round(pointer.x)}, ${Math.round(pointer.y)} (${pointer.type})\nassets: ${loadedAssets.length}`;
    };
    this.timer = setInterval(this.update, 500); this.update();
  }
  destroy() { clearInterval(this.timer); this.element?.remove(); }
}
