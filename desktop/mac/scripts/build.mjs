import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("..", import.meta.url));
process.chdir(root);
await mkdir("dist", { recursive: true });
await build({
  absWorkingDir: root,
  entryPoints: ["src/main.jsx"],
  bundle: true,
  outdir: "dist",
  format: "esm",
  minify: true,
  sourcemap: false,
  loader: { ".svg": "dataurl" },
  define: { "process.env.NODE_ENV": '"production"' },
});
await copyFile("src/index.html", "dist/index.html");
await copyFile("src/theme-boot.js", "dist/theme-boot.js");
console.log("客户端界面构建完成");
