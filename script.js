const $ = (id) => document.getElementById(id);

const controls = {
  gpuCount: $('gpuCount'),
  runtime: $('runtime'),
  gpuRate: $('gpuRate'),
  pilotPercent: $('pilotPercent'),
  decisionChance: $('decisionChance'),
  approvalLimit: $('approvalLimit'),
  successMetric: $('successMetric'),
  successGate: $('successGate'),
  priorEvidence: $('priorEvidence')
};

const outputs = {
  gpuCount: $('gpuCountOut'),
  runtime: $('runtimeOut'),
  gpuRate: $('gpuRateOut'),
  pilotPercent: $('pilotPercentOut'),
  decisionChance: $('decisionChanceOut'),
  approvalLimit: $('approvalLimitOut'),
  successGate: $('successGateOut')
};

function money(value) {
  const digits = Number.isInteger(value) ? 0 : 2;
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: digits
  }).format(value);
}

function gpuHours(value) {
  return `${value.toLocaleString()} GPU-${value === 1 ? 'hour' : 'hours'}`;
}

function update() {
  const gpuCount = Number(controls.gpuCount.value);
  const runtime = Number(controls.runtime.value);
  const gpuRate = Number(controls.gpuRate.value);
  const pilotPercent = Number(controls.pilotPercent.value) / 100;
  const decisionChance = Number(controls.decisionChance.value) / 100;
  const approvalLimit = Number(controls.approvalLimit.value);
  const successMetric = controls.successMetric.value;
  const successGate = Number(controls.successGate.value);
  const priorEvidence = controls.priorEvidence.value;

  const fullGpuHours = gpuCount * runtime;
  const fullCost = fullGpuHours * gpuRate;
  const pilotGpuHours = Math.max(1, Math.ceil(fullGpuHours * pilotPercent));
  const pilotCost = pilotGpuHours * gpuRate;
  const pilotThenFullCost = pilotCost + fullCost;
  const effectivePilotShare = pilotGpuHours / fullGpuHours;

  outputs.gpuCount.textContent = `${gpuCount} GPU${gpuCount === 1 ? '' : 's'}`;
  outputs.runtime.textContent = `${runtime} h`;
  outputs.gpuRate.textContent = `${money(gpuRate)} / GPU-h`;
  outputs.pilotPercent.textContent = `${Math.round(pilotPercent * 100)}%`;
  outputs.decisionChance.textContent = `${Math.round(decisionChance * 100)}%`;
  outputs.approvalLimit.textContent = money(approvalLimit);
  outputs.successGate.textContent = successGate > 0 ? `${successGate}%` : 'Not defined';

  $('requestedMetric').textContent = `${fullGpuHours.toLocaleString()} GPU-h`;
  $('costMetric').textContent = money(fullCost);
  $('pilotMetric').textContent = `${pilotGpuHours.toLocaleString()} GPU-h · ${money(pilotCost)}`;

  const runSummary = `${gpuCount} GPU${gpuCount === 1 ? '' : 's'} × ${runtime} ${runtime === 1 ? 'hour' : 'hours'} is ${gpuHours(fullGpuHours)}, estimated at ${money(fullCost)}.`;
  const gate = `Release follow-on compute only if ${successMetric} is at least ${successGate}%.`;
  const evidenceNote = priorEvidence === 'partial'
    ? ' Review the related prior evidence first and isolate what remains unanswered.'
    : '';

  let badge;
  let headline;
  let memo;

  if (priorEvidence === 'strong') {
    badge = 'REVIEW EVIDENCE';
    headline = 'Check whether existing results already answer the decision.';
    memo = `${runSummary} The owner marked comparable evidence as strong and reusable. Review that evidence first, identify the unanswered delta, and require human approval before purchasing the same answer again.`;
  } else if (successGate <= 0) {
    badge = 'DEFINE GATE';
    headline = 'Define what success means before queueing the run.';
    memo = `${runSummary} No success threshold is recorded. Name the value that unlocks follow-on compute and the result that stops or redesigns the work.${evidenceNote}`;
  } else if (decisionChance < 0.30) {
    badge = 'DEFER / CLARIFY';
    headline = 'Clarify which decision this evidence could change.';
    memo = `${runSummary} The supplied chance of changing a decision is only ${Math.round(decisionChance * 100)}%. Define the action that would change, improve the experiment design, or defer the run until the result can influence a real choice.${evidenceNote}`;
  } else if (effectivePilotShare <= 0.30 && decisionChance >= 0.50 && pilotCost <= approvalLimit) {
    badge = 'RUN PILOT';
    headline = 'Run a smaller pilot before releasing the full GPU request.';
    memo = `${runSummary} The requested ${Math.round(pilotPercent * 100)}% pilot rounds to ${gpuHours(pilotGpuHours)} (${Math.round(effectivePilotShare * 100)}% of the full run) and ${money(pilotCost)}. ${gate} If the pilot and full run both execute, total compute cost could reach ${money(pilotThenFullCost)}.${evidenceNote}`;
  } else if (fullCost <= approvalLimit) {
    badge = 'APPROVE WITH LIMITS';
    headline = 'The requested run fits the supplied limit; approve it with a hard cap.';
    memo = `${runSummary} Keep the approval capped at ${gpuHours(fullGpuHours)} and ${money(fullCost)}. ${gate} Record the result even if it is negative so the evidence can be reused.${evidenceNote}`;
  } else {
    const blockers = [];
    if (effectivePilotShare > 0.30) blockers.push(`the rounded pilot uses ${Math.round(effectivePilotShare * 100)}% of the full GPU-hours`);
    if (decisionChance < 0.50) blockers.push(`its decision-change estimate is ${Math.round(decisionChance * 100)}%`);
    if (pilotCost > approvalLimit) blockers.push(`its ${money(pilotCost)} cost exceeds the ${money(approvalLimit)} approval limit`);
    badge = 'NARROW / REVIEW';
    headline = 'Narrow the request or send it for explicit human review.';
    memo = `${runSummary} The full request exceeds the ${money(approvalLimit)} preflight limit, and ${blockers.join('; ')}. Reduce scope, improve the pilot, or document why the full run should receive an exception.${evidenceNote}`;
  }

  $('recommendationBadge').textContent = badge;
  $('recommendationText').textContent = headline;
  $('memoText').textContent = memo;
}

Object.values(controls).forEach((control) => {
  control.addEventListener('input', update);
  control.addEventListener('change', update);
});

update();
