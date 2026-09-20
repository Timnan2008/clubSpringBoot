// ============================================================
// frontend/build/preloads.mjs —— 打包后刷新模板里的「模块预加载」标签
//
// 背景：esbuild 会把每个页面入口拆成「入口 + 若干带哈希的分块 chunk-XXXX.js」。
//       入口文件名固定（如 /javascript/ui/social.js），但分块名每次打包都会变，
//       所以每次 build 之后要按最新的依赖图重写各模板里的：
//           <link rel="modulepreload" href="/javascript/ui/chunks/chunk-XXXX.js" />
//       —— 这些标签只是「提前加载」的优化，写对能更快，写错也不会让页面坏掉。
//
// 谁调用：frontend/build.mjs 最后一行
//         await updateModulePreloads("src/main/resources/templates", uiBuild.metafile.outputs)
//
// ⚠️ 这个文件以前被 .gitignore 的 `build/` 规则忽略，导致新克隆仓库的人跑不了 npm run build，
//    现在 .gitignore 里加了 !frontend/build/ 例外，请连同本文件一起提交。
// ============================================================
import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

/** 静态资源在仓库里的前缀，用来把 esbuild 的输出路径换算成网址。 */
const STATIC_PREFIX = "src/main/resources/static/";

/** 把 esbuild 的输出路径换算成浏览器网址；不是静态资源的返回 null。 */
function toUrl(outputPath) {
  const normalized = outputPath.split("\\").join("/");
  if (!normalized.startsWith(STATIC_PREFIX)) return null;
  return "/" + normalized.slice(STATIC_PREFIX.length);
}

/** 递归找出所有的 .html 模板。 */
function htmlFiles(dir) {
  const found = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...htmlFiles(full));
    else if (name.endsWith(".html")) found.push(full);
  }
  return found;
}

/** 某个入口文件（含它 import 的、以及被 import 的 chunk）的全部依赖文件。 */
function dependencies(outputs, entry) {
  const seen = new Set();
  const queue = [...(outputs[entry]?.imports ?? [])];
  while (queue.length) {
    const path = queue.shift().path;
    if (path === entry || seen.has(path)) continue;
    seen.add(path);
    queue.push(...(outputs[path]?.imports ?? []));
  }
  return [...seen];
}

/**
 * 刷新模板里的 modulepreload 标签。
 *
 * @param {string} templatesDir 模板目录（如 src/main/resources/templates）
 * @param {object} outputs      esbuild 的 metafile.outputs
 * @returns {Promise<string[]>} 被改动的模板文件
 */
export async function updateModulePreloads(templatesDir, outputs) {
  const entries = Object.entries(outputs)
    .filter(([path, meta]) => meta.entryPoint && path.endsWith(".js") && toUrl(path))
    .map(([path]) => [path, toUrl(path)]);
  if (!entries.length) return [];

  const touched = [];
  for (const file of htmlFiles(templatesDir)) {
    let html = readFileSync(file, "utf8");
    // 这个模板用到了哪些入口（按网址匹配，忽略 ?v= 之类的查询串）
    const used = entries.filter(([, url]) => html.includes(`"${url}?`) || html.includes(`"${url}"`));
    if (!used.length) continue;

    // 期望的 chunk 集合 = 所有用到的入口的依赖，去重后按字母序，保证输出稳定
    const wanted = new Set();
    for (const [path] of used) {
      for (const dep of dependencies(outputs, path)) {
        const url = toUrl(dep);
        if (url && url.endsWith(".js")) wanted.add(url);
      }
    }
    const next = [...wanted].sort();

    // 先删掉旧的全部 modulepreload 行，再插到入口脚本标签前面
    const stripped = html.replace(/^[ \t]*<link rel="modulepreload"[^>]*\/>\r?\n/gm, "");
    const script = stripped.match(/^([ \t]*)<script type="module" src="\/javascript\/ui\/[^"]*"><\/script>$/m);
    const indent = script ? script[1] : "    ";
    const block = next.map((url) => `${indent}<link rel="modulepreload" href="${url}" />\n`).join("");
    const updated = script
      ? stripped.replace(script[0], `${block}${script[0]}`)
      : stripped;
    if (updated !== html) {
      writeFileSync(file, updated);
      touched.push(file);
    }
  }
  if (touched.length) {
    console.log(`[preloads] 已刷新 ${touched.length} 个模板的模块预加载标签`);
  }
  return touched;
}
