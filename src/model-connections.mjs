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
{ id:'ling-3.0-flash-sante', name:'Ling-3.0-flash-Sante', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'mimo-v2.6-pro-ultraspeed', name:'MiMo-V2.6-Pro-UltraSpeed', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'ling-3.0-flash-vl', name:'Ling-3.0-flash-VL', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'mimo-v2.6-flash', name:'MiMo-V2.6-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'mimo-v2.6-pro', name:'MiMo-V2.6-Pro', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'deepseek-flash', name:'DeepSeek-V4.1-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'kimi-k3', name:'Kimi K3', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3.8-flash', name:'Qwen3.8-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'glm-5.3-flash', name:'GLM-5.3-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'deepseek-v4-pro-0813', name:'DeepSeek-V4-Pro-0813', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'ling-3.0-flash-fin', name:'Ling-3.0-flash-Fin', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'deepseek-v4-flash-0731', name:'DeepSeek-V4-Flash-0731', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.8-max', name:'Qwen3.8-Max', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'glm-5.3', name:'GLM-5.3', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'mimo-v2.5', name:'MiMo-V2.5', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'minimax-h3', name:'MiniMax-H3', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'lingdt-3.0-flash', name:'LingDT-3.0-flash', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'glm-5.2', name:'GLM 5.2', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'minimax-m3', name:'MiniMax M3', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'mimo-v2.5-pro', name:'MiMo-V2.5-Pro', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'kimi-k2.7-code', name:'Kimi K2.7 Code', provider:'蚂蚁 MaaS', capabilities:['code','text','image_understand'] },
  { id:'happyhorse-1.1-r2v', name:'HappyHorse-1.1-R2V', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'deepseek-v4-pro', name:'DeepSeek-V4-Pro', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'step-3.7-flash', name:'Step 3.7 Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3.7-plus', name:'Qwen3.7-Plus', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'minimax-m2.7', name:'MiniMax M2.7', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.7-max', name:'Qwen3.7-Max', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'glm-5.1', name:'GLM 5.1', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'kimi-k2.6', name:'Kimi K2.6', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'happyhorse-1.1-t2v', name:'HappyHorse-1.1-T2V', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'qwen3.6-max-preview', name:'Qwen3.6-Max-Preview', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'happyhorse-1.1-i2v', name:'HappyHorse-1.1-I2V', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'wan2.7-t2v', name:'Wan2.7-T2V', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'wan2.7-i2v', name:'Wan2.7-I2V', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'wan2.7-r2v', name:'Wan2.7-R2V', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'happyhorse-1.0-video-edit', name:'HappyHorse-1.0-video-edit', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'happyhorse-1.0-r2v', name:'HappyHorse-1.0-r2v', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'happyhorse-1.0-i2v', name:'HappyHorse-1.0-i2v', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'qwen3.6-plus', name:'Qwen3.6-Plus', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen-image-2.0', name:'Qwen-Image-2.0', provider:'蚂蚁 MaaS', capabilities:['image_generate'] },
  { id:'happyhorse-1.0-t2v', name:'Happyhorse-1.0-t2v', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'qwen-vl-max', name:'qwen-vl-max', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3-32b', name:'Qwen3-32B', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'wan2.7-videoedit', name:'Wan2.7-videoedit', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'wan2.6-t2i', name:'Wan2.6-T2I', provider:'蚂蚁 MaaS', capabilities:['image_generate'] },
  { id:'wan2.7-image', name:'Wan2.7-image', provider:'蚂蚁 MaaS', capabilities:['image_generate'] },
  { id:'qwen3.6-27b', name:'qwen3.6-27b', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3.5-27b', name:'qwen3.5-27b', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'deepseek-v3.1', name:'DeepSeek-V3.1', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'deepseek-v3', name:'DeepSeek-V3', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-next-80b-a3b-thinking', name:'Qwen3-Next-80B-A3B-Thinking', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-30b-a3b-instruct-2507', name:'Qwen3-30B-A3B-Instruct-2507', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-235b-a22b-thinking-2507', name:'Qwen3-235B-A22B-Thinking-2507', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.6-flash', name:'qwen3.6-flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen-flash', name:'Qwen-Flash', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.5-omni-flash', name:'Qwen3.5-Omni-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3-30b-a3b-thinking-2507', name:'Qwen3-30B-A3B-Thinking-2507', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-235b-a22b', name:'Qwen3-235B-A22B', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-next-80b-a3b-instruct', name:'Qwen3-Next-80B-A3B-Instruct', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen-max', name:'Qwen-Max', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen-turbo', name:'Qwen-Turbo', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen-plus', name:'Qwen-Plus', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-235b-a22b-instruct-2507', name:'Qwen3-235B-A22B-Instruct-2507', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-coder-flash', name:'Qwen3-Coder-Flash', provider:'蚂蚁 MaaS', capabilities:['code','text'] },
  { id:'glm-4.7', name:'GLM 4.7', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'deepseek-r1-distill-qwen-32b', name:'DeepSeek-R1-Distill-Qwen-32B', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'deepseek-v3.2-exp', name:'DeepSeek-V3.2-Exp', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen-image-max', name:'Qwen-image-max', provider:'蚂蚁 MaaS', capabilities:['image_generate'] },
  { id:'qwen3.5-flash', name:'Qwen3.5-flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'kimi-k2-thinking', name:'Kimi-k2-thinking', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-coder-plus', name:'Qwen3-Coder-Plus', provider:'蚂蚁 MaaS', capabilities:['code','text'] },
  { id:'qwen-image-plus', name:'Qwen-image-plus', provider:'蚂蚁 MaaS', capabilities:['image_generate'] },
  { id:'qwen3.5-plus', name:'Qwen3.5-Plus', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'glm-5', name:'GLM 5', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'kimi-k2.5', name:'Kimi K2.5', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'deepseek-v3.2', name:'DeepSeek-V3.2', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3-vl-plus', name:'Qwen3-VL-Plus', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3-vl-flash', name:'Qwen3-VL-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'qwen3-max', name:'Qwen3-Max', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen3.7-flash', name:'Qwen3.7-Flash', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'wan3.0-video', name:'万相3.0-视频生成', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'atria-dawn-preview', name:'Atria Dawn Preview', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'qwen-long', name:'Qwen-Long', provider:'蚂蚁 MaaS', capabilities:['text'] },
  { id:'kling-v3-video-generation', name:'Kling Video 3.0', provider:'蚂蚁 MaaS', capabilities:['video'] },
  { id:'qwen3.5-omni-plus', name:'Qwen3.5-Omni-Plus', provider:'蚂蚁 MaaS', capabilities:['text','image_understand'] },
  { id:'deepseek-chat', name:'DeepSeek V3', provider:'DeepSeek', capabilities:['text'] },
  { id:'deepseek-reasoner', name:'DeepSeek R1', provider:'DeepSeek', capabilities:['text'] },
  { id:'glm-4-plus', name:'GLM 4 Plus', provider:'智谱', capabilities:['text'] },
  { id:'glm-4v-flash', name:'GLM 4V Flash', provider:'智谱', capabilities:['text','image_understand'] },
  { id:'cogview-4', name:'智谱 CogView 4', provider:'智谱', capabilities:['image_generate'] },
  { id:'moonshot-v1-8k', name:'Kimi', provider:'月之暗面', capabilities:['text'] },
  { id:'doubao-pro-32k', name:'Doubao Pro', provider:'豆包', capabilities:['text'] },
  { id:'seedream-4-0-t2i', name:'即梦 Seedream 4.0 文生图', provider:'豆包', capabilities:['image_generate'] },
  { id:'seedance-1-0-pro', name:'即梦 Seedance 1.0 Pro 文生视频', provider:'豆包', capabilities:['video'] },
  { id:'hunyuan-turbo', name:'腾讯混元 Turbo', provider:'腾讯混元', capabilities:['text'] },
  { id:'hunyuan-pro', name:'腾讯混元 Pro', provider:'腾讯混元', capabilities:['text'] },
  { id:'hunyuan-image', name:'混元图像', provider:'腾讯混元', capabilities:['image_generate'] },
  { id:'ernie-4.0-8k', name:'百度文心 4.0', provider:'百度文心', capabilities:['text'] },
  { id:'generalv3.5', name:'讯飞星火 3.5', provider:'讯飞星火', capabilities:['text'] },
];

const PROVIDER_META = {
  '蚂蚁 MaaS': { baseUrl:'https://maas-api.antdigital.com/v1', keyRef:'KEY_ANT' },
  'DeepSeek': { baseUrl:'https://api.deepseek.com/v1', keyRef:'KEY_DEEPSEEK' },
  '智谱': { baseUrl:'https://open.bigmodel.cn/api/paas/v4', keyRef:'KEY_ZHIPU' },
  '月之暗面': { baseUrl:'https://api.moonshot.cn/v1', keyRef:'KEY_MOONSHOT' },
  '豆包': { baseUrl:'https://ark.cn-beijing.volces.com/api/v3', keyRef:'KEY_DOUBAO' },
  '腾讯混元': { baseUrl:'https://api.hunyuan.cloud.tencent.com/v1', keyRef:'KEY_HUNYUAN' },
  '百度文心': { baseUrl:'https://qianfan.baidubce.com/v2', keyRef:'KEY_ERNIE' },
  '讯飞星火': { baseUrl:'https://spark-api-open.xf-yun.com/v1', keyRef:'KEY_SPARK' },
};

export const presetMeta = provider => PROVIDER_META[provider] || { baseUrl:'', keyRef:'KEY_CUSTOM' };

export const presetFor = model => MODEL_PRESETS.find(p => p.id===model.apiId) || null;
