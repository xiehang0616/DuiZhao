import assert from 'node:assert/strict';
import {test} from 'node:test';
import {DEFAULT_SCHEMES,snapshotScheme,c2cPlans,checkServiceUrl,csvText} from '../src/c2c.mjs';
import {appendConversationTurn,updateConversationTurn,asConversation} from '../src/conversations.mjs';
test('C2C history keeps pair, fuser, scores and earlier turns after editing configurations',()=>{
 const scheme={...DEFAULT_SCHEMES[0]};const snapshot=snapshotScheme(scheme);
 let record=appendConversationTurn(null,{id:'first',question:'退款？',plans:c2cPlans(scheme,'规则'),scheme:snapshot,compareMode:'c2c',kind:'refund'});
 record=updateConversationTurn(record,'first',{ratings:{0:{score:4,note:'正常流程完整'}}});
 scheme.pairId='qwen-base';scheme.name='改名';
 record=appendConversationTurn(record,{id:'second',question:'再比较',plans:c2cPlans(scheme,'新规则'),scheme:snapshotScheme(scheme),compareMode:'c2c',kind:'refund'});
 record=appendConversationTurn(record,{id:'third',question:'普通回答',plans:[{model:'API 模型'}],kind:'refund'});
 const saved=asConversation(JSON.parse(JSON.stringify(record)));
 assert.equal(saved.id,'first');assert.equal(saved.turns.length,3);
 assert.equal(saved.turns[0].scheme.fuser,'qwen3_0.6b+qwen2.5_0.5b_Fuser');
 assert.equal(saved.turns[1].scheme.sharer,'Qwen/Qwen3-4B-Base');
 assert.equal(saved.turns[0].ratings[0].score,4);assert.deepEqual(saved.turns[1].ratings,{});
 assert.equal(saved.turns[2].compareMode,'models');assert.equal(saved.turns[2].scheme,null);
 assert.equal(saved.turns[0].plans[0].sharer,'');assert.equal(saved.turns[0].plans[1].fuser,'');
 assert.equal(saved.turns[0].plans[2].fuser,saved.turns[0].scheme.fuser);
});
test('service address validation rejects unsafe schemes and credentials',()=>{
 for(const url of ['','hello','javascript:alert(1)','https://user:key@example.com','https://example.com?key=secret'])assert.notEqual(checkServiceUrl(url),'');
 assert.equal(checkServiceUrl('http://127.0.0.1:8000'),'');assert.equal(checkServiceUrl('https://c2c.example.com/api'),'');
});
test('CSV safely preserves multiline notes and neutralizes spreadsheet formulas',()=>{
 const csv=csvText([['评分','备注'],[4,'他说"完整"\n需补充'],[' =SUM(A1:A2)','文本']]);
 assert.ok(csv.startsWith('\ufeff'));assert.ok(csv.includes('"他说""完整""\n需补充"'));assert.ok(csv.includes('"\' =SUM(A1:A2)"'));
});
