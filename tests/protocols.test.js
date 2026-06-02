// tests/protocols.test.js
const STORAGE_KEY = 'pb_protocols';

// Inline das funções (padrão do projeto — não usa import)
function buildProtocols(list = []) { return list; }

function addToList(list, nome, caae) {
  return [...list, { nome: nome.trim(), caae: caae.trim() }];
}

function removeFromList(list, index) {
  return list.filter((_, i) => i !== index);
}

describe('addToList', () => {
  test('adiciona item ao final da lista', () => {
    const result = addToList([], 'TILIA', '66068322.1.1001.5262');
    expect(result).toEqual([{ nome: 'TILIA', caae: '66068322.1.1001.5262' }]);
  });

  test('trim em espaços de nome e caae', () => {
    const result = addToList([], '  TILIA  ', '  66068322.1.1001.5262  ');
    expect(result[0]).toEqual({ nome: 'TILIA', caae: '66068322.1.1001.5262' });
  });

  test('preserva itens existentes', () => {
    const list = [{ nome: 'A', caae: '111' }];
    const result = addToList(list, 'B', '222');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ nome: 'A', caae: '111' });
  });
});

describe('removeFromList', () => {
  test('remove item pelo índice', () => {
    const list = [{ nome: 'A', caae: '1' }, { nome: 'B', caae: '2' }];
    expect(removeFromList(list, 0)).toEqual([{ nome: 'B', caae: '2' }]);
  });

  test('índice fora do range retorna lista igual', () => {
    const list = [{ nome: 'A', caae: '1' }];
    expect(removeFromList(list, 5)).toEqual([{ nome: 'A', caae: '1' }]);
  });
});
