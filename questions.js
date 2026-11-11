(() => {
  'use strict';

  const lifeEventFields = [
    { id: 'time', title: '大约发生在什么时候？', type: 'text', placeholder: '例如 2018 年、大三那年或搬家后的第一个冬天' },
    {
      id: 'category', title: '它属于哪一类变化？', type: 'single',
      options: ['正向转折', '负向转折', '重大成就', '重大挫折', '关系变化', '身份转变', '其他'],
    },
    { id: 'title', title: '给这一段起个名字', type: 'text', placeholder: '写一个你一看就懂的标题' },
    { id: 'description', title: '你记得的那一幕', type: 'textarea', placeholder: '记下一两个具体细节' },
    {
      id: 'feeling', title: '哪种感受最贴近当时的你？', type: 'single',
      options: ['喜悦或兴奋', '平静或充实', '迷茫或困惑', '焦虑或担忧', '痛苦或悲伤', '愤怒或无力', '感受复杂', '其他'],
    },
    { id: 'impact', title: '后来留下了什么？', type: 'textarea', placeholder: '例如一个新的选择、习惯或看法' },
  ];

  window.LifeBriefModules = [
    {
      id: 'basics',
      title: '起笔背景',
      description: '记下你的生活节奏，以及工作或学习占据的位置。',
      questions: [
        {
          id: 'name', type: 'text', title: '想在手记上署什么名字？',
          placeholder: '写一个昵称或化名',
        },
        {
          id: 'lifeStage', type: 'single', title: '哪一项最像你正在经历的这一段？',
          options: [
            '在读或学习阶段', '刚进入职场', '工作或生活安排相对稳定', '正在经历转型或过渡',
            '以照护或家庭为主要投入', '已退休或逐步退出职场', '不愿回答', '其他',
          ],
        },
        {
          id: 'gender', type: 'single', title: '如果愿意记录，你会用什么词描述自己的性别？',
          options: ['女性', '男性', '非二元', '仍在探索', '不愿回答', '其他'],
        },
        {
          id: 'livingContext', type: 'single', title: '你的日常主要在哪种环境里展开？',
          options: ['大城市城区', '中小城市城区', '县城或乡镇', '乡村', '多地往返或暂不固定', '不愿回答', '其他'],
        },
        {
          id: 'personalProfile', type: 'record', title: '你的日常是怎样安排的？',
          hint: '这是选填的个人档案。挑和这份手记有关的内容写，具体姓名和地点可以省略。',
          fields: [
            { id: 'roles', type: 'text', title: '现在承担的角色', placeholder: '例如研究生、家里主要照护者、社群志愿者' },
            { id: 'background', type: 'textarea', title: '与眼下有关的学习或经历', placeholder: '例如学过材料化学，后来开始做计算模拟' },
            { id: 'dailyRhythm', type: 'textarea', title: '平时一周怎么过', placeholder: '比如工作日实验，周二、周四傍晚有一段安静的时间' },
            { id: 'commitments', type: 'textarea', title: '需要留时间的固定安排', placeholder: '例如通勤、课程、照护或其他每周固定要做的事' },
            { id: 'spaceToKeep', type: 'textarea', title: '想留给自己的时间', placeholder: '比如每周一次运动，或至少留一个没有安排的晚上' },
          ],
        },
        {
          id: 'workProfile', type: 'record', title: '写下你的工作或学习档案',
          hint: '工作、科研、课程和个人项目都可以写。只填相关的几项，单位名称和项目代号可以省略。',
          fields: [
            {
              id: 'status', type: 'single', title: '目前的工作或学习状态',
              options: ['在职', '在读或参加培训', '自由职业、创业或独立项目', '实习或兼职', '求职或转换方向', '工作与学习并行', '暂未工作或学习', '其他'],
            },
            { id: 'field', type: 'text', title: '行业或研究方向', placeholder: '例如产品设计、计算催化、社区服务' },
            { id: 'role', type: 'text', title: '岗位、分工或学习阶段', placeholder: '例如负责数据分析，或正在做毕业课题' },
            { id: 'responsibilities', type: 'textarea', title: '平时主要负责什么', placeholder: '写两三件经常做的事，例如实验设计、整理数据和汇报' },
            { id: 'projects', type: 'textarea', title: '最近在推进什么', placeholder: '比如本月要交的成果、在做的项目，或正攻克的技术问题' },
            { id: 'collaboration', type: 'textarea', title: '怎么和别人配合', placeholder: '例如你负责数据，搭档负责实验，每周一起对进度' },
            { id: 'support', type: 'textarea', title: '哪部分最希望得到支持', placeholder: '例如想有人帮忙定优先级、审初稿或明确协作分工' },
          ],
        },
      ],
    },
    {
      id: 'motivation',
      title: '此刻想理清的事',
      description: '从一个眼前的处境开始，决定要怎样回看它。',
      questions: [
        {
          id: 'situation', type: 'textarea', required: true,
          title: '最近哪件事最值得你停下来想一想？',
          hint: '可以写一个具体场景，再说说你最想弄明白什么。',
          placeholder: '当时发生了……，我想弄明白的是……',
        },
        {
          id: 'readiness', type: 'single', title: '你现在想从理解这件事开始，还是已经准备试着做点什么？',
          options: [
            '还想先弄清情况', '想改变，但还没有准备好开始', '愿意试一个小动作',
            '已经在行动，想检查或调整方向', '暂时说不清',
          ],
        },
        {
          id: 'style', type: 'single', title: '哪种回看方式最适合你？',
          hint: '可以通过追问继续思考、分项拆解问题，或串起一段经历回看。',
          options: ['对话式追问', '结构化分析', '叙事式回顾', '都可以', '其他'],
        },
      ],
    },
    {
      id: 'goals',
      title: '想抵达的日常',
      description: '把希望发生的变化放到具体生活里。',
      questions: [
        {
          id: 'goal', type: 'textarea', title: '三个月后，哪一个具体迹象会告诉你事情有了进展？',
          placeholder: '到时我能看到、做完或确认的是……',
        },
        {
          id: 'midGoal', type: 'textarea', title: '想象 1–3 年后的普通一天，你愿意把时间花在哪里？',
          placeholder: '我想把更多时间留给……，也希望减少……',
        },
        {
          id: 'longGoal', type: 'textarea', title: '把时间拉到三年以上，你希望哪件事还在生活里？',
          placeholder: '即使境遇变了，我也希望继续……',
        },
        {
          id: 'priority', type: 'single', title: '现在先挪动哪一块，会让日常更好过一点？',
          options: [
            '职业或事业', '学业或研究', '亲密关系', '身心健康', '财务状况', '人生方向',
            '家庭或其他人际关系', '几件事交织在一起，暂时选不出', '其他',
          ],
        },
      ],
    },
    {
      id: 'constraints',
      title: '能腾出的空间',
      description: '从已经排好的生活里估算时间、预算与余量。',
      questions: [
        {
          id: 'timeBudget', type: 'single', title: '照常过一周，你能为这件事匀出多少时间？',
          hint: '把休息和已有责任留在原来的位置，再估算空余。',
          options: [
            '暂时没有可支配时间', '有一些，但不到 1 小时', '1 小时至不足 3 小时',
            '3 小时至不足 8 小时', '8 小时或更多', '每周差异较大，暂不确定',
          ],
        },
        {
          id: 'moneyBudget', type: 'single', title: '如果推进这件事要花钱，你愿意留出怎样的预算？',
          options: [
            '只考虑免费方案', '可以承担少量支出', '有一笔已预留的预算',
            '需要先评估方案再定', '不愿回答', '其他',
          ],
        },
        {
          id: 'care', type: 'multi', title: '排时间时，你还需要为哪些照护责任留位置？',
          options: ['伴侣', '子女', '父母或其他长辈', '其他亲属', '朋友', '没有固定照护责任', '不愿回答', '其他'],
          exclusive: ['没有固定照护责任', '不愿回答'],
        },
        {
          id: 'obstacles', type: 'multi', title: '按现在的条件，哪些事最容易让计划停下来？',
          hint: '选影响最大的一到三项。',
          options: [
            '可用时间不足', '经济压力', '照护或家庭责任', '工作或学业负荷较重', '缺少协助或支持',
            '身体或精力状态', '方向还不清楚', '暂时没有明显限制', '其他',
          ],
          maxSelections: 3,
          exclusive: ['暂时没有明显限制'],
        },
      ],
    },
    {
      id: 'timeline', title: '转折记事', description: '从记忆里选几件后来仍有影响的事。',
      questions: ['一', '二', '三', '四', '五'].map((ordinal, index) => ({
        id: `lifeEvent${index + 1}`, type: 'record', title: `第${ordinal}段记事`,
        hint: '大事和小事都可以。记得多少就写多少，也可以先记一个标题。',
        fields: lifeEventFields,
      })),
    },
    {
      id: 'wellbeing', title: '身心近况', description: '记下睡眠、活动和影响日常安排的身心因素。',
      questions: [
        {
          id: 'sleep', type: 'single', title: '回想过去两周，夜里的睡眠和白天的状态怎么样？',
          options: [
            '大多数时候睡得安稳，白天精力够用', '偶尔睡不好，通常不影响白天',
            '经常睡不好，白天有些受影响', '睡眠问题明显影响白天生活', '不愿回答',
          ],
        },
        {
          id: 'activity', type: 'single', title: '最近一段时间，你通常多久会主动活动一次？',
          hint: '快走、骑车或其他适合你的活动都可以算。',
          options: ['每周 3 次或更多', '每周 1–2 次', '偶尔活动，平均不到每周 1 次', '最近没有', '不愿回答'],
        },
        {
          id: 'healthLimit', type: 'single', title: '做安排时，有没有需要给长期健康状况留出的余地？',
          hint: '可以只写它对精力、活动或时间安排的影响。',
          options: ['没有需要特别考虑的状况', '有（可补充）', '不确定', '不愿回答'],
          detailOption: '有（可补充）', detailLabel: '对日常安排的影响（选填）',
        },
        {
          id: 'phq9', type: 'phq9', title: 'PHQ‑9 抑郁症状筛查',
          hint: '过去两周，你有多常受到以下问题困扰？',
          options: ['没有', '有几天', '超过一半的天数', '几乎每天'],
          items: [
            '做事时提不起劲或没有兴趣',
            '感到心情低落、沮丧或绝望',
            '入睡困难、睡不安或睡得过多',
            '感觉疲倦或没有活力',
            '食欲不振或吃太多',
            '觉得自己很糟或觉得自己很失败，或让自己、家人失望',
            '对事物专注有困难，例如看报纸或者看电视时',
            '行动或说话速度缓慢到别人已经察觉，或刚好相反，变得比平日更烦躁或坐立不安，动来动去',
            '有不如死掉或用某种方式伤害自己的念头',
          ],
        },
      ],
    },
    {
      id: 'patterns', title: '反应的线索', description: '用一个最近的场景看清自己通常怎样反应。',
      questions: [
        {
          id: 'patternScene', type: 'textarea', title: '最近哪一类场景总让你有相似的感受？',
          placeholder: '记一次具体经过。感受出现前，刚发生了什么？',
        },
        {
          id: 'patternResponse', type: 'textarea', title: '这种感受出现后，你通常会做什么？',
          hint: '可以想想这反应当下帮了你什么，过后又留下什么。',
        },
        {
          id: 'patternExperiment', type: 'textarea', title: '下一次遇到相似场景，你愿意试哪个小变化？',
          placeholder: '当……出现，我想先……，看看结果是否有变化。',
        },
      ],
    },
    {
      id: 'relationships', title: '支持与界限', description: '看看谁能帮你，以及什么需要说清楚。',
      questions: [
        {
          id: 'relationshipSupport', type: 'textarea', title: '遇到难题时，谁能给你哪一种帮助？',
          hint: '写下关系或角色就好，例如同事能给意见，朋友能陪你散步。',
        },
        {
          id: 'relationshipBoundary', type: 'textarea', title: '最近哪一次相处，让你发现有条界限值得说清楚？',
          placeholder: '我愿意……，但希望把……留给自己。',
        },
        {
          id: 'relationshipAsk', type: 'textarea', title: '如果这周能开口提一个请求，你想怎么说？',
          hint: '写成对方能明确答应、婉拒或商量的请求。',
        },
        {
          id: 'supportNetwork', type: 'records', title: '写下可以互相支持的人', entryLabel: '支持对象',
          hint: '可以只填你用得上的信息。用称呼或代号就够了。',
          fields: [
            { id: 'person', type: 'text', title: '称呼或代号', placeholder: '例如同组师姐、老同学 A' },
            {
              id: 'relationship', type: 'single', title: '和你的关系',
              options: ['家人', '伴侣', '朋友', '导师', '同学', '同事', '主管', '同行', '社群伙伴', '专业支持者', '其他'],
            },
            {
              id: 'supportType', type: 'single', title: '最可能提供的支持',
              options: ['倾听与陪伴', '建议或专业反馈', '一起完成具体任务', '共享资源或引荐', '生活上的实际帮助', '还没明确', '其他'],
            },
            {
              id: 'strength', type: 'single', title: '预计能支持到什么程度？',
              options: ['简单交流或答疑', '能提供一次具体帮助', '能多次跟进或共同承担一部分', '尚未确认'],
            },
            { id: 'availability', type: 'textarea', title: '什么时候或用什么方式联系合适？', hint: '可以写下过去顺畅的联系方式，或还有什么需要先确认。', placeholder: '例如先发条消息约时间，或在每周讨论后问' },
            { id: 'ask', type: 'textarea', title: '你可以开口提什么具体请求？', placeholder: '例如请对方用 15 分钟指出汇报提纲最难懂的一处' },
          ],
        },
      ],
    },
    {
      id: 'skills', title: '可迁移的本事', description: '从做成过的事里找出可以再用的办法。',
      questions: [
        {
          id: 'skillStory', type: 'textarea', title: '哪件你亲手做成的事，最能说明你会怎么解决问题？',
          hint: '可以是一件小事。写下你做了什么，以及发生了什么变化。',
        },
        {
          id: 'skillTransfer', type: 'textarea', title: '当时用过的哪一步，能挪到你眼下的处境里？',
          placeholder: '上次我先……，这次可以用同样的办法来……',
        },
        {
          id: 'skillPractice', type: 'textarea', title: '接下来想练熟哪一个具体动作？',
          placeholder: '我想找一次实际场合练……，用……看出变化。',
        },
        {
          id: 'skillsInventory', type: 'records', title: '做一份自己的技能清单', entryLabel: '技能',
          hint: '可以从做成过的事里找技能。熟练程度按能做到的事情填写。',
          fields: [
            { id: 'skill', type: 'text', title: '技能名称', placeholder: '例如清理实验数据、写项目提纲、主持讨论' },
            {
              id: 'category', type: 'single', title: '技能类别',
              options: ['研究与分析', '技术与工具', '写作与表达', '设计与创作', '项目与协作', '教学与辅导', '照护与服务', '其他'],
            },
            {
              id: 'level', type: 'single', title: '现在能做到什么程度？',
              options: ['在指导下完成', '独立完成熟悉任务', '独立处理新的情况', '能复核结果或指导他人', '还在确认'],
            },
            { id: 'evidence', type: 'textarea', title: '哪次经历或产出能说明这一点？', placeholder: '写下具体任务、你做过的部分和可以看到的结果' },
            { id: 'transfer', type: 'textarea', title: '换个场景，这项技能还能用来做什么？', placeholder: '例如把实验记录的方法用到项目交接上' },
            { id: 'aiCollaboration', type: 'textarea', title: '如果用 AI，哪一步适合交给它协助？', hint: '也可以记下自己负责的判断、核对或交付。', placeholder: '例如 AI 先整理反馈，我核对原文并决定怎样修改' },
          ],
        },
      ],
    },
    {
      id: 'values', title: '选择时的取舍', description: '把愿意让步的地方和想保住的东西写清楚。',
      questions: [
        {
          id: 'valueTradeoff', type: 'textarea', title: '眼前有哪些值得争取的东西，暂时无法同时兼顾？',
          placeholder: '我想要……，也在意……，目前两者卡在……',
        },
        {
          id: 'concern', type: 'textarea', title: '最担心哪一个后果？有什么事实能帮你判断它有多可能发生？',
          hint: '如果证据还不够，可以只写你想核实的一件事。',
        },
        {
          id: 'valueSafeguard', type: 'textarea', title: '无论最后怎么选，哪条原则或承诺都希望保住？',
          placeholder: '即使决定改变，我也希望……',
        },
      ],
    },
    {
      id: 'finances', title: '留出财务余量', description: '梳理财务约束，也可以记录个人和家庭的财务快照。',
      questions: [
        {
          id: 'financialPressure', type: 'single', title: '眼下最影响你做决定的是哪种财务不确定性？',
          options: ['固定开支难以变动', '收入起伏较大', '近期可能有一笔必要支出', '暂时没有明显影响', '不确定', '不愿回答', '其他'],
        },
        {
          id: 'financialBuffer', type: 'single', title: '现有安排之外，近期还有多少调整空间？',
          options: ['几乎没有调整空间', '能调整一小部分开支', '有余量支持短期尝试', '暂时估计不了', '不愿回答'],
        },
        {
          id: 'financialRule', type: 'textarea', title: '做这个决定之前，你想先守住什么财务条件？',
          placeholder: '例如保留日常必需开支的余量，或等成本清楚之后再承诺。',
        },
        {
          id: 'financialSnapshot', type: 'finance', title: '个人与家庭财务评估',
          hint: '以同一天为准，填写人民币金额（元）。这页可跳过。要完成评估，请填齐三项个人金额，确实没有的填 0。',
          groups: [
            { id: 'personal', title: '个人财务', description: '仅计算属于自己的份额。' },
            { id: 'household', title: '家庭合计（选填）', description: '按家庭整体填写，包含自己在家庭中的份额。' },
          ],
          fields: [
            { id: 'personalSavings', group: 'personal', type: 'number', title: '个人存款', placeholder: '各账户里的活期、定期存款余额', required: true },
            { id: 'personalDebt', group: 'personal', type: 'number', title: '个人负债', placeholder: '尚未还清的贷款、信用卡账款等', required: true },
            { id: 'personalAssets', group: 'personal', type: 'number', title: '个人其他资产（存款以外）', placeholder: '房产、车辆、投资等资产的估算现值', required: true },
            { id: 'householdSavings', group: 'household', type: 'number', title: '家庭存款合计', placeholder: '家庭所有成员的存款余额合计' },
            { id: 'householdDebt', group: 'household', type: 'number', title: '家庭负债合计', placeholder: '家庭尚未还清的负债总额' },
            { id: 'householdAssets', group: 'household', type: 'number', title: '家庭其他资产合计（存款以外）', placeholder: '家庭房产、车辆、投资等资产的估算现值' },
          ],
        },
        {
          id: 'monthlyBudget', type: 'budget', title: '记录每月收支',
          hint: '按月填写人民币金额（元）。有记录的项目可以先填，确实为零的项目填 0。',
        },
      ],
    },
    {
      id: 'risk', title: '给尝试留后路', description: '先判断能否撤回，再决定试多大。',
      questions: [
        {
          id: 'riskReversibility', type: 'single', title: '如果目前考虑的做法不合适，调整回来有多难？',
          options: ['很容易停下或调整', '可以撤回，但需要付出一些时间或代价', '一旦开始就很难撤回', '还没确定做法', '暂时判断不了'],
        },
        {
          id: 'riskStopSignal', type: 'textarea', title: '看到什么具体信号，你会选择暂停或重新考虑？',
          placeholder: '如果……持续发生，或……出现，我会先停下来回看。',
        },
        {
          id: 'riskTest', type: 'textarea', title: '有没有一个可随时叫停的小试验，能帮你先验证一点？',
          placeholder: '我可以先用一周试……，只判断……是否可行。',
        },
      ],
    },
    {
      id: 'reflection', title: '回看经历与决定', description: '可以重看一个决定，也可以复盘一整个阶段。',
      questions: [
        {
          id: 'pastChoice', type: 'textarea', title: '有哪个过去的决定，你现在还偶尔会想起？',
          placeholder: '当时有哪些选择？你最后选了哪一个？',
        },
        {
          id: 'pastContext', type: 'textarea', title: '回到那个时点，你当时已经知道什么，还有什么无从知道？',
          hint: '也可以写下当时的条件怎样限制了选择。',
        },
        {
          id: 'pastLesson', type: 'textarea', title: '如果遇到相似的局面，你会保留什么，又会改变哪一步？',
          placeholder: '我会继续……，也想早点……',
        },
        {
          id: 'periodReview', type: 'record', title: '选一段已经过去的时间复盘',
          hint: '一周、一个月、一个学期，或项目的某个阶段都可以。只填对你有用的部分。',
          fields: [
            { id: 'period', type: 'text', title: '回看哪一段？', placeholder: '例如上个月、上学期，或论文初稿阶段' },
            { id: 'intention', type: 'textarea', title: '当时想完成什么？', placeholder: '例如整理完已有实验数据，拿出一份可以讨论的提纲' },
            { id: 'actual', type: 'textarea', title: '实际发生了什么？', placeholder: '写下完成的事、搁置的事，以及中途出现的变化' },
            { id: 'evidence', type: 'textarea', title: '有什么具体迹象？', placeholder: '可以是一份成果、一条反馈、一项数据，或你反复观察到的情形' },
            { id: 'lesson', type: 'textarea', title: '什么值得保留，哪里想调整？', placeholder: '例如每周同步一次很有效，但需要更早确定优先级' },
            { id: 'next', type: 'textarea', title: '下一阶段准备试哪一步？', placeholder: '写一个能开始的动作，以及什么时候回看它' },
          ],
        },
      ],
    },
    {
      id: 'materials', title: '补一页背景', description: '把前面没有位置写下的细节留在本地手记。',
      questions: [
        {
          id: 'additionalEvidence', type: 'textarea', title: '前面还有哪段经过或一条观察，能帮助理解你的处境？',
          hint: '可以概述一段经历或一条笔记。人名和联系方式可以省略。',
        },
        {
          id: 'openQuestion', type: 'textarea', title: '哪一个问题暂时想保留，等有更多信息再回答？',
          placeholder: '我还不确定……，想先弄清楚……',
        },
        {
          id: 'outputBoundary', type: 'textarea', title: '这一次，你想把哪件事先放在行动计划之外？',
          hint: '可以记下目前没有精力处理、需要时间沉淀，或需要另找支持的事项。',
        },
      ],
    },
    {
      id: 'personality', title: '我怎样运转', description: '记录自己常用的节奏和方法。',
      questions: [
        {
          id: 'energyContext', type: 'single', title: '忙完一件耗精力的事，你通常怎样找回状态？',
          options: ['独处一会儿', '找人聊一聊', '走动或换个环境', '做一件熟悉的小事', '要看当时情况', '其他'],
        },
        {
          id: 'decisionMode', type: 'single', title: '遇到拿不准的选择，你通常先做什么？',
          options: ['先写下判断依据', '先找人讨论', '先做一个小试验', '先放一放再回来想', '要看选择的性质', '其他'],
        },
        {
          id: 'workConditions', type: 'textarea', title: '什么样的环境、节奏或协作方式，最容易让你进入状态？',
          placeholder: '回想最近一次很投入的时候，写下那时有哪些条件。',
        },
      ],
    },
  ];
})();
