(() => {
  'use strict';

  const thresholds = [
    [20, '重度'],
    [15, '中重度'],
    [10, '中度'],
    [5, '轻度'],
    [0, '极少或无症状'],
  ];

  function isResponse(value) {
    return Number.isInteger(value) && value >= 0 && value <= 3;
  }

  function evaluate(responses) {
    const values = Array.isArray(responses) ? responses.slice(0, 9) : [];
    const scored = values.filter(isResponse);
    const total = scored.length === 9 ? scored.reduce((sum, value) => sum + value, 0) : null;
    const severity = total === null ? null : thresholds.find(([threshold]) => total >= threshold)[1];
    const needsSupport = isResponse(values[8]) && values[8] > 0;
    return { answered: scored.length, total, severity, needsSupport };
  }

  window.LifeBriefPHQ9 = { evaluate };
})();
