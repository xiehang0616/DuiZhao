import test from 'node:test';
import assert from 'node:assert/strict';
import {modelConnections} from '../src/model-connections.mjs';
test('selected model names drive groups, each with its own ID and endpoint',()=>{
 const available=[{id:'qwen',modelId:'qwen-remote',baseUrl:'https://q.example/v1',keyConfigured:true},{id:'unselected',name:'Other'}];
 const rows=modelConnections([{id:'a',name:'我的 Qwen',provider:'通义千问',apiId:'qwen'},{id:'b',name:'另一个 Qwen',apiId:'qwen'}],available);
 assert.equal(rows.length,2);assert.equal(rows[0].name,'我的 Qwen');assert.equal(rows[0].baseUrl,'https://q.example/v1');assert.equal(rows[0].modelId,'qwen-remote');assert.notEqual(rows[0].id,rows[1].id);
});
test('saved connections override presets without copying or exposing API keys',()=>{
 const rows=modelConnections([{id:'a',name:'新名称',apiId:'custom'}],[{id:'connection:a',connectionName:'私有服务',baseUrl:'https://own.example/v1',keyConfigured:true,apiKey:'never-copy'}]);
 assert.equal(rows[0].connectionName,'私有服务');assert.equal(rows[0].name,'新名称');assert.equal(rows[0].modelId,'custom');assert.equal(rows[0].apiKey,undefined);
 assert.deepEqual(modelConnections([],[]),[]);
});
