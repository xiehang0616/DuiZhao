import React,{useState,useRef,useEffect,useLayoutEffect,useId} from 'react';
import {createPortal} from 'react-dom';
import {AnimatePresence,motion} from 'motion/react';
import {HugeiconsIcon} from '@hugeicons/react';
import {TextIcon,Image01Icon,SourceCodeIcon,Video01Icon,Tick02Icon,ArrowDown01Icon,Add01Icon,Cancel01Icon,File01Icon,Upload01Icon} from '@hugeicons/core-free-icons';
import {App,Modal,Input} from 'antd';
import {FILE_ACCEPT,getAttachmentType,formatFileSize} from './attachments.mjs';
import './composer-controls.css';
// Subscribe explicitly: Motion's hook snapshots the preference only on mount.
function useReducedMotion(){
 const [reduced,setReduced]=useState(()=>window.matchMedia('(prefers-reduced-motion: reduce)').matches);
 useEffect(()=>{const media=window.matchMedia('(prefers-reduced-motion: reduce)');const update=()=>setReduced(media.matches);media.addEventListener('change',update);update();return()=>media.removeEventListener('change',update)},[]);
 return reduced;
}
const Icon=({icon,size=20})=><HugeiconsIcon icon={icon} size={size} strokeWidth={1.8}/>;
const TYPES=[{key:'text',name:'文本',description:'与模型对话，比较文字回答',icon:TextIcon},{key:'image',name:'图片',description:'描述画面，比较图片效果',icon:Image01Icon},{key:'code',name:'代码',description:'描述需求，比较代码实现',icon:SourceCodeIcon},{key:'video',name:'视频',description:'描述镜头与动作',icon:Video01Icon}];
const ATTACH_TYPES=[{key:'text',name:'文本',description:'粘贴补充材料',icon:TextIcon},{key:'form',name:'表单',description:'PDF、Word、Excel、CSV',icon:File01Icon},{key:'image',name:'图片',description:'PNG、JPG、WebP、GIF',icon:Image01Icon},{key:'video',name:'视频',description:'MP4、MOV、WebM',icon:Video01Icon}];

const MENU_SCALE = 0.7;

// Portal keeps both the home and dock menus clear of the composer's animated border.
function ComposerMenu({items,value,onSelect,disabled,label,attachment=false}){
 const [open,setOpen]=useState(false),[position,setPosition]=useState(null);
 const trigger=useRef(null),menu=useRef(null),id=useId(),reduce=useReducedMotion();
 const current=items.find(x=>x.key===value)||items[0];
 const close=(restore=false)=>{setOpen(false);if(restore)trigger.current?.focus()};
 useLayoutEffect(()=>{
  if(!open)return;
  const place=()=>{const r=trigger.current.getBoundingClientRect(),width=Math.min((attachment?290:330)*MENU_SCALE,window.innerWidth-24),above=r.top-20,below=window.innerHeight-r.bottom-20;
   const up=above>=Math.min((attachment?280:316)*MENU_SCALE,below);
   setPosition({left:Math.max(12,Math.min(r.left,window.innerWidth-width-12)),width,maxHeight:Math.max(80,up?above:below),...(up?{bottom:window.innerHeight-r.top+8}:{top:r.bottom+8}),transformOrigin:up?'left bottom':'left top'});
  };place();window.addEventListener('resize',place);window.addEventListener('scroll',place,true);
  const outside=e=>{if(!menu.current?.contains(e.target)&&!trigger.current?.contains(e.target))close()};
  document.addEventListener('pointerdown',outside);
  return()=>{window.removeEventListener('resize',place);window.removeEventListener('scroll',place,true);document.removeEventListener('pointerdown',outside)};
 },[open,attachment]);
 useEffect(()=>{if(disabled)close()},[disabled]);
 useEffect(()=>{if(!open||!position)return;const frame=requestAnimationFrame(()=>{const nodes=menu.current?.querySelectorAll('button:not(:disabled)');const selected=menu.current?.querySelector('[aria-checked="true"]');(selected||nodes?.[0])?.focus()});return()=>cancelAnimationFrame(frame)},[open,!!position]);
 const keydown=e=>{
  if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);return}
  if(e.key==='Tab'){close(true);return}
  const nodes=[...menu.current.querySelectorAll('button:not(:disabled)')],i=nodes.indexOf(document.activeElement);
  const target=e.key==='Home'?0:e.key==='End'?nodes.length-1:e.key==='ArrowDown'?(i+1)%nodes.length:e.key==='ArrowUp'?(i-1+nodes.length)%nodes.length:null;
  if(target!==null){e.preventDefault();nodes[target]?.focus()}
 };
 return <>
  <motion.button ref={trigger} type="button" disabled={disabled} className={(attachment?'attachment-trigger icon-btn':'compare-type-trigger')+(open?' is-open':'')} aria-label={label} aria-haspopup="menu" aria-expanded={open} aria-controls={open?id:undefined} whileTap={!attachment&&!reduce?{scale:.96}:undefined} onClick={()=>setOpen(v=>!v)} onKeyDown={e=>{if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();setOpen(true)}}}>
   <Icon icon={attachment?Add01Icon:current.icon} size={attachment?19:17}/>{!attachment&&<><span>{current.name}</span><motion.span className="compare-type-arrow" animate={{rotate:open?180:0}} transition={{duration:reduce?0:.2}}><Icon icon={ArrowDown01Icon} size={13}/></motion.span></>}
  </motion.button>
  {createPortal(<AnimatePresence>{open&&position&&<motion.div ref={menu} id={id} role="menu" aria-label={attachment?'添加附件':'内容类型'} className={'composer-popover '+(attachment?'attachment-menu':'compare-type-menu')} style={{...position,'--menu-scale':MENU_SCALE}} initial={{opacity:0,scale:reduce?1:.96,y:reduce?0:8}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0,scale:reduce?1:.97,y:reduce?0:5}} transition={{duration:reduce?0:.24,ease:[.22,1,.36,1]}} onKeyDown={keydown}>
   {items.map((item,index)=>{const selected=!attachment&&value===item.key;return <motion.button key={item.key} type="button" role={attachment?'menuitem':'menuitemradio'} aria-checked={attachment?undefined:selected} tabIndex={-1} disabled={item.disabled} className={'compare-type-item '+(selected?'is-selected':'')} onClick={()=>{onSelect(item.key);close(true)}} initial={{opacity:0,y:reduce?0:5}} animate={{opacity:1,y:0}} transition={{delay:reduce?0:index*.025,duration:reduce?0:.18}} whileHover={!item.disabled&&!reduce?{x:2}:undefined} whileTap={!item.disabled&&!reduce?{scale:.985}:undefined}>
    <span className="compare-type-icon"><Icon icon={item.icon} size={23*MENU_SCALE}/></span><span className="compare-type-copy"><strong>{item.name}</strong><span>{item.description}</span></span>
    {selected&&<motion.span className="compare-type-check" initial={{opacity:0,scale:reduce?1:.7}} animate={{opacity:1,scale:1}} transition={reduce?{duration:0}:{type:'spring',stiffness:500,damping:28}}><Icon icon={Tick02Icon} size={21*MENU_SCALE}/></motion.span>}
   </motion.button>})}
  </motion.div>}</AnimatePresence>,document.body)}
 </>;
}
export function CompareTypeMenu({value,onChange,disabled}){return <ComposerMenu items={TYPES} value={value} onSelect={onChange} disabled={disabled} label={'切换内容类型，当前为'+(TYPES.find(x=>x.key===value)?.name||'文本')}/>}
export function useAttachments(){
 const [items,setItems]=useState([]),latest=useRef(items);latest.current=items;
 const {message}=App.useApp();
 useEffect(()=>()=>latest.current.forEach(a=>{if(a.preview)URL.revokeObjectURL(a.preview)}),[]);
 const clear=()=>{latest.current.forEach(a=>{if(a.preview)URL.revokeObjectURL(a.preview)});setItems([])};
 const remove=id=>{const a=latest.current.find(a=>a.id===id);if(a?.preview)URL.revokeObjectURL(a.preview);setItems(prev=>prev.filter(a=>a.id!==id))};
 const addFiles=files=>{const accepted=[],rejected=[];Array.from(files||[]).forEach(file=>{const type=getAttachmentType(file);if(!type){rejected.push(file.name);return}accepted.push({id:crypto.randomUUID(),type,name:file.name,size:file.size,file,preview:type==='image'?URL.createObjectURL(file):null})});if(accepted.length)setItems(prev=>[...prev,...accepted]);if(rejected.length)message.warning('不支持的文件格式：'+rejected.join('、'))};
 const addText=content=>setItems(prev=>[...prev,{id:crypto.randomUUID(),type:'text',name:'文本内容',content}]);
 return {items,addFiles,addText,remove,clear};
}
export function AttachMenu({attachments,disabled}){
 const fileInput=useRef(null),[textOpen,setTextOpen]=useState(false),[text,setText]=useState('');
 return <><ComposerMenu attachment items={ATTACH_TYPES} disabled={disabled} label="添加附件" onSelect={type=>{if(type==='text'){setTextOpen(true);return}fileInput.current.accept=FILE_ACCEPT[type];fileInput.current.click()}}/>
  <input hidden ref={fileInput} type="file" multiple aria-label="选择附件文件" onChange={e=>{attachments.addFiles(e.target.files);e.target.value=''}}/>
  <Modal title="添加文本附件" open={textOpen} onCancel={()=>setTextOpen(false)} okText="添加文本" cancelText="取消" okButtonProps={{disabled:!text.trim()||disabled}} onOk={()=>{if(!text.trim()||disabled)return;attachments.addText(text.trim());setText('');setTextOpen(false)}} afterOpenChange={open=>{if(open)document.getElementById('attachment-text')?.focus()}}>
   <label htmlFor="attachment-text">补充材料</label><Input.TextArea id="attachment-text" className="soft-focus-field" value={text} onChange={e=>setText(e.target.value)} rows={7} placeholder="粘贴需要模型参考的文本…"/>
  </Modal>
 </>;
}
export function AttachmentList({items,onRemove,disabled=false}){const reduce=useReducedMotion();return <div className="composer-attachments" aria-label="已添加附件" aria-live={onRemove?'polite':undefined}><AnimatePresence>{items.map(a=><motion.div key={a.id} className="composer-attachment" initial={reduce?false:{opacity:0,scale:.96,y:4}} animate={{opacity:1,scale:1,y:0}} exit={{opacity:0}} transition={{duration:reduce?0:.16}}>
 {a.preview?<img src={a.preview} alt="" className="attachment-preview"/>:<span className="attachment-icon"><Icon icon={a.type==='video'?Video01Icon:a.type==='image'?Image01Icon:File01Icon}/></span>}
 <span className="attachment-info"><strong title={a.type==='text'?a.content:a.name}>{a.name}</strong><small>{a.type==='text'?a.content.length+' 字':formatFileSize(a.size)}</small></span>{onRemove&&<button type="button" disabled={disabled} aria-label={'删除附件 '+a.name} onClick={()=>onRemove(a.id)}><Icon icon={Cancel01Icon} size={14}/></button>}
 </motion.div>)}</AnimatePresence></div>}
export function ComposerSurface({attachments,disabled,children}){
 const [dragging,setDragging]=useState(false),depth=useRef(0),reduce=useReducedMotion();
 const reset=()=>{depth.current=0;setDragging(false)};
 useEffect(()=>{window.addEventListener('dragend',reset);window.addEventListener('drop',reset);window.addEventListener('blur',reset);return()=>{window.removeEventListener('dragend',reset);window.removeEventListener('drop',reset);window.removeEventListener('blur',reset)}},[]);
 const isFile=e=>Array.from(e.dataTransfer?.types||[]).includes('Files');
 return <div className={'composer '+(dragging?'is-dragging-file':'')} onDragEnter={e=>{if(!isFile(e))return;e.preventDefault();e.stopPropagation();depth.current++;setDragging(true)}} onDragOver={e=>{if(!isFile(e))return;e.preventDefault();e.stopPropagation();e.dataTransfer.dropEffect=disabled?'none':'copy'}} onDragLeave={e=>{e.preventDefault();e.stopPropagation();if(--depth.current<=0)reset()}} onDrop={e=>{if(!isFile(e))return;e.preventDefault();e.stopPropagation();reset();if(!disabled)attachments.addFiles(e.dataTransfer.files)}}>
 <AnimatePresence>{dragging&&<motion.div className="composer-drop-layer" role="status" initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}} transition={{duration:reduce?0:.16}}><Icon icon={Upload01Icon} size={24}/><strong>{disabled?'生成完成后可添加文件':'松开以添加文件'}</strong><span>支持图片、视频、PDF、Word、Excel、CSV</span></motion.div>}</AnimatePresence>
 {attachments.items.length>0&&<><AttachmentList items={attachments.items} onRemove={attachments.remove} disabled={disabled}/>{attachments.items.some(a=>a.type!=='text')&&<p className="attachment-support-note" role="status">文件已添加到本地，暂不支持发送；移除文件后可发送问题和文本附件。</p>}</>}{children}</div>;
}
