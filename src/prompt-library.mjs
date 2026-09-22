import {validateRubric} from './evaluations.mjs';
export const HOME_PROMPT_LIMIT=9;
export const PROMPT_TITLE_LIMIT=10,PROMPT_DESC_LIMIT=20;
export const promptTextLength=value=>Array.from(value).length;
export const clipPromptText=(value,{max})=>Array.from(value).slice(0,max).join('');
export function savePrompt(items,prompt){
 const next={...prompt,title:prompt.title.trim(),question:prompt.question.trim(),systemPrompt:prompt.systemPrompt.trim(),desc:prompt.desc.trim()};
 if(!next.title||!next.question||!next.systemPrompt)throw new Error('请填写名称、系统提示词和案例问题。');
 if(promptTextLength(next.title)>PROMPT_TITLE_LIMIT)throw new Error('名称最多 10 字，请缩短后保存。');
 if(promptTextLength(next.desc)>PROMPT_DESC_LIMIT)throw new Error('简介最多 20 字，请缩短后保存。');
 if(next.home&&items.filter(x=>x.home&&x.id!==next.id).length>=HOME_PROMPT_LIMIT)throw new Error('首页最多展示 9 条，请先取消另一条的首页展示。');
 if(next.evaluation){validateRubric(next.evaluation.dimensions);if(!next.evaluation.acceptance.some(x=>x.trim()))throw new Error('请至少填写一项硬性验收条件。');}
 return items.some(x=>x.id===next.id)?items.map(x=>x.id===next.id?next:x):[...items,next];
}
export const homePrompts=items=>items.filter(x=>x.home).slice(0,HOME_PROMPT_LIMIT);
