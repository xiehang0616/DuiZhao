import React,{useEffect,useState,useCallback,useRef} from 'react';
import {BorderBeam} from 'border-beam';
import {resolvePreset,MODE_DRAWS} from 'thinking-orbs';
import './motion-ui.css';

// The rotating beam needs an explicit reduced-motion and hidden-tab path.
// Offscreen pausing is provided by BorderBeam's IntersectionObserver.
function useMotionAllowed(){
 const [allowed,setAllowed]=useState(()=>!document.hidden&&!window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{
  const media=window.matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>setAllowed(!document.hidden&&!media.matches);
  media.addEventListener('change',update);
  document.addEventListener('visibilitychange',update);
  update();
  return ()=>{media.removeEventListener('change',update);document.removeEventListener('visibilitychange',update)};
 },[]);
 return allowed;
}

export function ComposerBeam({appearance,children}){
 const motionAllowed=useMotionAllowed();
 const [editing,setEditing]=useState(false);
 // Illuminate only while the prompt itself has focus, including keyboard focus.
 const updateEditing=event=>setEditing(event.target.matches('textarea')&&event.type==='focus');
 // Share the pinned border-beam 1.3.0 rotation clock across the stroke and halo.
 const bindBeam=useCallback(node=>{
  if(node)node.style.setProperty('--composer-beam-angle',`var(--beam-angle-${node.dataset.beam})`);
 },[]);
 return <BorderBeam ref={bindBeam} onFocusCapture={updateEditing} onBlurCapture={updateEditing} staticColors className="composer-beam" size="md" theme={appearance} colorVariant="colorful" duration={5} strength={1} borderRadius={14} active={editing&&motionAllowed} style={{overflow:'visible','--beam-stroke-opacity':2.8,'--beam-inner-opacity':0.85,'--beam-bloom-opacity':1.2}}>{children}</BorderBeam>;
}

// Use the package's original globe geometry, then tint only its particle pixels.
// The component API has no palette prop; source-in preserves transparent gaps.
export function ModelOrb({appearance,size=32,paused=false}){
 const canvas=useRef(null),motionAllowed=useMotionAllowed();
 useEffect(()=>{
  const node=canvas.current,ctx=node?.getContext('2d');if(!ctx)return;
  const size=64,dpr=Math.min(window.devicePixelRatio||1,2);
  node.width=size*dpr;node.height=size*dpr;
  const {mode,speed,opts}=resolvePreset('searching',size);
  const gradient=ctx.createLinearGradient(6,32,58,32);
  [0,35,60,130,190,240,290,330].forEach((h,i)=>gradient.addColorStop(i/7,`hsl(${h} 85% ${appearance==='light'?'40%':'68%'} / ${1-.8*i/7})`));
  let frame=0,visible=true;
  const paint=time=>{
   ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,size,size);
   MODE_DRAWS[mode](ctx,size,time,appearance==='dark',opts);
   ctx.save();ctx.globalCompositeOperation='source-in';ctx.fillStyle=gradient;ctx.fillRect(0,0,size,size);ctx.restore();
  };
  const tick=now=>{paint(now/1000*speed*.7);if(visible&&motionAllowed&&!paused)frame=requestAnimationFrame(tick)};
  const update=()=>{cancelAnimationFrame(frame);paint(.6);if(visible&&motionAllowed&&!paused)frame=requestAnimationFrame(tick)};
  const observer=new IntersectionObserver(([entry])=>{visible=entry.isIntersecting;update()});
  observer.observe(node);update();
  return ()=>{cancelAnimationFrame(frame);observer.disconnect()};
 },[appearance,motionAllowed,paused]);
 return <span className="model-orb" aria-hidden="true" style={{width:size,height:size}}><canvas ref={canvas} width={64} height={64} role="presentation" style={{width:size,height:size,display:'block'}}/></span>;
}

export function ModelStatus({ready,label,appearance}){
 return ready?<span className="model-status" aria-label={'模型 '+label}><span className="model-letter">{label}</span></span>:<span className="model-status"><ModelOrb appearance={appearance} size={28}/></span>;
}
