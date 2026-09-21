import {watch} from 'node:fs';
import {spawn} from 'node:child_process';
import {startPreview,projectRoot} from './preview.mjs';

let building=false,queued=false,server,debounce,child;
const watchers=[];
async function build(){
 if(building){queued=true;return;}
 building=true;
 const code=await new Promise(resolve=>{child=spawn(process.execPath,['build-arena.mjs'],{cwd:projectRoot,stdio:'inherit'});child.on('error',err=>{console.error(err.message);resolve(1)});child.on('exit',resolve)});
 building=false;
 if(code===0){if(!server)server=startPreview();console.log('源码已构建；浏览器刷新即可看到修改。');}else console.error('构建失败。修正源码后保存，开发服务会重新构建。');
 if(queued){queued=false;await build();}
}
function schedule(){clearTimeout(debounce);debounce=setTimeout(build,180);}
process.chdir(projectRoot);
watchers.push(watch('src',{recursive:true},schedule),watch('build-arena.mjs',schedule));
for(const signal of ['SIGINT','SIGTERM'])process.on(signal,()=>{clearTimeout(debounce);watchers.forEach(w=>w.close());child?.kill();server?.close();process.exit(0)});
await build();
