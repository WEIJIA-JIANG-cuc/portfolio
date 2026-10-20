// Educational interaction only. No product backend or AI service is called.
export function canvasPath(task) {
  return {
    image: {entry:'自由画布',start:'快速生图',needsScript:false},
    drama: {entry:'一键短剧',start:'使用示例剧本',needsScript:false},
    reference: {entry:'自由画布',start:'参考图生视频',needsScript:false},
  }[task] ?? null;
}
export function skillPath({kind, confirmed = false}) {
  if (kind === 'draft') return ['review'];
  if (kind !== 'script') return [];
  return confirmed ? ['brief','perspective','generate','review'] : ['brief','perspective'];
}
