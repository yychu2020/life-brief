(function () {
  'use strict';

  const traits = [
    ['openness', '开放性'],
    ['conscientiousness', '尽责性'],
    ['extraversion', '外向性'],
    ['agreeableness', '宜人性'],
    ['neuroticism', '神经质'],
  ];
  const horizons = ['2 周', '30 天', '90 天'];
  const reflectionStyles = {
    '对话式追问': '回看时先回答一个问题：如果这周只能理清一件事，知道什么会最有帮助？',
    '结构化分析': '把回顾分成三栏：已经知道的事实、还需验证的判断、下一次验证动作。',
    '叙事式回顾': '选一个印象最深的时刻，用几句话写下当时发生了什么、你怎么应对、下次想怎么做。',
  };
  const observationReadiness = ['还想先弄清情况', '想改变，但还没有准备好开始', '暂时说不清'];
  const detailSections = [
    {
      title: '反应的线索',
      prompt: true,
      fields: [['patternScene', '容易出现反应的情境'], ['patternResponse', '当时的应对及其影响'], ['patternExperiment', '下次想试的做法']],
    },
    {
      title: '支持与界限',
      prompt: true,
      fields: [['relationshipSupport', '可以借力的支持'], ['relationshipBoundary', '想守住的界限'], ['relationshipAsk', '想提出的请求']],
    },
    {
      title: '可迁移的本事',
      prompt: true,
      fields: [['skillStory', '曾经做成的事'], ['skillTransfer', '现在能借用的经验'], ['skillPractice', '想练熟的动作']],
    },
    {
      title: '选择时的取舍',
      prompt: true,
      fields: [['valueTradeoff', '面对的取舍'], ['concern', '在意的风险或顾虑'], ['valueSafeguard', '希望保住的原则或承诺']],
    },
    {
      title: '留出财务余量',
      fields: [['financialPressure', '影响决定的财务不确定性'], ['financialBuffer', '可以留出的余量'], ['financialRule', '决定前想遵守的财务规则']],
    },
    {
      title: '给尝试留后路',
      prompt: true,
      fields: [['riskReversibility', '目前做法的可撤回程度'], ['riskStopSignal', '该暂停或退出的信号'], ['riskTest', '可以先做的小试验']],
    },
    {
      title: '重看过去的决定',
      prompt: true,
      fields: [['pastChoice', '想回看的决定'], ['pastContext', '当时的条件和信息'], ['pastLesson', '现在能借用的经验']],
    },
    {
      title: '补一页背景',
      fields: [['additionalEvidence', '想补充的背景'], ['openQuestion', '还想弄清的问题'], ['outputBoundary', '这次先搁置的事项']],
    },
    {
      title: '我怎样运转',
      prompt: true,
      fields: [['energyContext', '找回状态的方式'], ['decisionMode', '做决定时的习惯'], ['workConditions', '更能发挥的条件']],
    },
  ];
  const actionIdeas = [
    ['riskTest', '给尝试留后路', '小试验'],
    ['patternExperiment', '反应的线索', '下次想试的做法'],
    ['relationshipAsk', '支持与界限', '想提出的请求'],
    ['skillPractice', '可迁移的本事', '想练熟的动作'],
  ];
  const supportContextFields = [
    ['relationship', '关系'], ['supportType', '可能提供的支持'], ['strength', '预计支持程度'],
  ];
  const supportFields = [
    ['person', '称呼或代号'], ...supportContextFields, ['availability', '方便联系的方式或时间'], ['ask', '可以提出的具体请求'],
  ];
  const skillFields = [
    ['skill', '技能名称'], ['category', '类别'], ['level', '当前程度'], ['evidence', '经历或产出'],
    ['transfer', '可迁移的用途'], ['aiCollaboration', '与 AI 协作的分工'],
  ];
  const yuan = new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 2 });

  function answer(value) {
    return typeof value === 'string' ? value.trim().replace(/\r\n?/g, '\n') : '';
  }

  function selected(value, other) {
    const choice = answer(value);
    const detail = answer(other);
    return choice === '其他' && detail ? `其他（${detail}）` : choice;
  }

  function choices(answers, key) {
    const value = answers[key];
    const items = Array.isArray(value) ? value : [value];
    return [...new Set(items.map((item) => selected(item, answers[`${key}Other`])).filter(Boolean))];
  }

  function questionnaire(answers) {
    const single = (key) => selected(answers[key], answers[`${key}Other`]);
    return {
      lifeStage: single('lifeStage'),
      gender: single('gender'),
      livingContext: single('livingContext'),
      readiness: single('readiness'),
      style: single('style'),
      midGoal: single('midGoal'),
      longGoal: single('longGoal'),
      priority: single('priority'),
      timeBudget: single('timeBudget'),
      moneyBudget: single('moneyBudget'),
      care: choices(answers, 'care'),
      obstacles: choices(answers, 'obstacles'),
    };
  }

  function lifeEvents(answers) {
    const events = [];
    for (let index = 1; index <= 5; index += 1) {
      const event = answers[`lifeEvent${index}`];
      if (!event || typeof event !== 'object') continue;

      const fields = [
        ['时间', answer(event.time)],
        ['类别', selected(event.category, event.categoryOther)],
        ['事件标题', answer(event.title)],
        ['发生了什么', answer(event.description)],
        ['当时的感受', selected(event.feeling, event.feelingOther)],
        ['我感受到的后续影响', answer(event.impact)],
      ].filter(([, value]) => value);
      if (fields.length) events.push({ index, fields });
    }
    return events;
  }

  function addedDetails(answers) {
    return detailSections.flatMap(({ title, fields, prompt }) => {
      const entries = fields.map(([id, label]) => [label, selected(answers[id], answers[`${id}Other`])])
        .filter(([, value]) => value);
      return entries.length ? [{ title, entries, prompt }] : [];
    });
  }

  function profileEntries(answers, forPrompt = false) {
    const personal = answers.personalProfile ?? {};
    const work = answers.workProfile ?? {};
    const dailyLife = [
      ['现在承担的角色', answer(personal.roles)],
      ['与眼下有关的学习或经历', answer(personal.background)],
    ];
    if (!forPrompt) {
      dailyLife.push(
        ['平常一周的节奏', answer(personal.dailyRhythm)],
        ['需要留出时间的固定安排', answer(personal.commitments)],
        ['想留给自己的时间', answer(personal.spaceToKeep)],
      );
    }
    return [
      ['日常生活', dailyLife],
      ['工作与学习', [
        ['目前的状态', selected(work.status, work.statusOther)],
        ['行业或研究方向', answer(work.field)],
        ['岗位、分工或学习阶段', answer(work.role)],
        ['平时主要负责的事', answer(work.responsibilities)],
        ['最近在推进的事', answer(work.projects)],
        ['和别人配合的方式', answer(work.collaboration)],
        ['希望得到的支持', answer(work.support)],
      ]],
    ].map(([title, fields]) => [title, fields.filter(([, value]) => value)]);
  }

  function periodReviewEntries(review) {
    if (!review || typeof review !== 'object') return [];
    return [
      ['回顾的时间段', answer(review.period)],
      ['当初想做到的事', answer(review.intention)],
      ['实际发生的变化', answer(review.actual)],
      ['看得见的进展或证据', answer(review.evidence)],
      ['从这段经历学到的事', answer(review.lesson)],
      ['下一步想试的做法', answer(review.next)],
    ].filter(([, value]) => value);
  }

  function records(value, fields, includeDetails = true) {
    if (!Array.isArray(value)) return [];
    return value.flatMap((row) => {
      if (!row || typeof row !== 'object') return [];
      const record = Object.fromEntries(fields.map(([id]) => [
        id, selected(row[id], includeDetails ? row[`${id}Other`] : ''),
      ]));
      return Object.values(record).some(Boolean) ? [record] : [];
    });
  }

  function recordEntries(record, fields) {
    return fields.map(([id, label]) => [label, record[id]]).filter(([, value]) => value);
  }

  function appendSupportNetwork(sections, support) {
    if (!support.length) return;
    sections.push('## 支持网络');
    support.forEach((record, index) => appendAnswers(sections, `### 支持对象 ${index + 1}`, recordEntries(record, supportFields)));
  }

  function appendSkillsInventory(sections, skills) {
    if (!skills.length) return;
    const categories = new Map();
    const named = skills.filter((record) => record.skill);
    for (const record of named) {
      const category = record.category || '待选类别';
      categories.set(category, (categories.get(category) ?? 0) + 1);
    }
    const groupCounts = Array.from(categories, ([category, count]) => `${markdownLiteral(category.replace(/\s+/g, ' '))} ${count} 项`);
    const transferCount = skills.filter((record) => record.transfer).length;
    const summary = [`已写明名称的技能 ${named.length} 项。`];
    if (groupCounts.length) summary.push(`按类别分布为 ${groupCounts.join('、')}。`);
    if (transferCount) summary.push(`写下了 ${transferCount} 条可迁移的用途。`);
    sections.push('## 技能清单', summary.join(''));
    skills.forEach((record, index) => appendAnswers(sections, `### 技能 ${index + 1}`, recordEntries(record, skillFields)));
  }

  function formatYuan(amount) {
    return `${yuan.format(amount)} 元`;
  }

  function appendFinancialSnapshot(sections, snapshot) {
    const finance = window.LifeBriefFinance;
    const totals = finance?.evaluate(snapshot);
    if (!totals?.personal) return;

    sections.push('## 财务快照');
    for (const [scope, title] of [['personal', '个人'], ['household', '家庭']]) {
      const balances = [
        ['存款', finance.parseAmount(snapshot[`${scope}Savings`])],
        ['负债', finance.parseAmount(snapshot[`${scope}Debt`])],
        ['其他资产', finance.parseAmount(snapshot[`${scope}Assets`])],
      ];
      if (totals[scope]) {
        balances.push(['资产合计（存款加其他资产）', totals[scope].assets], ['净资产', totals[scope].net]);
      }
      const lines = balances.filter(([, value]) => value !== null)
        .map(([label, value]) => `- ${label} ${formatYuan(value)}`);
      if (lines.length) sections.push(`### ${title}`, lines.join('\n'));
    }
  }

  function appendMonthlyBudget(sections, value) {
    const summary = window.LifeBriefBudget?.summarize(value);
    if (!summary?.months.length) return;

    const totals = [['income', '收入合计'], ['total', '已记支出合计'], ['net', '净现金流合计']];
    const totalLines = totals.filter(([id]) => summary[id] !== null)
      .map(([id, label]) => `- ${label} ${formatYuan(summary.exact[id])}`);
    sections.push('## 每月收支');
    if (totalLines.length) sections.push(totalLines.join('\n'));
    const rows = summary.months.map(({ month, income, total, net }) => {
      const amounts = [income, total, net].map((amount) => amount === null ? '—' : formatYuan(amount));
      return `| ${month} | ${amounts.join(' | ')} |`;
    });
    sections.push([
      '| 月份 | 已记收入 | 已记支出 | 净现金流 |',
      '| --- | ---: | ---: | ---: |',
      ...rows,
    ].join('\n'));
    sections.push('支出合计取已填写的项目。收入和各项支出都填齐的月份会显示净现金流。');
    if (summary.excluded) sections.push(`另有 ${summary.excluded} 条待核对的月份记录。`);
  }

  function shortTermLabel(answers) {
    return horizons.includes(answers.horizon) ? `未来 ${answers.horizon}` : '未来 3 个月';
  }

  function oceanScores(answers) {
    return traits.flatMap(([key, label]) => {
      const raw = answer(String(answers[key] ?? ''));
      const score = Number(raw);
      return raw && Number.isFinite(score) && score >= 0 && score <= 100
        ? [[label, score]]
        : [];
    });
  }

  function appendMbtiProfile(sections, rawProfile) {
    const profile = window.LifeBriefMBTI?.normalizeProfile(rawProfile);
    if (!profile) return;

    const dimensions = [
      ['思考与充电', profile.ei],
      ['接收信息', profile.sn],
      ['衡量选择', profile.tf],
      ['安排节奏', profile.jp],
    ];
    sections.push(
      '## MBTI 风格偏好自评',
      `**${profile.type}** · ${profile.date}`,
      dimensions.map(([label, value]) => `- ${label} · ${value}`).join('\n'),
      '本工具根据自编题目汇总作答，记录你在作答时表达的偏好。百分比反映各维度两端的得分。',
    );
    if (profile.type.includes('X')) sections.push('X 表示这一维度的两端得分相同。');
  }

  function markdownLiteral(value) {
    return value.replace(/[\\`*_{}\[\]<>#~|&]/g, '\\$&');
  }

  function quote(value) {
    return value.split('\n').map((line) => {
      const literal = markdownLiteral(line.trim())
        .replace(/^([-+])(?=\s)/, '\\$1')
        .replace(/^(\d+)([.)])(?=\s)/, '$1\\$2');
      return literal ? `> ${literal}` : '>';
    }).join('\n');
  }

  function appendAnswers(sections, title, fields) {
    const entries = fields.flatMap(([label, value]) => {
      const content = Array.isArray(value) ? value.join('、') : answer(value);
      return content ? [`**${label}**\n\n${quote(content)}`] : [];
    });
    if (entries.length) sections.push(title, ...entries);
  }

  function initialAction(answers, current, skills) {
    if (current.timeBudget === '暂时没有可支配时间') {
      return '**先保留一个观察点**\n\n从现状里挑出一个想看清的情境。等有可支配的时间时，再记录一次实际发生的经过。';
    }
    if (observationReadiness.includes(current.readiness)) {
      return '**先把问题说具体**\n\n从你写下的现状里挑一个具体时刻，记下发生了什么、最希望有什么变化，以及还需要了解什么。';
    }
    if (current.readiness === '已经在行动，想检查或调整方向') {
      return '**回顾一次已经做过的尝试**\n\n记下当时做了什么、产生了什么结果，以及下次只想调整的一件事。';
    }

    const duration = ['有一些，但不到 1 小时', '每周差异较大，暂不确定'].includes(current.timeBudget)
      ? '5–10 分钟'
      : '10–20 分钟';
    if (answer(answers.firstStep)) {
      return `**选个时段开始第一步**\n\n给上面写下的第一步选一个具体时段。时间有限时，挑其中 ${duration}能做完的部分。`;
    }
    const idea = actionIdeas.find(([id]) => answer(answers[id]));
    if (idea) {
      const [, section, label] = idea;
      return `**用上你已经想到的做法**\n\n从「${section}」里写下的${label}开始。给准备或尝试留出 ${duration}，结束时记下一条观察。`;
    }
    if (answer(answers.periodReview?.next)) {
      return `**接着阶段回顾往前走一步**\n\n如果回顾里写下的下一步仍符合眼下的优先事项，给它留出 ${duration}。做完记下一条能在下次回顾时对照的变化。`;
    }
    if (skills.some((record) => record.transfer)) {
      return `**把一项技能用到新场景**\n\n从技能清单选一个与眼下目标有关的用途。用 ${duration}试其中一步，记下什么做法可以沿用，什么需要调整。`;
    }
    if (!answer(answers.goal) && !current.midGoal && !current.longGoal) {
      return '**先找出想改变的一件事**\n\n从现状或优先领域中挑出一件你想进一步弄清的事。写下它发生过的一次具体情境，以及你希望下次有什么不同。';
    }
    return `**选一个小动作**\n\n从最想推进的方向里拆出一件 ${duration}能做完的事。写下什么时候做，以及做完后能留下什么。`;
  }

  function buildReport(answers = {}) {
    const current = questionnaire(answers);
    const name = answer(answers.name).replace(/\s+/g, ' ');
    const title = name ? `${markdownLiteral(name)}的生活折页` : '我的生活折页';
    const sections = [`# ${title}`];
    appendAnswers(sections, '## 我现在在哪里', [
      ['人生阶段', current.lifeStage],
      ['性别', current.gender],
      ['生活背景', current.livingContext],
      ['眼下的状态', answers.situation],
      ['最想理清的事', answers.challenge],
      ['对行动的准备', current.readiness],
      ['做得顺手的事', answers.strength],
      ['想守住的东西', answers.values],
      ['能借力的人和资源', answers.resources],
    ]);

    for (const [title, fields] of profileEntries(answers)) {
      appendAnswers(sections, `## ${title}`, fields);
    }

    const timeline = lifeEvents(answers);
    if (timeline.length) {
      sections.push('## 生平时间线');
      for (const { index, fields } of timeline) {
        appendAnswers(sections, `### 事件 ${index}`, fields);
      }
    }
    appendAnswers(sections, '## 阶段回顾', periodReviewEntries(answers.periodReview));
    const healthLimit = answer(answers.healthLimit);
    appendAnswers(sections, '## 健康背景', [
      ['睡眠', answers.sleep],
      ['活动情况', answers.activity],
      ['需考虑的长期健康状况', healthLimit],
      ['对日常安排的影响', ['有（可补充）', '其他'].includes(healthLimit) ? answers.healthLimitOther : ''],
    ]);

    appendAnswers(sections, '## 我想走向哪里', [
      [shortTermLabel(answers), answers.goal],
      ['未来 1–3 年', current.midGoal],
      ['三年以上', current.longGoal],
      ['现阶段的优先事项', current.priority],
    ]);
    if (answer(answers.goal) || current.midGoal || current.longGoal) {
      sections.push('**给眼下想推进的目标加一个验收标准**\n\n到期时，我能看到或交付的一个具体结果是……');
    }

    const obstacles = [...new Set([...current.obstacles, answer(answers.obstacle)].filter(Boolean))];
    const resources = answer(answers.resources);
    appendAnswers(sections, '## 制订计划时要考虑的条件', [
      ['每周可投入的时间', current.timeBudget],
      ['可接受的支出', current.moneyBudget],
      ['需要安排时间的照护责任', current.care],
      ['可能遇到的阻碍', obstacles],
      ['希望怎样梳理', current.style],
      ['我想到的第一步', answers.firstStep],
    ]);

    for (const { title, entries } of addedDetails(answers)) {
      appendAnswers(sections, `## ${title}`, entries);
    }
    const support = records(answers.supportNetwork, supportFields);
    const skills = records(answers.skillsInventory, skillFields);
    appendSupportNetwork(sections, support);
    appendSkillsInventory(sections, skills);
    appendFinancialSnapshot(sections, answers.financialSnapshot);
    appendMonthlyBudget(sections, answers.monthlyBudget);

    sections.push('## 接下来 7 天');
    sections.push(initialAction(answers, current, skills));
    if (answer(answers.outputBoundary)) {
      sections.push('**照顾这次的范围**\n\n挑选本周行动时，先回看你在「补一页背景」里写下的暂缓事项。');
    }
    if (current.timeBudget !== '暂时没有可支配时间' && !observationReadiness.includes(current.readiness)) {
      if (resources) {
        sections.push('**用上一个已有资源**\n\n从前面写下的资源里挑一样。需要别人协助时，把请求缩成一句具体的问题。');
      } else if (support.some((record) => record.ask)) {
        sections.push('**提出一个具体请求**\n\n从支持网络挑一条和眼下任务有关的请求，先和对方确认是否方便。');
      }
      if (current.moneyBudget === '只考虑免费方案') {
        sections.push('**把起步成本控制在零**\n\n用手边已有的工具、资料或可免费获取的帮助做第一次尝试。');
      } else if (answer(answers.financialRule)) {
        sections.push('**用自己的规则检查支出**\n\n如果这一步需要花钱，先拿你在「留出财务余量」里写下的规则检查一遍。');
      }
      if (answer(answers.riskStopSignal)) {
        sections.push('**把暂停条件写在行动旁边**\n\n用你在「给尝试留后路」里写下的信号检查这次尝试。看到这个信号时，暂停并决定是否调整。');
      } else if (obstacles.some((obstacle) => obstacle !== '暂时没有明显限制')) {
        sections.push('**提前留一个备选做法**\n\n从上面的阻碍中挑出最可能遇到的一项。写下它出现时还能做的一个小动作，以及何时再决定要不要继续。');
      }
    }
    const review = Object.hasOwn(reflectionStyles, current.style)
      ? reflectionStyles[current.style]
      : '记下一项观察或变化，以及一个还想弄清的问题。';
    const hasCare = current.care.some((item) => !['没有固定照护责任', '不愿回答'].includes(item));
    const reviewChecks = [review];
    if (hasCare) reviewChecks.push('回看这个做法能否和已有的照护安排共存。');
    if (answer(answers.values) || answer(answers.valueSafeguard)) {
      reviewChecks.push('挑出一项你想守住的东西，看看这一步有没有顾及它。');
    } else if (answer(answers.pastLesson)) {
      reviewChecks.push('对照你从过去决定中留下的经验，看看这次有哪一条仍然适用。');
    }
    const reviewTitle = current.timeBudget === '暂时没有可支配时间' ? '有空时回看' : '第 7 天 · 回看并决定下一步';
    sections.push(`**${reviewTitle}**\n\n${reviewChecks.join('\n\n')}`);

    appendMbtiProfile(sections, answers.mbtiProfile);
    const scores = oceanScores(answers);
    if (scores.length) {
      sections.push('## 大五人格测评记录');
      sections.push(scores.map(([label, score]) => `- ${label} ${score}/100`).join('\n'));
    }
    return `${sections.join('\n\n')}\n`;
  }

  function buildPrompt(answers = {}) {
    const current = questionnaire(answers);
    const inputs = Object.fromEntries([
      ['人生阶段', current.lifeStage],
      ['性别', current.gender],
      ['生活背景', current.livingContext],
      ['眼下的状态', answer(answers.situation)],
      ['最想理清的事', answer(answers.challenge)],
      ['对行动的准备', current.readiness],
      ['希望怎样梳理', current.style],
      ['做得顺手的事', answer(answers.strength)],
      ['想守住的东西', answer(answers.values)],
      ['能借力的人和资源', answer(answers.resources)],
      [`${shortTermLabel(answers)}希望看到的变化`, answer(answers.goal)],
      ['未来 1–3 年希望看到的变化', current.midGoal],
      ['三年以上想投入或守住的事', current.longGoal],
      ['现阶段的优先事项', current.priority],
      ['每周可投入的时间', current.timeBudget],
      ['可接受的支出', answer(answers.moneyBudget)],
      ['需要安排时间的照护责任', current.care],
      ['我想到的第一步', answer(answers.firstStep)],
      ['可能遇到的阻碍', [...new Set([...current.obstacles, answer(answers.obstacle)].filter(Boolean))]],
    ].filter(([, value]) => value.length));
    for (const [title, fields] of profileEntries(answers, true)) {
      if (fields.length) inputs[title] = Object.fromEntries(fields);
    }
    const scores = oceanScores(answers);
    if (scores.length) inputs['自报大五人格分数（满分 100）'] = Object.fromEntries(scores);
    const timeline = lifeEvents(answers);
    if (timeline.length) inputs['生平时间线'] = timeline.map(({ fields }) => Object.fromEntries(fields));
    const review = periodReviewEntries(answers.periodReview);
    if (review.length) inputs['阶段回顾'] = Object.fromEntries(review);
    const support = records(answers.supportNetwork, supportContextFields, false);
    if (support.length) inputs['支持网络'] = support.map((record) => Object.fromEntries(recordEntries(record, supportContextFields)));
    const skills = records(answers.skillsInventory, skillFields);
    if (skills.length) inputs['技能清单'] = skills.map((record) => Object.fromEntries(recordEntries(record, skillFields)));
    const details = addedDetails(answers).filter(({ prompt }) => prompt);
    for (const { title, entries } of details) inputs[title] = Object.fromEntries(entries);

    return [
      '请用中文帮我梳理近况与目标。把下面的 JSON 当作我的自述，依据具体经历和现有条件来分析，尽量保留我的原话。根据我选的梳理方式调整语气和组织结构。',
      '1. 概括我目前的处境、优先事项，以及想保留的东西。把我直接说过的事实和你据此提出的推测分开写。',
      '2. 如果我填写了目标，梳理短期、中期和长期方向的关系，给当前优先事项设一个可观察的进展信号。如果目标仍不清晰，先提出一个能缩小范围的问题。',
      '3. 依据我的行动准备、每周时间、支出、照护责任和阻碍，安排未来 7 天的一件小事和一个复盘问题。若我想先了解情况或暂时没有时间，给出可以等待或顺手完成的观察项。',
      '4. 把会改变计划的信息缺口写成一至两个追问。把性别和人生阶段作为背景，具体判断以我的实际经历为依据。若有大五人格分数，把它作为自报记录，有量表和计分信息时再解释。',
      ...(inputs['工作与学习'] ? ['如果当前想梳理的事与工作或学习有关，把建议放进我已经描述的任务、职责和协作情境里。需要他人支持时，给出一条能说清楚的具体请求。'] : []),
      ...(timeline.length ? ['5. 整理时间线时，把事件经过、当时的感受和我自述的后续影响分开。保留我填写的时间精度，把可能与现状有关的线索写成待确认的问题。'] : []),
      ...(review.length ? ['结合阶段回顾，对照当初的想法、实际变化和我提供的证据。如果我已写下下一步，判断它是否仍适合当前优先事项，并把这个判断写成一个可以验证的问题。'] : []),
      ...(support.length ? ['如果下一步需要帮助，按我记录的关系、支持类型和预计支持程度提一个具体请求。把对方是否方便留作待确认。'] : []),
      ...(skills.length ? ['从技能清单中选一项与眼下目标有关的技能。依据已有经历和产出，给出一个可尝试的迁移用途。如果我写了 AI 协作，沿用我记录的分工，并指出由我核对的产出。'] : []),
      ...(details.length ? ['从我的补充回答中选一条与当前目标直接相关的经验或支持，把它接到下一步。若我写了边界、取舍或暂停信号，把它用来检查这个尝试的范围。对反应、关系或做决定方式的判断要落到我给过的具体情境。'] : []),
      JSON.stringify(inputs, null, 2),
    ].join('\n\n');
  }

  window.LifeBriefReport = { buildReport, buildPrompt };
})();
