import React, {useState} from 'react';
import {Modal} from 'antd';
import {ProCard} from '@ant-design/pro-components';
import {DownloadIcon, SearchIcon, CheckIcon} from '@animateicons/react/lucide';
import './image-demo.css';
import AnswerFeedback from './answer-feedback.jsx';
import {modelFeedback} from './feedback.mjs';
import {ModelStatus} from './motion-ui.jsx';
import studio from './assets/coffee-studio.png';
import canvas from './assets/coffee-canvas.png';

export const IMAGE_PROMPT='为一台奶油白色的小型咖啡机拍摄产品宣传图。浅色石材台面，清晨阳光，橄榄枝，温暖的米色背景。突出产品质感，画面简洁，不添加文字和 Logo。';
const SAMPLES=[
 {id:'coffee-studio',src:studio,alt:'暖色晨光下，奶油白咖啡机位于画面中间，右侧摆放橄榄枝。'},
 {id:'coffee-canvas',src:canvas,alt:'奶油白咖啡机位于画面右侧，窗边阳光洒落，左侧摆放橄榄枝。'}
];
export const imagePlans=(count,prompt)=>Array.from({length:count},(_,i)=>({id:'image-'+i,model:['Studio Image','Canvas Image'][i]||`图像示例模型 ${i+1}`,prompt,sampleId:SAMPLES[i%2].id}));
export const imageSample=plan=>SAMPLES.find(s=>s.id===plan.sampleId)||SAMPLES[0];

export default function ImageAnswers({turn,onFeedback,disabled}){
 const [expanded,setExpanded]=useState(null);
 const active=expanded===null?null:turn.plans[expanded];
 return <>
  <div className="image-demo-notice">图片布局演示 · 模型名称为虚拟示例；两张预置素材循环展示，不随提示词改变，未调用真实图片 API。</div>
  <div className={'answer-grid image-results '+(turn.plans.length>2?'multi-models':'')}>{turn.plans.map((plan,index)=>{const sample=imageSample(plan),label='ABCDEFGHI'[index],feedback=modelFeedback(turn,index),win=feedback==='better',worse=feedback==='worse';return <ProCard key={plan.id} bordered className={'answer-card image-result-card '+(win?'winner':worse?'neither':'')}>
   <div className="answer-card-header"><span className="model-label"><ModelStatus ready label={label}/><span className="model-name">{plan.model}</span><small className="image-sample-badge">示例</small></span><div className="card-tools"><a className="icon-btn" href={sample.src} download={'对照-'+plan.model+'-演示.png'} aria-label={'下载 '+plan.model+' 示例图片'}><DownloadIcon size={16}/></a><button className="icon-btn" aria-label={'放大 '+plan.model+' 图片'} onClick={()=>setExpanded(index)}><SearchIcon size={16}/></button></div></div>
   <button className="image-canvas" aria-label={'查看 '+plan.model+' 大图'} onClick={()=>setExpanded(index)}><img src={sample.src} alt={sample.alt} width="1536" height="1024"/><span className="image-hover-hint"><SearchIcon size={15}/>放大查看</span></button>
   <div className="image-file-meta"><span>1536 × 1024 · PNG</span><span>预置演示图片</span></div>
   <div className="answer-card-footer"><span>{win?'已选为更好':worse?'已选为较差':'比较构图与细节'}</span><AnswerFeedback value={feedback} label={label} model={plan.model} disabled={disabled} onChange={value=>onFeedback(index,value)}/></div>
  </ProCard>})}</div>
  <Modal open={active!==null} onCancel={()=>setExpanded(null)} title={active?active.model+' · 演示图片':''} footer={null} width={1100} centered className="image-preview-modal">{active&&<><img className="image-preview-full" src={imageSample(active).src} alt={imageSample(active).alt}/><div className="image-preview-caption"><span>原图 · 1536 × 1024</span><a href={imageSample(active).src} download={'对照-'+active.model+'-演示.png'}><DownloadIcon size={16}/>下载图片</a></div></>}</Modal>
 </>
}
