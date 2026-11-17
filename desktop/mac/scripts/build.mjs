import { build } from "esbuild";
import { mkdir, copyFile } from "node:fs/promises";
await mkdir("dist", { recursive: true });
await build({
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
console.log("客户端界面构建完成");
