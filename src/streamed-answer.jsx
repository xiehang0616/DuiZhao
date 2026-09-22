import React,{useRef,useLayoutEffect,useState,useEffect} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import './streamed-answer.css';
export default function StreamedAnswer({text='',status,error,loading}){
 const root=useRef(null),follow=useRef(true),[following,setFollowing]=useState(true);
 const streaming=status==='waiting'||status==='streaming';
 useEffect(()=>{
  const scroller=root.current?.closest('.answer-scroll');if(!scroller)return;
  const scroll=()=>{const near=scroller.scrollHeight-scroller.clientHeight-scroller.scrollTop<40;follow.current=near;setFollowing(near)};
  scroller.addEventListener('scroll',scroll,{passive:true});return()=>scroller.removeEventListener('scroll',scroll);
 },[]);
 useLayoutEffect(()=>{const scroller=root.current?.closest('.answer-scroll');if(scroller&&follow.current)scroller.scrollTop=scroller.scrollHeight},[text,status]);
 const jump=()=>{const scroller=root.current?.closest('.answer-scroll');follow.current=true;setFollowing(true);if(scroller)scroller.scrollTop=scroller.scrollHeight};
 return <div ref={root} className="streamed-answer" aria-busy={streaming}>
  {!text&&streaming?loading:<ReactMarkdown remarkPlugins={[remarkGfm]} skipHtml components={{img:({alt})=><span className="stream-image-reference">[图片：{alt||'图片引用'}]</span>,a:({children,href})=><a href={href} target="_blank" rel="noopener noreferrer">{children}</a>}}>{text}</ReactMarkdown>}
  {text&&streaming&&<span className="stream-cursor" aria-hidden="true"/>}
  {error&&<p className="stream-error" role="status">{error}{text?' · 已保留收到的内容，修正配置后可重新发送。':' · 修正配置后可重新发送问题。'}</p>}
  {status==='stopped'&&<p className="stream-status">已停止，保留已生成内容。</p>}
  {streaming&&!following&&<button className="stream-follow" onClick={jump}>跟随最新内容 ↓</button>}
 </div>;
}
