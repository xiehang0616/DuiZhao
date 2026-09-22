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

import {modelConnectionStatus,suggestedApiAddress} from '../src/model-connections.mjs';
test('connection status distinguishes saved keys, successful calls, errors and unavailable metadata',()=>{
 const m={id:'a',apiId:'upstream'};
 assert.equal(modelConnectionStatus(m,null).label,'读取中');
 assert.equal(modelConnectionStatus(m,[],true).label,'状态未知');
 assert.equal(modelConnectionStatus(m,[]).label,'未配置密钥');
 for(const [connectionStatus,label] of [['configured','已配置 · 待验证'],['connected','已连通'],['error','调用失败']]){
  assert.equal(modelConnectionStatus(m,[{id:'connection:a',keyConfigured:true,connectionStatus}]).label,label);
 }
});
test('console URLs get exact provider API suggestions, valid APIs stay unchanged',()=>{
 assert.equal(suggestedApiAddress('https://platform.deepseek.com/api_keys'),'https://api.deepseek.com');
 assert.equal(suggestedApiAddress('https://maas.antdigital.com/console/apiKey'),'https://maas-api.antdigital.com/v1');
 assert.equal(suggestedApiAddress('https://maas-api.antdigital.com/v1'),null);
 assert.equal(suggestedApiAddress('not-a-url'),null);
});
