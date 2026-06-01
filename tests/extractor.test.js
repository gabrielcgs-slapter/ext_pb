// tests/extractor.test.js
const { extractProjectData } = require('../lib/extractor');

function makeDoc(html) {
  document.body.innerHTML = html;
  return document;
}

describe('extractProjectData', () => {
  test('extrai CAAE, título, pesquisador, situação, área temática, patrocinador', () => {
    makeDoc(`
      <table>
        <tr><td><b><span class="labelClass">CAAE: </span></b>57957522.5.1001.5262</td></tr>
        <tr><td><b><span class="labelClass">Título da Pesquisa: </span></b>Meu Projeto</td></tr>
        <tr><td><b><span class="labelClass">Pesquisador Responsável: </span></b>João Silva</td></tr>
        <tr><td><b><span class="labelClass">Situação da Versão do Projeto: </span></b>Aprovado</td></tr>
        <tr><td><b><span class="labelClass">Instituição Proponente: </span></b>FIOCRUZ</td></tr>
        <tr><td><b><span class="labelClass">Área Temática: </span></b>Genética Humana</td></tr>
        <tr><td><b><span class="labelClass">Patrocinador Principal: </span></b>MS/SVS/DECIT</td></tr>
      </table>
    `);
    const data = extractProjectData(document);
    expect(data.caae).toBe('57957522.5.1001.5262');
    expect(data.titulo).toBe('Meu Projeto');
    expect(data.pesquisador).toBe('João Silva');
    expect(data.situacao).toBe('Aprovado');
    expect(data.instituicao).toBe('FIOCRUZ');
    expect(data.areaTematica).toBe('Genética Humana');
    expect(data.patrocinador).toBe('MS/SVS/DECIT');
  });

  test('retorna null em campo ausente', () => {
    makeDoc('<p>Sem dados</p>');
    const data = extractProjectData(document);
    expect(data.caae).toBeNull();
  });
});

