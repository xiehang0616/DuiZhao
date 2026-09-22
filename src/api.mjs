// 集中式 API 层：前端只通过这里访问后端，不散落 fetch。
// BASE_URL 在真实联调/部署时按环境替换。
const BASE_URL = 'http://127.0.0.1:8000';

export async function listModels() {
  const res = await fetch(`${BASE_URL}/api/v1/models`);
  if (!res.ok) throw new Error('模型列表请求失败');
  return res.json();
}

export async function createCompare({ question, systemPrompt, modelIds }) {
  const res = await fetch(`${BASE_URL}/api/v1/compare`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, systemPrompt, modelIds, stream: true }),
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

function parseSseBlock(block) {
  let event = 'message';
  let data = '';
  for (const line of block.split('\n')) {
    if (line.startsWith('event:')) event = line.slice(6).trim();
    else if (line.startsWith('data:')) data += line.slice(5).trim();
  }
  try {
    return { event, data: JSON.parse(data) };
  } catch {
    return { event, data };
  }
}

// 用 Fetch Streaming 消费 SSE（POST 带体，故不用 EventSource）。
// handlers: { onChunk, onDone, onError }
export async function streamCompare(taskId, handlers) {
  const res = await fetch(`${BASE_URL}/api/v1/compare/${taskId}/events`, {
    headers: { Accept: 'text/event-stream' },
  });
  if (!res.ok || !res.body) throw new Error('流式连接失败');
  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) >= 0) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      if (!block.trim()) continue;
      const { event, data } = parseSseBlock(block);
      if (event === 'chunk') handlers.onChunk?.(data);
      else if (event === 'done') handlers.onDone?.(data);
      else if (event === 'error') handlers.onError?.(data);
    }
  }
}
