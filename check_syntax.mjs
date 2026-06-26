// ═══════════════════════════════════════
// 语法检查脚本 — 部署前必须通过
// 用法: node check_syntax.mjs
// 原理: 为每个.js创建临时.mjs → node --check
// 只检查语法，不执行代码，不级联报错
// ═══════════════════════════════════════

import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, unlinkSync, mkdirSync, rmdirSync } from 'fs';
import { join, resolve, dirname, relative, basename } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const TARGET_DIRS = ['源代码'];
const TMP = join(__dirname, '.syntax_check');
let checked = 0, failed = 0;

function cleanup() {
    try {
        if (existsSync(TMP)) {
            readdirSync(TMP).forEach(f => { try { unlinkSync(join(TMP, f)); } catch (_) {} });
            try { rmdirSync(TMP); } catch (_) {}
        }
    } catch (_) {}
}

if (!existsSync(TMP)) mkdirSync(TMP, { recursive: true });

function findJSFiles(dir, files) {
    if (!existsSync(dir)) return;
    for (const entry of readdirSync(dir)) {
        const full = join(dir, entry);
        const st = statSync(full);
        if (st.isDirectory() && !entry.startsWith('.') && entry !== 'node_modules') {
            findJSFiles(full, files);
        } else if (st.isFile() && (entry.endsWith('.js') || entry.endsWith('.mjs'))) {
            files.push(full);
        }
    }
}

function checkFile(filePath) {
    const rel = relative(__dirname, filePath).replace(/\\/g, '/');
    try {
        const code = readFileSync(filePath, 'utf8');
        const tmpFile = join(TMP, basename(filePath).replace(/\.(js|mjs)$/, '_check.mjs'));
        writeFileSync(tmpFile, code, 'utf8');
        try {
            execSync(`"${process.execPath}" --check "${tmpFile}"`, {
                encoding: 'utf8', stdio: 'pipe', timeout: 5000
            });
            checked++;
        } finally {
            try { unlinkSync(tmpFile); } catch (_) {}
        }
    } catch (e) {
        failed++;
        const errMsg = e.stderr || e.message || '';
        const match = errMsg.match(/SyntaxError: (.+)/);
        const msg = match ? match[1] : errMsg.split('\n')[0];
        console.error(`  ❌ ${rel}: ${msg}`);
    }
}

console.log('══════ 语法扫描（独立检查，不级联） ══════');
const allFiles = [];
for (const dir of TARGET_DIRS) findJSFiles(resolve(__dirname, dir), allFiles);
console.log(`  共 ${allFiles.length} 个 JS 文件\n`);

for (const f of allFiles) checkFile(f);

process.stdout.write(`\n  ✅ ${checked} 通过`);
if (failed > 0) process.stdout.write(`  ❌ ${failed} 失败`);
process.stdout.write('\n');
cleanup();

if (failed === 0) {
    console.log('══════ 全部通过，可以部署 ✅ ══════');
    process.exit(0);
} else {
    console.error('\n══════ 修复以上语法错误后再部署 ══════');
    process.exit(1);
}
