// Keep legacy single-question records readable while adding conversation turns.
const turnFields = ({id, question, kind, plans, date, modality='text', compareMode='models', scheme=null, ratings={}, feedback={}, vote=null, notes='', checks=[]}) =>
  ({id, question, kind, plans, date, modality, compareMode, scheme, ratings, feedback, vote, notes, checks});
export function asConversation(record) {
  if (!record) return null;
  if (record.turns?.length) return record;
  return {...record, turns:[turnFields({...record,id:record.id+'-turn-1'})]};
}
export function appendConversationTurn(record, turn) {
  const previous=asConversation(record);
  const turns=[...(previous?.turns||[]),turnFields(turn)];
  return {...previous,...turnFields(turn),id:previous?.id||turn.id,title:previous?.title||turn.question.slice(0,30),turns};
}
export function updateConversationTurn(record, turnId, patch) {
  const conversation=asConversation(record);
  const turns=conversation.turns.map(turn=>turn.id===turnId?{...turn,...patch}:turn);
  const last=turns.at(-1);
  return {...conversation,...last,id:conversation.id,title:conversation.title,turns};
}

// Pinned topics stay above recent topics without changing either group's order.
export function sortConversations(records) {
  return [...records].sort((a,b)=>Number(!!b.pinned)-Number(!!a.pinned));
}
export function renameConversation(record, title) {
  const trimmed=title.trim();
  if (!trimmed || trimmed.length>80) return record;
  return {...record,title:trimmed};
}
