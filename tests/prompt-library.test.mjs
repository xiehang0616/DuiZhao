import {test} from 'node:test';
import assert from 'node:assert/strict';
import {savePrompt,homePrompts} from '../src/prompt-library.mjs';
const prompt=i=>({id:String(i),title:'案例 '+i,desc:'用途',question:'问题',systemPrompt:'系统规范',home:false,icon:'file'});
test('library stores more than nine prompts while enforcing home limit on creates and updates',()=>{
 let items=[];for(let i=0;i<20;i++)items=savePrompt(items,{...prompt(i),home:i<9});
 assert.equal(items.length,20);assert.equal(homePrompts(items).length,9);
 assert.throws(()=>savePrompt(items,{...prompt(20),home:true}),/最多展示 9/);
 assert.throws(()=>savePrompt(items,{...items[9],home:true}),/最多展示 9/);
 items=savePrompt(items,{...items[0],home:false});
 items=savePrompt(items,{...items[9],home:true});assert.equal(homePrompts(items).length,9);
});
test('editing retains id and visibility, persists icon/system/question and supports empty library',()=>{
 const initial=[{...prompt(0),home:true}];
 const next=savePrompt(initial,{...initial[0],title:' 新名称 ',icon:'book',question:' 新问题 ',systemPrompt:' 新规范 '});
 assert.equal(next.length,1);assert.equal(next[0].id,'0');assert.equal(next[0].home,true);
 assert.equal(next[0].question,'新问题');assert.equal(next[0].systemPrompt,'新规范');assert.equal(next[0].icon,'book');
 assert.equal(initial[0].title,'案例 0');assert.deepEqual(homePrompts([]),[]);
 assert.deepEqual(JSON.parse(JSON.stringify(next)),next);
});
test('required fields cannot be blank',()=>{
 for(const key of ['title','question','systemPrompt'])assert.throws(()=>savePrompt([],{...prompt(0),[key]:'  '}),/请填写/);
});
test('title and description limits also apply on save without silently truncating old records',()=>{
 const valid={...prompt(0),title:'名'.repeat(10),desc:'介'.repeat(20)};
 assert.equal(savePrompt([],valid)[0].title,valid.title);
 assert.throws(()=>savePrompt([],{...valid,title:'名'.repeat(11)}),/名称最多 10/);
 assert.throws(()=>savePrompt([],{...valid,desc:'介'.repeat(21)}),/简介最多 20/);
});
test('input character counter and paste clipping preserve whole Unicode characters',async()=>{
 const {promptTextLength,clipPromptText}=await import('../src/prompt-library.mjs');
 assert.equal(promptTextLength('😀中文'),3);
 assert.equal(clipPromptText('😀中文',{max:2}),'😀中');
 assert.equal(clipPromptText('字'.repeat(21),{max:20}).length,20);
});
