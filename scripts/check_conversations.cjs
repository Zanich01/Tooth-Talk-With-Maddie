const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const root = path.resolve(__dirname, '..');
const engine = require(path.join(root, 'assets/js/dental-engine.js'));
const answers = JSON.parse(fs.readFileSync(path.join(root, 'data/answers.json'), 'utf8'));
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json'), 'utf8'));
let checks = 0;
const failures = [];

function check(name, run) {
  checks += 1;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
function ask(question, context = {}) {
  return engine.resolve(question, answers, context, products);
}
function first(result) {
  assert.equal(result.type, 'answer');
  assert.ok(result.entries?.length, 'answer must contain an entry');
  return result.entries[0];
}
function noSales(result) {
  assert.ok(!result.entries?.some(entry => entry.products?.length), 'advice must not include purchase cards');
}
function replyText(result) {
  return [result.message, ...(result.entries || []).flatMap(entry => [entry.answer, ...(entry.bullets || [])])].filter(Boolean).join(' ');
}
function intent(question, id, context = {}) {
  const result = ask(question, context);
  assert.equal(first(result).id, id, question);
  noSales(result);
  return result;
}
function productNames(result) {
  return first(result).products?.map(product => product.name) || [];
}
function comparison(result, expectedNames) {
  const entry = first(result);
  assert.deepEqual(productNames(result), expectedNames);
  assert.ok(entry.comparison, 'comparison must show actual differences');
  assert.ok(entry.comparison.rows?.length >= 2, 'comparison needs at least two useful criteria');
  for (const row of entry.comparison.rows) {
    assert.ok(row.label, 'comparison criterion must be labelled');
    assert.equal(row.values.length, expectedNames.length, 'every product needs a value for each criterion');
    assert.ok(row.values.every(value => typeof value === 'string' && value.trim()), 'comparison values must contain useful text');
  }
  assert.ok(entry.comparison.rows.some(row => new Set(row.values).size > 1), 'comparison must include a real distinction');
}

// Answer retrieval must not override even an exact library question with a sale.
for (const answer of answers) {
  check(`library: ${answer.question}`, () => intent(answer.question, answer.id));
}

const brushNames = ['Oral B iO Electric Toothbrush', 'Sonicare ProtectiveClean'];
const waterNames = ['Oral B Cordless Waterflosser', 'Philips Countertop Waterflosser'];

for (const question of [
  'Do I need an electric toothbrush?',
  'Should I use a powered toothbrush?',
  'Are electric toothbrushes worth it?',
  'Would you recommend switching to an electric toothbrush?',
]) {
  check(`advice first: ${question}`, () => {
    const result = intent(question, 'electric-brush');
    assert.match(first(result).answer, /Maddie.*highly recommend/i);
    assert.match(first(result).answer, /(?:look|explor|recommendation|option|compare)/i);
    assert.equal(result.context.pending, 'product-options');
    assert.equal(result.context.productGroup, 'electric toothbrush');
  });
}

for (const question of ['Yes', 'Yes please', 'Sure', 'Show me the options']) {
  check(`consent: ${question}`, () => {
    const advice = ask('Do I need an electric toothbrush?');
    assert.deepEqual(productNames(ask(question, advice.context)), brushNames);
  });
}

for (const question of ['No thanks', 'Not now']) {
  check(`decline: ${question}`, () => {
    const advice = ask('Do I need an electric toothbrush?');
    const declined = ask(question, advice.context);
    assert.equal(declined.type, 'answer');
    noSales(declined);
    assert.ok(!declined.context?.pending, 'declining must clear the product offer');
    noSales(ask('Yes', declined.context));
  });
}

for (const question of ['Yes', 'Compare the two', 'Which one is better?']) {
  check(`unbound follow-up: ${question}`, () => {
    const result = ask(question);
    assert.ok(['clarify', 'unknown'].includes(result.type));
    noSales(result);
  });
}

for (const question of [
  'Electric toothbrush recommendations',
  'Show me electric toothbrush options',
  'I am looking for an electric toothbrush to buy',
]) {
  check(`explicit product request: ${question}`, () => {
    assert.deepEqual(productNames(ask(question)), brushNames);
  });
}

for (const question of [
  'Compare Oral-B iO and Sonicare electric toothbrushes',
  'What is the difference between Oral-B iO and Sonicare ProtectiveClean?',
]) {
  check(`named brush comparison: ${question}`, () => comparison(ask(question), brushNames));
}

for (const question of ['Compare the 2', 'Compare those two', 'What is the difference?', 'How are they different?']) {
  check(`contextual comparison: ${question}`, () => {
    const options = ask('Electric toothbrush recommendations');
    comparison(ask(question, options.context), brushNames);
  });
}

check('water flosser comparison explains countertop versus cordless', () => {
  const result = ask('Compare countertop versus cordless water flossers');
  comparison(result, waterNames);
  assert.match(JSON.stringify(first(result).comparison), /countertop/i);
  assert.match(JSON.stringify(first(result).comparison), /cordless|portable/i);
});

check('advice, consent, comparison, and a feature follow-up stay connected', () => {
  const advice = ask('Do I need an electric toothbrush?');
  noSales(advice);
  const options = ask('Yes please', advice.context);
  assert.deepEqual(productNames(options), brushNames);
  const compared = ask('Compare the 2', options.context);
  comparison(compared, brushNames);
  const feature = ask('Which has pressure feedback?', compared.context);
  const entry = first(feature);
  assert.deepEqual(productNames(feature), brushNames);
  const pressureRows = entry.comparison?.rows?.filter(row => /pressure/i.test(row.label)) || [];
  if (pressureRows.length) {
    assert.ok(pressureRows.every(row => row.values.length === brushNames.length), 'known pressure information must cover both options');
  } else {
    assert.match(entry.answer, /(?:don.t have verified pressure|pressure.{0,50}(?:unavailable|not (?:listed|verified)))/i, 'unknown feature information must be stated explicitly, rather than replaced with generic recommendations');
  }
});

check('an ordinal product follow-up selects the displayed second option', () => {
  const options = ask('Electric toothbrush recommendations');
  assert.deepEqual(productNames(ask('Tell me about the second one', options.context)), [brushNames[1]]);
});

check('comparison keeps both products while considering a travel preference', () => {
  const options = ask('Recommend a water flosser');
  comparison(ask('Compare both and which is best for travel?', options.context), waterNames);
});

check('missing product data does not invent recommendations or links', () => {
  const result = engine.resolve('Electric toothbrush recommendations', answers, {}, []);
  assert.equal(result.type, 'unknown');
  noSales(result);
  assert.match(replyText(result), /unavailable|couldn.t load|try again/i);
});

check('dry mouth comparison describes formats', () => {
  const options = ask('Recommend products for dry mouth');
  const names = productNames(options);
  const result = ask('Compare these', options.context);
  comparison(result, names);
  assert.match(JSON.stringify(first(result).comparison), /rinse|lozenge|tablet/i);
});

check('whitening comparison distinguishes strips and trays', () => {
  comparison(ask('Compare whitening strips and trays'), ['Opalescence Go Trays', 'Crest 3D White Strips']);
});

check('countertop preference selects the countertop unit', () => {
  assert.deepEqual(productNames(ask('Recommend a Philips countertop water flosser')), ['Philips Countertop Waterflosser']);
});

check('travel preference selects the cordless unit', () => {
  assert.deepEqual(productNames(ask('I need a portable water flosser to take when I travel. What do you recommend?')), ['Oral B Cordless Waterflosser']);
});

check('follow-up travel preference remembers the product category', () => {
  const options = ask('Recommend a water flosser');
  assert.deepEqual(productNames(ask('I travel a lot', options.context)), ['Oral B Cordless Waterflosser']);
});

check('a format follow-up refines the previous options', () => {
  const options = ask('Recommend products for dry mouth');
  assert.deepEqual(productNames(ask('Which one is a rinse?', options.context)), ['TheraBreath Dry Mouth Oral Rinse']);
});

check('unsupported manual brush request never substitutes electric brushes', () => {
  const result = ask('Recommend a soft manual toothbrush');
  assert.ok(['clarify', 'unknown', 'answer'].includes(result.type));
  noSales(result);
});

check('unsupported brand/format combination never substitutes another product', () => {
  const result = ask('Recommend Philips whitening strips');
  assert.ok(['clarify', 'unknown'].includes(result.type));
  noSales(result);
});

check('single-product comparison requests the missing option', () => {
  assert.equal(ask('Compare Philips countertop water flossers').type, 'clarify');
});

for (const [question, id] of [
  ['How often should I brush with an electric toothbrush?', 'brushing'],
  ['How often should I replace my electric toothbrush head?', 'replace-brush'],
  ['How do I floss correctly?', 'floss-technique'],
  ['How often should I use a water flosser?', 'flossing'],
  ['When should I floss?', 'floss-order'],
  ['Is it better to floss in the morning or at night?', 'floss-order'],
  ['Why do my gums bleed with my Philips water flosser?', 'bleeding-gums'],
  ['My electric toothbrush makes my teeth sensitive', 'sensitivity'],
  ['My tooth is loose, which brush is best?', 'loose-tooth'],
]) {
  check(`care advice: ${question}`, () => intent(question, id));
}

check('Maddie floss timing keeps the sweeping analogy', () => {
  assert.match(first(ask('When should I floss?')).answer, /sweeping before you mop/i);
});

for (const question of ['How often should I brush and floss?', 'How often should I floss and brush my teeth?']) {
  check(`both frequency questions: ${question}`, () => {
    const result = ask(question);
    assert.equal(result.type, 'answer');
    assert.deepEqual(new Set(result.entries.map(entry => entry.id)), new Set(['brushing', 'flossing']));
    noSales(result);
  });
}

for (const [question, id] of [
  ['My gums are not bleeding but my tooth hurts', 'pain'],
  ['My tooth does not hurt but my gums bleed', 'bleeding-gums'],
  ['I have no dry mouth but bad breath', 'bad-breath'],
]) {
  check(`negation respects a new clause: ${question}`, () => intent(question, id));
}

check('a negated product preference excludes that format', () => {
  const options = ask('Recommend a water flosser');
  assert.deepEqual(productNames(ask('I do not want cordless', options.context)), ['Philips Countertop Waterflosser']);
});

check('a negated product brand excludes that brand', () => {
  assert.deepEqual(productNames(ask('Recommend a water flosser, but not Philips')), ['Oral B Cordless Waterflosser']);
});

for (const question of [
  'Should I floss or water floss first?',
  'Should I water floss before string floss?',
  'Should I use a waterpik before or after regular floss?',
  'When should I water floss?',
]) {
  check(`Maddie sequence: ${question}`, () => {
    const result = intent(question, 'water-floss-order');
    assert.match(first(result).answer, /string floss first, water floss next, then mouthwash, and finally brush/i);
  });
}

check('topic switch beats product conversation context', () => {
  const options = ask('Electric toothbrush recommendations');
  const plaque = intent('What is the difference between plaque and tartar?', 'plaque', options.context);
  assert.ok(!plaque.context.productNames);
  noSales(ask('Compare the two', plaque.context));
});

check('timing question beats product conversation context', () => {
  const options = ask('Electric toothbrush recommendations');
  intent('Actually when should I floss?', 'floss-order', options.context);
});

check('symptom question beats product conversation context', () => {
  const options = ask('Electric toothbrush recommendations');
  intent('My adult tooth is loose', 'loose-adult', options.context);
});

check('comparison of string floss and water floss explains the methods', () => {
  const result = ask('Compare string floss and water floss');
  noSales(result);
  assert.match(replyText(result), /string floss/i);
  assert.match(replyText(result), /water floss/i);
  assert.match(replyText(result), /(?:plaque|along|sides|contact)/i);
});

check('comparison of manual and electric brushing explains how they differ', () => {
  const result = ask('What is the difference between manual and electric toothbrushes?');
  noSales(result);
  assert.match(replyText(result), /manual/i);
  assert.match(replyText(result), /electric/i);
  assert.match(replyText(result), /(?:by hand|hand.*movement|movement for you|motor|vibrat|oscillat)/i);
});

check('difficulty breathing gets urgent help before routine gum advice', () => {
  const result = ask('My face is swelling and I cannot breathe');
  noSales(result);
  assert.match(replyText(result), /(?:emergency|911|999|112)/i);
  assert.match(replyText(result), /(?:now|immediately|urgent)/i);
});

check('mouthwash ingestion does not get routine mouthwash advice', () => {
  const result = ask('What if I swallowed mouthwash?');
  noSales(result);
  assert.match(replyText(result), /poison/i);
});

check('young child product request checks age suitability', () => {
  const result = ask('My child is 4, recommend an electric toothbrush');
  noSales(result);
  assert.match(replyText(result), /child|age/i);
  assert.match(replyText(result), /dentist|dental team|pediatric/i);
});

for (const question of [
  'What is the weather?',
  'I need help building a patio',
  'Which restaurant is better?',
  'My tooth is purple',
  'Which antibiotic should I take?',
  '<script>alert(1)</script>',
]) {
  check(`unsupported: ${question}`, () => {
    const result = ask(question);
    assert.ok(['clarify', 'unknown'].includes(result.type), 'unsupported question must not get an unrelated dental answer');
    noSales(result);
  });
}

for (const question of [
  'Which restaurant is better?',
  'Which antibiotic should I take?',
  'Tell me about dogs',
  'How does brushing prevent cavities?',
]) {
  check(`new subject must leave product context: ${question}`, () => {
    const options = ask('Electric toothbrush recommendations');
    noSales(ask(question, options.context));
  });
}

check('a named toothbrush frequency question still gives care advice', () => {
  intent('How often should I use my Oral-B iO?', 'brushing');
});

for (const question of ['My gums do not bleed', 'My mouth is not dry']) {
  check(`negated symptoms: ${question}`, () => {
    assert.equal(ask(question).type, 'unknown');
  });
}

if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`${failures.length} of ${checks} conversation checks failed`);
  process.exitCode = 1;
} else {
  console.log(`PASS ${checks} advice, recommendations, comparisons, follow-ups, context, and unsupported-query checks`);
}
