// Demo models belong to sample conversations, never to a new user's catalog.
export function initialModelState(read) {
  const storedModels = read('arena-models-v2', []);
  const catalog = Array.isArray(storedModels) ? storedModels : [];
  const storedSelection = read('arena-selected-v2', []);
  const selected = Array.isArray(storedSelection)
    ? [...new Set(storedSelection)].filter(id => catalog.some(model => model.id === id)).slice(0, 9)
    : [];
  return { catalog, selected };
}
