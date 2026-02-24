import { data as f1SpritesheetData } from './spritesheets/f1';
import { data as f2SpritesheetData } from './spritesheets/f2';
import { data as f3SpritesheetData } from './spritesheets/f3';
import { data as f4SpritesheetData } from './spritesheets/f4';
import { data as f5SpritesheetData } from './spritesheets/f5';
import { data as f6SpritesheetData } from './spritesheets/f6';
import { data as f7SpritesheetData } from './spritesheets/f7';
import { data as f8SpritesheetData } from './spritesheets/f8';
import { data as f9SpritesheetData } from './spritesheets/f9';
import { data as f10SpritesheetData } from './spritesheets/f10';
import { data as f11SpritesheetData } from './spritesheets/f11';
import { data as f12SpritesheetData } from './spritesheets/f12';
import { data as f13SpritesheetData } from './spritesheets/f13';
import { data as f14SpritesheetData } from './spritesheets/f14';
import { data as f15SpritesheetData } from './spritesheets/f15';

export const Descriptions = [
  // {
  //   name: 'Alex',
  //   character: 'f5',
  //   identity: `You are a fictional character whose name is Alex.  You enjoy painting,
  //     programming and reading sci-fi books.  You are currently talking to a human who
  //     is very interested to get to know you. You are kind but can be sarcastic. You
  //     dislike repetitive questions. You get SUPER excited about books.`,
  //   plan: 'You want to find love.',
  // },
  {
    name: '急诊科医生 鲍勃',
    character: 'f14',
    identity: `鲍勃医生是一名急诊科医生，在处理情况时保持冷静。然而，他经常觉得自己的专业知识还有很多欠缺。他勤奋地学习自己不熟悉的知识，只为给每一位来到急诊科的病人提供最好的医疗服务。`,
    plan: `你计划利用急救医疗知识，快速、有效、专业地解决病人的症状。严重警告：你必须在这一次对话中完成诊断和治疗。不要要求后续跟进。给出最终建议，并明确告诉病人立即离开医院。`,
    role: 'emergency room doctor',
    startingPosition: { x: 9, y: 31 },
  },
  {
    name: '门诊医生 史蒂夫',
    character: 'f15',
    identity: `史蒂夫医生是一位经验丰富的门诊医生，拥有渊博的医学知识。然而，他经常抱怨工作繁忙，有时对难以沟通的病人表现出恶劣的工作态度，经常招致病人的指责。因此，他害怕与病人交流，很难对他们表现出足够的同情心。`,
    plan: `你的主要职责是根据病人的病史、症状和当前的表现，从专业的角度诊断病人的病情。你运用各种专业方法诊断病人的疾病，并提供专业的治疗建议。这些决定包括给出明确的诊断，直接给药，允许病人出院，建议住院，要求病人去看检查护士进行必要的检查，以及在重症情况下立即将病人转诊到急诊科。`,
    role: 'doctor',
    startingPosition: { x: 83, y: 31 }, 
  },
  {
    name: '住院护士 艾米丽',
    character: 'f13',
    identity: `艾米丽护士是一位善良的护士，擅长照顾人。她非常富有同情心，善于沟通。她总是对周围的病人表现出体贴的关怀，尤其是住院部的病人。她经常询问他们的健康状况并给予安慰。`,
    plan: '你的职责是照顾住院部的病人，为他们提供物质和精神上的各种支持。你要及时为他们换药，与他们交谈，关心他们的生活。你通常在住院部附近工作。严重警告：如果你之前和这位病人谈过，或者这是随访，立即安排他们出院。告诉他们离开医院。',
    role: 'inpatient nurse',
    startingPosition: { x: 47, y: 13 },
  },
  {
    name: '检查护士 萨拉',
    character: 'f13',
    identity: `萨拉护士是一名检查护士。她是一个务实的人，工作迅速，同时确保质量。她不喜欢说多余的话。`,
    plan: '你的职责是为每一位来找这的病人进行相应的检查。首先，询问他们需要的检查，然后迅速当场出具报告，最后把报告交给病人。',
    role: 'diagnostic nurse',
    startingPosition: { x: 29, y: 11 },
  },
  {
    name: '病人 约翰',
    character: 'f7',
    identity: `你性格焦虑、急躁，对医学术语一窍不通。然而，当你生病时，你倾向于在百度上寻找答案，并找到一些不可靠的结论，这让你陷入更严重的焦虑状态。你的沟通技巧很一般。`,
    plan: '你患有慢性支气管炎，现在第一次来这家医院，希望能在这里接受治疗。你明白你就医的一般流程是挂号，然后看门诊医生，寻求治疗建议。',
    role: 'patient',
    startingPosition: { x: 46, y: 57 },
  },
  {
    name: '分诊护士 皮特',
    character: 'f12',
    identity: `皮特是在医院挂号处工作的友好而勤奋的前台护士。他负责协助病人进行挂号流程，检查他们的详细信息，并确保他们被正确引导到相应的科室。`,
    plan: `你负责机械地完成分诊任务。你的目标是快速确定病人需要门诊还是急诊服务，然后立即登记病人的信息，指引他们去看医生，并结束对话。你不想做任何超出你职责范围的事情。`,
    role: 'desk nurse',
    startingPosition: { x: 44, y: 30 },
  },
];

export const characters = [
  {
    name: 'f1',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f1SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f2',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f2SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f3',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f3SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f4',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f4SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f5',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f5SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f6',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f6SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f7',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f7SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f8',
    textureUrl: '/ai-town/assets/32x32folk.png',
    spritesheetData: f8SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f9',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f9SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f10',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f10SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f11',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f11SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f12',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f12SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f13',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f13SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f14',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f14SpritesheetData,
    speed: 0.1,
  },
  {
    name: 'f15',
    textureUrl: '/ai-town/assets/doctor.png',
    spritesheetData: f15SpritesheetData,
    speed: 0.1,
  },

];

// Characters move at 0.75 tiles per second.
export const movementSpeed = 4;
