(() => {
  'use strict';

  const axes = [
    { key: 'ei', title: '思考与充电', letters: ['E', 'I'], ends: ['借交流展开', '先独自整理'] },
    { key: 'sn', title: '接收信息', letters: ['S', 'N'], ends: ['具体线索', '关联与可能'] },
    { key: 'tf', title: '衡量选择', letters: ['T', 'F'], ends: ['一致标准', '人的处境'] },
    { key: 'jp', title: '安排节奏', letters: ['J', 'P'], ends: ['先定安排', '保留弹性'] },
  ];

  const questions = [
    ['ei', 1, '碰到还没想清楚的问题，我常在和人边聊边想时找到切入点。'],
    ['sn', 1, '接手新任务时，我通常先找一个具体例子，照着它理解要求。'],
    ['tf', 1, '比较两个可行方案时，我习惯先定一套对两边都适用的标准。'],
    ['jp', 1, '知道周末有几件事要办时，我倾向于提前排出大致顺序。'],
    ['ei', -1, '参加完一场信息密集的多人活动，我通常想先自己消化一会儿。'],
    ['sn', -1, '读完几段看似无关的材料，我会先想它们背后有没有共同的模式。'],
    ['tf', -1, '几个做法都可行时，我会先了解受影响的人各自最看重什么。'],
    ['jp', -1, '为接下来一周留几个可以临时决定做什么的时段，会让我更自在。'],
    ['ei', 1, '想法只有一个雏形时，我愿意先讲给别人听，在问答里把它补全。'],
    ['sn', 1, '听人讲一段经历时，我最容易记住的是当时发生的具体细节。'],
    ['tf', 1, '给一份工作提反馈时，我先对照双方原先约定的目标。'],
    ['jp', 1, '开始一项持续几天的任务前，先划出几个检查进度的节点会让我踏实。'],
    ['ei', -1, '别人问我对新点子的看法时，我喜欢先把自己的思路在纸上写几行。'],
    ['sn', -1, '听到一种新做法时，我常会想到它还能用在哪些不同场景。'],
    ['tf', -1, '给建议时，我会根据对方此刻的处境调整最先讨论的重点。'],
    ['jp', -1, '做一项有探索余地的任务时，我更愿意先试几种做法，再确定路线。'],
    ['ei', 1, '有一个空闲下午时，约熟悉的人一起做点事常能让我恢复活力。'],
    ['sn', 1, '需要作判断时，我会先确认目前有哪些可以核实的观察。'],
    ['tf', 1, '复盘一个不如预期的决定时，我先检查当时的推理哪里站不住脚。'],
    ['jp', 1, '几件事都悬而未决时，先定下一两件的做法会让我更容易集中。'],
    ['ei', -1, '一天的交流很多时，留一段不必回应任何人的时间对我很有帮助。'],
    ['sn', -1, '遇到一个细节时，我经常自然地联想到它可能指向的整体趋势。'],
    ['tf', -1, '团队意见分歧时，我倾向于先弄清每个人在努力保护什么。'],
    ['jp', -1, '有新信息还在陆续出现时，我倾向于晚一点再敲定可调整的安排。'],
  ];

  const choices = ['很不符合', '不太符合', '介于两者之间', '比较符合', '很符合'];
  const pageSize = 6;
  const pageCount = questions.length / pageSize;

  function normalizeProfile(raw) {
    if (!raw || typeof raw !== 'object' || typeof raw.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(raw.date)) return null;
    const date = new Date(raw.date + 'T00:00:00Z');
    if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== raw.date || raw.date.startsWith('0000')) return null;

    const profile = { type: '', date: raw.date };
    for (const { key, letters: [left, right] } of axes) {
      if (typeof raw[key] !== 'string') return null;
      const match = raw[key].match(new RegExp('^' + left + ' (\\d{1,3})% · ' + right + ' (\\d{1,3})%$'));
      if (!match) return null;
      const first = Number(match[1]);
      const second = Number(match[2]);
      if (first + second !== 100) return null;
      profile[key] = `${left} ${first}% · ${right} ${second}%`;
      profile.type += first === second ? 'X' : first > second ? left : right;
    }
    return raw.type === profile.type ? profile : null;
  }

  function score(answers) {
    const totals = { ei: 0, sn: 0, tf: 0, jp: 0 };
    questions.forEach(([key, direction], index) => {
      totals[key] += (answers[index] - 2) * direction;
    });

    const now = new Date();
    const profile = {
      type: '',
      date: [now.getFullYear(), now.getMonth() + 1, now.getDate()].map((value, index) => String(value).padStart(index === 0 ? 4 : 2, '0')).join('-'),
    };
    const dimensions = axes.map((axis) => {
      const [left, right] = axis.letters;
      const total = totals[axis.key];
      const first = Math.round((total + 12) * 100 / 24);
      const favored = total === 0 ? -1 : total > 0 ? 0 : 1;
      profile.type += favored < 0 ? 'X' : axis.letters[favored];
      profile[axis.key] = `${left} ${first}% · ${right} ${100 - first}%`;
      return { ...axis, first, favored, close: Math.abs(total) <= 2 };
    });
    return { profile, dimensions };
  }

  function element(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }

  function button(text, className, action) {
    const node = element('button', 'button ' + className, text);
    node.type = action ? 'button' : 'submit';
    if (action) node.addEventListener('click', action);
    return node;
  }

  function mount({ onBack, onSave }) {
    const content = document.getElementById('mbti-content');
    let answers = Array(questions.length).fill(null);
    let view = 'intro';
    let page = 0;
    let result = null;
    let saved = false;

    function heading(text) {
      const title = element('h1', 'mbti-title', text);
      title.tabIndex = -1;
      return title;
    }

    function display(section, title) {
      content.replaceChildren(section);
      title.focus({ preventScroll: true });
      window.scrollTo(0, 0);
    }

    function renderIntro() {
      const section = element('section', 'mbti-intro');
      const title = heading('MBTI 风格偏好自测');
      const lead = element('p', 'mbti-lead', '用 24 个日常场景，看看你在思考、接收信息、衡量选择和安排节奏时，更常采用哪些做法。');
      const facts = element('p', 'mbti-facts', '约 5 分钟 · 独立填写 · 可选择将结果加入档案');
      const note = element('p', 'mbti-note', '这是生活折页自编的偏好练习，借用 MBTI 的四个维度，采用自编题目和计分。');
      const actions = element('div', 'mbti-actions');
      const started = answers.some((answer) => answer !== null);
      actions.append(
        button(started ? '继续自测' : '开始自测', 'primary', () => {
          view = 'questions';
          renderQuestions();
        }),
        button('返回生活折页', 'quiet mbti-back', onBack),
      );
      section.append(title, lead, facts, note, actions);
      display(section, title);
    }

    function renderQuestions() {
      const form = element('form', 'mbti-form');
      const title = heading(`你的日常偏好 · 第 ${page + 1} 组`);
      const progress = element('progress', 'mbti-progress');
      progress.max = pageCount;
      progress.value = page + 1;
      progress.setAttribute('aria-label', `自测进度，第 ${page + 1} 组，共 ${pageCount} 组`);
      const lead = element('p', 'mbti-lead', '根据多数时候的真实做法选择。拿不准，或做法随场景而变时，可以选中间项。');
      const list = element('div', 'mbti-items');
      const error = element('p', 'mbti-error');
      error.setAttribute('role', 'alert');
      error.hidden = true;
      const start = page * pageSize;
      const end = start + pageSize;

      for (let index = start; index < end; index++) {
        const item = element('fieldset', 'mbti-item');
        const legend = element('legend', '', `${index + 1}. ${questions[index][2]}`);
        const scale = element('div', 'mbti-scale');
        choices.forEach((label, value) => {
          const option = element('label', 'mbti-option');
          const input = element('input');
          input.type = 'radio';
          input.name = `mbti-${index + 1}`;
          input.id = `mbti-${index + 1}-${value}`;
          input.value = String(value);
          input.checked = answers[index] === value;
          input.addEventListener('change', () => {
            answers[index] = value;
            if (!answers.slice(start, end).includes(null)) error.hidden = true;
          });
          option.append(input, element('span', '', label));
          scale.append(option);
        });
        item.append(legend, scale);
        list.append(item);
      }

      const actions = element('div', 'mbti-actions');
      actions.append(
        button(page === 0 ? '返回说明' : '上一组', 'secondary', () => {
          if (page === 0) {
            view = 'intro';
            renderIntro();
          } else {
            page--;
            renderQuestions();
          }
        }),
        button(page + 1 === pageCount ? '查看结果' : '下一组', 'primary'),
        button('返回生活折页', 'quiet mbti-back', onBack),
      );

      form.addEventListener('submit', (event) => {
        event.preventDefault();
        const missing = answers.indexOf(null, start);
        if (missing >= start && missing < end) {
          error.textContent = `请先回答第 ${missing + 1} 题。`;
          error.hidden = false;
          list.children[missing - start].querySelector('input').focus();
          return;
        }
        if (page + 1 < pageCount) {
          page++;
          renderQuestions();
          return;
        }
        result = score(answers);
        view = 'result';
        renderResult();
      });

      form.append(title, progress, lead, list, error, actions);
      display(form, title);
    }

    function renderResult() {
      const section = element('section', 'mbti-result');
      const title = heading('这次的偏好倾向');
      const type = element('p', 'mbti-type', result.profile.type);
      const intro = element('p', 'mbti-lead', '字母取自各维度中得分较高的一侧。出现 X 时，该维度两侧同分。');
      const list = element('div', 'mbti-dimensions');
      for (const dimension of result.dimensions) {
        const { title: label, letters, ends, first, favored, close } = dimension;
        const item = element('section', 'mbti-dimension');
        const pair = element('div', 'mbti-pair');
        pair.append(element('span', '', `${letters[0]} ${ends[0]} · ${first}%`), element('span', '', `${100 - first}% · ${letters[1]} ${ends[1]}`));
        const bar = element('div', 'mbti-bar');
        bar.setAttribute('aria-hidden', 'true');
        const fill = element('span');
        fill.style.width = `${first}%`;
        bar.append(fill);
        const text = favored < 0 ? '两侧同分，暂记为 X。' : close ? `两侧接近，这次略偏向「${ends[favored]}」。` : `这次作答更偏向「${ends[favored]}」。`;
        const interpretation = element('p', 'mbti-interpretation', text);
        item.append(element('h2', '', label), pair, bar, interpretation);
        list.append(item);
      }

      const actions = element('div', 'mbti-actions');
      const status = element('p', 'mbti-save-status', saved ? '已加入生活折页档案。' : '加入档案时仅保存类型、四维得分和日期。');
      status.setAttribute('role', 'status');
      const save = button(saved ? '已加入档案' : '加入折页档案', 'primary', () => {
        if (onSave(result.profile) === false) {
          status.textContent = '当前浏览器未能保存到档案，可以再试一次。';
          return;
        }
        saved = true;
        save.disabled = true;
        save.textContent = '已加入档案';
        status.textContent = '已加入生活折页档案。';
      });
      save.disabled = saved;
      actions.append(save, button('重新自测', 'secondary', () => {
        answers = Array(questions.length).fill(null);
        view = 'intro';
        page = 0;
        result = null;
        saved = false;
        renderIntro();
      }), button('返回生活折页', 'quiet mbti-back', onBack));
      const note = element('p', 'mbti-note', '百分比是这 24 道题内部的相对得分。你也可以看看，哪一侧更贴近工作时的自己，哪一侧更贴近休息时的自己。');
      section.append(title, type, intro, list, note, actions, status);
      display(section, title);
    }

    return {
      open(archivedProfile = null) {
        if (view === 'result') {
          const archived = normalizeProfile(archivedProfile);
          saved = Boolean(archived && Object.keys(result.profile).every((key) => archived[key] === result.profile[key]));
          renderResult();
        } else if (view === 'questions') renderQuestions();
        else renderIntro();
      },
    };
  }

  window.LifeBriefMBTI = { mount, normalizeProfile };
})();
