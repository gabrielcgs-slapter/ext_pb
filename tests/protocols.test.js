// tests/protocols.test.js

const CAAE_REGEX = /^\d{8}\.\d\.\d{4}\.\d{4}$/;

function isValidCAAE(caae) {
  return CAAE_REGEX.test(caae);
}

function addToList(list, nome, caae) {
  const trimmedCAAE = caae.trim();
  if (!isValidCAAE(trimmedCAAE)) {
    throw new Error(`CAAE inválido: "${trimmedCAAE}". Formato esperado: 00000000.0.0000.0000`);
  }
  return [...list, { nome: nome.trim(), caae: trimmedCAAE }];
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
    const list = [{ nome: 'A', caae: '66068322.1.1001.5262' }];
    const result = addToList(list, 'B', '12345678.9.0001.1234');
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ nome: 'A', caae: '66068322.1.1001.5262' });
  });

  test('rejeita CAAE com formato inválido', () => {
    expect(() => addToList([], 'X', 'abc')).toThrow('CAAE inválido');
    expect(() => addToList([], 'X', '123')).toThrow('CAAE inválido');
    expect(() => addToList([], 'X', '')).toThrow('CAAE inválido');
  });

  test('rejeita CAAE com separadores errados', () => {
    expect(() => addToList([], 'X', '66068322-1-1001-5262')).toThrow('CAAE inválido');
  });

  test('aceita CAAE com formato correto (8.1.4.4 dígitos)', () => {
    const result = addToList([], 'Proj', '12345678.9.0001.1234');
    expect(result[0].caae).toBe('12345678.9.0001.1234');
  });
});

describe('removeFromList', () => {
  test('remove item pelo índice', () => {
    const list = [{ nome: 'A', caae: '66068322.1.1001.5262' }, { nome: 'B', caae: '12345678.9.0001.1234' }];
    expect(removeFromList(list, 0)).toEqual([{ nome: 'B', caae: '12345678.9.0001.1234' }]);
  });

  test('índice fora do range retorna lista igual', () => {
    const list = [{ nome: 'A', caae: '66068322.1.1001.5262' }];
    expect(removeFromList(list, 5)).toEqual([{ nome: 'A', caae: '66068322.1.1001.5262' }]);
  });
});
