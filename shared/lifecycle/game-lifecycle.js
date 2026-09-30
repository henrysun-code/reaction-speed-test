export class GameLifecycle extends EventTarget {
  #state = 'init';
  #visibilityHandler;
  constructor() {
    super();
    this.#visibilityHandler = () => { if (document.hidden && this.#state === 'playing') this.transition('paused'); };
    document.addEventListener('visibilitychange', this.#visibilityHandler);
  }
  get state() { return this.#state; }
  transition(next) {
    const allowed = { init:['loading','ready','destroy'], loading:['ready','destroy'], ready:['playing','destroy'], playing:['paused','completed','destroy'], paused:['playing','destroy'], completed:['ready','destroy'], destroy:[] };
    if (!allowed[this.#state]?.includes(next)) return false;
    const previous = this.#state; this.#state = next;
    this.dispatchEvent(new CustomEvent('statechange', { detail: { previous, state: next } }));
    return true;
  }
  destroy() { if (this.#state !== 'destroy') this.transition('destroy'); document.removeEventListener('visibilitychange', this.#visibilityHandler); }
}
