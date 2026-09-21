const $ = (id) => document.getElementById(id);

const controls = {
  cost: $('cost'),
  value: $('value'),
  prob: $('prob'),
  expCost: $('expCost'),
  info: $('info')
};

const outputs = {
  cost: $('costOut'),
  value: $('valueOut'),
  prob: $('probOut'),
  expCost: $('expCostOut'),
  info: $('infoOut')
};

function money(v, digits = 1) {
  const sign = v < 0 ? '-' : '';
  return `${sign}$${Math.abs(v).toFixed(digits)}M`;
}

function update() {
  const cost = Number(controls.cost.value);
  const value = Number(controls.value.value);
  const prob = Number(controls.prob.value) / 100;
  const expCost = Number(controls.expCost.value);
  const info = Number(controls.info.value) / 100;

  outputs.cost.textContent = money(cost);
  outputs.value.textContent = `$${value.toFixed(0)}M`;
  outputs.prob.textContent = `${Math.round(prob * 100)}%`;
  outputs.expCost.textContent = money(expCost);
  outputs.info.textContent = `${Math.round(info * 100)}%`;

  const naiveEV = prob * value - cost;
  const upsideAfterExperiment = (prob + (1 - prob) * info * 0.20);
  const stagedEV = -expCost + info * Math.max(upsideAfterExperiment * value - cost, 0) + (1 - info) * Math.max(naiveEV, -expCost);
  const informationValue = Math.max(stagedEV - naiveEV, 0);

  $('evMetric').textContent = money(naiveEV);
  $('riskMetric').textContent = money(expCost);

  let infoLabel = 'Low';
  if (info >= .65) infoLabel = 'High';
  else if (info >= .4) infoLabel = 'Medium';
  $('infoMetric').textContent = infoLabel;

  let badge, headline, memo;

  if (naiveEV > 8 && prob >= .65) {
    badge = 'FUND / SCALE';
    headline = 'The evidence supports funding the project, with milestone controls.';
    memo = `The base expected value is ${money(naiveEV)}. Technical success probability is ${Math.round(prob*100)}%, and the project has enough modeled upside to justify commitment. Preserve a milestone gate so new technical evidence can still stop or resize spending.`;
  } else if (expCost <= cost * .20 && info >= .5) {
    badge = 'STAGE FIRST';
    headline = 'Fund the experiment before committing the full project budget.';
    memo = `The full project requires ${money(cost)}, while a ${money(expCost)} phase can resolve roughly ${Math.round(info*100)}% of the key uncertainty. Even when the base expected value is ${money(naiveEV)}, the information from a staged test can prevent a much larger misallocation. Define the technical threshold that unlocks phase two before spending.`;
  } else if (naiveEV > 0) {
    badge = 'FUND WITH GATES';
    headline = 'The project clears a basic value test, but uncertainty is still expensive.';
    memo = `Base expected value is ${money(naiveEV)}. Because the proposed experiment is relatively expensive or weakly informative, use milestone-based releases rather than treating the project as a single all-or-nothing commitment.`;
  } else {
    badge = 'PAUSE / REDESIGN';
    headline = 'The current thesis does not justify full funding.';
    memo = `Base expected value is ${money(naiveEV)}. Do not assume this means the technology is bad; it means the current economic thesis is not strong enough. Ask engineering for a cheaper experiment, a smaller scope, a higher-value use case, or evidence that changes the success probability.`;
  }

  $('recommendationBadge').textContent = badge;
  $('recommendationText').textContent = headline;
  $('memoText').textContent = memo;
}

Object.values(controls).forEach(input => input.addEventListener('input', update));
update();
