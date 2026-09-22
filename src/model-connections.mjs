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
