import { build } from "esbuild";
import {existsSync} from "node:fs";
import {readFile,writeFile,readdir} from "node:fs/promises";
import path from "node:path";
const shared = {
  bundle: true,
  minify: true,
  jsx: "automatic",
  define: { "process.env.NODE_ENV": '"production"' },
  entryNames: "[name]",
  legalComments: "eof",
};
await build({
  ...shared,
  entryPoints: ["frontend/home.jsx"],
  outdir: "src/main/resources/static/javascript/darkveil",
});
const uiBuild=await build({
  ...shared,
  metafile:true,
  format: "esm",
  splitting: true,
  chunkNames: "chunks/[name]-[hash]",
  entryPoints: ["frontend/navigation.jsx", "frontend/auth.jsx", "frontend/workspace.jsx", "frontend/social.jsx", "frontend/account.jsx", "frontend/suggestion.jsx", "frontend/catalog.jsx", "frontend/calendar.jsx"],
  outdir: "src/main/resources/static/javascript/ui",
});

await build({...shared,entryPoints:['frontend/booking-nav.jsx'],outfile:process.env.BOOKING_ASSET_FILE || (existsSync('booking/school') ? 'booking/school/aero-shards.bundle.js' : existsSync('../outputs/qpsw-mrbs/school') ? '../outputs/qpsw-mrbs/school/aero-shards.bundle.js' : 'src/main/resources/static/javascript/booking/aero-shards.bundle.js'),format:'iife'});

// Discover critical module dependencies from this build instead of serial browser discovery.
const outputs=uiBuild.metafile.outputs;
async function preloadModules(dir){for(const item of await readdir(dir,{withFileTypes:true})){const file=path.join(dir,item.name);if(item.isDirectory()){await preloadModules(file);continue;}if(!file.endsWith('.html'))continue;let html=await readFile(file,'utf8');html=html.replace(/<!-- ui-module-preloads -->[\s\S]*?<!-- \/ui-module-preloads -->/g,'');const names=[...html.matchAll(/src="\/javascript\/ui\/([\w-]+)\.js(?:\?[^" ]*)?"/g)].map(m=>m[1]);if(!names.length)continue;const imports=new Set();function visit(key){for(const dep of outputs[key]?.imports||[]){if(dep.kind!=='import-statement'||dep.external||imports.has(dep.path))continue;imports.add(dep.path);visit(dep.path)}}for(const name of names)visit('src/main/resources/static/javascript/ui/'+name+'.js');const links=[...imports].filter(p=>p.includes('/chunks/')).map(p=>'<link rel="modulepreload" href="/'+p.replace('src/main/resources/static/','')+'"/>').join('');if(links){const block='<!-- ui-module-preloads -->'+links+'<!-- /ui-module-preloads -->';html=html.includes('</head>')?html.replace('</head>',block+'</head>'):block+html;}await writeFile(file,html)}}
await preloadModules('src/main/resources/templates');
