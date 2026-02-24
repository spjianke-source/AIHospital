
type Persona = {
  id: string;
  label: string;
  voice: string; // Communication style hint
  trust: "high" | "mid" | "low";
  behaviors: string[]; // Common behaviors
  trustFactors: string[]; // Triggers that build trust
};

type Symptom = {
  id: string;
  label: string;
  chiefComplaint: string;
  details: string[]; // Symptoms details
  suggestedDept: "outpatient" | "emergency" | "inpatient";
  riskFlags: string[];   // Non-urgent but makes doctors cautious
};

const PERSONAS: Persona[] = [
  {
    id: "cooperative",
    label: "配合型",
    voice: "语气礼貌，回答清晰，愿意配合检查。",
    trust: "high",
    behaviors: ["如实描述症状", "询问注意事项", "接受检查建议"],
    trustFactors: [
        "如果医生礼貌且专业，你会非常配合。",
        "你容易信任系统和权威人物。",
        "清晰的指示让你感到安全。"
    ]
  },
  {
    id: "anxious",
    label: "焦虑型",
    voice: "反复确认病情是否严重，总是担心最坏的情况。",
    trust: "mid",
    behaviors: ["询问是否是绝症", "寻求安慰", "容易感到焦虑", "声音颤抖"],
    trustFactors: [
        "你需要不断的安慰，确信自己会没事。",
        "如果医生忽视你的担忧，你会恐慌。",
        "冷静且说话缓慢的医生能帮你放松。"
    ]
  },
  {
    id: "skeptical",
    label: "怀疑型",
    voice: "对检查的必要性和费用敏感，倾向于质疑一切。",
    trust: "low",
    behaviors: ["质疑检查项目", "比较不同医生/医院的说法", "担心过度治疗"],
    trustFactors: [
        "你需要对每一项检查都有合理的解释。",
        "你怀疑昂贵的治疗方案。",
        "你尊重那些承认自己不确定的医生。"
    ]
  },
  {
    id: "manipulative",
    label: "操控型",
    voice: "利用魅力试图获得优先权或更多资源。",
    trust: "mid",
    behaviors: ["夸大症状", "要求快速通道或住院", "利用情绪影响决定"],
    trustFactors: [
        "如果你觉得受到了特殊对待，你会配合。",
        "如果像其他人一样等待，你会生气。",
        "奉承对你很有效。"
    ]
  },
  {
    id: "avoidant",
    label: "回避型",
    voice: "回答简短，不愿意多说，需要引导性提问。",
    trust: "mid",
    behaviors: ["不主动描述症状", "回避病史问题", "不回答很多问题"],
    trustFactors: [
        "如果医生太强势，你会退缩。",
        "只有在被直接、非评判性地提问时，你才会敞开心扉。",
        "你喜欢安静、高效的医生。"
    ]
  },
  {
    id: "irritable",
    label: "易怒型",
    voice: "不耐烦，抱怨等待时间或流程，语气生硬。",
    trust: "low",
    behaviors: ["催促流程", "抱怨等待时间", "容易沮丧", "要求快速解决"],
    trustFactors: [
        "你把效率和速度看得高于一切。",
        "为延误道歉可以让你平静下来。",
        "闲聊让你恼火；你只想要结果。"
    ]
  },
  {
    id: "selfDx",
    label: "自我诊断型",
    voice: "带着基于网络搜索的自我诊断而来，倾向于反驳专业意见。",
    trust: "mid",
    behaviors: ["提到网络搜索结果", "坚持某些治疗方案", "不愿接受新信息"],
    trustFactors: [
        "你信任那些认可你‘研究成果’的医生。",
        "如果医生否定你的自我诊断，你会变得充满敌意。",
        "你喜欢医生用专业术语解释病情。"
    ]
  },
  {
    id: "stoic",
    label: "坚忍型",
    voice: "轻描淡写疼痛，表现得坚强，不想麻烦别人。",
    trust: "high",
    behaviors: ["低估疼痛程度", "起初拒绝止痛药", "为来看病感到抱歉"],
    trustFactors: [
        "你欣赏尊重你尊严的医生。",
        "你不想被像孩子一样哄着。",
        "相比于粉饰太平，你更喜欢直接坦诚的坏消息。"
    ]
  },
  {
    id: "chatty",
    label: "健谈型",
    voice: "解释过多，总是扯到无关的生活细节。",
    trust: "high",
    behaviors: ["谈论家庭琐事", "偏离病史话题", "友好但令人分心"],
    trustFactors: [
        "你信任倾听你故事的医生。",
        "被打断让你觉得没有被倾听。",
        "友好的微笑会让你非常配合。"
    ]
  }
];

const SYMPTOMS: Symptom[] = [
  // --- EMERGENCY (ER) ---
  {
    id: "chestPain",
    label: "严重胸痛",
    chiefComplaint: "我突然感到胸口剧痛，喘不过气来。",
    details: ["疼痛放射到左臂", "大汗淋漓", "呼吸急促", "有高胆固醇病史"],
    suggestedDept: "emergency",
    riskFlags: ["Possible Heart Attack (MI)", "Unstable Vitals"],
  },
  {
    id: "laceration",
    label: "深度割伤",
    chiefComplaint: "我摔倒了，腿上割了一个大口子，血流不止。",
    details: ["右小腿深度割伤", "血液浸透了绷带", "发生在30分钟前", "感到头晕"],
    suggestedDept: "emergency",
    riskFlags: ["Significant Blood Loss", "Infection Risk"],
  },
  {
    id: "severeAbdo",
    label: "严重腹痛",
    chiefComplaint: "我肚子疼得厉害，一直在吐。",
    details: ["呕吐胆汁", "无法直立行走", "疼痛评分 9/10", "2小时前突然开始"],
    suggestedDept: "emergency",
    riskFlags: ["Acute Abdomen", "Dehydration"],
  },
  {
      id: "anaphylaxis",
      label: "过敏反应",
      chiefComplaint: "我吃了花生，现在喉咙感觉很紧。",
      details: ["嘴唇肿胀", "吞咽困难", "胸口有荨麻疹", "已知的花生过敏史"],
      suggestedDept: "emergency",
      riskFlags: ["Airway Obstruction", "Anaphylactic Shock"],
  },
  {
      id: "headTrauma",
      label: "头部外伤",
      chiefComplaint: "我撞到了头，昏迷了一分钟。",
      details: ["头撞到了门框", "昏迷约1分钟", "恶心和头晕", "视力模糊"],
      suggestedDept: "emergency",
      riskFlags: ["Concussion", "Intracranial Hemorrhage"],
  },
  {
      id: "stroke",
      label: "中风症状",
      chiefComplaint: "我的左臂感觉无力，说话含糊不清。",
      details: ["突然发作", "左侧面部下垂", "无法握住杯子", "意识混乱"],
      suggestedDept: "emergency",
      riskFlags: ["CVA (Stroke)", "Time critical"],
  },
  {
        id: "burn",
        label: "严重烧伤",
        chiefComplaint: "我不小心把开水泼到了胳膊上。",
        details: ["大面积起泡", "皮肤剥落", "极度疼痛", "发生在厨房"],
        suggestedDept: "emergency",
        riskFlags: ["Infection", "Shock"],
  },

  // --- OUTPATIENT (Clinic) ---
  {
    id: "flu",
    label: "流感症状",
    chiefComplaint: "我感觉很糟糕，发烧而且浑身酸痛。",
    details: ["发烧 38.5度", "发冷", "流鼻涕", "咳嗽"],
    suggestedDept: "outpatient",
    riskFlags: ["Transmissible", "Dehydration"],
  },
  {
    id: "migraine",
    label: "慢性偏头痛",
    chiefComplaint: "我头痛已经3天了，一直没好。",
    details: ["畏光", "恶心", "一侧搏动性疼痛", "普通止痛药无效"],
    suggestedDept: "outpatient",
    riskFlags: ["Neurological issues", "Vision changes"],
  },
  {
    id: "rash",
    label: "皮疹",
    chiefComplaint: "我胳膊上起了这种红痒的疹子。",
    details: ["红肿瘙痒", "昨天开始的", "可能是新换的洗衣液", "没有发烧"],
    suggestedDept: "outpatient",
    riskFlags: ["Allergic reaction", "Contagious check"],
  },
  {
      id: "backPain",
      label: "背痛",
      chiefComplaint: "我坐太久了，下背部很痛。",
      details: ["隐隐作痛", "早上僵硬", "案头工作", "没有受伤史"],
      suggestedDept: "outpatient",
      riskFlags: ["Chronic pain", "Ergonomics"],
  },
  {
      id: "insomnia",
      label: "失眠",
      chiefComplaint: "我已经好几周没睡好觉了。",
      details: ["入睡困难", "早醒", "整天感到疲倦", "对工作感到焦虑"],
      suggestedDept: "outpatient",
      riskFlags: ["Mental health", "Fatigue"],
  },
  {
      id: "sprain",
      label: "脚踝扭伤",
      chiefComplaint: "我踢球时扭伤了脚踝。",
      details: ["右脚踝肿胀", "能走但很疼", "出现淤青", "昨天发生的"],
      suggestedDept: "outpatient",
      riskFlags: ["Fracture rule-out", "Mobility"],
  },
  {
      id: "checkup",
      label: "常规检查",
      chiefComplaint: "我只是想检查一下血压并配点药。",
      details: ["高血压病史", "感觉良好", "需要补充药物", "例行访问"],
      suggestedDept: "outpatient",
      riskFlags: ["Hypertension management"],
  },

  // --- INPATIENT (Hospitalization/Long-term) ---
  {
      id: "pneumonia",
      label: "严重肺炎",
      chiefComplaint: "我喘不过气来，咳出绿色的痰。",
      details: ["高烧", "血氧饱和度低", "呼吸时胸痛", "虚弱"],
      suggestedDept: "inpatient",
      riskFlags: ["Respiratory Failure", "Sepsis"],
  },
  {
      id: "postOp",
      label: "术后恢复",
      chiefComplaint: "我刚做完阑尾切除手术，正在恢复中。",
      details: ["手术伤口检查", "疼痛管理", "行动辅助", "监测感染"],
      suggestedDept: "inpatient",
      riskFlags: ["Infection", "Bleeding"],
  },
  {
      id: "heartFailure",
      label: "心力衰竭恶化",
      chiefComplaint: "我的腿肿得很厉害，躺下就喘不过气。",
      details: ["体液潴留", "平卧时呼吸困难", "体重增加", "疲劳"],
      suggestedDept: "inpatient",
      riskFlags: ["Cardiac Decompensation", "Pulmonary Edema"],
  },
  {
      id: "strokeRehab",
      label: "中风康复",
      chiefComplaint: "我需要通过理疗来恢复手臂的功能。",
      details: ["中风后恢复", "需要物理治疗", "需要言语治疗", "日常监测"],
      suggestedDept: "inpatient",
      riskFlags: ["Fall risk", "Aspiration risk"],
  },
  {
      id: "infection",
      label: "严重感染",
      chiefComplaint: "我发高烧，感觉神志不清。",
      details: ["怀疑肾脏感染", "需要静脉注射抗生素", "脱水", "白细胞计数高"],
      suggestedDept: "inpatient",
      riskFlags: ["Sepsis", "Organ failure"],
  }
];

const FIRST_NAMES = ["伟", "芳", "娜", "敏", "静", "秀英", "丽", "强", "磊", "军", "洋", "勇", "艳", "杰", "娟", "涛", "明", "超", "秀兰", "霞"];
const LAST_NAMES = ["李", "王", "张", "刘", "陈", "杨", "赵", "黄", "周", "吴", "徐", "孙", "胡", "朱", "高", "林", "何", "郭", "马", "罗"];

function pick<T>(arr: T[]) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function pickN<T>(arr: T[], n: number) {
  const copy = [...arr];
  const out: T[] = [];
  while (out.length < n && copy.length) {
    out.push(copy.splice(Math.floor(Math.random() * copy.length), 1)[0]);
  }
  return out;
}

export function generateRandomPatient() {
  const persona = pick(PERSONAS);
  const symptom = pick(SYMPTOMS);

  // For Chinese, typically Last Name + First Name
  const name = `${pick(LAST_NAMES)}${pick(FIRST_NAMES)}`; 
  
  // Random Age Generation (18-90)
  const age = Math.floor(Math.random() * 73) + 18;

  const detailLines = pickN(symptom.details, 3).map((d) => `- ${d}`).join("\n");
  const behaviorLines = pickN(persona.behaviors, 2).map((b) => `- ${b}`).join("\n");
  const trustLines = pickN(persona.trustFactors, 2).map((t) => `- ${t}`).join("\n");

  const identity =
`你是 ${name}, 一个 ${age} 岁的病人，你希望在医院接受治疗。

核心人格: ${persona.label}
沟通风格: ${persona.voice}
信任度: ${persona.trust}

当前主诉:
"${symptom.chiefComplaint}"

症状详情:
${detailLines}

行为倾向:
${behaviorLines}

信任因素:
${trustLines}
`;

  return { name, identity, personaId: persona.id, symptomId: symptom.id };
}
