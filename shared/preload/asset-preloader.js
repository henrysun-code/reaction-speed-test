export function preloadAssets(entries = []) {
  return Promise.all(entries.map(entry => new Promise(resolve => {
    if (entry.type === 'audio') { const audio = new Audio(); audio.preload = 'metadata'; audio.src = entry.src; audio.addEventListener('loadedmetadata', () => resolve({ entry, ok: true }), { once: true }); audio.addEventListener('error', () => resolve({ entry, ok: false }), { once: true }); }
    else { const image = new Image(); image.src = entry.src; image.onload = () => resolve({ entry, ok: true }); image.onerror = () => resolve({ entry, ok: false }); }
  })));
}
