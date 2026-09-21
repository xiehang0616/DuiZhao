import assert from 'node:assert/strict';
import {test} from 'node:test';
import {asConversation,appendConversationTurn,updateConversationTurn} from '../src/conversations.mjs';
const old={id:'old-topic',title:'退款需求',question:'怎么退款？',kind:'refund',plans:[{model:'A',prompt:'旧规则'}],vote:'A',notes:'原有评价'};
test('legacy records retain their question, settings and evaluation',()=>{
 const topic=asConversation(old);
 assert.equal(topic.id,old.id);assert.equal(topic.turns.length,1);
 assert.equal(topic.turns[0].notes,'原有评价');assert.equal(topic.turns[0].vote,'A');
});
test('follow-up preserves the topic and earlier answers while snapshotting new settings',()=>{
 const topic=appendConversationTurn(old,{id:'followup',question:'失败怎么办？',kind:'refund',plans:[{model:'B',prompt:'新规则'}]});
 assert.equal(topic.id,'old-topic');assert.equal(topic.title,'退款需求');assert.equal(topic.turns.length,2);
 assert.equal(topic.turns[0].question,'怎么退款？');assert.equal(topic.turns[0].plans[0].prompt,'旧规则');
 assert.equal(topic.turns[1].plans[0].prompt,'新规则');assert.equal(topic.vote,null);
 const saved=asConversation(JSON.parse(JSON.stringify(topic)));
 const updated=updateConversationTurn(saved,saved.turns[0].id,{vote:'neither'});
 assert.equal(updated.turns[0].vote,'neither');assert.equal(updated.vote,null);
 assert.equal(updated.question,'失败怎么办？');assert.equal(updated.id,'old-topic');
});
test('only an empty current conversation creates a new topic',()=>{
 const topic=appendConversationTurn(null,{id:'new-topic',question:'新业务问题',kind:'upload',plans:[]});
 assert.equal(topic.id,'new-topic');assert.equal(topic.turns.length,1);
});
test('mixed text and image turns keep their own type, media identity and topic',()=>{
 const image=appendConversationTurn(old,{id:'image-turn',question:'做成产品图',kind:'refund',modality:'image',plans:[{id:'image-0',model:'Studio Image',sampleId:'coffee-studio',prompt:'图片规则'}]});
 const followup=appendConversationTurn(image,{id:'text-followup',question:'解释图片构图',kind:'refund',modality:'text',plans:[{model:'A',prompt:'文字规则'}]});
 const reloaded=asConversation(JSON.parse(JSON.stringify(followup)));
 assert.equal(reloaded.id,old.id);assert.equal(reloaded.turns.length,3);
 assert.deepEqual(reloaded.turns.map(t=>t.modality),['text','image','text']);
 assert.equal(reloaded.turns[1].plans[0].sampleId,'coffee-studio');
 const voted=updateConversationTurn(reloaded,'image-turn',{vote:'A',notes:'构图自然'});
 assert.equal(voted.turns[1].notes,'构图自然');assert.equal(voted.turns[2].vote,null);
 assert.equal(voted.modality,'text');
});

test('renaming and pinning survive follow-ups, votes and reload without changing turn content',async()=>{
 const {renameConversation,sortConversations}=await import('../src/conversations.mjs');
 const original={...asConversation(old),pinned:true};
 const renamed=renameConversation(original,'  退款规则验证  ');
 const followed=appendConversationTurn(renamed,{id:'next',question:'超时怎么办？',kind:'refund',plans:[]});
 const voted=updateConversationTurn(followed,'next',{vote:'both'});
 const saved=asConversation(JSON.parse(JSON.stringify(voted)));
 assert.equal(saved.title,'退款规则验证');assert.equal(saved.pinned,true);
 assert.equal(saved.turns[0].question,old.question);assert.equal(original.title,old.title);
 assert.equal(renameConversation(saved,'   '),saved);
 assert.equal(renameConversation(saved,'长'.repeat(81)),saved);
 const recent={...saved,id:'recent',pinned:false},olderPinned={...saved,id:'older-pin'};
 const records=[recent,saved,olderPinned];
 assert.deepEqual(sortConversations(records).map(r=>r.id),['old-topic','older-pin','recent']);
 assert.equal(records[0].id,'recent');
});
