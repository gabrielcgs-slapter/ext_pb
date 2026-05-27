// tests/extractor.test.js
const { extractProjectData, extractTramites, buildCsv } = require('../lib/extractor');

function makeDoc(html) {
  document.body.innerHTML = html;
  return document;
}

describe('extractProjectData', () => {
  test('extrai CAAE, título, pesquisador, situação', () => {
    makeDoc(`
      <table>
        <tr><td><b><span class="labelClass">CAAE: </span></b>57957522.5.1001.5262</td></tr>
        <tr><td><b><span class="labelClass">Título da Pesquisa: </span></b>Meu Projeto</td></tr>
        <tr><td><b><span class="labelClass">Pesquisador Responsável: </span></b>João Silva</td></tr>
        <tr><td><b><span class="labelClass">Situação da Versão do Projeto: </span></b>Aprovado</td></tr>
        <tr><td><b><span class="labelClass">Instituição Proponente: </span></b>FIOCRUZ</td></tr>
      </table>
    `);
    const data = extractProjectData(document);
    expect(data.caae).toBe('57957522.5.1001.5262');
    expect(data.titulo).toBe('Meu Projeto');
    expect(data.pesquisador).toBe('João Silva');
    expect(data.situacao).toBe('Aprovado');
    expect(data.instituicao).toBe('FIOCRUZ');
  });

  test('retorna null em campo ausente', () => {
    makeDoc('<p>Sem dados</p>');
    const data = extractProjectData(document);
    expect(data.caae).toBeNull();
  });
});

describe('extractTramites', () => {
  test('extrai linhas da tabela de trâmites', () => {
    makeDoc(`
      <table id="formDetalharProjeto:tableTramiteApreciacaoProjeto">
        <tbody id="formDetalharProjeto:tableTramiteApreciacaoProjeto:tb">
          <tr class="rich-table-row">
            <td><span>N22</span></td>
            <td><span>26/05/2026 10:10:10</span></td>
            <td><span>Parecer liberado</span></td>
            <td><span>10</span></td>
            <td><span>Coordenador</span></td>
            <td><span>FIOCRUZ</span></td>
            <td><span>CONEP</span></td>
            <td><span></span></td>
          </tr>
        </tbody>
      </table>
    `);
    const tramites = extractTramites(document);
    expect(tramites).toHaveLength(1);
    expect(tramites[0].apreciacao).toBe('N22');
    expect(tramites[0].tipo).toBe('Parecer liberado');
    expect(tramites[0].origem).toBe('FIOCRUZ');
  });

  test('retorna [] se tabela ausente', () => {
    makeDoc('<p>sem tabela</p>');
    expect(extractTramites(document)).toEqual([]);
  });
});

describe('buildCsv', () => {
  test('gera CSV com header + linhas', () => {
    const tramites = [
      { apreciacao: 'N22', dataHora: '26/05/2026', tipo: 'Parecer liberado', versao: '10', perfil: 'Coord', origem: 'FIOCRUZ', destino: 'CONEP', informacoes: '' }
    ];
    const csv = buildCsv(tramites);
    expect(csv).toContain('Apreciação,Data/Hora,Tipo Trâmite');
    expect(csv).toContain('N22,26/05/2026,Parecer liberado');
  });
});
