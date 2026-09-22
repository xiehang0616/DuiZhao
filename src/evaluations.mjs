import {csvText} from './c2c.mjs';

export const MODULES={text:'文本 / LLM',image:'图片',video:'视频',code:'代码'};
export const SCENARIOS={text:['通用问答','需求与写作','RAG / 知识库','长文本','结构化输出'],image:['图片生成','图片编辑','图片理解'],video:['视频生成','视频编辑','视频理解'],code:['代码生成','缺陷修复','项目开发','前端实现']};
const templates={
 text:[['事实正确性',30,'内容无事实错误；有依据时可核查。'],['完整性',20,'覆盖问题要求和关键边界。'],['指令遵循',20,'满足格式、约束和角色要求。'],['可用性',20,'内容能用于实际业务，结论可执行。'],['表达质量',10,'清晰、相关、没有重复和歧义。']],
 image:[['内容与指令',30,'主体、数量、属性、空间关系符合要求。'],['结构与画质',25,'结构自然、无畸形、细节清晰。'],['构图与风格',20,'构图合理，风格符合要求。'],['任务专项',25,'按任务检查文字、参考一致性、编辑区域或理解准确性。']],
 video:[['内容与动作',25,'情节、动作及顺序完整。'],['时序一致性',25,'主体和背景连续，无突变或闪烁。'],['运动合理性',20,'动作、物理与镜头运动合理。'],['画面质量',15,'细节、清晰度和节奏符合要求。'],['任务专项',15,'检查参考一致性、编辑、音画同步或理解准确性。']],
 code:[['功能正确性',40,'满足要求，可运行，通过验证。'],['边界与回归',25,'边界、异常、安全及已有功能得到验证。'],['工程质量',15,'可维护，性能合理，符合项目约定。'],['任务专项',20,'检查测试质量、修改范围、前端效果及交付完整性。']]
};
export const clone=value=>JSON.parse(JSON.stringify(value));
export const uid=()=>crypto.randomUUID();
export const newRubric=module=>templates[module].map(([name,weight,guide],i)=>({id:'d'+i,name,weight,guide}));
export const caseCriteria=(item,module='text')=>({...{module,scenario:SCENARIOS[module][0],references:'',acceptance:['完成案例要求，交付可用结果'],severe:['出现影响业务使用的严重错误'],dimensions:newRubric(module)},...clone(item?.evaluation||{})});
export function validateRubric(dimensions){
 if(!Array.isArray(dimensions)||!dimensions.length)throw Error('至少保留一个评分维度。');
 if(new Set(dimensions.map(d=>d.id)).size!==dimensions.length)throw Error('评分维度编号不能重复。');
 if(dimensions.some(d=>!d.name?.trim()||!Number.isFinite(Number(d.weight))||Number(d.weight)<=0))throw Error('请填写维度名称和大于 0 的权重。');
 if(Math.abs(dimensions.reduce((sum,d)=>sum+Number(d.weight),0)-100)>.001)throw Error('评分权重合计必须为 100%。');
}
export const modelSnapshot=m=>({id:m.id,name:m.name||m.model,apiId:m.apiId||'',provider:m.provider||'',version:m.version||'未记录'});
export function createTask({name,module='text',scenario,models,cases,dimensions,conditions='',reviewer='',seed},id=uid()){
 if(!name?.trim())throw Error('请填写任务名称。');
 if(!MODULES[module])throw Error('请选择测评模块。');
 if(models.length<2||models.length>9||new Set(models.map(m=>m.id)).size!==models.length)throw Error('请选择 2–9 个不同模型。');
 if(!cases.length)throw Error('请至少选择一个测评用例。');
 validateRubric(dimensions);
 const frozenCases=cases.map(c=>{const evaluation=caseCriteria(c,module);if(evaluation.module!==module)throw Error('同一任务的用例需要属于同一模块。');if(!evaluation.acceptance.filter(x=>x.trim()).length)throw Error('每个用例至少需要一项验收条件。');return {id:c.id,title:c.title,question:c.question,systemPrompt:c.systemPrompt||'',evaluation:{...evaluation,acceptance:evaluation.acceptance.filter(x=>x.trim()),severe:evaluation.severe.filter(x=>x.trim()),dimensions:clone(dimensions)}}});
 const task={id,schemaVersion:1,rubricVersion:'snapshot:'+id,name:name.trim(),module,scenario:scenario||SCENARIOS[module][0],createdAt:new Date().toISOString(),models:models.map(modelSnapshot),cases:clone(frozenCases),dimensions:clone(dimensions),conditions,reviewer,currency:'CNY',runs:[],conclusion:{recommended:'',suitable:'',unsuitable:'',reason:''}};
 if(seed){const next=addExperiment(task,frozenCases[0].id,'demo');task.runs=next.runs.map((r,i)=>({...r,status:'success',output:seed.outputs[i],preference:seed.feedback?.[i]||'',note:seed.ratings?.[i]?.note||'',legacyScore:seed.ratings?.[i]?.score??null,conversationNotes:seed.notes||'',sourceRef:seed.sourceRef,originalPlan:Object.fromEntries(Object.entries(seed.plans[i]).filter(([key])=>['id','name','model','apiId','provider','version','prompt','seconds','sharer','receiver','fuser','description'].includes(key))),recordedAt:seed.date||task.createdAt}));}
 return task;
}
export function addExperiment(task,caseId,source='manual'){
 if(!task.cases.some(c=>c.id===caseId))throw Error('找不到测评用例。');
 if(!['manual','demo'].includes(source))throw Error('无效数据来源。');
 const repetition=1+Math.max(0,...task.runs.filter(r=>r.caseId===caseId&&r.source===source).map(r=>r.repetition));
 const runs=task.models.map(model=>({id:uid(),caseId,modelId:model.id,repetition,attempt:1,retryOf:null,source,status:'pending',output:'',assets:'',failure:'',executedAt:'',adoption:'',reworkMinutes:null,reviewer:task.reviewer,acceptance:{},severe:{},scores:{},evidence:'',location:'',note:'',preference:'',metrics:{latency:null,cost:null,inputTokens:null,outputTokens:null},measurementNote:'',createdAt:new Date().toISOString()}));
 return {...task,runs:[...task.runs,...runs]};
}
export function acceptanceStatus(task,run){
 if(run.status==='error')return 'fail';
 if(run.status!=='success')return 'pending';
 const c=task.cases.find(c=>c.id===run.caseId);if(!c)return 'pending';
 if(c.evaluation.acceptance.some((_,i)=>run.acceptance?.[i]==='fail')||c.evaluation.severe.some((_,i)=>run.severe?.[i]==='yes'))return 'fail';
 if(c.evaluation.acceptance.some((_,i)=>run.acceptance?.[i]!=='pass')||c.evaluation.severe.some((_,i)=>run.severe?.[i]!=='no'))return 'pending';
 return 'pass';
}
export function qualityScore(task,run){
 const ds=task.dimensions,values=run.scores||{};
 const missing=ds.filter(d=>values[d.id]!=='na'&&!(Number.isInteger(values[d.id])&&values[d.id]>=1&&values[d.id]<=5));
 const applicable=ds.filter(d=>values[d.id]!=='na');
 if(run.status!=='success'||missing.length||!applicable.length)return {score:null,missing:missing.length,applicable:applicable.length,signature:applicable.map(d=>d.id).join(',')};
 const weight=applicable.reduce((s,d)=>s+Number(d.weight),0);
 return {score:Math.round(applicable.reduce((s,d)=>s+Number(d.weight)*(values[d.id]-1)/4,0)/weight*1000)/10,missing:0,applicable:applicable.length,signature:applicable.map(d=>d.id).join(',')};
}
export function saveRun(task,run){
 const existing=task.runs.find(x=>x.id===run.id);if(!existing)throw Error('找不到本次记录。');
 if(task.runs.some(r=>r.retryOf===existing.id))throw Error('此记录已有重试，原记录保留为只读证据。');
 if(!['pending','success','error'].includes(run.status))throw Error('无效运行状态。');
 if(Object.values(run.scores||{}).some(v=>v!==''&&v!=='na'&&!(Number.isInteger(v)&&v>=1&&v<=5)))throw Error('评分必须为 1–5 分、未测或不适用。');
 if(run.status==='success'&&!run.output?.trim()&&!run.assets?.trim())throw Error('请填写原始输出或媒体引用，再标记为已完成。');
 if(run.status==='error'&&!run.failure?.trim())throw Error('请记录失败原因。');
 for(const value of Object.values(run.metrics||{}))if(value!==null&&value!==''&&(!Number.isFinite(Number(value))||Number(value)<0))throw Error('耗时、费用和 Token 数需为非负数。');
 for(const key of ['inputTokens','outputTokens'])if(run.metrics?.[key]!=null&&run.metrics[key]!==''&&!Number.isInteger(Number(run.metrics[key])))throw Error('Token 数需为整数。');
 if(run.reworkMinutes!=null&&run.reworkMinutes!==''&&(!Number.isFinite(Number(run.reworkMinutes))||Number(run.reworkMinutes)<0))throw Error('返工耗时需为非负数。');
 const measured=Object.values(run.metrics||{}).some(v=>v!==null&&v!=='');
 if(measured&&!run.measurementNote?.trim())throw Error('填写测量数据后，请说明记录来源。');
 if(Object.values(run.scores||{}).includes('na')&&!run.note?.trim())throw Error('选择“不适用”时，请在评价备注中说明原因。');
 const {id,caseId,modelId,repetition,attempt,retryOf,source,createdAt,originalPlan,sourceRef,recordedAt}=existing;
 const saved={...clone(run),reworkMinutes:run.reworkMinutes==null||run.reworkMinutes===''?null:Number(run.reworkMinutes),id,caseId,modelId,repetition,attempt,retryOf,source,createdAt,originalPlan,sourceRef,recordedAt,updatedAt:new Date().toISOString()};
 if(source==='demo')saved.metrics={latency:null,cost:null,inputTokens:null,outputTokens:null};
 else saved.metrics=Object.fromEntries(Object.entries(run.metrics||{}).map(([k,v])=>[k,v===null||v===''?null:Number(v)]));
 return {...task,runs:task.runs.map(x=>x.id===id?saved:x)};
}
export function retryRun(task,runId){
 const old=task.runs.find(r=>r.id===runId);
 if(old?.source==='demo')throw Error('演示记录不执行重试，请新增独立测评录入实测结果。');
 if(!old||acceptanceStatus(task,old)!=='fail')throw Error('只有调用失败或验收不通过的记录可以重试。');
 if(task.runs.some(r=>r.retryOf===runId))throw Error('该记录已有重试，请继续处理最新一次。');
 const fresh=addExperiment({...task,runs:[]},old.caseId,old.source).runs.find(r=>r.modelId===old.modelId);
 return {...task,runs:[...task.runs,{...fresh,repetition:old.repetition,attempt:old.attempt+1,retryOf:old.id}]};
}
export const statusLabel=value=>({pass:'通过',fail:'不通过',pending:'待评价'}[value]||value);
export const sourceLabel=source=>source==='demo'?'预置演示（非实测）':'外部实测 · 人工录入';
const mean=values=>values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null;
const observed=value=>typeof value==='number'&&Number.isFinite(value);
export function summarize(task){
 const groups=[];
 // Keep each case, source, and applicability set separate: repetitions cannot overweight another case.
 for(const model of task.models)for(const c of task.cases)for(const source of ['manual','demo']){
  const runs=task.runs.filter(r=>r.modelId===model.id&&r.caseId===c.id&&r.source===source);if(!runs.length)continue;
  const complete=runs.filter(r=>r.status!=='pending');
  const first=runs.filter(r=>r.attempt===1),firstDone=first.filter(r=>acceptanceStatus(task,r)!=='pending');
  const latest=first.map(r=>runs.filter(x=>x.repetition===r.repetition).sort((a,b)=>b.attempt-a.attempt)[0]);
  const accepted=latest.filter(r=>acceptanceStatus(task,r)==='pass');
  const scored=latest.map(r=>qualityScore(task,r)).filter(q=>q.score!==null);
  const comparable=new Set(scored.map(q=>q.signature)).size<=1;
  const costs=complete.filter(r=>observed(r.metrics?.cost));const latency=complete.filter(r=>observed(r.metrics?.latency));
  const costTotal=source!=='demo'&&complete.length>0&&costs.length===complete.length?costs.reduce((s,r)=>s+r.metrics.cost,0):null;
  const resolved=latest.length>0&&latest.every(r=>acceptanceStatus(task,r)!=='pending');
  groups.push({model:model.name,modelId:model.id,caseId:c.id,caseTitle:c.title,scenario:task.scenario,source,runs:runs.length,completed:complete.length,repetitions:first.length,retries:runs.length-first.length,firstPass:firstDone.filter(r=>acceptanceStatus(task,r)==='pass').length,firstEvaluated:firstDone.length,accepted:accepted.length,resolved:latest.filter(r=>acceptanceStatus(task,r)!=='pending').length,quality:comparable?mean(scored.map(q=>q.score)):null,scoreCount:scored.length,comparable,qualityRange:scored.length?[Math.min(...scored.map(q=>q.score)),Math.max(...scored.map(q=>q.score))]:null,latency:source==='demo'?null:mean(latency.map(r=>r.metrics.latency)),latencyCount:source==='demo'?0:latency.length,costTotal,costPerAccepted:resolved&&accepted.length&&costTotal!==null?costTotal/accepted.length:null,costStatus:!resolved?'待完成验收':!accepted.length?'无合格成果':costTotal===null?'未采集':'已采集'});
 }
 return groups;
}
export function modelSummaries(task){
 const groups=summarize(task),out=[];
 for(const model of task.models)for(const source of ['manual','demo']){
  const cases=groups.filter(g=>g.modelId===model.id&&g.source===source);if(!cases.length)continue;
  const runs=task.runs.filter(r=>r.modelId===model.id&&r.source===source);
  const latest=runs.filter(r=>!runs.some(x=>x.retryOf===r.id));
  const scored=latest.map(r=>qualityScore(task,r));
  const allScored=cases.length===task.cases.length&&scored.every(q=>q.score!==null);
  const comparable=new Set(scored.filter(q=>q.score!==null).map(q=>q.signature)).size<=1;
  const sum=key=>cases.reduce((n,c)=>n+c[key],0);
  const allCosts=cases.every(c=>c.costTotal!==null);
  const totalCost=allCosts?sum('costTotal'):null;
  const resolved=sum('resolved')===sum('repetitions')&&cases.length===task.cases.length;
  const accepted=sum('accepted');
  out.push({model:model.name,source,cases:cases.length,totalCases:task.cases.length,repetitions:sum('repetitions'),firstPass:sum('firstPass'),firstEvaluated:sum('firstEvaluated'),accepted,resolved:sum('resolved'),quality:allScored&&comparable?mean(cases.map(c=>c.quality)):null,qualityStatus:!comparable?'不适用维度不同，不合并':!allScored?'用例或评分未完成':'各用例等权平均',costTotal:totalCost,costPerAccepted:resolved&&accepted&&totalCost!==null?totalCost/accepted:null,costStatus:!resolved?'用例或验收未完成':!accepted?'无合格成果':totalCost===null?'未采集':'已采集'});
 }
 return out;
}
const collected=value=>value===null||value===undefined?'未采集':value;
const qText=q=>q.score===null?(q.applicable?'未完成评分':'全部不适用'):q.score;
const runOutput=run=>run.output||'（无文本输出）';
export function detailCSV(task){
 const head=['任务 ID','任务','模块','场景','用例 ID','用例','记录 ID','模型','模型 ID','版本','来源','重复序号','尝试序号','重试源 ID','运行状态','验收','质量分(100)','更好/较差','验收逐项','严重错误逐项','维度评分','权重与评分指引','原始输出','媒体引用','证据位置','证据','备注','评价人','耗时秒','费用 CNY','输入 Token','输出 Token','测量来源','系统提示词','问题','参考材料','测试条件','实际运行时间','是否采纳','返工分钟','保存时间'];
 return csvText([head,...task.runs.map(r=>{const c=task.cases.find(c=>c.id===r.caseId),m=task.models.find(m=>m.id===r.modelId);return [task.id,task.name,MODULES[task.module],task.scenario,c.id,c.title,r.id,m.name,m.apiId||m.id,m.version,sourceLabel(r.source),r.repetition,r.attempt,r.retryOf||'',r.status,statusLabel(acceptanceStatus(task,r)),qText(qualityScore(task,r)),r.preference||'未评价',JSON.stringify(c.evaluation.acceptance.map((name,i)=>({name,result:r.acceptance[i]||'pending'}))),JSON.stringify(c.evaluation.severe.map((name,i)=>({name,result:r.severe[i]||'pending'}))),JSON.stringify(task.dimensions.map(d=>({name:d.name,score:r.scores[d.id]||'未测'}))),JSON.stringify(task.dimensions),runOutput(r),r.assets,r.location,r.evidence,r.note,r.reviewer,collected(r.metrics.latency),collected(r.metrics.cost),collected(r.metrics.inputTokens),collected(r.metrics.outputTokens),r.measurementNote,c.systemPrompt,c.question,c.evaluation.references,task.conditions,r.executedAt||'未记录',r.adoption||'待确认',collected(r.reworkMinutes),r.updatedAt||r.createdAt]})]);
}
export function summaryCSV(task){
 const rows=[['汇总层级','任务','场景','模型','用例 / 覆盖','来源','独立重复次数','重试次数','首过数','首评数','首过率(仅已验收首次)','最终合格数','最终已验收数','质量分(100)','质量口径','有效评分数','质量范围','耗时均值秒','耗时样本数','总费用 CNY','合格成果平均成本 CNY']];
 modelSummaries(task).forEach(s=>rows.push(['模型总览',task.name,task.scenario,s.model,s.cases+'/'+s.totalCases,sourceLabel(s.source),s.repetitions,'',s.firstPass,s.firstEvaluated,s.firstEvaluated?s.firstPass/s.firstEvaluated:'未评价',s.accepted,s.resolved,s.quality??s.qualityStatus,'各用例等权平均','','','','',collected(s.costTotal),s.costPerAccepted??s.costStatus]));
 summarize(task).forEach(s=>rows.push(['用例明细',task.name,s.scenario,s.model,s.caseTitle,sourceLabel(s.source),s.repetitions,s.retries,s.firstPass,s.firstEvaluated,s.firstEvaluated?s.firstPass/s.firstEvaluated:'未评价',s.accepted,s.resolved,s.comparable?s.quality??'未完成评分':'不适用维度不同，不合并','每次重复的最终尝试',s.scoreCount,s.qualityRange?.join('–')||'未完成评分',collected(s.latency),s.latencyCount,collected(s.costTotal),s.costPerAccepted??s.costStatus]));
 return csvText(rows);
}

const quote=text=>String(text||'未填写').split('\n').map(l=>'> '+l).join('\n');
export function taskReport(task){
 const lines=['# 对照 · '+task.name,'','## 测评概览',`- 任务 ID：${task.id}`,`- 模块 / 场景：${MODULES[task.module]} / ${task.scenario}`,`- 创建时间：${task.createdAt}`,`- 用例：${task.cases.length}；模型：${task.models.length}；尝试记录：${task.runs.length}`,'- 来源：外部实测由人工录入；预置演示单独标注，不作为真实选型依据。','','## 测试条件',quote(task.conditions),''];
 task.models.forEach((m,i)=>lines.push(`- ${'ABCDEFGHI'[i]} ${m.name} · ID：${m.apiId||m.id} · 厂商：${m.provider||'未记录'} · 版本：${m.version}`));
 lines.push('','### 固定评分模板 · '+(task.rubricVersion||task.id),'1 分：明显不满足；2 分：较差；3 分：基本满足；4 分：良好；5 分：完全满足。未测不补零；不适用排除权重后重新归一，并须说明原因。');
 task.dimensions.forEach(d=>lines.push(`- ${d.name}（${d.weight}%）：${d.guide||'无额外指引'}`));
 lines.push('','## 结果汇总','按模型 × 用例 × 来源分组，重试不增加独立重复次数。首过率仅使用已验收的首次尝试；最终质量分取每次重复的最后一次尝试。相同适用维度才合并均分；不输出跨用例总排名。','');
 if(!task.runs.length)lines.push('尚无测评记录。');
 modelSummaries(task).forEach(s=>lines.push(`### 模型总览：${s.model} / ${sourceLabel(s.source)}`,`- 用例覆盖 ${s.cases}/${s.totalCases}；首次通过 ${s.firstPass}/${s.firstEvaluated} 已验收首次；最终合格 ${s.accepted}/${s.resolved} 已验收。`,`- 质量总分：${s.quality??s.qualityStatus}（每个用例等权，不因重复次数多而增加权重）。`,`- 总费用：${collected(s.costTotal)} CNY；合格成果平均成本：${s.costPerAccepted??s.costStatus}。`,''));
 summarize(task).forEach(s=>lines.push(`### ${s.model} / ${s.caseTitle} / ${sourceLabel(s.source)}`,`- 独立重复 ${s.repetitions} 次；尝试 ${s.runs} 次；已完成 ${s.completed} 次；重试 ${s.retries} 次。`,`- 首次通过：${s.firstPass}/${s.firstEvaluated} 已验收首次；首次未验收 ${s.repetitions-s.firstEvaluated} 次。`,`- 最终合格：${s.accepted}/${s.resolved} 已验收；最终未验收 ${s.repetitions-s.resolved} 次。`,`- 最终质量均分：${s.comparable?s.quality??'未完成评分':'不适用维度不同，不合并'} / 100；有效评分 ${s.scoreCount} 次；范围 ${s.qualityRange?.join('–')||'未评分'}。`,`- 耗时均值：${collected(s.latency)} 秒（${s.latencyCount} 个样本）；总费用：${collected(s.costTotal)} CNY；每份合格成果成本：${s.costPerAccepted??s.costStatus}。`,''));
 lines.push('## 逐例记录与证据');
 task.cases.forEach(c=>{lines.push(`### ${c.title}`,`- 用例 ID：${c.id}`,'**问题**',quote(c.question),'**系统提示词**',quote(c.systemPrompt),'**参考材料**',quote(c.evaluation.references));task.runs.filter(r=>r.caseId===c.id).forEach(r=>{const m=task.models.find(m=>m.id===r.modelId);lines.push(`#### ${m.name} · 重复 ${r.repetition} · 尝试 ${r.attempt}`,`- 记录 ID：${r.id}；重试源：${r.retryOf||'无'}；来源：${sourceLabel(r.source)}`,`- 状态：${r.status}；验收：${statusLabel(acceptanceStatus(task,r))}；质量：${qText(qualityScore(task,r))}；偏好：${r.preference||'未评价'}`,`- 评价人：${r.reviewer||'未填写'}；实际运行时间：${r.executedAt||'未记录'}；采纳：${r.adoption||'待确认'}；返工：${collected(r.reworkMinutes)} 分钟`,'**验收项**',...c.evaluation.acceptance.map((name,i)=>`- ${name}：${statusLabel(r.acceptance[i]||'pending')}`),'**严重错误**',...c.evaluation.severe.map((name,i)=>`- ${name}：${({yes:'出现',no:'未出现'})[r.severe[i]]||'待确认'}`),'**维度评分**',...task.dimensions.map(d=>`- ${d.name}：${r.scores[d.id]==='na'?'不适用':r.scores[d.id]||'未测'}（权重 ${d.weight}%）`),'**原始输出**',quote(r.output),'**媒体引用（不包含文件本体）**',quote(r.assets),'**证据位置 / 引用 / 备注**',quote([r.location,r.evidence,r.note].filter(Boolean).join('\n')),`- 耗时：${collected(r.metrics.latency)} 秒；费用：${collected(r.metrics.cost)} CNY；输入/输出 Token：${collected(r.metrics.inputTokens)} / ${collected(r.metrics.outputTokens)}`,`- 测量来源：${r.measurementNote||'未采集'}`,`- 失败原因：${r.failure||'无'}`);if(r.sourceRef)lines.push(`- 原对话：${r.sourceRef}；原配置：${JSON.stringify(r.originalPlan)}`,`- 原对话整体评分（非维度评分）：${r.legacyScore??'未评分'}；本轮备注：${r.conversationNotes||'未填写'}`);lines.push('')});});
 lines.push('## 适用性结论（人工填写）',`- 推荐方案：${task.conclusion.recommended||'尚未形成结论'}`,'**适用场景**',quote(task.conclusion.suitable),'**不适用场景**',quote(task.conclusion.unsuitable),'**依据与待验证事项**',quote(task.conclusion.reason),'','---','本报告不自动推断推荐模型。未通过硬门槛的结果仍可保留质量分，但不计为合格成果；演示结果不证明实际能力。费用仅在所有已完成尝试费用齐全时汇总，合格成本还要求最终验收全部完成。');
 return lines.join('\n\n');
}
export const rawPackage=task=>JSON.stringify({format:'duizhao-evaluation',version:1,exportedAt:new Date().toISOString(),mediaPolicy:'仅保存文本原件与媒体引用；不包含远程或本地媒体文件本体。',task:clone(task)},null,2);
