// lib/extractor.js

function getTextAfterLabel(doc, labelText) {
  const spans = doc.querySelectorAll('span.labelClass');
  for (const span of spans) {
    if (span.textContent.includes(labelText)) {
      const td = span.closest('td');
      if (!td) continue;
      // Get the full TD text content
      const full = td.textContent.trim();
      // Extract label text from span
      const label = span.textContent.trim();
      // Remove the label from full text to get just the value
      if (full.includes(label)) {
        return full.replace(label, '').trim();
      }
      return full.trim();
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
  };
}

// Exporta para Node.js (Jest) e também funciona no browser (content script)
if (typeof module !== 'undefined') {
  module.exports = { extractProjectData };
}
