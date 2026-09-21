import {build} from 'esbuild';
import fs from 'node:fs/promises';
async function buildPage(entry,output,title){
const r=await build({entryPoints:[entry],bundle:true,loader:{'.png':'dataurl'},minify:true,write:false,outfile:'arena.js',define:{'process.env.NODE_ENV':'"production"'}});
const js=r.outputFiles.find(x=>x.path.endsWith('.js')).text.replaceAll('</script','<\\/script');
const css=r.outputFiles.find(x=>x.path.endsWith('.css'))?.text||'';
await fs.writeFile(output,`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light dark"><script>try{document.documentElement.dataset.theme=JSON.parse(localStorage.getItem("arena-appearance"))==="light"?"light":"dark"}catch{}</script><title>${title}</title><style>${css}</style></head><body><div id="root"></div><script>${js}</script></body></html>`);
}
await buildPage('src/arena.jsx','arena.html','对照 · AI 方案对比台');
await buildPage('src/loading-demo.jsx','loading-demo.html','对照 · 加载动效');
await fs.copyFile('arena.html','index.html');
console.log('Built arena.html + index.html + loading-demo.html — latest DUIZHAO preview.');
