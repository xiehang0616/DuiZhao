// 模型计费表（人民币 CNY）：文本按百万 token、图片按张、视频按秒。
// 价格来自蚂蚁 MaaS 模型市场（取折后价）；直接厂商（DeepSeek/智谱/混元等）未计价时返回 null。
export const MODEL_PRICING = {
  'ling-3.0-flash-sante': {type:'text', inPerM: 0, outPerM: 0},
  'mimo-v2.6-pro-ultraspeed': {type:'text', inPerM: 30, outPerM: 60},
  'ling-3.0-flash-vl': {type:'text', inPerM: 0, outPerM: 0},
  'mimo-v2.6-flash': {type:'text', inPerM: 1, outPerM: 2},
  'mimo-v2.6-pro': {type:'text', inPerM: 3, outPerM: 6},
  'deepseek-flash': {type:'text', inPerM: 1, outPerM: 4},
  'kimi-k3': {type:'text', inPerM: 17, outPerM: 85},
  'qwen3.8-flash': {type:'text', inPerM: 0.8, outPerM: 2.7},
  'glm-5.3-flash': {type:'text', inPerM: 0.8, outPerM: 2.8},
  'deepseek-v4-pro-0813': {type:'text', inPerM: 3.375, outPerM: 10.125},
  'ling-3.0-flash-fin': {type:'text', inPerM: 0, outPerM: 0},
  'deepseek-v4-flash-0731': {type:'text', inPerM: 1.05, outPerM: 3.15},
  'qwen3.8-max': {type:'text', inPerM: 10.8, outPerM: 32.4},
  'glm-5.3': {type:'text', inPerM: 6.8, outPerM: 23.8},
  'mimo-v2.5': {type:'text', inPerM: 1, outPerM: 2},
  'lingdt-3.0-flash': {type:'text', inPerM: 0.14, outPerM: 0.42},
  'glm-5.2': {type:'text', inPerM: 5.2, outPerM: 18.2},
  'minimax-m3': {type:'text', inPerM: 2.1, outPerM: 8.4},
  'mimo-v2.5-pro': {type:'text', inPerM: 3, outPerM: 6},
  'kimi-k2.7-code': {type:'text', inPerM: 6.5, outPerM: 27},
  'happyhorse-1.1-r2v': {type:'video', perSecond: 0.9},
  'deepseek-v4-pro': {type:'text', inPerM: 12, outPerM: 24},
  'step-3.7-flash': {type:'text', inPerM: 1.37, outPerM: 8.1},
  'qwen3.7-plus': {type:'text', inPerM: 1.3, outPerM: 5.2},
  'minimax-m2.7': {type:'text', inPerM: 2.1, outPerM: 8.4},
  'qwen3.7-max': {type:'text', inPerM: 12, outPerM: 36},
  'glm-5.1': {type:'text', inPerM: 6, outPerM: 24},
  'kimi-k2.6': {type:'text', inPerM: 6.5, outPerM: 27},
  'happyhorse-1.1-t2v': {type:'video', perSecond: 0.9},
  'qwen3.6-max-preview': {type:'text', inPerM: 9, outPerM: 54},
  'happyhorse-1.1-i2v': {type:'video', perSecond: 0.9},
  'wan2.7-t2v': {type:'video', perSecond: 0.8},
  'wan2.7-i2v': {type:'video', perSecond: 0.6},
  'wan2.7-r2v': {type:'video', perSecond: 0.6},
  'happyhorse-1.0-video-edit': {type:'video', perSecond: 0.72},
  'happyhorse-1.0-r2v': {type:'video', perSecond: 0.72},
  'happyhorse-1.0-i2v': {type:'video', perSecond: 0.72},
  'qwen3.6-plus': {type:'text', inPerM: 2, outPerM: 12},
  'qwen-image-2.0': {type:'image', perImage: 0.2},
  'happyhorse-1.0-t2v': {type:'video', perSecond: 0.72},
  'qwen-vl-max': {type:'text', inPerM: 1.6, outPerM: 4},
  'qwen3-32b': {type:'text', inPerM: 2, outPerM: 8},
  'qwen-vl-ocr-latest': {type:'text', inPerM: 0.3, outPerM: 0.5},
  'wan2.7-videoedit': {type:'video', perSecond: 0.8},
  'wan2.6-t2i': {type:'image', perImage: 0.016},
  'wan2.7-image': {type:'image', perImage: 0.2},
  'qwen3.6-27b': {type:'text', inPerM: 3, outPerM: 18},
  'qwen3.5-27b': {type:'text', inPerM: 0.6, outPerM: 4.8},
  'deepseek-v3.1': {type:'text', inPerM: 4, outPerM: 12},
  'deepseek-v3': {type:'text', inPerM: 2, outPerM: 8},
  'qwen3-next-80b-a3b-thinking': {type:'text', inPerM: 1, outPerM: 10},
  'qwen3-30b-a3b-instruct-2507': {type:'text', inPerM: 0.75, outPerM: 3},
  'qwen3-235b-a22b-thinking-2507': {type:'text', inPerM: 2, outPerM: 20},
  'qwen3.6-flash': {type:'text', inPerM: 1.2, outPerM: 7.2},
  'qwen-flash': {type:'text', inPerM: 0.15, outPerM: 1.5},
  'qwen3.5-omni-flash': {type:'text', inPerM: 2.2, outPerM: 72},
  'qwen3-30b-a3b-thinking-2507': {type:'text', inPerM: 0.75, outPerM: 7.5},
  'qwen3-235b-a22b': {type:'text', inPerM: 2, outPerM: 8},
  'qwen3-next-80b-a3b-instruct': {type:'text', inPerM: 1, outPerM: 4},
  'qwen-max': {type:'text', inPerM: 2.4, outPerM: 9.6},
  'qwen-turbo': {type:'text', inPerM: 0.3, outPerM: 0.6},
  'qwen-plus': {type:'text', inPerM: 0.8, outPerM: 2},
  'qwen3-235b-a22b-instruct-2507': {type:'text', inPerM: 2, outPerM: 8},
  'qwen3-coder-flash': {type:'text', inPerM: 1, outPerM: 4},
  'glm-4.7': {type:'text', inPerM: 3, outPerM: 14},
  'deepseek-r1-distill-qwen-32b': {type:'text', inPerM: 2, outPerM: 6},
  'deepseek-v3.2-exp': {type:'text', inPerM: 2, outPerM: 3},
  'qwen-image-max': {type:'image', perImage: 0.5},
  'qwen3.5-flash': {type:'text', inPerM: 0.2, outPerM: 2},
  'kimi-k2-thinking': {type:'text', inPerM: 4, outPerM: 16},
  'qwen3-coder-plus': {type:'text', inPerM: 4, outPerM: 16},
  'qwen-image-plus': {type:'image', perImage: 0.2},
  'qwen3.5-plus': {type:'text', inPerM: 0.8, outPerM: 4.8},
  'glm-5': {type:'text', inPerM: 4, outPerM: 18},
  'kimi-k2.5': {type:'text', inPerM: 4, outPerM: 21},
  'deepseek-v3.2': {type:'text', inPerM: 2, outPerM: 3},
  'qwen3-vl-plus': {type:'text', inPerM: 1, outPerM: 10},
  'qwen3-vl-flash': {type:'text', inPerM: 0.15, outPerM: 1.5},
  'qwen3-max': {type:'text', inPerM: 2.5, outPerM: 10},
  'qwen3.5-ocr': {type:'text', inPerM: 0.5, outPerM: 2},
  'qwen-vl-ocr-2025-11-20': {type:'text', inPerM: 0.3, outPerM: 0.5},
  'qwen3.7-flash': {type:'text', inPerM: 0.2, outPerM: 0.8},
  'wan3.0-video': {type:'video', perSecond: 0.3},
  'atria-dawn-preview': {type:'text', inPerM: 0, outPerM: 0},
  'qwen-long': {type:'text', inPerM: 0.5, outPerM: 2},
  'kling-v3-video-generation': {type:'video', perSecond: 0.6},
  'qwen3.5-omni-plus': {type:'text', inPerM: 7, outPerM: 213},
};

// 分辨率倍率（估算）：像素数比值，用于不同规格的计费拆分。
const VIDEO_RES_FACTOR = { '720P': 1, '1080P': 2.25, '2K': 4 };
const IMAGE_RES_FACTOR = { '1024x1024': 1, '1080P': 1.9, '2K': 4, '4K': 8 };

export function formatCost(value) {
  if (value == null) return '未计价';
  if (value === 0) return '¥0';
  return '¥' + (value < 0.01 ? value.toFixed(4) : value.toFixed(3));
}

// 计算单模型费用（CNY）。turn 提供视频分辨率/时长；plan 提供用量/媒体。
export function calcCost(turn, plan) {
  const apiId = plan.apiId || plan.id;
  const p = MODEL_PRICING[apiId];
  if (!p) return null;
  if (p.type === 'text') {
    const u = plan.usage || {};
    const pt = u.prompt_tokens || 0, ct = u.completion_tokens || 0;
    return (pt * p.inPerM + ct * p.outPerM) / 1e6;
  }
  if (p.type === 'image') {
    const n = (plan.media && plan.media.urls && plan.media.urls.length) || 1;
    const size = (plan.media && plan.media.size) || '1024x1024';
    return n * p.perImage * (IMAGE_RES_FACTOR[size] || 1);
  }
  if (p.type === 'video') {
    const dur = turn.videoDuration || 5;
    const res = turn.videoResolution || '720P';
    return dur * p.perSecond * (VIDEO_RES_FACTOR[res] || 1);
  }
  return null;
}

// 计费单位说明（用于导出或展示）。
export function pricingUnit(turn, plan) {
  const apiId = plan.apiId || plan.id;
  const p = MODEL_PRICING[apiId];
  if (!p) return '未计价';
  if (p.type === 'text') return '按 Token 计费（输入 ¥' + p.inPerM + '/M · 输出 ¥' + p.outPerM + '/M）';
  if (p.type === 'image') return '按张计费（¥' + p.perImage + '/张 · 基础 1024x1024）';
  if (p.type === 'video') return '按秒计费（¥' + p.perSecond + '/秒 · 基础 720P）';
  return '未计价';
}
