// tests/popup-toggle.test.js
// Testa o mapa TOGGLE_EXTRACTORS isolado (sem importar popup.js, que depende de chrome APIs)

const TOGGLE_EXTRACTORS = {
  aumentarQuadro: r => Boolean(r?.enlarged),
};

function getToggleResult(action, response) {
  return TOGGLE_EXTRACTORS[action]?.(response) ?? null;
}

describe('getToggleResult', () => {
  describe('aumentarQuadro', () => {
    test('retorna true quando enlarged=true', () => {
      expect(getToggleResult('aumentarQuadro', { ok: true, enlarged: true })).toBe(true);
    });

    test('retorna false quando enlarged=false', () => {
      expect(getToggleResult('aumentarQuadro', { ok: true, enlarged: false })).toBe(false);
    });

    test('retorna false quando enlarged ausente', () => {
      expect(getToggleResult('aumentarQuadro', { ok: true })).toBe(false);
    });

    test('retorna false quando response é null', () => {
      expect(getToggleResult('aumentarQuadro', null)).toBe(false);
    });

    test('retorna false quando response é undefined', () => {
      expect(getToggleResult('aumentarQuadro', undefined)).toBe(false);
    });
  });

  describe('ação sem extrator', () => {
    test('retorna null para ação não togglável', () => {
      expect(getToggleResult('copyData', { ok: true })).toBeNull();
    });

    test('retorna null para ação desconhecida', () => {
      expect(getToggleResult('inexistente', { ok: true })).toBeNull();
    });
  });
});
