// Decode across arbitrary byte boundaries, including CRLF and a final unterminated event.
export async function consumeSse(body,handlers){
 const reader=body.getReader(),decoder=new TextDecoder();let buffer='';
 const dispatch=block=>{let event='message';const lines=[];for(const line of block.split(/\r?\n/)){if(line.startsWith('event:'))event=line.slice(6).trim();else if(line.startsWith('data:'))lines.push(line.slice(5).replace(/^ /,''))}if(!lines.length)return;let data;try{data=JSON.parse(lines.join('\n'))}catch{throw new Error('收到无效的流式数据')}if(event==='chunk')handlers.onChunk?.(data);else if(event==='done')handlers.onDone?.(data);else if(event==='error')handlers.onError?.(data)};
 const drain=()=>{let boundary;while((boundary=/\r?\n\r?\n/.exec(buffer))){dispatch(buffer.slice(0,boundary.index));buffer=buffer.slice(boundary.index+boundary[0].length)}};
 try{while(true){const {done,value}=await reader.read();if(done)break;buffer+=decoder.decode(value,{stream:true});drain()}buffer+=decoder.decode();drain();if(buffer.trim())dispatch(buffer)}finally{await reader.cancel().catch(()=>{});reader.releaseLock()}
}
