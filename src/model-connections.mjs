export const connectionId = id => `connection:${id}`;
export function modelConnections(models, available) {
  return models.map(model => {
    const saved = available.find(item => item.id === connectionId(model.id));
    const preset = available.find(item => item.id === model.apiId);
    const source = saved || preset;
    return {
      id: connectionId(model.id), name: model.name, provider: model.provider,
      modelId: preset?.modelId || model.apiId,
      connectionName: saved?.connectionName || `${model.name}连接`,
      baseUrl: source?.baseUrl || '', keyConfigured: !!source?.keyConfigured,
      inheritFrom: saved ? undefined : preset?.id,
    };
  });
}
