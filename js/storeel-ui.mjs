import {canvasPath, skillPath} from './storeel-model.mjs';
import {filterEvaluationCases} from './storeel-evaluation.mjs';

const descriptions = {
  image:'先完成一次单点生成，再按需要探索节点；不必先准备完整剧本。',
  reference:'以已有参考图起步，直接进入图生视频任务，不把素材上传重复设成首页入口。',
  drama:'一键短剧已有示例入口；没有自己的剧本，也能先用示例体验完整流程。',
};
document.querySelectorAll('[data-canvas]').forEach(button => {
  button.addEventListener('click', () => {
    const route = canvasPath(button.dataset.canvas);
    if (!route) return;
    document.querySelectorAll('[data-canvas]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
    document.querySelector('#canvas-entry').textContent = route.entry;
    document.querySelector('#canvas-start').textContent = route.start;
    document.querySelector('#canvas-explanation').textContent = descriptions[button.dataset.canvas];
  });
});
let materialKind = 'script';
const confirmation = document.querySelector('#perspective-confirmed');
function renderSkill() {
  const path = skillPath({kind:materialKind,confirmed:confirmation.checked});
  document.querySelectorAll('[data-stage]').forEach(stage => {
    const active = path.includes(stage.dataset.stage);
    stage.classList.toggle('is-active',active);
    stage.setAttribute('aria-label',stage.textContent.trim().replace(/\s+/g,' ') + (active ? '，当前流程包含此阶段' : '，当前流程未进入此阶段'));
  });
  document.querySelector('#skill-gate').hidden = materialKind === 'draft';
  document.querySelector('#skill-explanation').textContent = materialKind === 'draft'
    ? '已有成稿直接进入审查，不重新生成；审查清单与最终文档分开，结果仍需人工复核。'
    : confirmation.checked
      ? '人工确认后可进入双语文档生成和审查；生成不等于审核通过，也不触发配置或发布。'
      : '当前停在视角确认：先判断用户扮演谁、与角色是什么关系，再生成正式文档。';
}
document.querySelectorAll('[data-skill]').forEach(button => {
  button.addEventListener('click', () => {
    materialKind = button.dataset.skill;
    confirmation.checked = false;
    document.querySelectorAll('[data-skill]').forEach(item => item.setAttribute('aria-pressed',String(item === button)));
    renderSkill();
  });
});
confirmation.addEventListener('change',renderSkill);
renderSkill();
// This browser displays a test DESIGN, never a generated model score.
let evaluationGroup='all';
let showAllEvaluationCases=false;
const evaluationList=document.querySelector('#evaluation-cases');
const evaluationToggle=document.querySelector('#evaluation-more');
function renderEvaluationCases() {
  if (!evaluationList) return;
  const cases=filterEvaluationCases(evaluationGroup);
  evaluationList.replaceChildren();
  for (const item of (showAllEvaluationCases ? cases : cases.slice(0,4))) {
    const card=document.createElement('article');
    card.className='sr-eval-case';
    const label=document.createElement('span');
    label.className='sr-small-label';
    label.textContent=item.id+' / 构造用例 · 未评测';
    const title=document.createElement('h4'); title.textContent=item.title;
    card.append(label,title);
    for (const [name,value] of [['输入',item.input],['期望',item.expected],['不通过条件',item.reject]]) {
      const paragraph=document.createElement('p');
      const lead=document.createElement('strong'); lead.textContent=name+'：';
      paragraph.append(lead,document.createTextNode(value));
      card.append(paragraph);
    }
    const details=document.createElement('details');
    const summary=document.createElement('summary'); summary.textContent='查看固定输入与测试提示词';
    const fixed=document.createElement('pre');
    fixed.textContent='以下故事、角色和平台字段均为本次自制的测试材料。\n\n'+item.materials.map(material=>'【'+material.title+'】\n'+material.text).join('\n\n')+'\n\n【固定测试提示词】\n'+item.prompt;
    details.append(summary,fixed);
    card.append(details);
    evaluationList.append(card);
  }
  document.querySelector('#evaluation-count').textContent=`${cases.length} 条设计用例 · 当前展示 ${evaluationList.children.length} 条 · 尚未运行模型评测`;
  evaluationToggle.hidden=cases.length<=4;
  evaluationToggle.setAttribute('aria-expanded',String(showAllEvaluationCases));
  evaluationToggle.textContent=showAllEvaluationCases?'收起为 4 条代表用例':'展开全部 20 条设计用例';
}
document.querySelectorAll('[data-eval-filter]').forEach(button=>{
  button.addEventListener('click',()=>{
    evaluationGroup=button.dataset.evalFilter;
    showAllEvaluationCases=false;
    document.querySelectorAll('[data-eval-filter]').forEach(item=>item.setAttribute('aria-pressed',String(item===button)));
    renderEvaluationCases();
  });
});
evaluationToggle?.addEventListener('click',()=>{
  showAllEvaluationCases=!showAllEvaluationCases;
  renderEvaluationCases();
});
renderEvaluationCases();
const sectionLinks = [...document.querySelectorAll('.sr-section-nav a')];
if ('IntersectionObserver' in window) {
  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      sectionLinks.forEach(link => {
        if (link.hash === '#' + entry.target.id) link.setAttribute('aria-current','location');
        else link.removeAttribute('aria-current');
      });
    }
  }, {rootMargin:'-15% 0px -55% 0px',threshold:0});
  document.querySelectorAll('.sr-case').forEach(section => observer.observe(section));
}
