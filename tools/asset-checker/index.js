import { readdir, stat } from 'node:fs/promises'; import path from 'node:path';
const base=path.resolve(process.argv[2]||'.'); let count=0;
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())await walk(file);else{await stat(file);count++;}}}
await walk(path.join(base,'assets')); console.log(`Asset check passed: ${count} files`);
