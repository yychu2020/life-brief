(() => {
  'use strict';

  const fields = {
    personal: ['personalSavings', 'personalDebt', 'personalAssets'],
    household: ['householdSavings', 'householdDebt', 'householdAssets'],
  };
  const allFields = [...fields.personal, ...fields.household];

  function normalize(raw) {
    return Object.fromEntries(allFields.flatMap((id) => typeof raw?.[id] === 'string' ? [[id, raw[id]]] : []));
  }

  function cents(raw) {
    if (typeof raw !== 'string') return null;
    const text = raw.trim().normalize('NFKC');
    if (!/^(?:(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{0,2})?|\.\d{1,2})$/.test(text)) return null;
    const [whole, fraction = ''] = text.replace(/,/g, '').split('.');
    const yuan = Number(whole);
    if (yuan >= 1e12) return null;
    return yuan * 100 + Number(fraction.padEnd(2, '0'));
  }

  function parseAmount(raw) {
    const value = cents(raw);
    return value === null ? null : value / 100;
  }

  function totals([savings, debt, otherAssets]) {
    if ([savings, debt, otherAssets].includes(null)) return null;
    const assets = savings + otherAssets;
    return { assets: assets / 100, debt: debt / 100, net: (assets - debt) / 100 };
  }

  function evaluate(raw) {
    const values = normalize(raw);
    const hasValue = (id) => Boolean(values[id]?.trim());
    const amounts = Object.fromEntries(allFields.map((id) => [id, cents(values[id])]));
    return {
      personal: totals(fields.personal.map((id) => amounts[id])),
      household: totals(fields.household.map((id) => amounts[id])),
      missingPersonal: fields.personal.filter((id) => !hasValue(id)),
      invalidFields: allFields.filter((id) => hasValue(id) && amounts[id] === null),
      started: allFields.some(hasValue),
    };
  }

  window.LifeBriefFinance = { parseAmount, normalize, evaluate };
})();
