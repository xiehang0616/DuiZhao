import test from 'node:test';
import assert from 'node:assert/strict';
import {getAttachmentType,attachmentSnapshots,questionWithAttachments,attachmentText} from '../src/attachments.mjs';
import {appendConversationTurn} from '../src/conversations.mjs';
test('attachments accept supported MIME types and extension fallback, reject unsupported formats',()=>{
 for(const [name,type,expected] of [['a.png','image/png','image'],['a.mov','video/quicktime','video'],['a.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document','form'],['a.XLSX','','form'],['a.WEBP','application/octet-stream','image'],['a.csv','text/csv','form'],['a.svg','image/svg+xml',null],['a.mp3','audio/mpeg',null],['a.exe','','null'],['a.png','application/x-executable',null]])assert.equal(getAttachmentType({name,type}),expected==='null'?null:expected);
});
test('snapshots keep text and metadata, never persist File or preview URL',()=>{
 const input=[{id:'a',type:'text',name:'材料',content:'独立原文'},{id:'b',type:'image',name:'图.png',size:10,file:{binary:true},preview:'blob:secret'}];
 const snapshot=attachmentSnapshots(input);input[0].content='modified';
 assert.equal(snapshot[0].content,'独立原文');assert.deepEqual(snapshot[1],{id:'b',type:'image',name:'图.png',size:10});
 const first=appendConversationTurn(null,{id:'turn1',question:'问题',attachments:snapshot});
 const next=appendConversationTurn(first,{id:'turn2',question:'追问'});
 assert.deepEqual(next.turns[0].attachments,snapshot);assert.deepEqual(next.turns[1].attachments,[]);
 assert.match(attachmentText(JSON.parse(JSON.stringify(first)).attachments),/独立原文/);
});
test('request includes text material but excludes unsupported file content and old attachments',()=>{
 assert.equal(questionWithAttachments('问题'), '问题');
 const text=questionWithAttachments('问题',[{type:'text',name:'文本内容',content:'参考要求'},{type:'image',name:'secret.png',size:12}]);
 assert.match(text,/参考要求/);assert.doesNotMatch(text,/secret/);
});
