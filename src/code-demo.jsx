import React from 'react';
import {ProCard} from '@ant-design/pro-components';
import {CopyIcon} from '@animateicons/react/lucide';
import './code-demo.css';
import AnswerFeedback from './answer-feedback.jsx';
import {modelFeedback} from './feedback.mjs';
import {ModelStatus} from './motion-ui.jsx';

export const CODE_PROMPT='写一个 JavaScript 函数，接收一个数字数组，过滤出其中的偶数并返回它们的总和。';
const SAMPLES=[
 {id:'code-readable',title:'可读写法',lang:'JavaScript',code:`function sumEven(numbers) {
  return numbers
    .filter((n) => n % 2 === 0)
    .reduce((total, n) => total + n, 0);
}`},
 {id:'code-compact',title:'紧凑写法',lang:'JavaScript',code:`const sumEven = (numbers) =>
  numbers.reduce((sum, n) => (n % 2 === 0 ? sum + n : sum), 0);`}
];
export const codePlans=(count,prompt)=>Array.from({length:count},(_,i)=>({id:'code-'+i,model:['代码示例模型 A','代码示例模型 B'][i]||`代码示例模型 ${i+1}`,prompt,sampleId:SAMPLES[i%2].id}));
export const codeSample=plan=>SAMPLES.find(s=>s.id===plan.sampleId)||SAMPLES[0];

export default function CodeAnswers({turn,onFeedback,disabled}){
 return <>
  <div className="code-demo-notice">代码演示 · 模型名称为虚拟示例；两段预置代码循环展示，未调用真实模型。</div>
  <div className={'answer-grid code-results '+(turn.plans.length>2?'multi-models':'')}>{turn.plans.map((plan,index)=>{const sample=codeSample(plan),label='ABCDEFGHI'[index],feedback=modelFeedback(turn,index),win=feedback==='better',worse=feedback==='worse';return <ProCard key={plan.id} bordered className={'answer-card code-result-card '+(win?'winner':worse?'neither':'')}>
   <div className="answer-card-header"><span className="model-label"><ModelStatus ready label={label}/><span className="model-name">{plan.model}</span><small className="code-sample-badge">示例</small></span><div className="card-tools"><button className="icon-btn" aria-label={'复制 '+plan.model+' 代码'} onClick={()=>navigator.clipboard?.writeText(sample.code)}><CopyIcon size={15}/></button></div></div>
   <div className="code-block-wrap"><pre className="code-block"><code>{sample.code}</code></pre></div>
   <div className="code-file-meta"><span>{sample.title} · {sample.lang}</span><span>预置演示代码</span></div>
   <div className="answer-card-footer"><span>{win?'已选为更好':worse?'已选为较差':'比较实现与可读性'}</span><AnswerFeedback value={feedback} label={label} model={plan.model} disabled={disabled} onChange={value=>onFeedback(index,value)}/></div>
  </ProCard>})}</div>
 </>;
}
