import React,{useState} from 'react';
import {App,Button,Input,Form,Switch} from 'antd';
import {FileTextIcon,ArrowLeftRightIcon,MessageSquareIcon,SlidersHorizontalIcon,CheckCheckIcon,BookOpenIcon,CodeIcon,ImageIcon,SearchIcon,PlusIcon,PencilIcon,Trash2Icon,ArrowLeftIcon} from '@animateicons/react/lucide';
import {savePrompt,homePrompts,PROMPT_TITLE_LIMIT,PROMPT_DESC_LIMIT,promptTextLength,clipPromptText} from './prompt-library.mjs';
import './prompt-library.css';
import {CaseEvaluationEditor} from './evaluations-ui.jsx';
export const PROMPT_ICONS={file:FileTextIcon,compare:ArrowLeftRightIcon,message:MessageSquareIcon,settings:SlidersHorizontalIcon,check:CheckCheckIcon,book:BookOpenIcon,code:CodeIcon,image:ImageIcon};
const ICON_NAMES={file:'文档',compare:'对比',message:'对话',settings:'规则',check:'清单',book:'书籍',code:'代码',image:'图片'};
export function PromptIcon({name,size=20,animated=true}){const Icon=PROMPT_ICONS[name]||FileTextIcon;return <Icon size={size} isAnimated={animated}/>}
export default function PromptLibrary({items,onSave,onUse,defaultPrompt}){
 const {message,modal}=App.useApp();
 const [query,setQuery]=useState(''),[draft,setDraft]=useState(null),[original,setOriginal]=useState(null),[error,setError]=useState('');
 const edit=item=>{setDraft({...item});setOriginal({...item});setError('');window.scrollTo(0,0)};
 const cancel=()=>{const close=()=>setDraft(null);if(JSON.stringify(draft)!==JSON.stringify(original))modal.confirm({title:'放弃未保存的修改？',okText:'放弃修改',cancelText:'继续编辑',onOk:close});else close()};
 const persist=next=>{if(onSave(next)===false)return false;return true};
 const save=()=>{try{if(persist(savePrompt(items,draft))){setDraft(null);message.success('提示词已保存')}}catch(e){setError(e.message)}};
 const toggle=item=>{try{if(persist(savePrompt(items,{...item,home:!item.home})))message.success(item.home?'已从首页移除':'已显示在首页')}catch(e){message.warning(e.message)}};
 const remove=item=>modal.confirm({title:'删除提示词？',content:'“'+item.title+'”将从题库和首页移除，已有对话不受影响。',okText:'删除',cancelText:'取消',okButtonProps:{danger:true},onOk:()=>{if(persist(items.filter(x=>x.id!==item.id)))message.success('提示词已删除')}});
 const field=(name,value)=>{setDraft({...draft,[name]:value});setError('')};
 const filtered=items.filter(x=>(x.title+' '+x.desc+' '+x.question+' '+x.systemPrompt).toLowerCase().includes(query.toLowerCase()));
 return <main id="main" className="prompt-library">
 {draft?<><Button type="text" icon={<ArrowLeftIcon size={16}/>} onClick={cancel}>返回题库</Button><div className="library-heading"><div><h1>{items.some(x=>x.id===draft.id)?'编辑提示词':'新增提示词'}</h1><p>设置模型遵守的要求，以及首页案例填入的问题。</p></div></div>
 <Form layout="vertical" onFinish={save} className="prompt-editor">
 <Form.Item label="名称" required htmlFor="prompt-title"><Input className="soft-focus-field" id="prompt-title" count={{show:true,max:PROMPT_TITLE_LIMIT,strategy:promptTextLength,exceedFormatter:clipPromptText}} value={draft.title} onChange={e=>field('title',e.target.value)} placeholder="如：检查退款流程"/></Form.Item>
 <Form.Item label="简介" htmlFor="prompt-desc"><Input className="soft-focus-field" id="prompt-desc" count={{show:true,max:PROMPT_DESC_LIMIT,strategy:promptTextLength,exceedFormatter:clipPromptText}} value={draft.desc} onChange={e=>field('desc',e.target.value)} placeholder="一句话描述用途，显示在首页案例中"/></Form.Item>
 <Form.Item label="图标"><div className="prompt-icon-options" role="group" aria-label="选择提示词图标">{Object.keys(PROMPT_ICONS).map(name=><button key={name} type="button" aria-label={ICON_NAMES[name]+'图标'} aria-pressed={draft.icon===name} onClick={()=>field('icon',name)}><PromptIcon name={name} animated={false}/></button>)}</div></Form.Item>
 <Form.Item label="系统提示词" required htmlFor="prompt-system"><Input.TextArea className="soft-focus-field" id="prompt-system" value={draft.systemPrompt} onChange={e=>field('systemPrompt',e.target.value)} autoSize={{minRows:6,maxRows:16}} placeholder="描述角色、回答规范与约束"/></Form.Item>
 <Form.Item label="案例问题" required htmlFor="prompt-question"><Input.TextArea className="soft-focus-field" id="prompt-question" value={draft.question} onChange={e=>field('question',e.target.value)} autoSize={{minRows:3,maxRows:8}} placeholder="使用该案例时填入输入框的问题"/></Form.Item>
 <CaseEvaluationEditor item={draft} onChange={value=>field('evaluation',value)}/>
 <Form.Item label="显示在首页"><Switch aria-label="显示在首页" checked={draft.home} onChange={value=>field('home',value)}/><span className="library-switch-help">首页最多展示 9 条</span></Form.Item>
 {error&&<p role="alert" className="library-error">{error}</p>}<div className="library-editor-actions"><Button onClick={cancel}>取消</Button><Button htmlType="submit" type="primary">保存提示词</Button></div>
 </Form></>:<><div className="library-heading"><div><h1>我的题库</h1><p>管理系统提示词与案例，自由选择展示在首页的内容。</p></div><Button type="primary" icon={<PlusIcon size={16}/>} onClick={()=>edit({id:crypto.randomUUID(),title:'',desc:'',question:'',systemPrompt:defaultPrompt,icon:'file',home:false,kind:'refund'})}>新增提示词</Button></div>
 <div className="library-toolbar"><span>共 {items.length} 条 · 首页展示 {homePrompts(items).length} / 9</span><Input className="soft-focus-field" aria-label="搜索提示词" prefix={<SearchIcon size={16}/>} placeholder="搜索名称或内容" allowClear value={query} onChange={e=>setQuery(e.target.value)}/></div>
 <div className="library-list">{filtered.map(item=><article className="library-row" key={item.id}><span className="library-icon"><PromptIcon name={item.icon}/></span><div className="library-row-content"><h2>{item.title}</h2><p>{item.desc||item.question}</p><div className="library-row-actions"><Button icon={<PencilIcon size={14}/>} aria-label={'编辑 '+item.title} onClick={()=>edit(item)}>编辑</Button><Button onClick={()=>onUse(item)}>用于新对比</Button><Button danger icon={<Trash2Icon size={14}/>} aria-label={'删除 '+item.title} onClick={()=>remove(item)}>删除</Button></div></div><label className="library-home-toggle"><Switch aria-label={'首页展示 '+item.title} checked={item.home} onChange={()=>toggle(item)}/><span>首页展示</span></label></article>)}</div>
 {!filtered.length&&<div className="library-empty">{query?'没有找到匹配的提示词，请换个关键词。':'题库还没有内容，点击“新增提示词”开始创建。'}</div>}</>}
 </main>;
}
