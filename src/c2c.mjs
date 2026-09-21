export const C2C_PAIRS=[
 {id:'qwen-small',label:'Qwen 小模型组合',sharer:'Qwen/Qwen2.5-0.5B-Instruct',receiver:'Qwen/Qwen3-0.6B',fuser:'qwen3_0.6b+qwen2.5_0.5b_Fuser'},
 {id:'qwen-base',label:'Qwen 4B Base 组合',sharer:'Qwen/Qwen3-4B-Base',receiver:'Qwen/Qwen3-0.6B',fuser:'qwen3_0.6b+qwen3_4b_base_Fuser'}
];
export const DEFAULT_SCHEMES=[{id:'c2c-small',name:'Qwen 小模型协作',pairId:'qwen-small'}];
export const METHODS=[{id:'single',model:'单模型 · Single',description:'接收模型独立回答',seconds:2.4},{id:'t2t',model:'文字协作 · T2T',description:'通过文字传递背景信息',seconds:4.7},{id:'c2c',model:'缓存协作 · C2C',description:'通过内部缓存传递信息',seconds:3.2}];
export function snapshotScheme(scheme){const pair=C2C_PAIRS.find(p=>p.id===scheme?.pairId);if(!pair)throw new Error('请选择有效的协作方案');return {...pair,...scheme};}
export function c2cPlans(scheme,prompt){const snapshot=snapshotScheme(scheme);return METHODS.map(method=>({...method,prompt,receiver:snapshot.receiver,sharer:method.id==='single'?'':snapshot.sharer,fuser:method.id==='c2c'?snapshot.fuser:''}));}
export function checkServiceUrl(value){try{const u=new URL(value.trim());if(!['http:','https:'].includes(u.protocol))return '请填写以 http:// 或 https:// 开头的后台地址';if(u.username||u.password||u.search||u.hash)return '地址中请勿包含账号、密钥、查询参数或锚点';return '';}catch{return '请输入完整的后台地址，例如 https://c2c.example.com';}}
export function csvText(rows){const cell=value=>'"'+String(value??'').replace(/^[\s]*[=+@\-]/,"'$&").replaceAll('"','""')+'"';return '\ufeff'+rows.map(row=>row.map(cell).join(',')).join('\r\n');}
