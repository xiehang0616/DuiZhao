import React,{useState,useEffect} from 'react';
import {createRoot} from 'react-dom/client';
import {ModelOrb} from './motion-ui.jsx';
import './arena.css';
import './loading-demo.css';
function LoadingDemo(){
 const [appearance,setAppearance]=useState(document.documentElement.dataset.theme||'dark');
 const [paused,setPaused]=useState(false),[hidden,setHidden]=useState(document.hidden);
 useEffect(()=>{document.documentElement.dataset.theme=appearance},[appearance]);
 useEffect(()=>{const update=()=>setHidden(document.hidden);document.addEventListener('visibilitychange',update);return()=>document.removeEventListener('visibilitychange',update)},[]);
 return <div className="loading-demo" data-paused={paused||hidden}>
  <header className="loading-demo-header"><a href="arena.html">← 返回对照</a><button className="theme-toggle" onClick={()=>setAppearance(appearance==='dark'?'light':'dark')}>{appearance==='dark'?'浅色':'深色'}</button></header>
  <main className="loading-demo-main"><div className="loading-demo-stage" aria-label="彩虹粒子球加载动效">
   <ModelOrb appearance={appearance} size={64} paused={paused}/>
   <h1><span className="text-shimmer">正在整理回答…</span></h1>
   <p>连接想法，让答案逐渐清晰。</p>
  </div><button className="loading-demo-pause" aria-pressed={paused} onClick={()=>setPaused(!paused)}>{paused?'继续播放':'暂停动效'}</button></main>
  <footer>加载动效演示 · 不调用模型服务</footer>
 </div>;
}
createRoot(document.getElementById('root')).render(<LoadingDemo/>);
