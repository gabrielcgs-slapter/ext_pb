// tests/extractor.test.js
const fs = require('fs');
const path = require('path');
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

  test('extrai campos corretamente do HTML real (caae_exemp.html)', () => {
    const html = fs.readFileSync(path.join(__dirname, '..', 'caae_exemp.html'), 'utf-8');
    document.body.innerHTML = html;
    const data = extractProjectData(document);
    expect(data.caae).toBe('75323823.0.1001.5262');
    expect(data.titulo).toBe(
      'Ensaio clínico randomizado de fase I/IIa controlado por placebo de vacina de células T conservadas em mosaico em um esquema com Vesatolimod e anticorpos amplamente neutralizantes em adultos iniciados em terapia antirretroviral supressiva na fase aguda do HIV-1 - A5374'
    );
    expect(data.pesquisador).toBe('Sandra Wagner Cardoso');
    expect(data.areaTematica).toBe(
      'Pesquisas com coordenação e/ou patrocínio originados fora do Brasil, excetuadas aquelas com copatrocínio do Governo Brasileiro;'
    );
    expect(data.patrocinador).toBe(
      'Division of AIDS US National Institute of Allergy and Infectious Diseases'
    );
  });
});

describe('emendaAtual', () => {
  test('extrai código de emenda de nó "Versão Atual Aprovada"', () => {
    document.body.innerHTML = `
      <table>
        <td class="rich-tree-node-text">Pendência Documental (E2) - Versão 9</td>
        <td class="rich-tree-node-text">Versão Atual Aprovada (E3)  - Versão 10</td>
        <td class="rich-tree-node-text">Outra coisa sem parênteses</td>
      </table>
    `;
    const data = extractProjectData(document);
    expect(data.emendaAtual).toBe('E3');
  });

  test('retorna null quando nó "Versão Atual Aprovada" ausente', () => {
    document.body.innerHTML = '<p>Sem árvore</p>';
    const data = extractProjectData(document);
    expect(data.emendaAtual).toBeNull();
  });

  test('retorna null quando nó existe mas sem parênteses', () => {
    document.body.innerHTML = `
      <td class="rich-tree-node-text">Versão Atual Aprovada sem código</td>
    `;
    const data = extractProjectData(document);
    expect(data.emendaAtual).toBeNull();
  });
});

