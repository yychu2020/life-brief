(() => {
  'use strict';

  const storageKey = 'lifebrief.local-draft.v2';
  const legacyStorageKey = 'lifebrief.local-draft.v1';
  const mbtiArchiveKey = 'mbtiProfile';
  const modules = window.LifeBriefModules;
  const examples = window.LifeBriefExamples;
  const chapterSections = [
    { title: '眼下与来路', modules: modules.slice(0, 5) },
    { title: '身心与支点', modules: modules.slice(5, 10) },
    { title: '取舍与下一步', modules: modules.slice(10) },
  ];
  const questions = modules.flatMap((module) => module.questions.map((question) => ({ ...question, module })));
  const questionsById = new Map(questions.map((question) => [question.id, question]));
  const phqQuestion = questions.find((question) => question.type === 'phq9');
  const financeQuestion = questions.find((question) => question.type === 'finance');
  const budgetQuestion = questions.find((question) => question.type === 'budget');
  const yuanFormat = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });
  const legacySteps = ['situation', 'readiness', 'goal', 'obstacles'];
  const get = (id) => document.getElementById(id);
  const screens = ['screen-intro', 'screen-form', 'screen-report', 'screen-mbti'].map(get);
  const form = get('reflection-form');
  const content = get('step-content');
  const formError = get('form-error');
  const reportText = get('report-text');
  const status = get('status');
  const moduleDialog = get('module-dialog');
  const questionProgress = get('question-progress');
  const questionJump = get('question-jump');
  const questionPicker = get('question-picker');
  const jumpToggle = get('jump-toggle');
  const jumpPanel = get('jump-panel');

  let storageUnavailable = false;
  let hasStoredDraft = false;
  let draft = readDraft();
  let answers = {};
  let index = 0;
  let view = 'current';
  let savedReport = null;
  let reportEdited = false;
  let reportNeedsMbtiPanel = false;
  let financeDeferred = false;
  let financeFinishPending = false;
  let demoExample = null;
  let mbtiController;
  let mbtiBack;

  function readDraft() {
    try {
      for (const key of [storageKey, legacyStorageKey]) {
        const raw = localStorage.getItem(key);
        if (!raw) continue;
        let data;
        try {
          data = JSON.parse(raw);
        } catch {
          continue;
        }
        if (!data?.answers || typeof data.answers !== 'object' || Array.isArray(data.answers)) continue;

        const questionId = key === legacyStorageKey ? legacySteps[data.step] : data.questionId;
        const report = typeof data.report === 'string' ? data.report : null;
        hasStoredDraft = true;
        return {
          answers: normalizeAnswers(data.answers),
          index: Math.max(0, questions.findIndex((question) => question.id === questionId)),
          view: data.view === 'overview' ? 'overview' : 'current',
          report,
          // Previously saved notes may have been edited before this flag existed.
          reportEdited: data.reportEdited === true || (data.reportEdited === undefined && report !== null),
          reportNeedsMbtiPanel: data.reportNeedsMbtiPanel === true,
          financeDeferred: data.financeDeferred === true,
          reportView: data.reportView === true || (data.reportView === undefined && report !== null),
        };
      }
    } catch {
      storageUnavailable = true;
    }
    return null;
  }

  function normalizeAnswers(raw) {
    // Keep compatible legacy answers available to the report even before their modules are ready.
    return Object.fromEntries(Object.entries(raw).flatMap(([id, value]) => {
      if (id === mbtiArchiveKey) {
        const profile = window.LifeBriefMBTI.normalizeProfile(value);
        return profile ? [[id, profile]] : [];
      }
      const question = questionsById.get(id);
      if (question?.type === 'records') {
        const records = normalizeRecords(question, value);
        return records.length ? [[id, records]] : [];
      }
      if (question?.type === 'budget') {
        const budget = window.LifeBriefBudget.normalize(value);
        return window.LifeBriefBudget.hasAnswers(budget) ? [[id, budget]] : [];
      }
      if (question?.type === 'finance') {
        const values = window.LifeBriefFinance.normalize(value);
        return Object.keys(values).length ? [[id, values]] : [];
      }
      if (question?.type === 'record') {
        const record = normalizeRecord(question, value);
        return record ? [[id, record]] : [];
      }
      if (question?.type === 'phq9') return [[id, phqResponses(value, question.items.length)]];
      if (typeof value === 'string' || (Array.isArray(value) && value.every((item) => typeof item === 'string'))) {
        return [[id, value]];
      }
      return [];
    }));
  }

  function normalizeRecord(question, value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    return Object.fromEntries(question.fields.flatMap((field) => {
      const answer = value[field.id];
      if (typeof answer !== 'string' || (field.options && !field.options.includes(answer))) return [];
      const entries = [[field.id, answer]];
      const detailKey = field.id + 'Other';
      if (answer === '其他' && typeof value[detailKey] === 'string') entries.push([detailKey, value[detailKey]]);
      return entries;
    }));
  }

  function hasRecordAnswers(question, value) {
    return question.fields.some(({ id }) => typeof value?.[id] === 'string' && value[id].trim());
  }

  function normalizeRecords(question, value) {
    if (!Array.isArray(value)) return [];
    return value.map((record) => normalizeRecord(question, record)).filter((record) => hasRecordAnswers(question, record));
  }

  function phqResponses(value, length) {
    const responses = Array.isArray(value) ? value : [];
    return Array.from({ length }, (_, index) => {
      const score = responses[index];
      return Number.isInteger(score) && score >= 0 && score <= 3 ? score : null;
    });
  }

  function phqResult(value) {
    return window.LifeBriefPHQ9.evaluate(value);
  }

  function financeResult(value) {
    return window.LifeBriefFinance.evaluate(value);
  }

  function financeNeedsAttention(result) {
    return result.started && (!result.personal || result.invalidFields.length > 0);
  }

  function announce(message = '') {
    const warning = storageUnavailable ? '浏览器未能保存草稿，请在关闭页面前下载手记。' : '';
    status.textContent = [message, warning].filter(Boolean).join(' ');
  }

  function answered(question, source = answers) {
    const value = source[question.id];
    if (question.type === 'multi') return Array.isArray(value) && value.length > 0;
    if (question.type === 'single') return question.options.includes(value);
    if (question.type === 'record') return hasRecordAnswers(question, value);
    if (question.type === 'records') return Array.isArray(value) && value.some((record) => hasRecordAnswers(question, record));
    if (question.type === 'budget') return window.LifeBriefBudget.hasAnswers(value);
    if (question.type === 'phq9') return phqResult(value).total !== null;
    if (question.type === 'finance') {
      const result = financeResult(value);
      return Boolean(result.personal) && !financeNeedsAttention(result);
    }
    return typeof value === 'string' && Boolean(value.trim());
  }

  function persist(reportView = false) {
    if (demoExample) return;
    const partialPhq = phqQuestion && phqResult(answers[phqQuestion.id]).answered > 0;
    const partialFinance = financeQuestion && financeResult(answers[financeQuestion.id]).started;
    if (!draft && !partialPhq && !partialFinance && !questions.some((question) => answered(question))) return;
    draft = { answers: { ...answers }, index, view, report: savedReport, reportView, reportEdited, reportNeedsMbtiPanel, financeDeferred };
    get('reset').hidden = !hasQuestionnaireDraft();
    writeDraft(draft);
  }

  function writeDraft(nextDraft) {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ ...nextDraft, questionId: questions[nextDraft.index].id }));
      if (storageUnavailable) {
        storageUnavailable = false;
        announce();
      }
      hasStoredDraft = true;
      return true;
    } catch {
      if (!storageUnavailable) {
        storageUnavailable = true;
        announce();
      }
      return false;
    }
  }

  function hasQuestionnaireDraft(source = draft) {
    return Boolean(source && (source.reportView || source.report !== null ||
      Object.keys(source.answers).some((key) => key !== mbtiArchiveKey)));
  }

  function refreshIntroActions() {
    const hasDraft = hasQuestionnaireDraft();
    get('start').hidden = hasDraft;
    get('continue-draft').hidden = !hasDraft;
    const profile = draft?.answers[mbtiArchiveKey];
    const archive = get('mbti-archive');
    archive.hidden = !profile;
    get('mbti-archive-type').textContent = profile?.type ?? '';
    get('mbti-archive-meta').textContent = profile ? mbtiSummary(profile) : '';
    const saved = draft?.answers;
    const work = saved?.workProfile;
    const tags = [...new Set([saved?.lifeStage, work?.status, work?.field, work?.role].map(shortProfileTag).filter(Boolean))];
    get('home-profile').hidden = tags.length === 0;
    get('home-profile-tags').replaceChildren(...tags.map((tag) => profileTag(tag, 'li')));
  }

  function shortProfileTag(value) {
    if (typeof value !== 'string') return '';
    const label = value.trim();
    if (label === '其他' || label === '不愿回答' || Array.from(label).length > 24) return '';
    return /[\r\n@。！？!?；;]|https?:\/\/|\d(?:[ -]?\d){6,}/i.test(label) ? '' : label;
  }

  function profileTag(label, tagName = 'span') {
    const tag = document.createElement(tagName);
    tag.className = 'profile-tag';
    tag.textContent = label;
    return tag;
  }

  function renderExamples() {
    get('example-grid').replaceChildren(...examples.map((example) => {
      const card = document.createElement('article');
      card.className = 'example-card';
      card.dataset.exampleId = example.id;
      const identity = document.createElement('p');
      identity.className = 'example-identity';
      identity.textContent = example.name;
      const title = document.createElement('h3');
      title.className = 'example-title';
      title.textContent = example.title;
      const tags = document.createElement('div');
      tags.className = 'example-tags';
      tags.append(...example.tags.map((tag) => profileTag(tag)));
      const comparisons = [
        ['example-before', '梳理前', example.startingPoint],
        ['example-outcome', '梳理后', example.outcome],
      ].map(([className, label, copy]) => {
        const paragraph = document.createElement('p');
        paragraph.className = className;
        const caption = document.createElement('strong');
        caption.textContent = label;
        const text = document.createElement('span');
        text.textContent = copy;
        paragraph.append(caption, text);
        return paragraph;
      });
      const open = document.createElement('button');
      open.type = 'button';
      open.className = 'button secondary';
      open.textContent = '查看这份示例';
      open.setAttribute('aria-label', '查看' + example.name + '的示例手记');
      open.addEventListener('click', () => begin(structuredClone(example.answers), { index: questions.length - 1, demoExample: example }));
      card.append(identity, title, tags, ...comparisons, open);
      return card;
    }));
  }

  function focusExamples() {
    const heading = get('examples-title');
    heading.setAttribute('tabindex', '-1');
    heading.focus({ preventScroll: true });
    heading.scrollIntoView({ block: 'start' });
  }

  function mbtiSummary(profile) {
    return profile.date + ' · ' + [profile.ei, profile.sn, profile.tf, profile.jp].join(' / ');
  }

  function clearDraft() {
    try {
      localStorage.removeItem(legacyStorageKey);
      localStorage.removeItem(storageKey);
    } catch {
      if (hasStoredDraft) return false;
    }
    hasStoredDraft = false;
    draft = null;
    return true;
  }

  function archiveOnlyDraft(profile) {
    return {
      answers: { [mbtiArchiveKey]: profile }, index: 0, view: 'current',
      report: null, reportView: false, reportEdited: false, reportNeedsMbtiPanel: false,
    };
  }

  function clearQuestionnaireDraft() {
    const profile = draft?.answers[mbtiArchiveKey];
    if (!profile) return clearDraft();
    const next = archiveOnlyDraft(profile);
    try {
      localStorage.removeItem(legacyStorageKey);
    } catch {
      return false;
    }
    if (!writeDraft(next)) return false;
    draft = next;
    return true;
  }

  function draftWithArchive(profile) {
    if (!draft) return archiveOnlyDraft(profile);
    const next = { ...draft, answers: { ...draft.answers } };
    if (profile) next.answers[mbtiArchiveKey] = profile;
    else delete next.answers[mbtiArchiveKey];
    if (!next.reportEdited) next.report = null;
    next.reportNeedsMbtiPanel = next.reportEdited && Boolean(profile);
    return next;
  }

  function applyArchiveUpdate(nextDraft) {
    draft = nextDraft;
    if (!demoExample) {
      const profile = nextDraft?.answers[mbtiArchiveKey];
      if (profile) answers[mbtiArchiveKey] = profile;
      else delete answers[mbtiArchiveKey];
      savedReport = nextDraft?.report ?? null;
      reportEdited = nextDraft?.reportEdited ?? false;
      reportNeedsMbtiPanel = nextDraft?.reportNeedsMbtiPanel ?? false;
    }
    refreshIntroActions();
  }

  function saveMbti(raw) {
    const profile = window.LifeBriefMBTI.normalizeProfile(raw);
    if (!profile) return false;
    const next = draftWithArchive(profile);
    if (!writeDraft(next)) return false;
    applyArchiveUpdate(next);
    return true;
  }

  function removeMbti() {
    if (!draft?.answers[mbtiArchiveKey] || !window.confirm('要移除本机保存的偏好测验结果吗？')) return;
    let next = draftWithArchive(null);
    if (hasQuestionnaireDraft(next)) {
      if (!writeDraft(next)) {
        announce('浏览器未能移除归档结果。');
        return;
      }
    } else {
      try {
        localStorage.removeItem(storageKey);
      } catch {
        announce('浏览器未能移除归档结果。');
        return;
      }
      hasStoredDraft = false;
      next = null;
    }
    applyArchiveUpdate(next);
    announce(next?.reportEdited ? '已移除归档结果。以前编辑过的手记可以在正文中更新。' : '已移除归档结果。');
    get('open-mbti').focus();
  }

  function openMbti(onBack) {
    mbtiBack = onBack;
    showScreen('screen-mbti');
    if (!mbtiController) mbtiController = window.LifeBriefMBTI.mount({ onBack: () => mbtiBack(), onSave: saveMbti });
    mbtiController.open(draft?.answers[mbtiArchiveKey] ?? null);
  }

  function showScreen(id, focusTarget) {
    const screen = get(id);
    for (const item of screens) item.hidden = item !== screen;
    if (id === 'screen-intro') refreshIntroActions();
    get('reset').hidden = id === 'screen-mbti' || (id !== 'screen-intro' && Boolean(demoExample)) || !hasQuestionnaireDraft();
    if (focusTarget === false) return;
    const heading = focusTarget ?? screen.querySelector('h1, h2');
    heading?.setAttribute('tabindex', '-1');
    heading?.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  }

  function setError(message) {
    formError.textContent = message;
    formError.hidden = !message;
  }

  function updateAnswer(id, value, changesReport = true) {
    const type = questionsById.get(id)?.type;
    const clear = (type === 'finance' && !Object.keys(value).length) ||
      (type === 'records' && value.length === 0) ||
      (type === 'budget' && !window.LifeBriefBudget.hasAnswers(value));
    if (clear) delete answers[id];
    else answers[id] = value;
    if (id === 'goal') delete answers.horizon;
    if (id === financeQuestion?.id) financeDeferred = false;
    if (changesReport) {
      savedReport = null;
      reportEdited = false;
      reportNeedsMbtiPanel = false;
    }
    persist();
  }

  function refreshQuestionActions(question) {
    const last = index === questions.length - 1;
    const hasAnswer = answered(question);
    const financing = question.type === 'finance';
    const financeStarted = financing && financeResult(answers[question.id]).started;
    const finishingFinance = financing && financeFinishPending;
    const next = get('next');
    const skip = get('skip');
    skip.hidden = question.required || hasAnswer || finishingFinance;
    if (question.type === 'phq9') skip.textContent = last ? '跳过量表并整理手记' : '暂时跳过量表';
    else if (financeStarted) skip.textContent = '稍后补充';
    else skip.textContent = last ? '跳过并整理手记' : '跳过';
    next.hidden = !question.required && !hasAnswer && !(finishingFinance && !financeStarted);
    next.textContent = last || finishingFinance ? '整理成手记' : '下一题';
    get('back').textContent = index === 0 ? '返回首页' : '上一题';
  }

  function textControl(question) {
    const control = document.createElement(question.type === 'textarea' ? 'textarea' : 'input');
    if (question.type === 'textarea') control.rows = 6;
    else control.type = 'text';
    control.id = 'answer-' + question.id;
    control.name = question.id;
    control.maxLength = question.type === 'textarea' ? 2000 : 60;
    control.required = Boolean(question.required);
    control.placeholder = question.placeholder ?? '';
    control.value = typeof answers[question.id] === 'string' ? answers[question.id] : '';
    control.setAttribute('aria-labelledby', 'active-question-title');
    if (question.hint) control.setAttribute('aria-describedby', 'active-question-hint');
    control.addEventListener('input', () => {
      if ((answers[question.id] ?? '') !== control.value) updateAnswer(question.id, control.value);
      if (control.value.trim()) {
        control.removeAttribute('aria-invalid');
        setError('');
      }
      refreshQuestionActions(question);
    });
    return control;
  }

  function choiceControls(question, container) {
    const multiple = question.type === 'multi';
    const otherKey = question.id + 'Other';
    const detailOption = question.detailOption ?? '其他';
    const otherField = document.createElement('div');
    otherField.className = 'other-field';
    const otherLabel = document.createElement('label');
    const otherInput = document.createElement('input');
    otherInput.type = 'text';
    otherInput.id = 'answer-' + otherKey;
    otherInput.name = otherKey;
    otherInput.maxLength = 200;
    otherLabel.htmlFor = otherInput.id;
    otherLabel.textContent = question.detailLabel ?? '其他情况（选填）';
    otherField.append(otherLabel, otherInput);

    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'clear-answer';
    clear.textContent = '清除此题';

    const controls = question.options.map((option, optionIndex) => {
      const label = document.createElement('label');
      label.className = 'choice';
      const input = document.createElement('input');
      input.type = multiple ? 'checkbox' : 'radio';
      input.name = question.id;
      input.id = 'answer-' + question.id + '-' + (optionIndex + 1);
      input.value = option;
      const text = document.createElement('span');
      text.textContent = option;
      label.append(input, text);
      container.append(label);
      input.addEventListener('change', () => select(input));
      return input;
    });

    function selected() {
      const value = answers[question.id];
      return multiple ? (Array.isArray(value) ? value : []) : [value];
    }

    function sync() {
      const values = selected();
      for (const input of controls) input.checked = values.includes(input.value);
      clear.hidden = !answered(question);
      otherField.hidden = !values.includes(detailOption);
      otherInput.value = typeof answers[otherKey] === 'string' ? answers[otherKey] : '';
      refreshQuestionActions(question);
    }

    function select(input) {
      let value = input.value;
      if (multiple) {
        const exclusive = question.exclusive ?? [];
        const current = selected();
        if (!input.checked) {
          value = current.filter((item) => item !== input.value);
        } else if (exclusive.includes(input.value)) {
          value = [input.value];
        } else {
          value = [...current.filter((item) => !exclusive.includes(item)), input.value];
          if (question.maxSelections && value.length > question.maxSelections) {
            sync();
            setError('这一题最多选 ' + question.maxSelections + ' 项，可以先取消一项。');
            return;
          }
        }
      }

      const useOther = multiple ? value.includes(detailOption) : value === detailOption;
      if (!useOther) delete answers[otherKey];
      updateAnswer(question.id, value);
      setError('');
      sync();
    }

    otherInput.addEventListener('input', () => updateAnswer(otherKey, otherInput.value));
    clear.addEventListener('click', () => {
      delete answers[otherKey];
      updateAnswer(question.id, multiple ? [] : '');
      setError('');
      sync();
      controls[0]?.focus();
    });

    if (question.options.includes(detailOption)) container.append(otherField);
    if (!question.required) container.append(clear);
    container.setAttribute('role', 'group');
    container.setAttribute('aria-labelledby', 'active-question-title');
    if (question.hint) container.setAttribute('aria-describedby', 'active-question-hint');
    sync();
  }

  function changeRecordField(record, id, value) {
    if (value) record[id] = value;
    else delete record[id];
    if (!id.endsWith('Other') && value !== '其他') delete record[id + 'Other'];
  }

  function appendRecordFields(question, container, prefix, values, update) {
    container.classList.add('record-fields');
    for (const field of question.fields) {
      const row = document.createElement('div');
      row.className = 'record-field';
      const label = document.createElement('label');
      const tag = field.type === 'textarea' ? 'textarea' : field.options ? 'select' : 'input';
      const control = document.createElement(tag);
      control.id = prefix + '-' + field.id;
      control.name = field.id;
      label.htmlFor = control.id;
      label.textContent = field.title;
      if (tag === 'select') {
        for (const value of ['', ...field.options]) {
          const option = document.createElement('option');
          option.value = value;
          option.textContent = value || '请选择';
          control.append(option);
        }
      } else {
        if (tag === 'textarea') control.rows = 3;
        else control.type = 'text';
        control.maxLength = tag === 'textarea' ? 2000 : 120;
        control.placeholder = field.placeholder ?? '';
      }
      control.value = values?.[field.id] ?? '';
      row.append(label, control);
      if (field.hint) {
        const hint = document.createElement('p');
        hint.id = control.id + '-hint';
        hint.className = 'record-field-hint';
        hint.textContent = field.hint;
        control.setAttribute('aria-describedby', hint.id);
        row.append(hint);
      }

      let detail;
      let detailInput;
      if (field.options?.includes('其他')) {
        const detailKey = field.id + 'Other';
        detail = document.createElement('div');
        detail.className = 'other-field';
        detail.hidden = control.value !== '其他';
        const detailLabel = document.createElement('label');
        detailInput = document.createElement('input');
        detailInput.type = 'text';
        detailInput.id = control.id + '-other';
        detailInput.maxLength = 200;
        detailInput.value = values?.[detailKey] ?? '';
        detailLabel.htmlFor = detailInput.id;
        detailLabel.textContent = '补充' + field.title + '（选填）';
        detailInput.addEventListener('input', () => update(detailKey, detailInput.value));
        detail.append(detailLabel, detailInput);
        row.append(detail);
      }

      control.addEventListener(tag === 'select' ? 'change' : 'input', () => {
        update(field.id, control.value);
        if (detail) {
          detail.hidden = control.value !== '其他';
          if (detail.hidden) detailInput.value = '';
        }
      });
      container.append(row);
    }
  }

  function recordControls(question, container) {
    appendRecordFields(question, container, 'answer-' + question.id, answers[question.id], (id, value) => {
      const record = { ...answers[question.id] };
      changeRecordField(record, id, value);
      updateAnswer(question.id, record);
      refreshQuestionActions(question);
    });
  }

  function repeatableRecordControls(question, container) {
    const label = question.entryLabel ?? '条目';
    const list = document.createElement('div');
    list.className = 'records-list';
    const empty = document.createElement('p');
    empty.className = 'records-empty';
    empty.textContent = '还没有添加' + label + '。';
    const actions = document.createElement('div');
    actions.className = 'records-actions';
    const count = document.createElement('span');
    count.className = 'records-count';
    count.setAttribute('role', 'status');
    const add = document.createElement('button');
    add.type = 'button';
    add.className = 'button secondary';
    add.textContent = '添加' + label;
    actions.append(add, count);
    container.append(empty, list, actions);

    const entries = [];
    let serial = 0;

    function sync() {
      const values = normalizeRecords(question, entries.map((entry) => entry.record));
      if (JSON.stringify(answers[question.id] ?? []) !== JSON.stringify(values)) updateAnswer(question.id, values);
      const summary = '已记录 ' + values.length + ' 条';
      if (count.textContent !== summary) count.textContent = summary;
      empty.hidden = entries.length > 0;
      entries.forEach((entry, position) => {
        entry.legend.textContent = label + ' ' + (position + 1);
        entry.remove.setAttribute('aria-label', '移除' + entry.legend.textContent);
      });
      refreshQuestionActions(question);
    }

    function appendEntry(initial = {}) {
      const record = { ...initial };
      const card = document.createElement('fieldset');
      card.className = 'record-card';
      const legend = document.createElement('legend');
      const fields = document.createElement('div');
      fields.className = 'record-card-fields';
      serial += 1;
      appendRecordFields(question, fields, 'answer-' + question.id + '-' + serial, record, (id, value) => {
        changeRecordField(record, id, value);
        sync();
      });
      const cardActions = document.createElement('div');
      cardActions.className = 'record-card-actions';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'clear-answer';
      remove.textContent = '移除';
      const entry = { record, legend, remove };
      remove.addEventListener('click', () => {
        const position = entries.indexOf(entry);
        entries.splice(position, 1);
        card.remove();
        sync();
        const adjacent = entries[Math.min(position, entries.length - 1)];
        (adjacent?.remove ?? add).focus();
      });
      cardActions.append(remove);
      card.append(legend, fields, cardActions);
      entries.push(entry);
      list.append(card);
      return fields.querySelector('input, textarea, select');
    }

    for (const record of normalizeRecords(question, answers[question.id])) appendEntry(record);
    add.addEventListener('click', () => {
      const control = appendEntry();
      sync();
      control?.focus();
    });
    sync();
  }

  function budgetControls(question, container) {
    const budget = window.LifeBriefBudget;
    budget.render(container, {
      question,
      value: budget.normalize(answers[question.id]),
      onChange(raw) {
        const value = budget.normalize(raw);
        if (JSON.stringify(budget.normalize(answers[question.id])) !== JSON.stringify(value)) updateAnswer(question.id, value);
        refreshQuestionActions(question);
      },
    });
  }

  function createPhqPanel() {
    return get('phq-result-template').content.firstElementChild.cloneNode(true);
  }

  function updatePhqPanel(panel, result) {
    const score = panel.querySelector('[data-phq-score]');
    const message = result.total === null
      ? '已填写 ' + result.answered + ' / 9，答完后显示总分。'
      : result.total + ' / 27 · ' + result.severity;
    if (score.textContent !== message) score.textContent = message;
    const support = panel.querySelector('[data-phq-support]');
    const revealed = support.hidden && result.needsSupport;
    support.hidden = !result.needsSupport;
    return revealed ? support : null;
  }

  function phqControls(question, container) {
    const list = document.createElement('div');
    list.className = 'phq-items';
    const panel = createPhqPanel();
    const actions = document.createElement('div');
    actions.className = 'phq-actions';
    const privacy = document.createElement('p');
    privacy.className = 'phq-save-note';
    privacy.textContent = '暂时跳过时，已选的答案仍保存在本机草稿。回答和筛查结果仅供在当前浏览器查看。';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'clear-answer';
    clear.textContent = '清除量表答案';
    actions.append(privacy, clear);

    const allControls = [];
    question.items.forEach((label, itemIndex) => {
      const group = document.createElement('fieldset');
      group.className = 'phq-item';
      const legend = document.createElement('legend');
      legend.textContent = (itemIndex + 1) + '. ' + label;
      const options = document.createElement('div');
      options.className = 'phq-options';
      const controls = question.options.map((option, score) => {
        const choice = document.createElement('label');
        choice.className = 'phq-choice';
        const control = document.createElement('input');
        control.type = 'radio';
        control.name = question.id + '-' + (itemIndex + 1);
        control.id = 'answer-' + control.name + '-' + score;
        control.value = String(score);
        const text = document.createElement('span');
        text.textContent = option;
        choice.append(control, text);
        options.append(choice);
        control.addEventListener('change', () => {
          const value = phqResponses(answers[question.id], question.items.length);
          value[itemIndex] = score;
          updateAnswer(question.id, value, false);
          const support = sync();
          if (itemIndex === 8) support?.scrollIntoView({ block: 'nearest' });
        });
        return control;
      });
      allControls.push(controls);
      group.append(legend, options);
      list.append(group);
    });

    function sync() {
      const value = phqResponses(answers[question.id], question.items.length);
      allControls.forEach((controls, itemIndex) => controls.forEach((control, score) => {
        control.checked = value[itemIndex] === score;
      }));
      const result = phqResult(value);
      clear.hidden = result.answered === 0;
      refreshQuestionActions(question);
      return updatePhqPanel(panel, result);
    }

    clear.addEventListener('click', () => {
      updateAnswer(question.id, phqResponses([], question.items.length), false);
      sync();
      allControls[0]?.[0]?.focus();
    });
    container.append(list, panel, actions);
    sync();
  }

  function financeMessage(result) {
    if (!financeNeedsAttention(result)) return '';
    const incomplete = result.missingPersonal.length ? '请补齐三项个人金额' : '';
    const invalid = result.invalidFields.length ? '修正标出的金额' : '';
    return [incomplete, invalid && (incomplete ? invalid : '请' + invalid)].filter(Boolean).join('，并') + '。也可以暂不做财务评估。';
  }

  function financeTotals(label, values) {
    if (!values) return '';
    return label + ' · 总资产 ' + yuanFormat.format(values.assets) + ' 元 · 负债 ' +
      yuanFormat.format(values.debt) + ' 元 · 净资产 ' + yuanFormat.format(values.net) + ' 元';
  }

  function financeControls(question, container) {
    container.classList.add('finance-fields');
    const inputs = new Map();
    const summary = document.createElement('div');
    summary.className = 'finance-assessment';
    summary.setAttribute('role', 'status');
    const personal = document.createElement('p');
    const household = document.createElement('p');
    summary.append(personal, household);

    for (const group of question.groups) {
      const fieldset = document.createElement('fieldset');
      fieldset.className = 'finance-group';
      const legend = document.createElement('legend');
      legend.textContent = group.title;
      const description = document.createElement('p');
      description.className = 'finance-group-description';
      description.textContent = group.description;
      const fields = document.createElement('div');
      fields.className = 'finance-group-fields';

      for (const field of question.fields.filter((item) => item.group === group.id)) {
        const row = document.createElement('div');
        row.className = 'finance-field';
        const label = document.createElement('label');
        const input = document.createElement('input');
        input.id = 'answer-' + question.id + '-' + field.id;
        input.name = field.id;
        input.type = 'text';
        input.inputMode = 'decimal';
        input.autocomplete = 'off';
        input.maxLength = 24;
        input.placeholder = '金额（元）';
        input.value = answers[question.id]?.[field.id] ?? '';
        label.htmlFor = input.id;
        label.textContent = field.title + (field.required ? '（评估必填）' : '');
        const hint = document.createElement('small');
        hint.id = input.id + '-hint';
        hint.textContent = field.placeholder;
        input.setAttribute('aria-describedby', hint.id);
        input.addEventListener('input', () => {
          const values = { ...answers[question.id] };
          if ((values[field.id] ?? '') === input.value) return;
          if (input.value.trim()) values[field.id] = input.value;
          else delete values[field.id];
          updateAnswer(question.id, values);
          sync();
        });
        inputs.set(field.id, { input, hint, detail: field.placeholder });
        row.append(label, input, hint);
        fields.append(row);
      }
      fieldset.append(legend, description, fields);
      container.append(fieldset);
    }

    const actions = document.createElement('div');
    actions.className = 'finance-actions';
    const clear = document.createElement('button');
    clear.type = 'button';
    clear.className = 'clear-answer';
    clear.textContent = '清空本页金额';
    const defer = document.createElement('button');
    defer.type = 'button';
    defer.className = 'button secondary';
    defer.textContent = '暂不做财务评估，继续整理';
    actions.append(defer, clear);

    function sync() {
      const result = financeResult(answers[question.id]);
      for (const [id, { input, hint, detail }] of inputs) {
        const invalid = result.invalidFields.includes(id);
        if (invalid) input.setAttribute('aria-invalid', 'true');
        else input.removeAttribute('aria-invalid');
        hint.textContent = invalid ? '请输入非负金额，最多两位小数，且小于 1 万亿元。' : detail;
      }
      personal.textContent = financeTotals('个人合计', result.personal) || '填齐三项个人金额后显示合计。';
      const householdStarted = question.fields.some((field) => field.group === 'household' && answers[question.id]?.[field.id]?.trim());
      household.textContent = result.personal && householdStarted
        ? financeTotals('家庭合计', result.household) || '家庭金额选填，三项填齐后显示家庭合计。' : '';
      clear.hidden = !result.started;
      defer.hidden = !financeFinishPending || !financeNeedsAttention(result);
      if (financeFinishPending) setError(financeMessage(result));
      refreshQuestionActions(question);
    }

    clear.addEventListener('click', () => {
      if (!window.confirm('要清空这一页已填的财务金额吗？')) return;
      for (const { input } of inputs.values()) input.value = '';
      updateAnswer(question.id, {});
      sync();
      inputs.values().next().value?.input.focus();
    });
    defer.addEventListener('click', () => {
      financeDeferred = true;
      finish();
    });
    container.append(summary, actions);
    sync();
  }

  function setJumpPanel(open) {
    jumpPanel.hidden = !open;
    jumpToggle.setAttribute('aria-expanded', String(open));
    if (open) questionPicker.focus();
  }

  function previewQuestion(number) {
    const question = questions[number - 1];
    if (!question) return;
    get('question-position').textContent = number + ' / ' + questions.length;
    questionProgress.value = number;
    questionJump.setAttribute('aria-valuetext', '第 ' + number + ' 题，共 ' + questions.length + ' 题 · ' + question.title);
  }

  function renderQuestion(focusTarget) {
    const question = questions[index];
    const heading = document.createElement('h2');
    heading.id = 'active-question-title';
    heading.className = 'question-title';
    heading.textContent = question.title;
    const hint = document.createElement('p');
    hint.id = 'active-question-hint';
    hint.className = 'question-hint';
    hint.textContent = question.hint ?? '';
    hint.hidden = !question.hint;
    const controls = document.createElement('div');
    controls.className = 'question-controls';
    if (question.type === 'record') recordControls(question, controls);
    else if (question.type === 'records') repeatableRecordControls(question, controls);
    else if (question.type === 'phq9') phqControls(question, controls);
    else if (question.type === 'finance') financeControls(question, controls);
    else if (question.type === 'budget') budgetControls(question, controls);
    else if (question.options) choiceControls(question, controls);
    else controls.append(textControl(question));
    content.replaceChildren(heading, hint, controls);
    get('question-module').textContent = [question.module.title, question.required ? '必填' : ''].filter(Boolean).join(' · ');
    questionJump.value = String(index + 1);
    questionPicker.value = String(index + 1);
    previewQuestion(index + 1);
    setJumpPanel(false);
    refreshQuestionActions(question);
    if (!financeFinishPending) setError('');
    showScreen('screen-form', focusTarget ?? heading);
  }

  function moduleButton(module, order) {
    const count = module.questions.filter((question) => answered(question)).length;
    const required = module.questions.filter((question) => question.required && !answered(question)).length;
    const total = module.questions.length;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'module-card';
    button.classList.toggle('is-pending', total === 0);
    button.classList.toggle('has-required', required > 0);
    button.classList.toggle('is-complete', total > 0 && count === total);
    button.setAttribute('aria-haspopup', 'dialog');
    button.dataset.moduleId = module.id;

    const number = document.createElement('span');
    number.className = 'chapter-order';
    number.textContent = String(order).padStart(2, '0');
    number.setAttribute('aria-hidden', 'true');
    const copy = document.createElement('span');
    copy.className = 'chapter-copy';
    const name = document.createElement('span');
    name.className = 'module-name';
    name.textContent = module.title;
    const description = document.createElement('span');
    description.className = 'module-description';
    description.textContent = module.description ?? '';
    copy.append(name, description);
    const progress = document.createElement('span');
    progress.className = 'chapter-progress';
    const detail = document.createElement('span');
    detail.className = 'module-status';
    detail.textContent = total === 0 ? '待补充' : required > 0 ? '还有 ' + required + ' 道必填'
      : count === total ? '已完成' : count + ' / ' + total + ' 已填';
    progress.append(detail);
    if (total > 0) {
      const meter = document.createElement('progress');
      meter.className = 'chapter-meter';
      meter.max = total;
      meter.value = count;
      meter.setAttribute('aria-hidden', 'true');
      progress.append(meter);
    }
    const arrow = document.createElement('span');
    arrow.className = 'chapter-arrow';
    arrow.setAttribute('aria-hidden', 'true');
    arrow.textContent = '→';
    button.append(number, copy, progress, arrow);
    button.addEventListener('click', () => openModule(module));
    return button;
  }

  function renderOverview() {
    const summary = get('overview-summary');
    summary.textContent = '已填写 ' + questions.filter((question) => answered(question)).length + ' / ' + questions.length + ' 题';
    let order = 0;
    const groups = chapterSections.filter((section) => section.modules.length > 0).map((section) => {
      const group = document.createElement('section');
      group.className = 'chapter-group';
      const heading = document.createElement('h2');
      heading.className = 'chapter-group-title';
      heading.textContent = section.title;
      const rows = document.createElement('div');
      rows.className = 'chapter-list';
      rows.append(...section.modules.map((module) => moduleButton(module, ++order)));
      group.append(heading, rows);
      return group;
    });
    get('module-grid').replaceChildren(...groups);
    showScreen('screen-form', summary);
  }

  function openModule(module) {
    get('module-title').textContent = module.title;
    get('module-description').textContent = module.description ?? '';
    const list = get('module-questions');
    if (!module.questions.length) {
      const message = document.createElement('p');
      message.textContent = '这一章的题目待补充。';
      list.replaceChildren(message);
    } else {
      list.replaceChildren(...module.questions.map((question) => {
        const target = questions.findIndex((item) => item.id === question.id);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'module-question';
        if (target === index) button.setAttribute('aria-current', 'true');
        const done = answered(question);
        button.classList.toggle('is-answered', done);
        button.classList.toggle('has-required', Boolean(question.required) && !done);

        const label = document.createElement('span');
        label.textContent = question.title;
        const detail = document.createElement('span');
        detail.className = 'module-question-status';
        const partial = question.type === 'phq9' ? phqResult(answers[question.id]).answered : 0;
        const partialFinance = question.type === 'finance' && financeResult(answers[question.id]).started;
        detail.textContent = done ? '已填写' : partial ? '已答 ' + partial + ' / 9 项'
          : partialFinance ? (financeDeferred ? '暂缓评估' : '待补充') : question.required ? '必填' : '选填';
        button.append(label, detail);
        button.addEventListener('click', () => {
          moduleDialog.close();
          showFlow('current', target);
        });
        return button;
      }));
    }
    if (module.id === 'personality') {
      const profile = demoExample ? null : draft?.answers[mbtiArchiveKey];
      const panel = document.createElement('section');
      panel.className = 'mbti-archive-panel';
      const heading = document.createElement('h3');
      heading.textContent = profile ? '归档结果 · ' + profile.type : '人格偏好小测';
      if (profile) {
        const summary = document.createElement('p');
        summary.className = 'mbti-archived-summary';
        summary.textContent = mbtiSummary(profile);
        panel.append(heading, summary);
      } else panel.append(heading);
      const entry = document.createElement('button');
      entry.type = 'button';
      entry.className = 'button secondary';
      entry.textContent = '打开偏好小测';
      entry.addEventListener('click', () => {
        moduleDialog.close();
        openMbti(() => {
          showFlow('overview');
          openModule(module);
        });
      });
      panel.append(entry);
      list.append(panel);
    }
    moduleDialog.showModal();
  }

  function showFlow(nextView, nextIndex = index, focusTarget) {
    view = nextView;
    index = nextIndex;
    const current = view === 'current';
    if (!current || questions[index] !== financeQuestion) financeFinishPending = false;
    get('current-view').hidden = !current;
    get('overview-view').hidden = current;
    get('current-tab').setAttribute('aria-pressed', String(current));
    get('overview-tab').setAttribute('aria-pressed', String(!current));
    persist();
    if (current) renderQuestion(focusTarget);
    else renderOverview();
  }

  function begin(initialAnswers = {}, options = {}) {
    demoExample = options.demoExample ?? null;
    answers = { ...initialAnswers };
    index = options.index ?? 0;
    view = options.view ?? 'current';
    savedReport = options.report ?? null;
    reportEdited = options.reportEdited === true;
    reportNeedsMbtiPanel = options.reportNeedsMbtiPanel === true;
    financeDeferred = options.financeDeferred === true;
    financeFinishPending = false;
    announce();
    if (options.reportView || demoExample) showReport();
    else showFlow(view, index);
  }

  function showReport() {
    if (savedReport === null) {
      savedReport = window.LifeBriefReport.buildReport(reportInputs());
      reportEdited = false;
      reportNeedsMbtiPanel = false;
    }
    reportText.value = savedReport;
    get('report-summary').textContent = demoExample
      ? demoExample.name + '的虚构示例。' + demoExample.outcome
      : '可以直接修改手记，也可以下载 Markdown 文件。';
    if (phqQuestion) {
      const result = phqResult(answers[phqQuestion.id]);
      const reportPhq = get('report-phq');
      reportPhq.hidden = result.answered === 0;
      if (result.answered > 0) {
        const panel = createPhqPanel();
        updatePhqPanel(panel, result);
        reportPhq.replaceChildren(panel);
      } else reportPhq.replaceChildren();
    }
    const profile = answers[mbtiArchiveKey];
    const reportArchive = get('report-mbti');
    reportArchive.hidden = !profile || !reportNeedsMbtiPanel;
    if (reportArchive.hidden) reportArchive.replaceChildren();
    else {
      const heading = document.createElement('h3');
      heading.textContent = '当前偏好归档 · ' + profile.type;
      const summary = document.createElement('p');
      summary.className = 'mbti-archived-summary';
      summary.textContent = mbtiSummary(profile);
      reportArchive.replaceChildren(heading, summary);
    }
    persist(true);
    showScreen('screen-report');
  }

  function reportInputs() {
    const inputs = { ...answers };
    if (phqQuestion) delete inputs[phqQuestion.id];
    if (financeQuestion && financeDeferred) delete inputs[financeQuestion.id];
    return inputs;
  }

  function showRequiredQuestion(target, message) {
    showFlow('current', target);
    setError(message);
    const control = content.querySelector('textarea, input');
    control?.setAttribute('aria-invalid', 'true');
    control?.focus();
  }

  function finish() {
    const missing = questions.findIndex((question) => question.required && !answered(question));
    if (missing !== -1) {
      showRequiredQuestion(missing, '整理手记前，请先填这一道必答题。');
      return;
    }
    if (financeQuestion && !financeDeferred) {
      const result = financeResult(answers[financeQuestion.id]);
      if (financeNeedsAttention(result)) {
        financeFinishPending = true;
        showFlow('current', questions.indexOf(financeQuestion));
        const field = result.invalidFields[0] ?? result.missingPersonal[0];
        get('answer-' + financeQuestion.id + '-' + field)?.focus();
        return;
      }
    }
    financeFinishPending = false;
    showReport();
  }

  function advance() {
    const question = questions[index];
    if (question.required && !answered(question)) {
      showRequiredQuestion(index, '这道题需要填写，写下一两句也可以。');
    } else if (index === questions.length - 1 || financeFinishPending) {
      finish();
    } else {
      showFlow('current', index + 1);
    }
  }

  function previous() {
    if (view === 'overview') showFlow('current');
    else if (index > 0) showFlow('current', index - 1);
    else showScreen('screen-intro');
  }

  function setupQuestionJump() {
    questionJump.max = String(questions.length);
    questionProgress.max = questions.length;
    let number = 0;
    for (const module of modules.filter((item) => item.questions.length)) {
      const group = document.createElement('optgroup');
      group.label = module.title;
      for (const question of module.questions) {
        const option = document.createElement('option');
        number += 1;
        option.value = String(number);
        option.textContent = number + ' · ' + question.title;
        group.append(option);
      }
      questionPicker.append(group);
    }
    questionJump.addEventListener('input', () => previewQuestion(Number(questionJump.value)));
    questionJump.addEventListener('change', () => {
      const target = Number(questionJump.value) - 1;
      if (target !== index && questions[target]) showFlow('current', target, false);
    });
    jumpToggle.addEventListener('click', () => setJumpPanel(jumpPanel.hidden));
    jumpPanel.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape') return;
      setJumpPanel(false);
      jumpToggle.focus();
    });
    get('jump-go').addEventListener('click', () => {
      const target = Number(questionPicker.value) - 1;
      if (questions[target]) showFlow('current', target);
    });
  }

  function copyWithSelection(text) {
    const previousFocus = document.activeElement;
    const buffer = document.createElement('textarea');
    buffer.value = text;
    buffer.setAttribute('readonly', '');
    buffer.style.cssText = 'position: fixed; left: -9999px; top: 0;';
    document.body.append(buffer);
    buffer.select();
    try {
      return document.execCommand('copy');
    } catch {
      return false;
    } finally {
      buffer.remove();
      previousFocus?.focus({ preventScroll: true });
    }
  }

  function showManualCopy(text) {
    const dialog = document.createElement('dialog');
    const heading = document.createElement('h2');
    heading.textContent = '手动复制提示词';
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.readOnly = true;
    textarea.rows = 12;
    textarea.setAttribute('aria-label', 'AI 提示词');
    const close = document.createElement('button');
    close.type = 'button';
    close.textContent = '关闭';
    close.addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove());
    dialog.append(heading, textarea, close);
    document.body.append(dialog);
    dialog.showModal();
    textarea.select();
  }

  async function copyText(text, isPrompt = false) {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      if (!copyWithSelection(text)) {
        if (isPrompt) showManualCopy(text);
        else {
          reportText.select();
          announce('手记已选中，可以手动复制。');
        }
        return;
      }
    }
    announce(isPrompt ? 'AI 提示词已复制。' : '手记已复制。');
  }

  function downloadReport() {
    const blob = new Blob([reportText.value], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = demoExample ? '生活折页-手记-示例.md' : '生活折页-手记.md';
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    announce('已发起 Markdown 下载。');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    advance();
  });
  get('start').addEventListener('click', () => begin(draft?.answers));
  get('continue-draft').addEventListener('click', () => {
    if (draft) begin(draft.answers, draft);
  });
  get('demo').addEventListener('click', focusExamples);
  get('open-mbti').addEventListener('click', () => openMbti(() => showScreen('screen-intro')));
  get('remove-mbti').addEventListener('click', removeMbti);
  get('home').addEventListener('click', () => {
    announce();
    showScreen('screen-intro');
  });
  get('flow-back').addEventListener('click', previous);
  get('back').addEventListener('click', previous);
  get('skip').addEventListener('click', advance);
  get('current-tab').addEventListener('click', () => {
    if (view !== 'current') showFlow('current');
  });
  get('overview-tab').addEventListener('click', () => {
    if (view !== 'overview') showFlow('overview');
  });
  get('submit-early').addEventListener('click', finish);
  get('module-close').addEventListener('click', () => moduleDialog.close());
  get('edit').addEventListener('click', () => showFlow('overview'));
  reportText.addEventListener('input', () => {
    savedReport = reportText.value;
    reportEdited = true;
    persist(true);
  });
  get('copy-report').addEventListener('click', () => copyText(reportText.value));
  get('copy-prompt').addEventListener('click', () => {
    const inputs = reportInputs();
    if (budgetQuestion) delete inputs[budgetQuestion.id];
    copyText(window.LifeBriefReport.buildPrompt(inputs), true);
  });
  get('download').addEventListener('click', downloadReport);
  get('reset').addEventListener('click', () => {
    if (!hasQuestionnaireDraft() || !window.confirm('确定要清除这台浏览器里的问卷回答和手记吗？')) return;
    if (!clearQuestionnaireDraft()) {
      announce('浏览器未能清除草稿。');
      return;
    }
    answers = {};
    savedReport = null;
    reportEdited = false;
    reportNeedsMbtiPanel = false;
    financeDeferred = false;
    financeFinishPending = false;
    announce('已清除本地草稿。');
    showScreen('screen-intro');
  });

  setupQuestionJump();
  renderExamples();
  announce();
  showScreen('screen-intro', false);
})();
