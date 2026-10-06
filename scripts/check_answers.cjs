const fs = require('node:fs');
const path = require('node:path');

const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const engine = require(path.join(root, 'assets/js/dental-engine.js'));
const answers = JSON.parse(fs.readFileSync(path.join(root, 'data/answers.json'), 'utf8'));
const cases = [
  ['What are some questions I should ask at my next dental visit?', 'What questions should I ask at my next dental visit?'],
  ['How can I prepare for my next appointment?', 'What questions should I ask at my next dental visit?'],
  ['What should I ask at my next cleaning?', 'What questions should I ask at my next dental visit?'],
  ['What are good questions to ask at a check-up?', 'What questions should I ask at my next dental visit?'],
  ['What should I ask my hygienist?', 'What questions should I ask at my next dental visit?'],
  ['What should I discuss with the dentist?', 'What questions should I ask at my next dental visit?'],
  ['Why is my tooth loose?', 'Why is my tooth loose?'],
  ['My adult tooth feels wobbly', 'My adult tooth is loose'],
  ["My child's tooth is loose", 'My child has a loose baby tooth'],
  ['How long should I brush my teeth?', 'How often and how long should I brush?'],
  ['How often should I floss?', 'How often should I floss?'],
  ['Do I floss before brushing?', 'Should I floss before or after brushing?'],
  ['Should I brush first or floss first?', 'Should I floss before or after brushing?'],
  ['How do I floss my teeth correctly?', 'How do I floss properly?'],
  ['What is the C shape floss technique?', 'How do I floss properly?'],
  ['String floss is hard to use. What are my alternatives?', 'What if string floss is difficult to use?'],
  ['Can I use a waterpik?', 'What if string floss is difficult to use?'],
  ['How often should I use a water flosser?', 'How often should I floss?'],
  ['Why do my gums bleed when I use a water flosser?', 'Why do my gums bleed?'],
  ['Can I wash and reuse dental floss?', 'Can I reuse dental floss?'],
  ['Why does my breath smell?', 'Why do I have bad breath?'],
  ['What is a root canal?', 'What is a root canal?'],
  ['Why do my gums bleed when I floss?', 'Why do my gums bleed?'],
  ['My tooth was knocked out', 'What should I do after a tooth injury?'],
  ['My mouth feels dry', 'Why is my mouth always dry?'],
  ['I am scared of the dentist', 'What if I feel embarrassed or nervous?'],
  ['How often should I change my toothbrush?', 'How often should I replace my toothbrush?'],
];
for (const [question, expected] of cases) {
  assert.equal(engine.resolve(question, answers).entries?.[0]?.question, expected, question);
}
for (const question of ['What is the weather?', 'My tooth is purple', '<script>alert(1)</script>']) {
  assert.equal(engine.rank(question, answers).length, 0, question);
}
const titles = new Set(answers.map(answer => answer.question));
assert.equal(titles.size, answers.length);
for (const answer of answers) {
  assert.ok(answer.answer && answer.prompt && answer.sources.length && answer.checked);
  if (!answer.url.startsWith('https://')) assert.ok(fs.existsSync(path.join(root, answer.url.split('#')[0])));
  for (const source of answer.sources) assert.equal(new URL(source.url).protocol, 'https:');
  for (const followup of answer.followups) assert.ok(titles.has(followup), followup);
}
console.log(`PASS ${cases.length} question regressions, unknown queries, and ${answers.length} sourced answers`);

assert.equal(engine.resolve('How often?', answers).type, 'clarify');
assert.equal(engine.resolve('My gums do not bleed', answers).type, 'unknown');
assert.equal(engine.resolve('My mouth is not dry', answers).type, 'unknown');
assert.equal(engine.resolve('My mouth is not dry but my breath smells', answers).entries[0].id, 'bad-breath');
assert.equal(engine.resolve('It is an adult tooth', answers, {lastIntent:'loose-tooth'}).entries[0].id, 'loose-adult');
assert.equal(engine.resolve('What should I ask?', answers, {lastIntent:'dry-mouth'}).entries[0].bullets[0], answers.find(entry=>entry.id==='dry-mouth').prompt);
assert.equal(engine.resolve('Is that normal?', answers).type, 'clarify');
console.log('PASS ambiguity, negation, and contextual follow-ups');

const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
const productCases = [
  ['Electric toothbrush recommendations', ['Oral B iO Electric Toothbrush', 'Sonicare ProtectiveClean']],
  ['Compare Oral-B iO and Sonicare electric toothbrushes', ['Oral B iO Electric Toothbrush', 'Sonicare ProtectiveClean']],
  ['Compare Oral-B cordless and Philips Sonicare countertop water flossers', ['Oral B Cordless Waterflosser', 'Philips Countertop Waterflosser']],
  ['Compare countertop versus cordless water flossers', ['Oral B Cordless Waterflosser', 'Philips Countertop Waterflosser']],
  ['I need a portable water flosser to take when I travel. What do you recommend?', ['Oral B Cordless Waterflosser']],
  ['I want a waterflosser that sits on my bathroom counter, preferably Philips', ['Philips Countertop Waterflosser']],
  ['Tell me about the Philips countertop waterflosser', ['Philips Countertop Waterflosser']],
  ['Recommend a rinse for dry mouth', ['TheraBreath Dry Mouth Oral Rinse']],
  ['Recommend dry mouth lozenges', ['TheraBreath Dry Mouth Lozenges']],
  ['Compare whitening strips and trays', ['Opalescence Go Trays', 'Crest 3D White Strips']],
  ['Recommend prescription fluoride toothpaste', ['Fluoridex']],
];
for (const [question, expected] of productCases) {
  const result = engine.resolve(question, answers, {}, products);
  assert.equal(result.type, 'answer', question);
  assert.deepEqual(result.entries[0].products.map(product => product.name), expected, question);
  for (const product of result.entries[0].products) assert.ok(products.some(p => p.url === product.url));
}
for (const question of [
  'Should I floss or water floss first?',
  'Should I water floss before string floss?',
  'Should I use a waterpik before or after regular floss?',
  'Should I string floss then use the waterflosser then brush?',
]) {
  const result = engine.resolve(question, answers, {}, products);
  assert.equal(result.entries[0].id, 'water-floss-order', question);
  assert.match(result.entries[0].answer, /string floss first, water floss next, then mouthwash, and finally brush/);
}
const recommendationContext = engine.resolve('Electric toothbrush recommendations', answers, {}, products).context;
assert.equal(engine.resolve('Compare those two', answers, recommendationContext, products).entries[0].products.length, 2);
const waterContext = engine.resolve('Recommend a water flosser', answers, {}, products).context;
assert.equal(engine.resolve('Which is portable?', answers, waterContext, products).entries[0].products[0].name, 'Oral B Cordless Waterflosser');
assert.equal(engine.resolve('Recommend Philips whitening strips', answers, {}, products).type, 'unknown');
assert.equal(engine.resolve('Compare Philips countertop water flossers', answers, {}, products).type, 'clarify');
assert.equal(engine.resolve('Recommend something', answers, {}, products).type, 'clarify');
assert.equal(engine.resolve('Why do my gums bleed with my Philips water flosser?', answers, {}, products).entries[0].id, 'bleeding-gums');
console.log('PASS product recommendations, descriptions, comparisons, format constraints, context, and water-floss order');

for (const question of [
  'When should I floss?', 'When should I be flossing?', 'When is the best time to floss?',
  'At what point in my routine should I floss?', 'Should flossing come before brushing?',
  'Should I brush then floss?', 'Is it better to floss in the morning or at night?',
  'Do I floss after brushing my teeth?', 'What time should I floss?',
]) {
  const result = engine.resolve(question, answers, {}, products);
  assert.equal(result.entries[0].id, 'floss-order', question);
  assert.match(result.entries[0].answer, /think of sweeping before you mop/);
}
const flossRoutine = engine.resolve('Should I floss or water floss first?', answers, {}, products).entries[0].answer;
assert.match(flossRoutine, /water floss next, then mouthwash, and finally brush/);
assert.equal(engine.resolve('How often should I floss?', answers, {}, products).entries[0].id, 'flossing');
assert.equal(engine.resolve('When I floss my gums bleed', answers, {}, products).entries[0].id, 'bleeding-gums');
console.log('PASS floss timing paraphrases, mouthwash sequence, frequency, and symptom routing');

for (const question of ['What water flosser is best?', 'Help me choose a water flosser', 'Which water flosser is the best option?', 'What electric toothbrush is best?']) {
  const result = engine.resolve(question, answers, {}, products);
  assert.equal(result.entries?.[0]?.id, 'product-recommendations', question);
  assert.equal(result.entries[0].products.length, 2, question);
}
console.log('PASS best-option and help-me-choose product requests');
