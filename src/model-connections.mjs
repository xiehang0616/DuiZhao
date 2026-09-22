export const connectionId = id => `connection:${id}`;
export function modelConnections(models, available) {
  return models.map(model => {
    const saved = available.find(item => item.id === connectionId(model.id));
    const preset = available.find(item => item.id === model.apiId);
    const source = saved || preset;
    return {
      id: connectionId(model.id), name: model.name, provider: model.provider,
      modelId: saved?.modelId || preset?.modelId || model.apiId,
      connectionName: saved?.connectionName || `${model.name}连接`,
      baseUrl: source?.baseUrl || '', keyConfigured: !!source?.keyConfigured,
      inheritFrom: saved ? undefined : preset?.id,
    };
  });
}

export function modelConnectionStatus(model, available, failed = false) {
  if (failed) return {label:'状态未知', tone:'unknown'};
  if (available === null) return {label:'读取中', tone:'unknown'};
  const connection = available.find(item => item.id === (model.connectionId || connectionId(model.id))) || available.find(item => item.id === model.apiId);
  if (!connection?.keyConfigured) return {label:'未配置密钥', tone:'unconfigured'};
  if (connection.connectionStatus === 'connected') return {label:'已连通', tone:'connected'};
  if (connection.connectionStatus === 'error') return {label:'调用失败', tone:'error'};
  return {label:'已配置 · 待验证', tone:'configured'};
}

export function suggestedApiAddress(value) {
  try {
    const host=new URL(value).hostname;
    if(host==='platform.deepseek.com')return 'https://api.deepseek.com';
    if(host==='maas.antdigital.com')return 'https://maas-api.antdigital.com/v1';
  } catch {}
  return null;
}

// 预设模型库：选一个即自动带出模型 ID、厂商、能力；后端 models.json 同步维护对应连接。
// 蚂蚁 MaaS 模型 ID 来自 https://maas.antdigital.com/models（以平台实际清单为准）。
export const MODEL_PRESETS = [
  { id:'mimo-v2.6-pro-ultraspeed', name:'MiMo V2.6 Pro UltraSpeed', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'mimo-v2.6-flash', name:'MiMo V2.6 Flash', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'mimo-v2.6-pro', name:'MiMo V2.6 Pro', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'mimo-v2.5-pro', name:'MiMo V2.5 Pro', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.8-flash', name:'Qwen3.8 Flash', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.8-max', name:'Qwen3.8 Max', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.7-plus', name:'Qwen3.7 Plus', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.7-max', name:'Qwen3.7 Max', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.6-plus', name:'Qwen3.6 Plus', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.6-max-preview', name:'Qwen3.6 Max Preview', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'minimax-h3', name:'MiniMax H3', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'minimax-m3', name:'MiniMax M3', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'minimax-m2.7', name:'MiniMax M2.7', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'step-3.7-flash', name:'Step 3.7 Flash', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'kimi-k2.7-code', name:'Kimi K2.7 Code', provider:'蚂蚁 MaaS', capabilities:['text','code'] },
  { id:'wan2.7-t2v', name:'万相 2.7 文生视频', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'wan2.7-i2v', name:'万相 2.7 图生视频', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'wan2.7-r2v', name:'万相 2.7 视频重绘', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'deepseek-chat', name:'DeepSeek V3', provider:'DeepSeek', capabilities:['text'] },
  { id:'deepseek-reasoner', name:'DeepSeek R1', provider:'DeepSeek', capabilities:['text'] },
  { id:'glm-4', name:'GLM 4', provider:'智谱', capabilities:['text'] },
  { id:'moonshot-v1-8k', name:'Kimi', provider:'月之暗面', capabilities:['text'] },
  { id:'doubao-pro-32k', name:'Doubao Pro', provider:'豆包', capabilities:['text'] }
];

const PROVIDER_META = {
  '蚂蚁 MaaS': { baseUrl:'https://maas-api.antdigital.com/v1', keyRef:'KEY_ANT' },
  'DeepSeek': { baseUrl:'https://api.deepseek.com/v1', keyRef:'KEY_DEEPSEEK' },
  '智谱': { baseUrl:'https://open.bigmodel.cn/api/paas/v4', keyRef:'KEY_ZHIPU' },
  '月之暗面': { baseUrl:'https://api.moonshot.cn/v1', keyRef:'KEY_MOONSHOT' },
  '豆包': { baseUrl:'https://ark.cn-beijing.volces.com/api/v3', keyRef:'KEY_DOUBAO' },
};

export const presetMeta = provider => PROVIDER_META[provider] || { baseUrl:'', keyRef:'KEY_CUSTOM' };

export const presetFor = model => MODEL_PRESETS.find(p => p.id===model.apiId && p.name===model.name && p.provider===model.provider && JSON.stringify(p.capabilities)===JSON.stringify(model.capabilities||[])) || null;
