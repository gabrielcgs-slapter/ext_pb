// tests/imprimir.test.js

function actionImprimir() {
  window.print();
  return { ok: true };
}

describe('actionImprimir', () => {
  beforeEach(() => {
    window.print = jest.fn();
  });

  test('chama window.print e retorna ok: true', () => {
    const result = actionImprimir();
    expect(window.print).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ ok: true });
  });
});
