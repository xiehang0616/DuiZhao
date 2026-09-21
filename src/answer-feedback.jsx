import React from 'react';
import {CheckIcon,XIcon} from '@animateicons/react/lucide';
export default function AnswerFeedback({value,label,model,disabled,onChange}){
 return <div className="answer-feedback" role="group" aria-label={label+' '+model+' 评价'}>
  <button aria-label={label+' '+model+'：更好'} aria-pressed={value==='better'} className={value==='better'?'feedback-better':''} disabled={disabled} onClick={()=>onChange('better')}><CheckIcon size={13}/>更好</button>
  <button aria-label={label+' '+model+'：较差'} aria-pressed={value==='worse'} className={value==='worse'?'feedback-worse':''} disabled={disabled} onClick={()=>onChange('worse')}><XIcon size={13}/>较差</button>
 </div>;
}
