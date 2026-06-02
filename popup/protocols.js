// popup/protocols.js
const PROTOCOLS_KEY = 'pb_protocols';

function addToList(list, nome, caae) {
  return [...list, { nome: nome.trim(), caae: caae.trim() }];
}

function removeFromList(list, index) {
  return list.filter((_, i) => i !== index);
}

async function loadProtocols() {
  const result = await chrome.storage.local.get(PROTOCOLS_KEY);
  return result[PROTOCOLS_KEY] ?? [];
}

async function saveProtocols(list) {
  await chrome.storage.local.set({ [PROTOCOLS_KEY]: list });
}
