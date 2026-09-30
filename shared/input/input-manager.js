export class InputManager extends EventTarget {
  #locked = false;
  #handlers;
  constructor(target = document) {
    super(); this.target = target; this.pointer = { x: 0, y: 0, type: 'unknown' };
    const pointer = event => {
      this.pointer = { x: event.clientX, y: event.clientY, type: event.pointerType };
      if (this.#locked) { if (event.cancelable) event.preventDefault(); return; }
      this.dispatchEvent(new CustomEvent('input', { detail: { type: event.type, ...this.pointer, button: event.button } }));
    };
    const keyboard = event => {
      if (this.#locked) { if (event.cancelable) event.preventDefault(); return; }
      this.dispatchEvent(new CustomEvent('input', { detail: { type: event.type, key: event.key, repeat: event.repeat } }));
    };
    const visibility = () => {
      if (document.hidden) this.lock(); else this.unlock();
      this.dispatchEvent(new CustomEvent('input', { detail: { type: 'visibilitychange', hidden: document.hidden } }));
    };
    this.#handlers = { pointer, keyboard, visibility };
    for (const type of ['pointerdown','pointerup','pointermove','pointercancel']) target.addEventListener(type, pointer, { passive: false });
    window.addEventListener('keydown', keyboard); window.addEventListener('keyup', keyboard);
    document.addEventListener('visibilitychange', visibility);
  }
  lock() { this.#locked = true; }
  unlock() { this.#locked = false; }
  get locked() { return this.#locked; }
  destroy() {
    for (const type of ['pointerdown','pointerup','pointermove','pointercancel']) this.target.removeEventListener(type, this.#handlers.pointer);
    window.removeEventListener('keydown', this.#handlers.keyboard); window.removeEventListener('keyup', this.#handlers.keyboard);
    document.removeEventListener('visibilitychange', this.#handlers.visibility);
  }
}
