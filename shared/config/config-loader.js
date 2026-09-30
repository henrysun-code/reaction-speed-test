export async function loadConfig(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`設定載入失敗 ${response.status}: ${url}`);
  const config = await response.json();
  for (const sheet of ['GameSettings', 'Assets', 'Animations', 'Audio', 'Text']) {
    if (!Array.isArray(config[sheet])) throw new Error(`設定缺少有效的 ${sheet} Sheet`);
  }
  return config;
}
