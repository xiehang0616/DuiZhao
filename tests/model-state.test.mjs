import test from 'node:test';
import assert from 'node:assert/strict';
import {initialModelState} from '../src/model-state.mjs';
const reader = data => (key, fallback) => data[key] ?? fallback;
test('first visit has no preset models or selected model IDs', () => {
  assert.deepEqual(initialModelState(reader({})), {catalog:[], selected:[]});
});
test('saved configurations survive and stale selections cannot recreate demo models', () => {
  const catalog = [{id:'custom',name:'我的模型',apiId:'my-model'}];
  assert.deepEqual(initialModelState(reader({'arena-models-v2':catalog,'arena-selected-v2':['m0','custom','custom']})), {catalog,selected:['custom']});
  assert.deepEqual(initialModelState(reader({'arena-selected-v2':['m0','m1']})), {catalog:[],selected:[]});
});
test('explicitly empty and malformed saved state remain empty', () => {
  for (const value of [[],{}]) assert.deepEqual(initialModelState(reader({'arena-models-v2':value,'arena-selected-v2':{}})), {catalog:[],selected:[]});
});
