(() => {
  'use strict';

  const categories = [
    { id: 'clothing', title: '衣' },
    { id: 'food', title: '食' },
    { id: 'housing', title: '住（不含房贷）' },
    { id: 'transport', title: '行（不含车贷）' },
    { id: 'leisure', title: '玩' },
    { id: 'mortgage', title: '房贷' },
    { id: 'carLoan', title: '车贷' },
    { id: 'other', title: '其他' },
  ];
  const amountKeys = ['income', ...categories.map(({ id }) => id)];
  const keys = ['month', ...amountKeys];
  const integerFormat = new Intl.NumberFormat('zh-CN');

  function cleanRecord(raw) {
    if (!raw || typeof raw !== 'object') return {};
    return Object.fromEntries(keys.flatMap((key) =>
      typeof raw[key] === 'string' && raw[key].trim() ? [[key, raw[key].trim()]] : []));
  }

  function normalize(value) {
    return Array.isArray(value) ? value.map(cleanRecord).filter((row) => Object.keys(row).length > 0) : [];
  }

  function hasAnswers(value) {
    return normalize(value).length > 0;
  }

  function validMonth(month) {
    return /^\d{4}-(?:0[1-9]|1[0-2])$/.test(month ?? '') && !month.startsWith('0000');
  }

  function toCents(raw) {
    const amount = window.LifeBriefFinance.parseAmount(raw);
    return amount === null ? null : BigInt(Math.round(amount * 100));
  }

  function sumKnown(amounts) {
    const known = amounts.filter((amount) => amount !== null);
    return known.length ? known.reduce((sum, amount) => sum + amount, 0n) : null;
  }

  function sumComplete(amounts) {
    return amounts.every((amount) => amount !== null) ? sumKnown(amounts) : null;
  }

  function inspect(value) {
    const records = value.map(cleanRecord);
    const monthCounts = new Map();
    for (const { month } of records) {
      if (validMonth(month)) monthCounts.set(month, (monthCounts.get(month) ?? 0) + 1);
    }

    const drafts = records.map((record) => {
      const { month } = record;
      const active = Object.keys(record).length > 0;
      const badMonth = active && !validMonth(month);
      const duplicate = (monthCounts.get(month) ?? 0) > 1;
      const amounts = Object.fromEntries(amountKeys.map((key) => [key, toCents(record[key])]));
      const invalid = amountKeys.filter((key) => record[key] && amounts[key] === null);
      const expenses = categories.map(({ id }) => amounts[id]);
      const total = sumKnown(expenses);
      const completeExpenses = expenses.every((amount) => amount !== null);
      const net = completeExpenses && amounts.income !== null ? amounts.income - total : null;
      return { active, badMonth, duplicate, invalid, month, amounts, total, completeExpenses, net };
    });

    const months = drafts.filter(({ active, badMonth, duplicate, invalid }) =>
      active && !badMonth && !duplicate && !invalid.length).sort((left, right) => left.month.localeCompare(right.month));
    return {
      drafts,
      months,
      excluded: drafts.filter(({ active }) => active).length - months.length,
      total: sumKnown(months.map(({ total }) => total)),
      income: sumComplete(months.map(({ amounts }) => amounts.income)),
      net: sumComplete(months.map(({ net }) => net)),
    };
  }

  function decimal(cents, grouped = false) {
    if (cents === null) return '';
    const positive = cents < 0n ? -cents : cents;
    const whole = positive / 100n;
    const sign = cents < 0n ? '-' : '';
    const fraction = (positive % 100n).toString().padStart(2, '0');
    return sign + (grouped ? integerFormat.format(whole) : whole.toString()) + '.' + fraction;
  }

  function summarize(value) {
    const result = inspect(Array.isArray(value) ? value : []);
    const yuan = (amount) => amount === null ? null : Number(amount) / 100;
    return {
      months: result.months.map(({ month, amounts, total, net, completeExpenses }) => ({
        month,
        income: yuan(amounts.income),
        expenses: Object.fromEntries(categories.map(({ id }) => [id, yuan(amounts[id])])),
        total: yuan(total),
        net: yuan(net),
        completeExpenses,
      })),
      total: yuan(result.total),
      income: yuan(result.income),
      net: yuan(result.net),
      excluded: result.excluded,
      exact: Object.fromEntries(['total', 'income', 'net'].map((id) => [id, decimal(result[id])])),
    };
  }

  function monthStatus(row) {
    if (!row.completeExpenses && row.amounts.income === null) return '开销有缺项，收入未填';
    if (!row.completeExpenses) return '开销有缺项';
    if (row.amounts.income === null) return '收入未填';
    return '已填齐';
  }

  function csv(value) {
    const result = inspect(value);
    if (!result.months.length) return '';
    const rows = [['月份', '收入（元）', ...categories.map(({ title }) => title + '（元）'), '已填开销（元）', '净现金流（元）', '填写状态']];
    for (const month of result.months) {
      rows.push([month.month, ...amountKeys.map((id) => decimal(month.amounts[id])), decimal(month.total), decimal(month.net), monthStatus(month)]);
    }
    const categoryTotals = categories.map(({ id }) => decimal(sumKnown(result.months.map(({ amounts }) => amounts[id]))));
    const complete = result.months.every(({ net }) => net !== null);
    const excluded = result.excluded ? `；另有 ${result.excluded} 条记录未纳入` : '';
    rows.push(['合计', decimal(result.income), ...categoryTotals, decimal(result.total), decimal(result.net),
      `${result.months.length} 个月${complete ? '' : '；部分金额未填'}${excluded}`]);
    return '\uFEFF' + rows.map((row) => row.map((cell) => '"' + cell.replace(/"/g, '""') + '"').join(',')).join('\r\n') + '\r\n';
  }

  function element(tag, className, content) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (content !== undefined) node.textContent = content;
    return node;
  }

  function button(title, className, action) {
    const node = element('button', className, title);
    node.type = 'button';
    node.addEventListener('click', action);
    return node;
  }

  function download(value) {
    const content = csv(value);
    if (!content) return;
    const url = URL.createObjectURL(new Blob([content], { type: 'text/csv;charset=utf-8' }));
    const link = element('a');
    link.href = url;
    link.download = '生活折页-每月收支.csv';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function render(container, { question, value, onChange }) {
    const rows = normalize(value);
    if (!rows.length) rows.push({});
    const list = element('div', 'budget-list');
    const actions = element('div', 'budget-actions');
    const overview = element('div', 'budget-overview');
    const overviewTitle = element('h3', '', '月度收支汇总');
    const summary = element('p', 'budget-summary');
    const summaryHint = element('p', 'budget-hint');
    summary.setAttribute('role', 'status');
    const csvButton = button('下载收支明细 CSV', 'button secondary', () => download(rows));
    const add = button('＋ 添加月份', 'button secondary', () => {
      rows.push({});
      rebuild(rows.length - 1);
    });
    actions.append(add, csvButton);
    overview.append(overviewTitle, summary, summaryHint, actions);
    const scopeHint = element('p', 'budget-hint', '各月使用同一统计口径，例如都按个人或都按家庭。收入记实际到账的款项，账户之间互转可以略过。');
    container.append(scopeHint, list, overview);
    let controls = [];

    function refresh() {
      const result = inspect(rows);
      for (const [index, card] of controls.entries()) {
        const draft = result.drafts[index];
        const amountHasError = draft.invalid.length > 0;
        card.heading.textContent = validMonth(draft.month) ? draft.month : `月份 ${index + 1}`;
        const issue = draft.badMonth ? '请填写有效月份。' : draft.duplicate ? '该月份有重复记录，请保留一条。' : amountHasError ? '请修正标记的金额。' : '';
        card.status.textContent = issue ? issue + ' 这条记录暂不计入汇总。' : draft.active ? monthStatus(draft) : '';
        card.status.classList.toggle('budget-error', Boolean(issue));
        for (const [id, input] of card.inputs) {
          const invalid = id === 'month' ? draft.badMonth || draft.duplicate : draft.invalid.includes(id);
          if (invalid) input.setAttribute('aria-invalid', 'true');
          else input.removeAttribute('aria-invalid');
        }
        const available = draft.active && !issue;
        const totalLabel = draft.completeExpenses ? '本月总开销' : '本月已填开销';
        card.totals.textContent = available && draft.total !== null ? `${totalLabel} ${decimal(draft.total, true)} 元` : '';
        card.flow.textContent = available && draft.net !== null ? `本月净现金流 ${decimal(draft.net, true)} 元` : '';
        card.confirmZero.disabled = categories.every(({ id }) => Boolean(rows[index][id]?.trim()));
      }

      const { months, total, net, excluded } = result;
      const completeExpenses = months.every((month) => month.completeExpenses);
      const parts = [`纳入 ${months.length} 个月`];
      if (total !== null) parts.push(`${completeExpenses ? '总开销' : '已填开销总计'} ${decimal(total, true)} 元`);
      if (net !== null) parts.push(`累计净现金流 ${decimal(net, true)} 元`);
      summary.textContent = parts.join(' · ');
      summaryHint.textContent = [excluded ? `另有 ${excluded} 条记录因月份缺失、重复或金额无效暂未纳入。` : '',
        months.length && net === null ? '收入和八类开销都填齐后，才会计算对应月份的净现金流。' : ''].filter(Boolean).join(' ');
      csvButton.disabled = months.length === 0;
    }

    function changed() {
      onChange(normalize(rows));
      refresh();
    }

    function buildCard(row, index) {
      const id = `${question.id}-${index + 1}`;
      const node = element('fieldset', 'budget-month');
      const heading = element('legend');
      const monthFields = element('div', 'budget-month-fields');
      const expenseFields = element('div', 'budget-expenses');
      const inputs = new Map();

      function field(key, title) {
        const wrapper = element('div', 'budget-field');
        const label = element('label', '', title);
        const input = element('input');
        input.id = `answer-${id}-${key}`;
        label.htmlFor = input.id;
        if (key === 'month') {
          input.type = 'month';
          if (input.type !== 'month') {
            input.placeholder = 'YYYY-MM';
            input.maxLength = 7;
          }
        } else {
          input.type = 'text';
          input.inputMode = 'decimal';
          input.placeholder = '金额（元）';
          input.maxLength = 24;
          input.autocomplete = 'off';
        }
        input.value = row[key] ?? '';
        input.addEventListener('input', () => {
          row[key] = input.value;
          changed();
        });
        inputs.set(key, input);
        wrapper.append(label, input);
        return wrapper;
      }

      monthFields.append(field('month', '月份'), field('income', '实际到账收入（元）'));
      for (const { id: key, title } of categories) expenseFields.append(field(key, title));
      const hint = element('p', 'budget-hint', '金额以人民币元填写，最多两位小数。留空表示未记录，确认没有时填 0。');
      const status = element('p', 'budget-status');
      status.id = `answer-${id}-status`;
      node.setAttribute('aria-describedby', status.id);
      const totals = element('p', 'budget-totals');
      const flow = element('p', 'budget-totals');
      const rowActions = element('div', 'budget-actions');
      const confirmZero = button('未填开销记为 0', 'button secondary', () => {
        for (const { id: key } of categories) {
          if (row[key]?.trim()) continue;
          row[key] = '0';
          inputs.get(key).value = '0';
        }
        changed();
      });
      const remove = button('移除本月', 'button quiet', () => {
        if (Object.keys(cleanRecord(row)).length && !window.confirm('要移除这个月的收支记录吗？')) return;
        rows.splice(index, 1);
        if (!rows.length) rows.push({});
        rebuild(Math.min(index, rows.length - 1));
        changed();
      });
      rowActions.append(confirmZero, remove);
      node.append(heading, monthFields, expenseFields, hint, status, totals, flow, rowActions);
      return { node, heading, inputs, status, totals, flow, confirmZero };
    }

    function rebuild(focusIndex) {
      controls = rows.map(buildCard);
      list.replaceChildren(...controls.map(({ node }) => node));
      refresh();
      if (focusIndex !== undefined) controls[focusIndex]?.inputs.get('month').focus();
    }

    rebuild();
  }

  window.LifeBriefBudget = { categories, normalize, hasAnswers, render, summarize };
})();
