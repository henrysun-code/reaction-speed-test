import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import fs from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import { validateConfig } from '../../shared/config/config-validator.js';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const args = process.argv.slice(2); const flag = args.indexOf('--game');
const gameDir = path.resolve(process.cwd(), flag >= 0 ? args[flag + 1] : '.');
if (!gameDir.startsWith(path.join(root, 'games') + path.sep) && !gameDir.startsWith(path.join(root, 'game-template') + path.sep) && gameDir !== path.join(root, 'game-template')) throw new Error('只允許處理 game-template/ 或 games/ 下的遊戲。');
const XLSX = createRequire(path.join(gameDir, 'package.json'))('xlsx');
const source = path.join(gameDir, 'config', 'game_config.xlsx');
const workbook = XLSX.readFile(source, { cellDates: false });
const config = {};
for (const sheet of ['GameSettings', 'Assets', 'Animations', 'Audio', 'Text']) {
  if (!workbook.SheetNames.includes(sheet)) throw new Error(`[${path.basename(gameDir)}] Sheet ${sheet}: 找不到工作表`);
  config[sheet] = XLSX.utils.sheet_to_json(workbook.Sheets[sheet], { defval: '' }).filter(row => Object.values(row).some(value => value !== '' && value !== null && value !== undefined));
}
const gameId = config.GameSettings.find(row => row.key === 'gameId')?.value || path.basename(gameDir);
const errors = validateConfig(config, gameId);
const categoryPaths = { target:'targets', distractor:'distractors', character:'characters', enemy:'enemies', item:'items', background:'backgrounds', ui:'ui', effect:'effects', animation:'../animations' };
for (const [index, row] of config.Assets.entries()) if (String(row.enabled).toUpperCase() !== 'FALSE') {
  const folder = categoryPaths[row.category]; if (!folder) continue;
  const relative = row.file.includes('/') ? row.file : `${folder}/${row.file}`;
  const file = path.resolve(gameDir, 'assets', 'images', relative);
  if (!file.startsWith(path.resolve(gameDir, 'assets') + path.sep)) errors.push(`[${gameId}] Sheet Assets Row ${index + 2} Column file: 不可使用素材目錄以外的路徑`);
  else try { await readFile(file); } catch { errors.push(`[${gameId}] Sheet Assets Row ${index + 2} Column file: 找不到 assets/images/${relative}`); }
}
for (const [index, row] of config.Animations.entries()) if (row.image) {
  const file = path.resolve(gameDir, 'assets', 'animations', row.image);
  if (!file.startsWith(path.resolve(gameDir, 'assets', 'animations') + path.sep)) errors.push(`[${gameId}] Sheet Animations Row ${index + 2} Column image: 不可使用素材目錄以外的路徑`);
  else try { await readFile(file); } catch { errors.push(`[${gameId}] Sheet Animations Row ${index + 2} Column image: 找不到 assets/animations/${row.image}`); }
}
for (const [index, row] of config.Audio.entries()) if (String(row.enabled).toUpperCase() !== 'FALSE' && row.file) {
  const folder = String(row.category).toLowerCase() === 'bgm' ? 'bgm' : 'sfx';
  const file = path.resolve(gameDir, 'assets', 'audio', folder, row.file);
  if (!file.startsWith(path.resolve(gameDir, 'assets', 'audio') + path.sep)) errors.push(`[${gameId}] Sheet Audio Row ${index + 2} Column file: 不可使用素材目錄以外的路徑`);
  else try { await readFile(file); } catch { errors.push(`[${gameId}] Sheet Audio Row ${index + 2} Column file: 找不到 assets/audio/${folder}/${row.file}`); }
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
const output = path.join(gameDir, 'config', 'generated', 'game_config.json');
await writeFile(output, `${JSON.stringify(config, null, 2)}\n`);
const publicDir = path.join(gameDir, 'public');
fs.mkdirSync(path.join(publicDir, 'config', 'generated'), { recursive: true });
fs.copyFileSync(output, path.join(publicDir, 'config', 'generated', 'game_config.json'));
fs.cpSync(path.join(gameDir, 'assets'), path.join(publicDir, 'assets'), { recursive: true });
console.log(`[${gameId}] 設定驗證完成，已輸出 ${path.relative(root, output)}`);
