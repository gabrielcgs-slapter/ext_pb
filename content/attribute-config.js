// content/attribute-config.js
async function applyAttributeConfig(rulesUrl, doc, trigger) {
  const res = await fetch(rulesUrl);
  const rules = await res.json();
  const target = doc ?? document;
  const filtered = trigger ? rules.filter(r => r.trigger === trigger) : rules;
  filtered.forEach(({ selector, attributes }) => {
    target.querySelectorAll(selector).forEach(el => {
      Object.entries(attributes).forEach(([attr, val]) => el.setAttribute(attr, val));
    });
  });
}

if (typeof module !== 'undefined') module.exports = { applyAttributeConfig };
