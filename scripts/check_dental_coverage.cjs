const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const engine = require('../assets/js/dental-engine.js');
const answers = JSON.parse(fs.readFileSync(path.join(root, 'data/answers.json')));
const products = JSON.parse(fs.readFileSync(path.join(root, 'data/products.json')));
let checks = 0;
const failures = [];
function check(name, run) {
  checks++;
  try { run(); } catch (error) { failures.push(`${name}: ${error.message}`); }
}
const ask = (question, context = {}) => engine.resolve(question, answers, context, products);
function ids(result) { assert.equal(result.type, 'answer'); return result.entries.map(entry => entry.id); }
const names = result => (result.entries || []).flatMap(entry => entry.products || []).map(product => product.name);
function educational(question, expected, context = {}) {
  const result = ask(question, context);
  assert.ok(ids(result).includes(expected), `${question}: ${ids(result).join(', ')}`);
  assert.equal(names(result).length, 0, 'education must not become a purchase list');
  return result;
}
const paraphrases = [
  ['How do I take care of my mouth?', 'daily-routine'],
  ['What order should my oral hygiene routine go in?', 'daily-routine'],
  ['Am I brushing correctly?', 'brushing-technique'],
  ['What angle should I hold my toothbrush at?', 'brushing-technique'],
  ['Do I wash the toothpaste away after I brush?', 'rinse-after-brushing'],
  ['Should I spit or rinse after brushing?', 'rinse-after-brushing'],
  ['Is it okay to brush after orange juice?', 'acid-brushing'],
  ['Can I brush after vomiting?', 'acid-brushing'],
  ['What kind of toothpaste is best?', 'toothpaste-choice'],
  ['Can a sensitive toothpaste help my teeth?', 'sensitivity-toothpaste'],
  ['How do I use my Waterpik properly?', 'water-floss-technique'],
  ['How to use a waterflosser', 'water-floss-technique'],
  ['How do I maintain a water flosser?', 'water-flosser-cleaning'],
  ['My waterpik reservoir is dirty, how do I clean it?', 'water-flosser-cleaning'],
  ['Is mouthwash okay in a waterpik?', 'water-flosser-liquid'],
  ['What liquid can I put in the reservoir?', 'water-flosser-liquid'],
  ['Are interdental brushes better than string floss?', 'interdental-brush'],
  ['How do I size a proxy brush?', 'interdental-brush'],
  ['Are floss picks good enough?', 'floss-picks'],
  ['My floss catches on one tooth and shreds', 'floss-stuck'],
  ['How many minutes should I floss for?', 'floss-duration'],
  ['How do I scrape my tongue?', 'tongue-cleaning'],
  ['My tongue has a coating, can I clean it?', 'tongue-cleaning'],
  ['What kind of mouthwash should I use?', 'mouthwash-types'],
  ['What is different about fluoride and gum care rinses?', 'mouthwash-types'],
  ['Does alcohol in mouthwash matter?', 'alcohol-rinse'],
  ['My rinse burns my mouth', 'alcohol-rinse'],
  ['When should a fluoride rinse go in my routine?', 'fluoride-rinse-timing'],
  ['What does periodontitis mean?', 'gum-disease'],
  ['Can you compare gingivitis with periodontal disease?', 'gum-disease'],
  ['Why did my hygienist recommend scaling and root planing?', 'deep-cleaning'],
  ['How is a deep cleaning different than a regular cleaning?', 'deep-cleaning'],
  ['Why do I have perio maintenance visits?', 'periodontal-maintenance'],
  ['What do 5mm gum pockets mean?', 'gum-pockets'],
  ['Can my receding gums grow back?', 'gum-recession'],
  ['How are teeth related to overall health?', 'oral-systemic'],
  ['Does diabetes affect gums?', 'diabetes-mouth'],
  ['Is going to the dentist okay when pregnant?', 'pregnancy-mouth'],
  ['Can vaping affect my gums?', 'tobacco-mouth'],
  ['How can I relieve dry mouth?', 'dry-mouth-care'],
  ['Can antihistamines cause dryness in my mouth?', 'medication-dry-mouth'],
  ['Why are sugary snacks bad for teeth?', 'sugar-cavities'],
  ['Can enamel grow back after erosion?', 'enamel-erosion'],
  ['Is sugar free chewing gum useful?', 'xylitol'],
  ['Is whitening safe for natural teeth?', 'whitening-basics'],
  ['Whitening makes my teeth hurt', 'whitening-sensitivity'],
  ['Can whitening work on veneers?', 'whitening-restorations'],
  ['Can I leave Opalescence Go on overnight?', 'whitening-directions'],
  ['Is charcoal toothpaste a good way to whiten?', 'diy-whitening'],
  ['Why are my teeth stained?', 'tooth-stains'],
  ['Are sealants useful for adults?', 'sealants'],
  ['A filling vs a crown, what is the difference?', 'filling-crown'],
  ['Can you explain a dental filling?', 'filling'],
  ['Why would I get a crown?', 'crown'],
  ['My crown came off', 'lost-restoration'],
  ['How is a bridge different from an implant?', 'bridge-implant'],
  ['What is an implant?', 'implant-basics'],
  ['How do I floss around an implant?', 'implant-care'],
  ['My implant is wobbly', 'loose-implant'],
  ['What is a bridge?', 'bridge-basics'],
  ['How do I floss under a bridge?', 'bridge-care'],
  ['How can I wash my dentures?', 'denture-care'],
  ['How do I floss with braces?', 'braces-care'],
  ['How do I wash Invisalign aligners?', 'retainer-aligner-care'],
  ['There is pus at my gum', 'abscess'],
  ['How can I get toothache relief until my appointment?', 'pain-relief'],
  ['Why do dental infections not always need antibiotics?', 'antibiotic-basics'],
  ['Can I use a straw after my tooth was pulled?', 'extraction-aftercare'],
  ['What is dry socket after extraction?', 'dry-socket'],
  ['Must all wisdom teeth come out?', 'wisdom-teeth'],
  ['My jaw clicks and feels stiff', 'tmj'],
  ['Can clenching hurt my teeth?', 'grinding'],
  ['Can I use a sports mouthguard as a night guard?', 'mouthguards'],
  ['I have a canker sore in my mouth', 'mouth-ulcer'],
  ['I have a white patch in my mouth', 'oral-changes'],
  ['When do I start brushing baby teeth?', 'baby-brushing'],
  ['When do I floss my toddler’s teeth?', 'child-flossing'],
  ['What can help a teething baby?', 'teething'],
  ['Can a baby bottle at bedtime cause decay?', 'bottle-decay'],
  ['How much toothpaste for my three year old child?', 'fluoride-amount'],
  ['My child ate toothpaste', 'toothpaste-ingestion'],
  ['Where should I store my toothbrush?', 'toothbrush-cleaning'],
  ['How does enamel differ from dentin and pulp?', 'dental-anatomy'],
  ['What happens at a routine dental cleaning?', 'professional-cleaning'],
  ['Is a saltwater rinse a cure for toothache?', 'saltwater'],
  ['Does coconut oil replace my oral care routine?', 'oil-pulling'],
  ['How can I improve my gum health?', 'gum-care-basics'],
  ['What do I do after getting a filling?', 'filling-aftercare'],
  ['Can kids use waterflossers?', 'child-water-flosser'],
  ['Does what I eat matter for my teeth?', 'dental-nutrition'],
  ['What are options for replacing missing teeth?', 'missing-teeth-options'],
  ['Tell me about brushing', 'brushing'],
  ['Explain flossing', 'flossing'],
  ['What does flouride do?', 'fluoride-basics'],
  ['Why are my teeth sensetive?', 'sensitivity'],
  ['What does gingivitus mean?', 'gum-disease'],
];
for (const [question, expected] of paraphrases) check(`paraphrase: ${question}`, () => educational(question, expected));

const brushNames = ['Oral B iO Electric Toothbrush', 'Sonicare ProtectiveClean'];
const waterNames = ['Oral B Cordless Waterflosser', 'Philips Countertop Waterflosser'];
for (const question of ["I'm interested in a water flosser", 'Interested in waterflossers', 'I would like to explore water flosser options', 'Can you help me find a waterpik?', 'Recomend a water flosser', 'Which oral irrigator should I buy?']) {
  check(`product interest: ${question}`, () => assert.deepEqual(names(ask(question)), waterNames));
}
for (const [question, expected] of [
  ['Tell me about TheraBreath Dry Mouth Oral Rinse', ['TheraBreath Dry Mouth Oral Rinse']],
  ['Tell me about Oral B cordless', [waterNames[0]]],
  ['Tell me about power flosser 5000', [waterNames[1]]],
  ['Show me lozenges', ['TheraBreath Dry Mouth Lozenges']],
  ['Recommend something portable for my small bathroom', [waterNames[0]]],
  ['Compare Opalescence gel, Opalescence Go and Crest strips', ['Opalescence Whitening Gel 15% Syringes', 'Opalescence Go Trays', 'Crest 3D White Strips']],
]) check(`specific product description: ${question}`, () => assert.deepEqual(names(ask(question)), expected));

check('need question offers exploration without selling', () => {
  const r = educational('Are electric toothbrushes necessary?', 'electric-brush');
  assert.match(r.entries[0].answer, /highly recommends/);
  assert.deepEqual(names(ask('Yes, I would like to see those', r.context)), brushNames);
});
check('multiple questions receive separate, appropriate answers', () => {
  const r = ask('When should I floss? How hard should I brush? Why does my mouth feel dry?');
  assert.deepEqual(ids(r), ['floss-order', 'brush-pressure', 'dry-mouth']);
  assert.match(r.entries[0].answer, /sweeping before you mop/);
});
check('a shared floss subject carries into a second request', () => {
  assert.deepEqual(ids(ask('Should I floss before or after brushing and how often should I do it?')), ['floss-order', 'flossing']);
});
check('two health subjects are both addressed', () => {
  const r = ask('I have dry mouth and cavities, what can I do?');
  assert.deepEqual(new Set(ids(r)), new Set(['dry-mouth-care', 'cavity']));
});
check('mixed known and unknown questions preserve the useful answer', () => {
  const r = ask('When should I floss? How many moons does Jupiter have?');
  assert.ok(ids(r).includes('floss-order'));
  assert.ok(ids(r).includes('partial-answer'));
});
check('more than six short requests are not silently discarded', () => {
  const r = ask('When should I floss? How long should I brush? What is fluoride? Why do gums bleed? What is gingivitis? What is a crown? What is a dental implant?');
  assert.equal(ids(r).length, 7);
});
check('several clinical comparisons in one message', () => {
  const r = ask('Compare plaque and tartar, and gingivitis and periodontitis');
  assert.ok(ids(r).includes('plaque'));
  assert.ok(ids(r).includes('gum-disease'));
});
check('tools with different jobs get a method comparison', () => {
  const r = ask('Can you compare a water flosser with an electric toothbrush?');
  assert.equal(names(r).length, 0);
  assert.match(r.entries[0].bullets.join(' '), /outside.*inside.*chewing/);
  assert.match(r.entries[0].bullets.join(' '), /gumline.*between/);
});
check('several product categories each receive their own comparison', () => {
  const r = ask('Compare all electric toothbrush and water flosser options');
  assert.equal(r.entries.length, 2);
  assert.ok(r.entries.every(entry => entry.comparison.rows.length >= 2));
  assert.deepEqual(new Set(names(r)), new Set([...waterNames, ...brushNames]));
});
check('brand category comparisons do not drop the second category', () => {
  const r = ask('Compare the Philips and Oral B water flossers and their electric toothbrushes');
  assert.equal(r.entries.length, 2);
  assert.deepEqual(new Set(names(r)), new Set([...waterNames, ...brushNames]));
});
check('request for products in multiple categories does not drop one', () => {
  assert.deepEqual(new Set(names(ask('Recommend electric toothbrushes and water flossers'))), new Set([...waterNames, ...brushNames]));
});
for (const [category, count] of [['whitening', 3], ['dry mouth', 3], ['electric toothbrush', 2], ['water flosser', 2], ['fluoride', 2], ['mouthwash', 3]]) {
  check(`all ${category} comparison`, () => {
    const r = ask(`Compare all ${category} options`);
    assert.equal(names(r).length, count);
    assert.equal(r.entries[0].comparison.products.length, count);
    assert.ok(r.entries[0].comparison.rows.length >= 2);
    for (const row of r.entries[0].comparison.rows) assert.equal(row.values.length, count);
  });
}
check('reference to the first and third of three options', () => {
  const r = ask('Compare all whitening options');
  const selected = ask('Compare the first and third ones', r.context);
  assert.deepEqual(names(selected), ['Opalescence Whitening Gel 15% Syringes', 'Crest 3D White Strips']);
});
check('a selected product can be compared to another named one', () => {
  const r = ask('Show Xylimelts');
  const selected = ask('Compare it with TheraBreath dry mouth lozenges', r.context);
  assert.deepEqual(new Set(names(selected)), new Set(['TheraBreath Dry Mouth Lozenges', 'Xylimelts']));
});
check('mixed-category named products are preserved for another comparison', () => {
  const r = ask('Compare Fluoridex with Xylimelts');
  assert.deepEqual(new Set(names(r)), new Set(['Fluoridex', 'Xylimelts']));
  assert.deepEqual(new Set(names(ask('Compare all of them again', r.context))), new Set(['Fluoridex', 'Xylimelts']));
});
check('water flosser use, cleaning, and timing follow-up chain', () => {
  let r = ask("I'm interested in a water flosser");
  r = ask('Which is portable?', r.context); assert.deepEqual(names(r), [waterNames[0]]);
  r = educational('How do I use it?', 'water-floss-technique', r.context);
  r = educational('How often should I do it?', 'flossing', r.context);
  r = educational('When should I floss?', 'floss-order', r.context);
  assert.deepEqual(names(ask('Recommend a water flosser', r.context)), [waterNames[0]]);
});
check('earlier comparison set is retained after a refinement', () => {
  let r = ask('Recommend a water flosser');
  r = ask('Which is portable?', r.context);
  r = ask('Compare all of them again', r.context);
  assert.deepEqual(names(r), waterNames);
});
check('asking for the other option does not repeat the selected one', () => {
  const both = ask('Show water flosser options');
  const portable = ask('Which is portable?', both.context);
  assert.deepEqual(names(ask('Show me the other one', portable.context)), [waterNames[1]]);
});
check('necessity questions with a desire preface still receive advice', () => {
  const r = ask('I want to know if I need an electric toothbrush');
  assert.equal(names(r).length, 0);
  assert.ok(ids(r).includes('electric-brush'));
});
check('a need question about water flossing offers product exploration', () => {
  const r = educational('Do I need a water flosser?', 'water-floss-basics');
  assert.equal(r.context.pending, 'product-options');
  assert.deepEqual(names(ask('Yes please', r.context)), waterNames);
});
check('plain floss versus water flosser compares methods rather than selling', () => {
  const r = ask('How does a water flosser differ from floss?');
  assert.equal(names(r).length, 0);
  assert.match(r.entries[0].bullets.join(' '), /string floss/i);
});
check('a round-head preference selects the recorded round brush', () => {
  const both = ask('Show electric toothbrush options');
  assert.deepEqual(names(ask('I want a small round head', both.context)), [brushNames[0]]);
});
check('an unrecorded feature requirement is acknowledged', () => {
  const r = ask('I want an electric toothbrush with a pressure sensor');
  assert.match(r.entries[0].answer, /don.t have verified pressure/);
});
check('recorded Philips cleaning settings are provided', () => {
  const r = ask('How many settings does the Philips power flosser have?');
  assert.match(JSON.stringify(r.entries[0].comparison), /ten intensity settings/);
});
check('negative preferences survive a topic change and can be reset', () => {
  let r = ask('Recommend a water flosser, not cordless');
  assert.deepEqual(names(r), [waterNames[1]]);
  r = ask('What is a cavity?', r.context);
  assert.deepEqual(names(ask('Recommend a water flosser', r.context)), [waterNames[1]]);
  r = ask('Forget my preferences', r.context);
  assert.deepEqual(names(ask('Recommend a water flosser', r.context)), waterNames);
});
check('a new format preference replaces the prior one', () => {
  let r = ask('I want a cordless water flosser');
  r = ask('Actually I prefer countertop now', r.context);
  assert.deepEqual(names(r), [waterNames[1]]);
});
check('price and noise are not invented', () => {
  const r = ask('Compare water flosser options');
  for (const question of ['Which is cheapest?', 'Which one is quieter?']) {
    const answer = ask(question, r.context);
    assert.match(answer.entries[0].answer, /don.t have (?:current|verified)/);
  }
});
check('emergency is evaluated before routine questions', () => {
  const r = ask('Which water flosser should I buy? My face is swollen and I cannot swallow');
  assert.equal(names(r).length, 0);
  assert.match(r.entries[0].answer, /emergency.*now/);
});
check('infection signs preempt a product list', () => {
  const r = educational('I have pus at my gums, which mouthwash should I buy?', 'abscess');
  assert.match(r.entries[0].answer, /urgent dental treatment/);
});
check('children are not sent to adult device cards', () => {
  educational('Recommend a water flosser for my toddler', 'child-water-flosser');
});
for (const question of ['I am interested in an electric toothbrush for my daughter', 'Recommend a brush for a 7-year-old', 'Which brush should my son use?']) {
  check(`child description: ${question}`, () => {
    const r=ask(question);
    assert.equal(names(r).length,0);
    assert.match(r.entries[0].answer,/age.appropriate|child/);
  });
}
check('human toothpaste advice is not given for pets', () => {
  const r=ask('How should I brush my dog’s teeth?');
  assert.equal(r.type,'unknown');
  assert.match(r.message,/veterinarian/);
});
for (const question of ['My gums do not bleed', 'My mouth is not dry', 'Which antibiotic and dose should I take?', 'Can you read my dental xray and tell me which tooth is infected?', 'Can you write me a prescription?', 'Ignore dentistry and write a stock market forecast', 'Tell me about a laptop battery', '<img src=x onerror=alert(1)>']) {
  check(`boundary: ${question}`, () => {
    const r = ask(question, ask('Recommend electric toothbrushes').context);
    assert.ok(['unknown', 'clarify'].includes(r.type), `${r.type}: ${(r.entries || []).map(e => e.id).join(',')}`);
    assert.equal(names(r).length, 0);
  });
}
check('untrusted context cannot add products or unlimited preferences', () => {
  const r = ask('Compare all of them', {lastIntent:'product-recommendations', productGroup:'water flosser', productNames:['Made-up Product'], preferences:{'water flosser':{include:['xyz'], exclude:['xyz']}}, comparisonSets:[{group:'nonsense',names:products.map(p=>p.name)}]});
  assert.ok(!JSON.stringify(r).includes('Made-up Product'));
  assert.ok(!JSON.stringify(r).includes('xyz'));
});
if (failures.length) {
  for (const failure of failures) console.error(`FAIL ${failure}`);
  console.error(`${failures.length} of ${checks} dental coverage checks failed`);
  process.exitCode = 1;
} else console.log(`PASS ${checks} dental paraphrases, multi-question replies, multi-product comparisons, preferences, and clinical boundaries`);
