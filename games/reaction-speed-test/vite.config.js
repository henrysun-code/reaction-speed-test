import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const gameRoot = fileURLToPath(new URL('.', import.meta.url));
const workspaceRoot = path.resolve(gameRoot, '../..');
const xlsxFile = path.join(gameRoot, 'config', 'game_config.xlsx');

function excelReloadPlugin() {
  let debounce;
  return {
    name: '012s-excel-reload',
    configureServer(server) {
      server.watcher.add(xlsxFile);
      server.watcher.on('change', changedFile => {
        if (path.resolve(changedFile).toLowerCase() !== xlsxFile.toLowerCase()) return;
        clearTimeout(debounce);
        debounce = setTimeout(() => {
          const result = spawnSync(process.execPath, [path.join(gameRoot, 'scripts/config.mjs')], { cwd: gameRoot, encoding: 'utf8' });
          if (result.status !== 0) {
            server.config.logger.error(result.stderr || result.stdout || 'Excel 設定驗證失敗');
            return;
          }
          server.config.logger.info(result.stdout.trim());
          server.ws.send({ type: 'full-reload' });
        }, 500);
      });
    }
  };
}

export default defineConfig({
  base: './',
  plugins: [excelReloadPlugin()],
  server: { fs: { allow: [workspaceRoot] } },
  build: { outDir: path.join(workspaceRoot, 'dist', path.basename(gameRoot)), emptyOutDir: true }
});
