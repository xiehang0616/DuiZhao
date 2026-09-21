import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export function startPreview(){
 const port=Number(process.env.PORT||8768);
 if(!Number.isInteger(port)||port<1||port>65535)throw new Error('PORT 必须是 1～65535 之间的整数');
 const mime={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.svg':'image/svg+xml','.jpg':'image/jpeg','.json':'application/json; charset=utf-8','.md':'text/plain; charset=utf-8'};
 const server=http.createServer(async(req,res)=>{
  if(!['GET','HEAD'].includes(req.method)){res.writeHead(405,{Allow:'GET, HEAD'});return res.end('Method not allowed');}
  let pathname;
  try{pathname=decodeURIComponent(new URL(req.url,'http://localhost').pathname);}catch{res.writeHead(400);return res.end('Bad request');}
  if(pathname==='/')pathname='/arena.html';
  const file=path.resolve(projectRoot,'.'+pathname);
  const relative=path.relative(projectRoot,file);
  if(relative.startsWith('..')||path.isAbsolute(relative)||relative.split(path.sep).some(part=>part.startsWith('.')||part==='node_modules')){res.writeHead(403);return res.end('Forbidden');}
  try{if(!(await stat(file)).isFile())throw new Error('not a file');const data=await readFile(file);res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});res.end(req.method==='HEAD'?undefined:data);}catch{res.writeHead(404,{'Content-Type':'text/plain; charset=utf-8'});res.end('文件不存在。请先执行 npm run build。');}
 });
 server.on('error',err=>{console.error(err.code==='EADDRINUSE'?`端口 ${port} 已被占用。请运行 PORT=8769 npm run dev 或关闭原服务。`:err.message);process.exit(1);});
 server.listen(port,'127.0.0.1',()=>console.log(`对照预览：http://127.0.0.1:${port}/arena.html\nC2C 演示：http://127.0.0.1:${port}/arena.html?demo=c2c\n按 Ctrl+C 停止。`));
 return server;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))startPreview();
