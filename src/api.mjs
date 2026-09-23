// 集中式 API 层：前端只通过这里访问后端，不散落 fetch。
// 后端地址：本地默认 127.0.0.1:8000；线上可用 window.__BACKEND_URL__ 指定，或留空走同域代理。
const BASE_URL =
  (typeof window !== 'undefined' && window.__BACKEND_URL__) ||
  (location.hostname === '127.0.0.1' || location.hostname === 'localhost' ? 'http://127.0.0.1:8000' : '');

// 后端返回的媒体地址是相对路径（/api/v1/media/...），本地开发前端与后端不同源时需补齐后端地址；
// 绝对地址（上游临时链接）与 data:/blob: 原样返回。
export function resolveMediaUrl(url) {
  if (!url) return url;
  if (/^(https?:|data:|blob:)/.test(url)) return url;
  return BASE_URL + url;
}

export async function listModels() {
  const res = await fetch(`${BASE_URL}/api/v1/models`);
  if (!res.ok) throw new Error('模型列表请求失败');
  return res.json();
}

export async function createCompare({ question, systemPrompt, modelIds, modality, videoResolution, imageResolution, videoDuration, images }, { signal } = {}) {
  const res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, systemPrompt, modelIds, modality, videoResolution, imageResolution, videoDuration, images, stream: true }),
    signal,
  });
  if (!res.ok) throw new Error('提交对比失败');
  return res.json(); // { taskId, modelIds }
}

export async function cancelCompare(taskId) {
  await fetch(`${BASE_URL}/api/v1/compare/${taskId}/cancel`, { method: 'POST' });
}

export async function getStore(key) {
  const res = await fetch(`${BASE_URL}/api/v1/store/${encodeURIComponent(key)}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error('读取失败');
  const data = await res.json();
  return data.value;
}

export async function putStore(key, value) {
  await fetch(`${BASE_URL}/api/v1/store/${encodeURIComponent(key)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ value }),
  });
}

export async function getSettings() {
  const res = await fetch(`${BASE_URL}/api/v1/settings`);
  if (!res.ok) throw new Error('读取设置失败');
  return res.json();
}

export async function putSettings(keys) {
  const res = await fetch(`${BASE_URL}/api/v1/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ keys }),
  });
  if (!res.ok) throw new Error('保存失败');
  return res.json();
}

export {consumeSse} from './sse.mjs';
import {consumeSse} from './sse.mjs';
export async function streamCompare(taskId, handlers, {signal}={}) {
 const res=await fetch(`${BASE_URL}/api/v1/compare/${taskId}/events`,{headers:{Accept:'text/event-stream'},signal});
 if(!res.ok||!res.body)throw new Error('流式连接失败');
 await consumeSse(res.body,handlers);
}

export async function putModelConnections(connections) {
  const res = await fetch(`${BASE_URL}/api/v1/settings`, {
    method: 'PUT', headers: {'Content-Type':'application/json'},
    body: JSON.stringify({connections}),
  });
  if (!res.ok) throw new Error('保存连接配置失败');
  const result = await res.json();
  if (!connections.every(item => result.connectionIds?.includes(item.id))) throw new Error('后端未确认保存连接配置');
  return result;
}

export async function testModelConnection(modelId) {
  const res = await fetch(`${BASE_URL}/api/v1/connections/${encodeURIComponent(modelId)}/test`, { method: 'POST' });
  if (!res.ok) throw new Error('测试请求失败');
  return res.json();
}
