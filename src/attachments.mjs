const extensions={image:['png','jpg','jpeg','webp','gif'],video:['mp4','mov','webm'],form:['pdf','doc','docx','xls','xlsx','csv']};
const mimeTypes={image:['image/png','image/jpeg','image/webp','image/gif'],video:['video/mp4','video/quicktime','video/webm'],form:['application/pdf','text/csv','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document','application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']};
export const FILE_ACCEPT=Object.fromEntries(Object.entries(extensions).map(([type,ext])=>[type,[...mimeTypes[type],...ext.map(x=>'.'+x)].join(',')]));
export function getAttachmentType(file){
 const mime=(file.type||'').toLowerCase();
 const matched=Object.keys(mimeTypes).find(type=>mimeTypes[type].includes(mime));
 if(matched)return matched;
 // Only fall back for missing/generic MIME, never accept an explicitly unsupported format.
 if(mime&&mime!=='application/octet-stream')return null;
 const ext=file.name.split('.').pop().toLowerCase();
 return Object.keys(extensions).find(type=>extensions[type].includes(ext))||null;
}
export function formatFileSize(bytes){return bytes<1024?`${bytes} B`:bytes<1024*1024?`${(bytes/1024).toFixed(1)} KB`:`${(bytes/1024/1024).toFixed(1)} MB`}
export function attachmentSnapshots(items){return items.map(({id,type,name,size,content})=>({id,type,name,...(size!==undefined?{size}:{}),...(type==='text'?{content}: {})}))}
export function attachmentText(items=[]){return items.map(a=>a.type==='text'?`文本附件「${a.name}」：\n${a.content}`:`附件「${a.name}」 · ${formatFileSize(a.size||0)}（仅文件信息）`).join('\n\n')}
export function questionWithAttachments(question,items=[]){const text=attachmentText(items.filter(a=>a.type==='text'));return question+(text?'\n\n--- 附加材料 ---\n'+text:'')}
export function fileToDataURL(file){return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('读取文件失败'));r.readAsDataURL(file)})}
export async function imageDataUrls(items=[]){return Promise.all(items.filter(a=>a.type==='image'&&a.file).map(a=>fileToDataURL(a.file)))}
