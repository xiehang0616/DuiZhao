const LETTERS='ABCDEFGHI';
export function modelFeedback(turn,index){
 if(Object.hasOwn(turn.feedback||{},index))return turn.feedback[index];
 if(turn.vote==='both'||turn.vote===LETTERS[index])return 'better';
 if(turn.vote==='neither')return 'worse';
 return null;
}
export function bulkFeedbackPatch(turn,vote){
 return {vote,feedback:Object.fromEntries(turn.plans.map((_,i)=>[i,vote==='both'||vote===LETTERS[i]?'better':vote==='neither'?'worse':null]))};
}
export function feedbackPatch(turn,index,value){
 const feedback=Object.fromEntries(turn.plans.map((_,i)=>[i,modelFeedback(turn,i)]));
 feedback[index]=feedback[index]===value?null:value;
 const values=Object.values(feedback),better=values.flatMap((v,i)=>v==='better'?[i]:[]);
 const vote=values.every(v=>v==='better')?'both':values.every(v=>v==='worse')?'neither':better.length===1?LETTERS[better[0]]:null;
 return {feedback,vote};
}
export const feedbackText=value=>value==='better'?'更好':value==='worse'?'较差':'未评价';
