// Independent model buffers; transport completion and visible completion are distinct.
export function createAnswerStream({modelIds,onUpdate,onSettled,schedule=requestAnimationFrame,cancel=cancelAnimationFrame,random=Math.random,reduced=()=>false}){
 const slots=modelIds.map(id=>({id,chars:[],shown:0,text:'',status:'waiting',terminal:null,next:0,error:null,source:null,media:null}));
 let frame=null,closed=false;
 const snapshots=()=>slots.map(s=>({text:s.text,status:s.status,error:s.error,source:s.source,media:s.media}));
 function emit(){onUpdate(snapshots());if(slots.every(s=>['done','error','stopped'].includes(s.status))){closed=true;onSettled?.(snapshots())}}
 function wake(){if(!closed&&frame===null)frame=schedule(tick)}
 function tick(time){
  frame=null;if(closed)return;let changed=false;
  for(const s of slots){
   if(s.shown<s.chars.length&&s.next===0)s.next=time;
   let rounds=0;
   while(s.shown<s.chars.length&&time>=s.next&&rounds++<12){
    let count=reduced()?s.chars.length-s.shown:2+Math.floor(random()*5);
    let chunk='';while(count--&&s.shown<s.chars.length){const char=s.chars[s.shown++];chunk+=char;if(!reduced()&&/[。！？!?，、；：,;:\n]/u.test(char))break}
    s.text+=chunk;s.status='streaming';changed=true;
    s.next+=(/[。！？!?]$/u.test(chunk)?90:/[，、；：,;:\n]$/u.test(chunk)?45:16+random()*16);
   }
   if(s.shown===s.chars.length)s.next=0;
   if(s.terminal&&s.shown===s.chars.length&&s.status!==s.terminal){s.status=s.terminal;changed=true}
  }
  if(changed)emit();
  if(!closed&&slots.some(s=>s.shown<s.chars.length))wake();
 }
 function forModel(id,fn){if(closed)return;slots.filter(s=>s.id===id&&!s.terminal).forEach(fn);wake()}
 return {
  push(id,text){forModel(id,s=>{s.chars.push(...Array.from(text||''))})},
  end(id,{error=null,fullText,source=null,media=null}={}){forModel(id,s=>{if(typeof fullText==='string'&&fullText.startsWith(s.chars.join('')))s.chars=Array.from(fullText);s.terminal=error?'error':'done';s.error=error;s.source=source;s.media=media})},
  fail(error){if(closed)return;slots.filter(s=>!s.terminal).forEach(s=>{s.error=error;s.terminal='error'});wake()},
  stop(){if(closed)return;if(frame!==null)cancel(frame);frame=null;slots.forEach(s=>{s.text=s.chars.join('');s.shown=s.chars.length;s.status=s.terminal||'stopped';s.terminal=s.status});emit();closed=true},
  dispose(){closed=true;if(frame!==null)cancel(frame);frame=null},
  snapshots
 };
}
export function answerMarkdown(data){return ['## '+data.lead,data.intro,...data.sections.flatMap(([title,items])=>['### '+title,items.map(x=>'- '+x).join('\n')]),data.end].join('\n\n')}
