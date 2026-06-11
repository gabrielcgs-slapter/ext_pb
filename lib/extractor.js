// lib/extractor.js

function getTextAfterLabel(doc, labelText) {
  const spans = doc.querySelectorAll('span.labelClass');
  for (const span of spans) {
    if (span.textContent.includes(labelText)) {
      const td = span.closest('td');
      if (!td) continue;
      const label = span.textContent.trim();
      const full = td.textContent.trim();
      const value = full.includes(label) ? full.replace(label, '').trim() : full.trim();
      if (value) return value;
      // HTML malformado (Área Temática, Patrocinador): valor está em td irmão
      // Patrocinador tem td vazio extra — percorre até achar conteúdo
      let next = td.nextElementSibling;
      while (next) {
        const v = next.textContent.trim();
        if (v) return v;
        next = next.nextElementSibling;
      }
      return null;
    }
  }
  return null;
}

const TIPO_CENTRO_MAP = {
  CARIMBO_COORDENADOR:    'Coordenador',
  CARIMBO_PARTICIPANTE:   'Participante',
  CARIMBO_COPARTICIPANTE: 'Coparticipante',
};

function extractTipoCentro(doc) {
  const img = doc.querySelector('img[src*="CARIMBO"]');
  if (!img) return null;
  const filename = img.src.split('/').pop().replace('.png', '');
  return TIPO_CENTRO_MAP[filename] ?? null;
}

function extractProjectId(doc) {
  for (const el of doc.querySelectorAll('[onclick]')) {
    const m = el.getAttribute('onclick').match(/'coProjeto'\s*:\s*(\d+)/);
    if (m) return m[1];
  }
  for (const s of doc.querySelectorAll('script')) {
    const m = s.textContent.match(/'coProjeto'\s*:\s*(\d+)/);
    if (m) return m[1];
  }
  return null;
}

function extractEmendaAtual(doc) {
  const nodes = doc.querySelectorAll('.rich-tree-node-text');
  for (const td of nodes) {
    if (td.textContent.includes('Versão Atual Aprovada')) {
      const match = td.textContent.match(/\(([^)]+)\)/);
      return match ? match[1].trim() : null;
    }
  }
  return null;
}

function extractProjectData(doc) {
  return {
    caae:          getTextAfterLabel(doc, 'CAAE:'),
    titulo:        getTextAfterLabel(doc, 'Título da Pesquisa:'),
    pesquisador:   getTextAfterLabel(doc, 'Pesquisador Responsável:'),
    situacao:      getTextAfterLabel(doc, 'Situação da Versão do Projeto:'),
    instituicao:   getTextAfterLabel(doc, 'Instituição Proponente:'),
    areaTematica:  getTextAfterLabel(doc, 'Área Temática:'),
    patrocinador:  getTextAfterLabel(doc, 'Patrocinador Principal:'),
    emendaAtual:   extractEmendaAtual(doc),
    tipoCentro:    extractTipoCentro(doc),
    projectId:     extractProjectId(doc),
  };
}

// Exporta para Node.js (Jest) e também funciona no browser (content script)
if (typeof module !== 'undefined') {
  module.exports = { extractProjectData, extractProjectId };
}
