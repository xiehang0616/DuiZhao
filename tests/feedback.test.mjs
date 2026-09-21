import assert from 'node:assert/strict';
import {test} from 'node:test';
import {modelFeedback,feedbackPatch,bulkFeedbackPatch,feedbackText} from '../src/feedback.mjs';
import {appendConversationTurn,updateConversationTurn,asConversation} from '../src/conversations.mjs';
const turn={id:'first',question:'评价测试',plans:[{model:'Qwen'},{model:'DeepSeek'}],vote:null};
test('legacy votes display without discarding explicit cleared feedback',()=>{
 assert.equal(modelFeedback({...turn,vote:'A'},0),'better');
 assert.equal(modelFeedback({...turn,vote:'neither'},1),'worse');
 assert.equal(modelFeedback({...turn,vote:'both',feedback:{0:null}},0),null);
});
test('individual positive and negative choices are independent and toggle off',()=>{
 let state={...turn,...feedbackPatch(turn,0,'better')};
 state={...state,...feedbackPatch(state,1,'worse')};
 assert.deepEqual(state.feedback,{0:'better',1:'worse'});
 state={...state,...feedbackPatch(state,0,'better')};
 assert.deepEqual(state.feedback,{0:null,1:'worse'});
 assert.equal(state.vote,null);
 state={...state,...feedbackPatch(state,1,'better')};
 assert.equal(state.feedback[1],'better');
 assert.equal(state.vote,'B');
});
test('bulk votes replace all previous choices consistently',()=>{
 const state={...turn,feedback:{0:'worse',1:'better'}};
 assert.deepEqual(bulkFeedbackPatch(state,'both').feedback,{0:'better',1:'better'});
 assert.deepEqual(bulkFeedbackPatch(state,'neither').feedback,{0:'worse',1:'worse'});
 assert.deepEqual(bulkFeedbackPatch(state,'A').feedback,{0:'better',1:null});
});
test('feedback survives reload and remains attached to its original turn',()=>{
 let topic=appendConversationTurn(null,turn);
 topic=updateConversationTurn(topic,'first',feedbackPatch(topic.turns[0],0,'better'));
 topic=appendConversationTurn(topic,{...turn,id:'second',question:'追问'});
 topic=asConversation(JSON.parse(JSON.stringify(topic)));
 assert.equal(modelFeedback(topic.turns[0],0),'better');
 assert.equal(modelFeedback(topic.turns[1],0),null);
 topic=updateConversationTurn(topic,'first',feedbackPatch(topic.turns[0],1,'worse'));
 assert.equal(modelFeedback(topic.turns[0],1),'worse');
 assert.deepEqual(topic.feedback,{});
 assert.equal(feedbackText(modelFeedback(topic.turns[0],1)),'较差');
});
