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
    caae: getTextAfterLabel(doc, 'CAAE:'),
    titulo: getTextAfterLabel(doc, 'Título da Pesquisa:'),
    pesquisador: getTextAfterLabel(doc, 'Pesquisador Responsável:'),
    situacao: getTextAfterLabel(doc, 'Situação da Versão do Projeto:'),
    instituicao: getTextAfterLabel(doc, 'Instituição Proponente:'),
  };
}

function extractTramites(doc) {
  const tbody = doc.querySelector('[id$="tableTramiteApreciacaoProjeto:tb"]');
  if (!tbody) return [];

  return Array.from(tbody.querySelectorAll('tr.rich-table-row')).map(tr => {
    const cells = tr.querySelectorAll('td span');
    return {
      apreciacao:  cells[0]?.textContent.trim() ?? '',
      dataHora:    cells[1]?.textContent.trim() ?? '',
      tipo:        cells[2]?.textContent.trim() ?? '',
      versao:      cells[3]?.textContent.trim() ?? '',
      perfil:      cells[4]?.textContent.trim() ?? '',
      origem:      cells[5]?.textContent.trim() ?? '',
      destino:     cells[6]?.textContent.trim() ?? '',
      informacoes: cells[7]?.textContent.trim() ?? '',
    };
  });
}

function buildCsv(tramites) {
  const header = 'Apreciação,Data/Hora,Tipo Trâmite,Versão,Perfil,Origem,Destino,Informações';
  const escape = v => {
    const str = String(v);
    // Only quote if contains comma, quote, or newline
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };
  const rows = tramites.map(t =>
    [t.apreciacao, t.dataHora, t.tipo, t.versao, t.perfil, t.origem, t.destino, t.informacoes]
      .map(escape).join(',')
  );
  return [header, ...rows].join('\n');
}

// Exporta para Node.js (Jest) e também funciona no browser (content script)
if (typeof module !== 'undefined') {
  module.exports = { extractProjectData, extractTramites, buildCsv };
}
