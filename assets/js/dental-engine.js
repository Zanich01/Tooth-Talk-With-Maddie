(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.DentalEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const aliases = {
    teeth: 'tooth', gums: 'gum', bleeding: 'bleed', bleeds: 'bleed', flossing: 'floss', flossers: 'flosser', toothbrushes: 'toothbrush',
    brushing: 'brush', brushes: 'brush', questions: 'question', asking: 'ask', asked: 'ask',
    appt: 'visit', appointments: 'visit', appointment: 'visit', checkup: 'visit', checkups: 'visit', visits: 'visit',
    dentist: 'dental', dentists: 'dental', hygienist: 'dental', hygienists: 'dental',
    prepare: 'prep', preparing: 'prep', preparation: 'prep', prepared: 'prep',
    permanent: 'adult', wobbly: 'loose', wiggly: 'loose', moving: 'loose',
    children: 'child', childs: 'child', kids: 'child', kid: 'child', babies: 'baby',
    costs: 'cost', price: 'cost', prices: 'cost', pricing: 'cost', expensive: 'cost',
    hurts: 'hurt', hurting: 'hurt', painful: 'pain', sensitive: 'sensitivity',
    cavities: 'cavity', decayed: 'decay', xrays: 'xray', radiographs: 'xray',
    medicines: 'medication', medications: 'medication', medicine: 'medication',
    anxiety: 'anxious', nervous: 'anxious', scared: 'anxious', afraid: 'anxious',
    smell: 'smelly', smells: 'smelly', stinks: 'smelly', odor: 'smelly', odour: 'smelly',
    swollen: 'swelling', swelling: 'swelling', replacing: 'replace', replacement: 'replace',
    change: 'replace', changing: 'replace', changed: 'replace', recommendations: 'recommendation',
    recommended: 'recommend', comparing: 'compare', compared: 'compare', comparisons: 'comparison', different: 'difference', quieter: 'quiet', cheaper: 'cheap',
    flossed: 'floss', brushed: 'brush', rinsing: 'rinse', rinses: 'rinse',
    dentalfloss: 'floss', waterpick: 'waterpik', waterpiks: 'waterpik', irrigators: 'irrigator',
    braces: 'braces', retainers: 'retainer', aligners: 'aligner', implants: 'implant', dentures: 'denture',
    crowns: 'crown', fillings: 'filling', extractions: 'extraction', sealants: 'sealant', ulcers: 'ulcer', sores: 'sore',
    whiteners: 'whitening', bleaching: 'whitening', bleach: 'whitening', whiten: 'whitening', whitened: 'whitening',
    halitosis: 'badbreath', xerostomia: 'drymouth', calculus: 'tartar', caries: 'cavity',
    receding: 'recession', grinding: 'grind', clenching: 'clench',
    recommends: 'recommend', suggestions: 'suggest', interested: 'interested', travelling: 'travel', traveling: 'travel',
    lozenges: 'lozenge', strips: 'strip', trays: 'tray', tablets: 'tablet', ingredients: 'ingredient',
    softer: 'soft', harder: 'hard', differences: 'difference', benefits: 'benefit', babys: 'baby',
    picks: 'pick', differ: 'difference', antibiotics: 'antibiotic', infections: 'infection',
    mouthrinse: 'mouthwash', mouthrinses: 'mouthwash', mouthguards: 'mouthguard', guards: 'guard',
    bridges: 'bridge', bottles: 'bottle', falls: 'fall', swallows: 'swallow', sizes: 'size', causes: 'cause',
    antihistamines: 'antihistamine', veneers: 'veneer', toddlers: 'toddler', ones: 'one', cheapest: 'cheap', foods: 'food', drinks: 'drink', heads: 'head',
    son: 'child', daughter: 'child', teen: 'child', teenager: 'child', preschooler: 'child', infant: 'baby'
  };
  // Correct common dental typos only; arbitrary fuzzy matching can change a symptom or a brand.
  const spelling = { flossng: 'flossing', flosss: 'floss', flosserr: 'flosser', flosssing: 'flossing',
    toothbruh: 'toothbrush', toothbrushe: 'toothbrush', toothbrushh: 'toothbrush', toothbrsh: 'toothbrush',
    flouride: 'fluoride', flouridex: 'fluoridex', flouridepaste: 'fluoride toothpaste',
    cavaties: 'cavities', cavitys: 'cavities', cavites: 'cavities', gingivitus: 'gingivitis',
    peridontitis: 'periodontitis', periodontitus: 'periodontitis', sensative: 'sensitive', sensetive: 'sensitive',
    mouthwsh: 'mouthwash', mouthwashes: 'mouthwash', sonicaree: 'sonicare', soniccare: 'sonicare',
    therabreat: 'therabreath', xyliemelts: 'xylimelts', opalesense: 'opalescence',
    compar: 'compare', recomend: 'recommend', reccomend: 'recommend', reccomendations: 'recommendations',
    recomendations: 'recommendations', recomended: 'recommended', denturees: 'dentures' };
  const normalize = text => String(text).toLowerCase().replace(/[’']/g, '')
    .replace(/water[ -]?floss/gi, 'water floss').replace(/tooth[ -]brush/gi, 'toothbrush')
    .replace(/counter[ -]?top|(?:bathroom|sink) counter/g, 'countertop')
    .replace(/x[ -]?rays?/g, 'xray').replace(/check[ -]?ups?/g, 'visit').replace(/[^a-z0-9]+/g, ' ').trim()
    .replace(/\b(\d{1,2}) (?:year|years|yr|yrs) old\b/g, (match, age) => Number(age) < 18 ? `${match} child` : match)
    .split(/\s+/).map(word => spelling[word] || word).join(' ');
  const tokenize = text => normalize(text).split(/\s+/).filter(Boolean).map(token => aliases[token] || token);
  const negations = new Set(['no', 'not', 'never', 'dont', 'doesnt', 'isnt', 'without']);
  const broad = new Set(['brush', 'floss', 'gum', 'blood', 'hurt', 'pain', 'cold', 'hot', 'cost', 'treatment', 'cleaning', 'cleanings', 'how often']);
  function analyze(question) {
    const tokens = tokenize(question);
    const contains = value => {
      const term = tokenize(value);
      for (let start = 0; start <= tokens.length - term.length; start++) {
        if (term.every((word, offset) => tokens[start + offset] === word) &&
            !tokens.slice(Math.max(0, start - 3), start).join(' ').split(/\b(?:but|however)\b/).pop().split(' ').some(word => negations.has(word))) return true;
      }
      return false;
    };
    const any = (...values) => values.some(contains);
    return { tokens, contains, any };
  }
  function rank(question, answers) {
    const q = analyze(question);
    const has = q.contains;
    const any = q.any;
    const boosts = new Map();
    const boost = (id, score = 30) => boosts.set(id, Math.max(boosts.get(id) || 0, score));
    const asking = any('ask', 'question', 'talk about', 'discuss');
    const visit = any('dental', 'visit', 'cleaning');
    // Recognize the request as well as the subject: the user's original regression.
    if ((asking && visit) || (any('prep', 'bring', 'ready') && visit)) boost('visit-questions', 70);
    if (any('loose') && any('adult')) boost('loose-adult', 65);
    else if (any('loose') && any('baby', 'child', 'milk')) boost('loose-baby', 65);
    else if (any('loose')) boost('loose-tooth', 40);
    if (any('injury', 'injured', 'knocked out', 'chipped', 'cracked', 'broken tooth')) boost('injury', 85);
    if (any('brush') && any('how long', 'how often', 'minutes', 'times', 'daily', 'day', 'frequency')) boost('brushing', 35);
    if (any('floss') && any('how often', 'daily', 'day', 'times', 'frequency')) boost('flossing', 35);
    const flossTiming = any('before', 'after', 'first', 'order', 'when', 'what time', 'best time', 'morning', 'night', 'bedtime', 'timing', 'then', 'what point', 'what stage');
    if (any('floss') && flossTiming && !any('how often', 'how many times', 'frequency', 'bleed', 'blood', 'hurt', 'pain')) boost('floss-order', 65);
    if (any('water floss', 'water flosser', 'waterpik', 'oral irrigator') && any('before', 'after', 'first', 'order', 'then') &&
        (any('string floss', 'dental floss', 'regular floss') || q.tokens.filter(token => token === 'floss').length > 1 || any('brush'))) boost('water-floss-order', 100);
    if (any('floss') && any('how do i', 'how to', 'properly', 'correctly', 'technique', 'c shape') && !any('before', 'after', 'first', 'order')) boost('floss-technique', 45);
    const flossTool = any('water flosser', 'waterpik', 'interdental brush', 'floss holder');
    if (flossTool && any('how often', 'daily', 'day', 'times', 'frequency')) boost('flossing', 55);
    if ((flossTool || (any('floss') && any('difficult', 'hard to use', 'alternatives', 'cant use', 'cannot use'))) && !any('how often', 'daily', 'day', 'times', 'frequency', 'bleed', 'blood', 'hurt', 'pain', 'before', 'after', 'first', 'order')) boost('floss-alternatives', 50);
    if (any('floss') && any('reuse', 'reusing', 'same piece', 'wash')) boost('reuse-floss', 65);
    if (any('toothbrush', 'brush', 'brush head') && any('replace', 'new', 'frayed', 'worn')) boost('replace-brush', 45);
    if (any('electric', 'powered', 'manual') && any('brush', 'toothbrush')) boost('electric-brush', 40);
    if (any('gum') && any('bleed', 'blood', 'swelling', 'puffy')) boost('bleeding-gums', 35);
    if (any('breath', 'mouth') && any('smelly', 'bad', 'stinky')) boost('bad-breath', 40);
    if (any('cost', 'estimate', 'second opinion', 'options') && !asking) boost('treatment-options', 35);
    if (any('visit', 'dental', 'cleaning') && any('how often', 'return', 'six months', '6 months', 'frequency')) boost('visit-frequency', 35);
    if (any('first', 'start', 'when') && any('baby', 'child') && visit) boost('first-child-visit', 45);
    if (any('root canal')) boost('root-canal', 30);
    if (any('brush') && any('tell me about', 'explain', 'information about') && !any('floss', 'electric', 'powered', 'manual')) boost('brushing', 40);
    if (any('floss') && any('tell me about', 'explain', 'information about') && !any('water floss')) boost('flossing', 40);
    if (any('brush', 'toothbrush') && any('how often', 'how long', 'minutes', 'times', 'daily', 'day', 'frequency') && !any('replace', 'frayed', 'worn')) boost('brushing', 80);
    if (any('water floss', 'water flosser', 'waterpik') && flossTiming && !any('how often', 'how many times', 'frequency')) boost('water-floss-order', 100);
    // Symptoms and specific care instructions outrank a product mentioned in the question.
    if (any('sensitivity') && any('tooth', 'gum', 'mouth', 'brush', 'toothbrush')) boost('sensitivity', 90);
    if (any('hurt', 'pain') && any('tooth', 'gum', 'mouth', 'brush', 'toothbrush')) boost('pain', 90);
    if (any('bleed', 'blood', 'swelling', 'puffy') && any('tooth', 'gum', 'mouth', 'floss', 'brush', 'toothbrush')) boost('bleeding-gums', 90);
    if (any('toothbrush', 'brush head') && any('replace', 'frayed', 'worn')) boost('replace-brush', 80);
    if (any('mouthwash', 'rinse') && any('when', 'before', 'after', 'order', 'first', 'then') && !any('replace')) boost('mouthwash-order', 75);
    if (any('fluoride') && any('what is', 'what does', 'benefits', 'necessary', 'why use', 'why do')) boost('fluoride-basics', 80);
    if (any('cavity', 'decay') && any('prevent', 'avoid', 'prevention') && any('brush', 'how', 'what can')) boost('cavity-prevention-basics', 80);
    if (any('water floss', 'water flosser', 'waterpik') && any('what is', 'what does', 'how does') && !any('compare', 'difference', 'features', 'modes', 'philips', 'oral b', 'sonicare')) boost('water-floss-basics', 85);
    if (any('brush', 'toothbrush') && any('pressure', 'how hard', 'too hard', 'press') && !any('features', 'compare', 'which', 'sensor')) boost('brush-pressure', 80);
    return answers.map(entry => {
      let score = boosts.get(entry.id) || 0;
      // New topics require their complete subject, not one incidental word such as "mouth".
      if (entry.requiredGroups) {
        if (!entry.requiredGroups.every(group => group.some(has))) return { entry, score: 0 };
        score += entry.priority || 70;
      }
      if (entry.exclude?.some(has)) return { entry, score: 0 };
      const terms = new Set(entry.terms.map(term => tokenize(term).join(' ')));
      for (const term of terms) if (has(term)) score += broad.has(term) ? 1 : term.includes(' ') ? 8 : 5;
      if (entry.matchGroups?.every(group => group.some(has))) score += 15;
      if (normalize(question) === normalize(entry.question)) score += 100;
      return { entry, score };
    }).filter(match => match.score >= 5).sort((a, b) => b.score - a.score);
  }
  const productGroups = [
    ['water flosser', ['water floss', 'water flosser', 'waterpik', 'oral irrigator', 'countertop', 'cordless']],
    ['electric toothbrush', ['electric toothbrush', 'powered brush', 'electric brush', 'toothbrush', 'sonicare', 'oral b io']],
    ['dry mouth', ['dry mouth', 'dryness', 'xylimelts', 'xyli melts']],
    ['bad breath', ['bad breath', 'tongue scraper', 'tongue cleaner']],
    ['whitening', ['whitening', 'whiten', 'white strips', 'opalescence']],
    ['fluoride', ['fluoride', 'fluoridex', 'varnish', 'prescription toothpaste', 'cavity prevention']],
    ['gum care', ['gum care', 'gum health', 'healthy gums']],
    ['mouthwash', ['mouthwash', 'mouth rinse', 'rinse']]
  ];
  const groupForIntent = { 'electric-brush': 'electric toothbrush', 'floss-alternatives': 'water flosser', 'water-floss-basics': 'water flosser', 'water-floss-technique': 'water flosser', 'water-flosser-cleaning': 'water flosser', 'water-flosser-liquid': 'water flosser', 'fluoride-basics': 'fluoride', 'dry-mouth': 'dry mouth', 'dry-mouth-care': 'dry mouth', 'bad-breath': 'bad breath', mouthwash: 'mouthwash', 'bleeding-gums': 'gum care', 'whitening-basics': 'whitening', 'whitening-directions': 'whitening', 'brushing-technique': 'electric toothbrush', 'toothbrush-cleaning': 'electric toothbrush' };
  const productSuggestions = group => {
    const suggestions = {
      'electric toothbrush': ['Show electric toothbrush recommendations', 'Compare Oral-B iO and Sonicare', 'How often should I replace my toothbrush?'],
      'water flosser': ['Compare countertop and cordless water flossers', 'Show countertop water flossers', 'Should I string floss or water floss first?'],
      'dry mouth': ['Compare dry mouth rinses and lozenges', 'Show dry mouth lozenges', 'Why is my mouth always dry?'],
      whitening: ['Compare whitening strips and trays', 'Show whitening strips', 'Can a cavity go away on its own?'],
      fluoride: ['Compare Fluoridex and fluoride varnish', 'Show prescription fluoride toothpaste', 'Can a cavity go away on its own?'],
      'bad breath': ['Compare a tongue scraper and breath rinse', 'Why do I have bad breath?', 'Show tongue scrapers'],
      'gum care': ['Show water flosser recommendations', 'Compare countertop and cordless water flossers', 'Why do my gums bleed?'],
      mouthwash: ['Show dry mouth rinses', 'Show gum care rinses', 'Can mouthwash replace flossing?']
    };
    return suggestions[group] || ['Show electric toothbrush recommendations', 'Show water flosser recommendations', 'Show products for dry mouth'];
  };
  const respond = (entry, context = {}) => ({ type: 'answer', entries: [entry], context: { lastIntent: entry.id, ...context } });
  function advice(entry) {
    if (!entry) return { type: 'unknown', message: 'That answer is not available in the current library. Please name the dental topic you would like help with.', suggestions: ['When should I floss?', 'Do I need an electric toothbrush?'], context: {} };
    const group = groupForIntent[entry.id];
    if (entry.id === 'electric-brush') return respond({ ...entry, followups: productSuggestions(group) }, { productGroup: group, pending: 'product-options' });
    if (entry.id === 'water-floss-basics') return respond({ ...entry, followups: productSuggestions(group) }, { productGroup: group, pending: 'product-options' });
    return respond(entry, group ? { productGroup: group } : {});
  }
  function clarifyProducts(context = {}) {
    return { type: 'clarify', message: 'Which products would you like to look at? I can explain the options or compare their differences.', suggestions: productSuggestions(context.productGroup), context };
  }
  function comparisonRows(choices, includeShared = false) {
    const labels = [...new Set(choices.flatMap(product => Object.keys(product.comparisonFacts || {})))];
    return labels.map(label => ({ label, values: choices.map(product => product.comparisonFacts?.[label] || 'Not listed in our product information') }))
      .filter(row => includeShared || new Set(row.values).size > 1);
  }
  function productAnswer(question, products, context, matches) {
    const q = analyze(question);
    const text = normalize(question);
    // The product name can sit between 'what' and 'should I get'. Match the
    // request structure rather than requiring one exact contiguous phrase.
    const purchaseQuestion = /\b(?:what|which)\b.*\b(?:should|could|would|can) (?:i|we) (?:get|buy|choose|pick|purchase)\b/.test(text) ||
      /\b(?:what|which)\b.*\b(?:is|are) (?:the )?best\b/.test(text) ||
      /\b(?:what|which) (?:\w+ ){0,5}(?:flosser|toothbrush|mouthwash|rinse|brand|model|product) (?:should|could|would|can) (?:i|we) use\b/.test(text);
    const compare = comparisonWords(question);
    const shop = purchaseQuestion || q.any('recommend', 'recommendation', 'suggest', 'suggestions', 'buy', 'purchase', 'looking for', 'interested in', 'curious about the options', 'explore', 'pick', 'choose', 'product options', 'products', 'show', 'options', 'what should i get', 'i want', 'help me find');
    const detail = q.any('tell me about', 'describe', 'description', 'details', 'features', 'specifications', 'what does', 'how does', 'overview', 'explain this product') || q.any('what about') && q.any('it', 'that', 'one', 'these', 'them');
    let group = productGroups.find(([, terms]) => terms.some(q.contains))?.[0];
    if (!products.length) {
      if (group && (purchaseQuestion || q.any('show', 'buy', 'choose', 'recommendation', 'product options', 'compare') || /^recommend /.test(text))) return { type: 'unknown', message: 'The product details are unavailable right now. Please try again shortly. I can still help with your daily-care questions.', suggestions: ['Do I need an electric toothbrush?', 'When should I floss?'], context: {} };
      return null;
    }
    const exactNamed = products.filter(product => q.contains(product.name) || q.contains(product.shortName || product.name) || product.aliases?.some(q.contains));
    const named = exactNamed.length ? exactNamed : products.filter(product => (product.chatTags || []).some(tag =>
      ['protectiveclean', 'fluoridex', 'xylimelts', 'xyli melts', 'opalescence go', 'io', 'io3', 'crest'].includes(tag) && q.contains(tag)));
    const negativePreference = /\b(?:do not want|dont want|not .+ instead)\b/.test(normalize(question));
    const referBack = negativePreference || /^what should i (?:get|buy|choose|pick|purchase)$/.test(text) || q.any('these', 'those', 'them', 'the two', 'the 2', 'both', 'one', 'it', 'that', 'heads', 'head shape', 'bristles', 'pressure', 'timer', 'battery', 'cleaning action', 'format') ||
      /^(compare|compare all(?: of them)?|what is the difference|how are they different|show (?:me )?(?:the |some )?options|tell me more|which (?:is|has|costs) .+|how much(?: do they cost)?|i travel(?: a lot)?|recommend something|what do you recommend|what would you (?:choose|pick)|what about .+)$/.test(normalize(question));
    const contextual = !named.length && (context.productGroup || context.productNames?.length) && referBack && (!group || group === 'mouthwash') && (!matches.length || matches[0].score < 15 || q.any('options') && context.pending === 'product-options');
    if (contextual) group = context.productGroup;
    // Asking whether a tool is needed or useful is advice, even if 'need' or 'recommended' appears.
    const needAdvice = /\b(do i (?:really )?need|if i need|whether i need|do i have to|should i (?:use|switch|buy|get)|is .+ (?:necessary|worth|recommended|right for me)|are .+ (?:necessary|worth|recommended)|would you recommend switching|(?:would|could|will|does) .+ (?:help|benefit))\b/.test(normalize(question)) || /^do you recommend (?:an? |using )?(?:electric|powered|manual)/.test(normalize(question));
    if (needAdvice && !purchaseQuestion && !named.length && !q.any('which', 'what brand', 'what model', 'show', 'compare', 'vs', 'versus')) return null;
    if (group === 'electric toothbrush' && q.any('manual')) {
      if (shop && !compare) return { type: 'unknown', message: 'Maddie’s current product list has electric brushes, but no specific manual toothbrush. For a manual brush, look for soft bristles and a head size you can use comfortably.', suggestions: ['Do I need an electric toothbrush?', 'How often and how long should I brush?'], context: {} };
      return null;
    }
    const formRequest = q.any('countertop', 'cordless', 'portable', 'travel') && !q.any('how often', 'how to', 'before', 'after', 'first', 'order', 'then');
    const contextualRequest = contextual && (negativePreference || compare || detail || q.any('which', 'cost', 'cheap', 'quiet', 'battery', 'pressure', 'timer', 'modes', 'portable', 'travel', 'first', 'second', 'third'));
    const specificChoice = group && q.any('which', 'what brand', 'what model');
    if (!shop && !compare && !detail && !named.length && !formRequest && !contextualRequest && !specificChoice) return null;
    if (!group && !named.length && !shop && !compare) return null;
    if (!group && !named.length && !contextual) return matches.length ? null : clarifyProducts();
    // A topic switch into a specific educational question must leave product context behind.
    if (contextual && matches[0]?.score >= 15 && !(q.any('options') && context.pending === 'product-options')) return null;
    let choices = named.length ? named : products.filter(product => (product.chatTags || []).some(tag => tokenize(tag).join(' ') === tokenize(group).join(' ')));
    const mentionedBrands = ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'opalescence', 'crest'].filter(q.contains);
    if (compare && group && named.length && mentionedBrands.length) {
      const unresolvedBrands = mentionedBrands.filter(brand => !named.some(product => (product.chatTags || []).includes(brand)));
      const candidates = products.filter(product => (product.chatTags || []).includes(group) && unresolvedBrands.some(brand => (product.chatTags || []).includes(brand)));
      choices = products.filter(product => choices.includes(product) || candidates.includes(product));
    }
    if (contextual && context.productNames?.length) choices = products.filter(product => context.productNames.includes(product.name));
    if (contextual && q.any('other', 'remaining') && context.comparisonSets?.length) {
      const saved = context.comparisonSets.find(set => set.group === group);
      if (saved) choices = products.filter(product => saved.names.includes(product.name) && !context.productNames?.includes(product.name));
    }
    if (compare && contextual && q.any('again', 'all', 'the two', 'the 2', 'both') && context.comparisonSets?.length) {
      const saved = context.comparisonSets.find(set => set.group === group);
      if (saved?.names.length > choices.length) choices = products.filter(product => saved.names.includes(product.name));
    }
    if (compare && named.length && context.productNames?.length && q.any('it', 'that', 'these', 'those', 'them')) choices = products.filter(product => choices.includes(product) || context.productNames.includes(product.name));
    const ordinals = [['first', '1st'], ['second', '2nd'], ['third', '3rd'], ['fourth', '4th']].map((terms, index) => terms.some(q.contains) ? index : -1).filter(index => index >= 0);
    if (q.any('last')) ordinals.push(choices.length - 1);
    if (contextual && ordinals.length) choices = choices.filter((_, index) => ordinals.includes(index));
    const formats = [['countertop', ['countertop']], ['cordless', group === 'water flosser' ? ['cordless', 'portable', 'travel'] : ['cordless']], ['rinse', ['rinse', 'mouthwash']], ['lozenge', ['lozenge', 'lozenges']], ['tablet', ['tablet', 'tablets']], ['strip', ['strip', 'strips']], ['gel', ['gel']], ['tray', ['tray', 'trays']], ['toothpaste', ['toothpaste']], ['varnish', ['varnish']]]
      .filter(([, terms]) => terms.some(q.contains)).map(([format]) => format);
    const explicitComparison = compare && (named.length > 1 || named.length && context.productNames?.length && q.any('it', 'that', 'these', 'those', 'them'));
    if (formats.length && !explicitComparison && !(compare && contextual && q.any('both', 'these', 'those', 'them', 'the two', 'the 2'))) choices = choices.filter(product => compare
      ? formats.some(format => (product.chatTags || []).includes(format))
      : formats.every(format => (product.chatTags || []).includes(format)));
    const brands = ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'opalescence', 'crest'].filter(q.contains);
    if (brands.length && !explicitComparison) choices = choices.filter(product => brands.some(brand => (product.chatTags || []).includes(brand)));
    // Respect exclusions, such as 'not cordless', instead of recommending the excluded format.
    const exclusions = ['countertop', 'cordless', 'philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'crest', 'opalescence'].filter(term => {
      const pattern = tokenize(term).join(' ');
      return new RegExp(`(?:not(?: want)?|no|without|dont want) (?:a |an |the )?${pattern}(?: |$)`).test(q.tokens.join(' '));
    });
    choices = choices.filter(product => !exclusions.some(tag => (product.chatTags || []).includes(tag)));
    const shape = q.any('round head', 'small round', 'round brush') ? 'round' : q.any('elongated', 'oval head', 'rectangular head') ? 'elongated' : undefined;
    if (shape && !compare && group === 'electric toothbrush') choices = choices.filter(product => normalize(product.comparisonFacts?.['Brush head']).includes(shape));
    if (!choices.length) return { type: 'unknown', message: 'I don’t have a matching product in Maddie’s recommendations. I can help you look at another format or explain what to consider when choosing.', suggestions: productSuggestions(group), context: {} };
    choices = choices.slice(0, 15);
    const families = [...new Set(choices.map(familyOf))];
    const nextContext = { lastIntent: 'product-recommendations', productGroup: families.length > 1 ? undefined : group, productNames: choices.map(product => product.name) };
    if (compare && choices.length < 2) return { type: 'clarify', message: 'I found one matching product. Which other product would you like to compare it with?', suggestions: productSuggestions(group), context: nextContext };
    const featureTerms = [['pressure', ['pressure', 'sensor']], ['timer', ['timer']], ['power', ['battery', 'charging', 'charge']], ['mode', ['modes', 'settings']], ['head', ['heads', 'head shape', 'bristles']]]
      .filter(([, terms]) => terms.some(q.contains)).map(([label]) => label);
    const featureQuestion = featureTerms.length && (contextual || named.length || detail || specificChoice || shop) && !q.any('cost', 'quiet');
    const featureLabels = { pressure: ['pressure', 'sensor'], timer: ['timer'], power: ['power', 'battery', 'charging'], mode: ['mode', 'setting'], head: ['head', 'bristle'] };
    const featureRows = featureQuestion ? comparisonRows(choices, true).filter(row => featureTerms.some(term => featureLabels[term].some(label => normalize(row.label).includes(label)))) : [];
    const comparison = compare || featureRows.length ? { products: choices, rows: featureRows.length ? featureRows : comparisonRows(choices), caption: featureRows.length ? 'Features you asked about' : 'How these options differ' } : undefined;
    if (comparison && !comparison.rows.length) return { type: 'clarify', message: 'I don’t have enough verified details to explain differences between those products yet. Would you like to compare another pair?', suggestions: productSuggestions(group), context: nextContext };
    let answer = compare ? 'Here are the differences between these options.' : detail || named.length ? 'Here’s what to know about the matching option' + (choices.length > 1 ? 's.' : '.') : 'These are options Maddie recommends. Here’s what each offers.';
    if (featureQuestion) answer = featureRows.length ? 'Here is the recorded information for the feature you asked about.' : `I don’t have verified ${featureTerms.join(' or ')} information for these models in the product records. Check the exact model’s specifications before choosing.`;
    if (group === 'water flosser' && !compare) answer += ' Use water flossing alongside string flossing and brushing in Maddie’s routine.';
    if (q.any('cost', 'cheap', 'budget', 'affordable')) answer = 'I don’t have current retailer prices, so I can’t say which costs less. Check the linked listings, and include replacement heads or accessories in your budget.';
    if (q.any('quiet', 'noise', 'loud')) answer = 'I don’t have verified noise measurements for these products, so I can’t say which is quieter. I can compare the features recorded in the product guide.';
    const sources = [...new Map(choices.flatMap(product => product.factSources || []).map(source => [source.url, source])).values()];
    const entry = {
      id: 'product-recommendations', question, title: `${group ? group[0].toUpperCase() + group.slice(1) : 'Product'} ${compare ? 'comparison' : 'options'}`, answer, products: choices, comparison,
      url: 'pr.html', guideLabel: 'Browse Product Recommendations →', prompt: `Which ${group || 'product'} option fits my needs and routine?`,
      sources: sources.length ? sources : [{ title: 'Maddie’s Product Recommendations', url: 'pr.html' }], sourceNote: 'Compare the linked product records for current specifications and directions.',
      followups: compare ? ({
        'electric toothbrush': ['How do the brush heads differ?', 'How hard should I brush?', 'How often should I replace my toothbrush?'],
        'water flosser': ['Which is portable?', 'Which is countertop?', 'Should I string floss or water floss first?'],
        'dry mouth': ['Which one is a rinse?', 'Show dry mouth lozenges', 'Why is my mouth always dry?'],
        whitening: ['Show whitening strips', 'Show whitening trays'],
        fluoride: ['Show prescription fluoride toothpaste', 'What does fluoride do?']
      }[group] || productSuggestions(group).filter(suggestion => !/^Compare/.test(suggestion))) : productSuggestions(group).filter(suggestion => normalize(suggestion) !== normalize(question))
    };
    return respond(entry, nextContext);
  }
  function resolveOne(question, answers, context = {}, products = []) {
    const q = analyze(question);
    const text = normalize(question);
    const previous = answers.find(entry => entry.id === context.lastIntent);
    const comparing = comparisonWords(question);
    const brushMention = q.any('electric', 'powered', 'toothbrush', 'brush', 'sonicare', 'oral b io', 'oralb io', 'io3', 'protectiveclean');
    if (brushMention && q.any('how often', 'how long', 'how many times') && !q.any('replace', 'bleed', 'hurt', 'pain', 'floss')) return advice(answers.find(entry => entry.id === 'brushing'));
    if (q.any('cannot breathe', 'cant breathe', 'difficulty breathing', 'trouble breathing', 'difficulty swallowing', 'cannot swallow')) return respond({
      id: 'urgent-care', answer: 'Difficulty breathing or swallowing can be a medical emergency. Call your local emergency number now for immediate help.',
      url: 'disclaimer.html#urgent-title', prompt: 'Tell emergency services what symptoms you are having and when they started.',
      sources: [{ title: 'NHS: Dental abscess and emergency symptoms', url: 'https://www.nhs.uk/conditions/dental-abscess/' }], checked: 'October 6, 2026', followups: []
    });
    if (q.any('mouthwash', 'rinse') && q.any('swallowed', 'drank', 'ingested')) return respond({
      id: 'mouthwash-ingestion', answer: 'If you swallowed more than a small accidental amount of mouthwash, contact Poison Control for advice now. In the U.S., call 1-800-222-1222; elsewhere, contact your local poison service. Do not make yourself vomit. Keep the bottle handy so they can check the ingredients and amount. If you have trouble breathing or are very unwell, call emergency services immediately.',
      url: 'https://www.poison.org/', prompt: 'What was swallowed, how much, and when?', sources: [{ title: 'Poison Control', url: 'https://www.poison.org/' }], checked: 'October 6, 2026', followups: []
    });
    if (q.any('child', 'baby') && q.any('toothbrush', 'brush', 'electric') && q.any('recommend', 'recommendation', 'buy', 'which', 'best')) return respond({
      id: 'child-brush', answer: 'For a child, choose an age-appropriate, soft-bristled brush with a head that fits their mouth. Maddie’s listed electric models have not been checked for your child’s age, so I won’t suggest an adult model. Ask your dental team which brush is suitable and how to help with brushing.',
      url: 'https://www.mouthhealthy.org/all-topics-a-z/brushing-your-teeth', prompt: 'Which brush is suitable for my child’s age, and how should I help them use it?', sources: [{ title: 'ADA: Brushing your teeth', url: 'https://www.mouthhealthy.org/all-topics-a-z/brushing-your-teeth' }], checked: 'October 6, 2026', followups: ['When should my child first see a dentist?']
    });
    if (comparing && q.any('water floss', 'water flosser', 'waterpik') && (q.any('string floss', 'dental floss', 'regular floss') || /\b(?:(?:vs|versus|and|or|than|from) floss\b|floss (?:vs|versus|or|and)\b)/.test(q.tokens.join(' ')))) {
      const entry = answers.find(entry => entry.id === 'floss-alternatives');
      return respond({ ...entry, answer: 'String floss and water floss clean in different ways. Maddie recommends using both in your routine:', bullets: ['String floss touches the sides of each tooth to remove plaque between teeth. Curve it around each tooth and move it gently along the surface.', 'A water flosser directs a stream of water along the gumline and between teeth. Maddie uses it as additional gum care, alongside string flossing.', 'Maddie’s order is string floss, water floss, mouthwash, then brushing.'], followups: ['Should I string floss or water floss first?', 'How do I floss properly?'] }, { productGroup: 'water flosser' });
    }
    if (comparing && q.any('manual') && q.any('electric', 'powered')) {
      const entry = answers.find(entry => entry.id === 'electric-brush');
      return respond({ ...entry, answer: 'The main difference is who does the brushing movement. Maddie highly recommends electric toothbrushes, but a manual brush can also clean effectively with good technique.', bullets: ['Manual: you move the brush by hand to clean each surface.', 'Electric: a motor moves the bristles; you guide the head gently along each tooth. Features such as pressure feedback or timers depend on the model.'], followups: productSuggestions('electric toothbrush') }, { productGroup: 'electric toothbrush', pending: 'product-options' });
    }
    const accepted = /^(yes|yeah|yep|sure|ok|okay|please|yes please|sure please|yes show me|sure show me|go ahead|show me|sounds good|lets see them|that would be helpful)$/.test(text) ||
      /^(yes|yeah|sure|okay|ok|yep)\b/.test(text) && q.tokens.every(token => ['yes', 'yeah', 'sure', 'okay', 'ok', 'yep', 'i', 'would', 'like', 'to', 'see', 'look', 'at', 'those', 'these', 'them', 'the', 'options', 'please', 'show', 'me', 'recommendation', 'recommend'].includes(token));
    if (accepted) {
      if (context.pending === 'product-options' && context.productGroup) return productAnswer(`Show ${context.productGroup} recommendations`, products, context, []) || clarifyProducts(context);
      return { type: 'clarify', message: 'What would you like to know next?', suggestions: previous?.followups || productSuggestions(context.productGroup), context };
    }
    if (/^(no|no thanks|not now|no thank you|im good|maybe later|thanks|thank you)$/.test(text)) return respond({ id: 'acknowledgement', answer: 'Of course. If another dental question comes up, I’m here to help.', followups: previous?.followups?.filter(s => !/recommend|compare/i.test(s)) || [] });
    if (previous && /^(what should i ask|what should i ask (my|the) (dentist|hygienist))$/.test(text)) return respond({ ...previous, answer: 'A useful question to bring to your dental team is:', bullets: [previous.prompt] });
    if (previous?.id.startsWith('loose-') && q.any('adult', 'baby', 'child') && q.tokens.length <= 8) return advice(answers.find(entry => entry.id === (q.any('adult') ? 'loose-adult' : 'loose-baby')));
    if (text === 'how often' && previous) {
      const id = ['electric-brush', 'replace-brush', 'brushing'].includes(previous.id) ? 'brushing' : previous.id.startsWith('floss') || previous.id === 'water-floss-order' ? 'flossing' : undefined;
      if (id) return advice(answers.find(entry => entry.id === id));
    }
    const matches = rank(question, answers);
    const symptoms = q.any('bleed', 'blood', 'hurt', 'pain', 'swelling', 'injury', 'knocked out', 'loose', 'sensitivity');
    const specificCare = ['water-floss-order', 'floss-order', 'mouthwash-order', 'replace-brush', 'floss-technique', 'reuse-floss', 'brushing', 'flossing', 'plaque', 'fluoride-basics', 'cavity-prevention-basics', 'water-floss-basics', 'brush-pressure'];
    if (symptoms && matches.length) {
      const clinical = matches.find(match => match.entry.clinicalPriority || ['injury', 'loose-adult', 'loose-baby', 'loose-tooth', 'sensitivity', 'pain', 'bleeding-gums'].includes(match.entry.id));
      return advice((clinical || matches[0]).entry);
    }
    // Both daily care questions can be answered in one reply without discarding either subject.
    if (q.any('brush', 'toothbrush') && q.any('floss') && q.any('how often', 'how many times') && !symptoms) return { type: 'answer', entries: ['brushing', 'flossing'].map(id => answers.find(entry => entry.id === id)), context: {} };
    if (matches[0] && (normalize(matches[0].entry.question) === text || matches[0].entry.requiredGroups || specificCare.includes(matches[0].entry.id) && matches[0].score >= 30)) {
      // Explicitly asking for products still works after a general educational topic.
      if (!q.any('recommend', 'recommendation', 'show', 'buy', 'purchase', 'product options') && !(comparing && q.any('all', 'options', 'products'))) return advice(matches[0].entry);
    }
    const recommendation = productAnswer(question, products, context, matches);
    if (recommendation) return recommendation;
    if (!matches.length) {
      if (q.any('how often', 'how long', 'how much', 'compare', 'difference', 'which') || /^(tell me more|is (that|it) normal)$/.test(text)) return { type: 'clarify', message: 'Could you name the topic or products you mean? I can help with daily care, product differences, symptoms, or preparing for a dental visit.', suggestions: ['Do I need an electric toothbrush?', 'When should I floss?', 'What questions should I ask at my next dental visit?'], context: {} };
      return { type: 'unknown', message: 'I don’t have an answer for that in the guide yet. Could you rephrase it or name the dental topic you mean?', suggestions: ['Do I need an electric toothbrush?', 'Why do my gums bleed?', 'When should I floss?'], context: {} };
    }
    if (matches[1] && matches[0].score < 30 && matches[0].score - matches[1].score < 3) return { type: 'clarify', message: 'Which of these best matches what you want to know?', suggestions: matches.slice(0, 3).map(match => match.entry.question), context: {} };
    return advice(matches[0].entry);
  }
  const comparisonWords = question => analyze(question).any('compare', 'comparison', 'difference', 'versus', 'vs', 'better', 'pros and cons', 'advantages', 'disadvantages', 'tradeoffs', 'trade offs');
  const buyingWords = question => analyze(question).any('recommend', 'recommendation', 'suggest', 'show', 'buy', 'purchase', 'options', 'interested in', 'looking for', 'i want', 'choose', 'pick', 'help me find');
  const familyOf = product => product.family || productGroups.find(([group]) => product.chatTags?.includes(group))?.[0];
  const namesIn = (names, products) => Array.isArray(names) ? [...new Set(names)].filter(name => products.some(product => product.name === name)).slice(0, 15) : [];
  function cleanContext(value, products) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
    const context = {};
    if (typeof value.lastIntent === 'string') context.lastIntent = value.lastIntent.slice(0, 80);
    if (productGroups.some(([group]) => group === value.productGroup)) context.productGroup = value.productGroup;
    if (value.pending === 'product-options') context.pending = value.pending;
    if (namesIn(value.productNames, products).length) context.productNames = namesIn(value.productNames, products);
    if (Array.isArray(value.recentTopics)) context.recentTopics = value.recentTopics.filter(id => typeof id === 'string').slice(-6).map(id => id.slice(0, 80));
    if (Array.isArray(value.comparisonSets)) context.comparisonSets = value.comparisonSets.filter(set => set && productGroups.some(([group]) => group === set.group))
      .slice(-8).map(set => ({ group: set.group, names: namesIn(set.names, products) })).filter(set => set.names.length);
    if (value.preferences && typeof value.preferences === 'object') {
      const allowed = ['countertop', 'cordless', 'rinse', 'lozenge', 'tablet', 'strip', 'gel', 'tray', 'toothpaste', 'varnish', 'philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'crest', 'opalescence'];
      context.preferences = {};
      for (const [group] of productGroups) {
        const preference = value.preferences[group];
        if (preference && typeof preference === 'object') context.preferences[group] = {
          include: Array.isArray(preference.include) ? [...new Set(preference.include)].filter(term => allowed.includes(term)).slice(0, 8) : [],
          exclude: Array.isArray(preference.exclude) ? [...new Set(preference.exclude)].filter(term => allowed.includes(term)).slice(0, 8) : []
        };
      }
    }
    return context;
  }
  function remember(result, context, products) {
    const next = cleanContext(result.context, products);
    if (context.preferences) next.preferences = context.preferences;
    const topics = result.entries?.filter(entry => entry.id !== 'acknowledgement').map(entry => entry.id) || [];
    next.recentTopics = [...new Set([...(context.recentTopics || []), ...topics])].slice(-6);
    next.comparisonSets = context.comparisonSets || [];
    if (next.productNames?.length) {
      const groups = [...new Set(products.filter(product => next.productNames.includes(product.name)).map(familyOf))];
      for (const group of groups.filter(Boolean)) {
        const names = products.filter(product => next.productNames.includes(product.name) && familyOf(product) === group).map(product => product.name);
        const earlier = next.comparisonSets.find(set => set.group === group)?.names || [];
        next.comparisonSets = [...next.comparisonSets.filter(set => set.group !== group), { group, names: [...new Set([...earlier, ...names])] }].slice(-8);
      }
    }
    return { ...result, context: next };
  }
  function updatePreferences(question, context, group) {
    if (!group) return context;
    const q = analyze(question);
    const text = q.tokens.join(' ');
    const formats = [['countertop', ['countertop']], ['cordless', group === 'water flosser' ? ['cordless', 'portable', 'travel', 'small bathroom', 'small space'] : ['cordless']],
      ['rinse', ['rinse', 'mouthwash']], ['lozenge', ['lozenge']], ['tablet', ['tablet']], ['strip', ['strip']], ['gel', ['gel']], ['tray', ['tray']], ['toothpaste', ['toothpaste']], ['varnish', ['varnish']]];
    const include = formats.filter(([, terms]) => terms.some(q.contains)).map(([format]) => format);
    const exclude = formats.filter(([, terms]) => terms.some(term => new RegExp(`\\b(?:not(?: want)?|no|without|dont want|dont like|avoid) (?:a |an |the |any )?${tokenize(term).join(' ')}\\b`).test(text))).map(([format]) => format);
    for (const brand of ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'crest', 'opalescence']) {
      if (new RegExp(`\\b(?:not(?: want)?|no|without|dont want|dont like|avoid) (?:a |an |the |any )?${brand}\\b`).test(text)) exclude.push(brand);
    }
    if (!include.length && !exclude.length) return context;
    const old = context.preferences?.[group] || { include: [], exclude: [] };
    const preference = { include: include.length ? include : old.include.filter(term => !exclude.includes(term)),
      exclude: [...new Set([...old.exclude.filter(term => !include.includes(term)), ...exclude])] };
    return { ...context, preferences: { ...context.preferences, [group]: preference } };
  }
  function groupFromQuestion(question, products, context) {
    const q = analyze(question);
    const group = productGroups.find(([, terms]) => terms.some(q.contains))?.[0];
    if (group) return group;
    const formatMatches = products.filter(product => (product.chatTags || []).some(tag => ['lozenge', 'tablet', 'strip', 'gel', 'tray', 'varnish', 'tongue scraper', 'portable', 'travel'].includes(tag) && q.contains(tag)));
    const groups = [...new Set(formatMatches.map(familyOf))];
    if (groups.length === 1) return groups[0];
    // Only an actual reference or preference inherits a shopping subject.
    if (context.productGroup && /^(?:compare|which|show me|tell me more|what about|what would you|what do you recommend|i (?:travel|prefer|want|dont want|do not want)|the |both|all of them)/.test(normalize(question))) return context.productGroup;
    return undefined;
  }
  function scopeProducts(question, context, products) {
    const group = groupFromQuestion(question, products, context);
    const q = analyze(question);
    let current = updatePreferences(question, context, group);
    // Revisit an earlier category without accidentally comparing the latest category.
    const saved = current.comparisonSets?.find(set => set.group === group);
    if (group && current.productGroup !== group && saved && q.any('again', 'earlier', 'previous', 'those', 'them')) current = { ...current, productGroup: group, productNames: saved.names };
    let rewritten = question;
    if (q.any('small bathroom', 'small space') && group === 'water flosser') rewritten += ' cordless';
    if (!productGroups.some(([, terms]) => terms.some(q.contains)) && group && !current.productGroup) rewritten += ` ${group}`;
    const hasExplicitFormat = ['countertop', 'cordless', 'portable', 'travel', 'rinse', 'lozenge', 'tablet', 'strip', 'gel', 'tray', 'toothpaste', 'varnish'].some(q.contains);
    const preference = current.preferences?.[group];
    const named = products.some(product => q.contains(product.name) || q.contains(product.shortName || product.name) || product.aliases?.some(q.contains));
    if (preference && buyingWords(question) && !comparisonWords(question) && !named && !hasExplicitFormat && !q.any('other', 'remaining', 'all', 'both')) {
      if (preference.include.length) rewritten += ` ${preference.include.join(' ')}`;
      if (preference.exclude.length) rewritten += ` ${preference.exclude.map(term => `but not ${term}`).join(' ')}`;
    }
    return { question: rewritten, context: current, group };
  }
  function dentalFollowup(question, answers, context, products) {
    const q = analyze(question);
    const text = normalize(question);
    const previous = answers.find(entry => entry.id === context.lastIntent);
    const active = products.filter(product => context.productNames?.includes(product.name));
    const references = q.any('it', 'them', 'those', 'one', 'that', 'these') || /^(how (?:do i|to) (?:use|clean)|tell me more|what about)/.test(text);
    if (previous && (references || text === 'how often' || text === 'how long') && q.any('how often', 'how long', 'how many times') && q.tokens.length <= 12 && !q.any('replace', 'brush', 'toothbrush', 'floss', 'mouthwash')) {
      const frequency = { 'floss-order': 'flossing', 'floss-technique': 'flossing', 'flossing': 'flossing', 'water-floss-order': 'flossing', 'water-floss-technique': 'flossing', 'water-floss-basics': 'flossing', 'brushing-technique': 'brushing', 'brushing': 'brushing', 'electric-brush': 'brushing', 'gum-disease': 'visit-frequency', 'deep-cleaning': 'visit-frequency', 'periodontal-maintenance': 'visit-frequency', 'whitening-basics': 'whitening-directions' };
      const id = q.any('how long') && ['floss-order', 'floss-technique', 'flossing'].includes(previous.id) ? 'floss-duration' : frequency[previous.id];
      if (id) return advice(answers.find(entry => entry.id === id));
    }
    if (references && q.any('use', 'clean', 'care', 'wash', 'maintain', 'technique') && !buyingWords(question) && !comparisonWords(question)) {
      let id;
      if (context.productGroup === 'water flosser') id = q.any('clean', 'wash', 'maintain') ? 'water-flosser-cleaning' : 'water-floss-technique';
      if (context.productGroup === 'electric toothbrush') id = q.any('clean', 'wash', 'maintain') ? 'toothbrush-cleaning' : 'brushing-technique';
      // Do not let an unrelated explicit dental subject inherit the previous tool.
      const explicitTopic = rank(question, answers).find(match => match.entry.requiredGroups && match.score >= 70);
      if (id && !explicitTopic) return advice(answers.find(entry => entry.id === id));
    }
    if (previous && /^(?:tell me more|can you explain (?:more|that)|explain (?:that|more)|what can i do|what should i do|how can i help it|how do i (?:fix|treat) it)$/.test(text)) {
      const expansions = { 'dry-mouth': 'dry-mouth-care', 'bleeding-gums': 'gum-disease', sensitivity: 'sensitivity-toothpaste', pain: 'pain-relief', 'electric-brush': 'brushing-technique', 'water-floss-basics': 'water-floss-technique', 'floss-alternatives': 'water-floss-technique', 'gum-disease': 'deep-cleaning', whitening: 'whitening-basics', 'cavity': 'cavity-prevention-basics' };
      const entry = answers.find(entry => entry.id === expansions[previous.id]) || previous;
      return advice({ ...entry, bullets: entry.bullets || [entry.prompt] });
    }
    if (active.length && q.any('which', 'choose', 'pick', 'better', 'best') && q.any('easy', 'easier', 'easiest', 'comfort', 'comfortable', 'convenient', 'fit') && !q.any('round', 'elongated')) {
      const rows = comparisonRows(active);
      return respond({ id: 'product-recommendations', answer: 'The useful choice depends on the shape and setup you prefer. Here is what is recorded for these options:',
        products: active, comparison: active.length > 1 ? { products: active, rows, caption: 'Choosing for your routine' } : undefined,
        bullets: active.map(product => `${product.shortName || product.name}: ${product.comparisonFacts?.['Practical fit'] || product.description}`),
        sources: active.flatMap(product => product.factSources || []), followups: productSuggestions(context.productGroup) }, context);
    }
    return null;
  }
  function combineResults(results, question, context, products) {
    const entries = [];
    const unmatched = [];
    let latest = context;
    for (const result of results) {
      latest = result.context || latest;
      if (result.type === 'answer') for (const entry of result.entries) {
        const key = `${entry.id}:${entry.products?.map(product => product.name).join('|') || ''}`;
        if (!entries.some(item => item.key === key)) entries.push({ key, entry });
      }
      else unmatched.push(result.message);
    }
    if (!entries.length) return results[0];
    const allProducts = [...new Set(entries.flatMap(item => item.entry.products?.map(product => product.name) || []))];
    if (allProducts.length) latest = { ...latest, productNames: allProducts, productGroup: [...new Set(allProducts.map(name => familyOf(products.find(product => product.name === name))))].length === 1 ? familyOf(products.find(product => product.name === allProducts[0])) : undefined };
    if (unmatched.length) entries.push({ entry: { id: 'partial-answer', answer: 'For the other part of your message, I need a more specific dental topic or product name.', followups: [] } });
    return { type: 'answer', entries: entries.map(item => item.entry), context: latest };
  }
  function splitRequests(question) {
    // Keep "A and B" intact for comparisons; split only a second request, not a second noun.
    return question.replace(/\b(?:and also|also|plus)\s+(?=(?:how|what|why|when|can|should|do|is|are|compare|recommend|show)\b)/gi, '? ')
      .replace(/\s+and\s+(?=(?:how|why|when|can|should)\b)/gi, '? ')
      .split(/[?;\n]+|\.(?=\s+(?:what|how|why|when|can|should|do|is|are|compare|recommend|show)\b)/i)
      .map(part => part.trim()).filter(Boolean);
  }
  function resolve(question, answers, value = {}, products = []) {
    let context = cleanContext(value, products);
    const text = normalize(question);
    const q = analyze(question);
    const lookup = id => answers.find(entry => entry.id === id);
    if (/^(?:hello|hi|hey|good morning|good evening|what can you (?:answer|do)|help|help me)$/.test(text)) return remember(respond({
      id: 'welcome', answer: 'Hi! I can help with daily dental care, explain dental topics, look through Maddie’s product recommendations, and compare several options. Tell me what you want help with or what matters to you.',
      followups: ['What is Maddie’s daily oral-care routine?', 'Show water flosser recommendations', 'How do gingivitis and periodontitis differ?'] }), context, products);
    if (/^(?:start over|reset|new chat|forget (?:that|my preferences)|clear preferences)$/.test(text)) return respond({ id: 'acknowledgement', answer: 'We can start fresh. What dental question would you like help with?', followups: ['What is Maddie’s daily oral-care routine?'] });
    // Evaluate dangerous symptoms before dividing a message into routine/product requests.
    if (q.any('cannot breathe', 'cant breathe', 'difficulty breathing', 'trouble breathing', 'difficulty swallowing', 'cannot swallow', 'cant swallow', 'trouble swallowing')) return resolveOne('I cannot breathe', answers, {}, products);
    if (q.any('mouthwash', 'rinse') && q.any('swallowed', 'drank', 'ingested')) return resolveOne(question, answers, {}, products);
    if (q.any('toothpaste') && q.any('swallowed', 'swallow', 'ate', 'eaten', 'ingested')) return advice(lookup('toothpaste-ingestion'));
    if (q.any('abscess', 'pus', 'gum boil', 'face swelling', 'facial swelling', 'swollen face')) return remember(advice(lookup('abscess')), context, products);
    if (q.any('child', 'baby', 'toddler') && q.any('water floss', 'water flosser', 'waterpik') && !q.any('bleed', 'pain', 'hurt', 'swelling')) return remember(advice(lookup('child-water-flosser')), context, products);
    if (q.any('child', 'baby', 'toddler') && q.any('brush', 'toothbrush', 'electric') && (buyingWords(question) || q.any('which', 'best')) && !q.any('bleed', 'pain', 'hurt', 'swelling')) return resolveOne('Recommend a toothbrush for my child', answers, context, products);
    if (q.any('knocked out') || q.any('tooth injury') && !buyingWords(question)) return resolveOne(question, answers, context, products);
    // Personal diagnosis, drug selection, and dosing need an examination/prescriber.
    if (q.any('antibiotic') && q.any('which', 'dose', 'dosage', 'prescribe', 'take')) return { type: 'unknown', message: 'A dentist needs to assess the cause and choose any prescription medicine or dose. For a possible dental infection, contact your dentist promptly; I can explain what treatment of an abscess involves.', suggestions: ['What should I do about a possible dental abscess?', 'Do dental infections always need antibiotics?'], context: {} };
    if (q.tokens.includes('antibiotic')) return remember(advice(lookup('antibiotic-basics')), context, products);
    if (q.any('xray') && q.any('read', 'interpret', 'diagnose', 'which tooth', 'infected')) return { type: 'unknown', message: 'I can explain why dental images are used, but interpreting your X-ray or diagnosing an infection requires your dentist’s examination and image review.', suggestions: ['Do I need X-rays at every visit?', 'What questions should I ask at my next dental visit?'], context: {} };
    if (q.any('prescribe', 'write me a prescription')) return { type: 'unknown', message: 'A licensed clinician needs to assess you and issue any prescription. I can explain general dental treatments and prescription-strength products.', suggestions: ['How do I understand a treatment recommendation?', 'What does fluoride do?'], context: {} };
    if (q.any('dog', 'dogs', 'cat', 'cats', 'pet', 'pets')) return { type: 'unknown', message: 'This guide covers human dental care. For an animal’s teeth, use advice and products from a veterinarian.', suggestions: ['What is Maddie’s daily oral-care routine?'], context: {} };
    if (/\b(?:weather|restaurant|patio|stock market|bitcoin|football|javascript|programming|recipe|dogs|cats|politics|laptop|computer|phone|camera|car battery)\b/.test(text) && !/\b(?:tooth|teeth|gum|dental|oral|mouth|brush|floss)\b/.test(text)) return { type: 'unknown', message: 'I can help with dentistry and Maddie’s dental product recommendations. What would you like to know about your oral care?', suggestions: ['What is Maddie’s daily oral-care routine?', 'Why do my gums bleed?'], context: {} };
    const exact = answers.find(entry => normalize(entry.question) === text);
    if (exact) return remember(advice(exact), context, products);
    const parts = splitRequests(question);
    if (parts.length > 1) {
      const results = [];
      for (const part of parts) {
        const result = resolve(part, answers, context, products);
        results.push(result);
        context = result.context || context;
      }
      return combineResults(results, question, context, products);
    }
    const clinicalComparisons = comparisonWords(question) && q.any('and', 'also') ? rank(question, answers).filter(match => match.entry.comparisonTopic && (match.score >= 50 || match.entry.id === 'plaque' && q.any('plaque') && q.any('tartar'))) : [];
    if (clinicalComparisons.length > 1) return remember({ type: 'answer', entries: clinicalComparisons.slice(0, 4).map(match => match.entry), context: { lastIntent: clinicalComparisons[0].entry.id } }, context, products);
    const healthSubjects = [
      ['dry-mouth-care', ['dry mouth', 'drymouth', 'mouth dry']], ['bad-breath', ['bad breath', 'badbreath', 'breath smelly']],
      ['bleeding-gums', ['gum bleed', 'bleeding gum']], ['sensitivity', ['sensitivity']], ['cavity', ['cavity']]
    ].filter(([, terms]) => terms.some(q.contains));
    if (healthSubjects.length > 1 && q.any('and', 'also') && !buyingWords(question) && !comparisonWords(question)) return remember({ type: 'answer', entries: healthSubjects.slice(0, 4).map(([id]) => lookup(id)), context: { lastIntent: healthSubjects[0][0] } }, context, products);
    // Distinguish comparing the jobs of two tools from shopping for several product families.
    const mentioned = productGroups.filter(([group, terms]) => group !== 'mouthwash' && terms.some(q.contains)).map(([group]) => group);
    const explicitlyNamed = products.filter(product => q.contains(product.name) || q.contains(product.shortName || product.name) || product.aliases?.some(q.contains));
    const types = rank(question, answers).find(match => match.entry.id === 'mouthwash-types');
    if (types && !q.any('all', 'options', 'products', 'show', 'buy', 'recommend', 'recommendation') && !explicitlyNamed.length) return remember(advice(types.entry), context, products);
    if (mentioned.includes('water flosser') && mentioned.includes('electric toothbrush') && (comparisonWords(question) || q.any('or')) && !buyingWords(question) && !q.any('philips', 'oral b', 'oralb', 'sonicare', 'all', 'products', 'options')) return remember(respond({
      ...lookup('water-floss-basics'), id: 'brush-water-comparison', answer: 'An electric toothbrush and a water flosser do different jobs in the same routine.',
      bullets: ['Electric toothbrush: bristles clean the outside, inside, and chewing surfaces of teeth.', 'Water flosser: a stream of water cleans along the gumline and between teeth as an additional step alongside string flossing.', 'Maddie’s order is string floss, water floss, mouthwash, then brushing. A water flosser does not replace brushing.'],
      followups: ['Do I need an electric toothbrush?', 'What is water flossing?', 'What is Maddie’s daily oral-care routine?'] }), context, products);
    if (mentioned.length > 1 && (comparisonWords(question) || buyingWords(question)) && explicitlyNamed.length < 2 && !q.any('string floss', 'dental floss', 'manual')) {
      const brands = ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'crest', 'opalescence'].filter(q.contains);
      const results = mentioned.map(group => productAnswer(`${comparisonWords(question) ? 'Compare' : 'Show'} ${group} options ${brands.join(' and ')}`, products.filter(product => familyOf(product) === group), context, []));
      return remember(combineResults(results.filter(Boolean), question, context, products), context, products);
    }
    if (q.any('all', 'everything') && buyingWords(question) && !productGroups.some(([, terms]) => terms.some(q.contains)) && !context.productNames?.length) return { type: 'clarify', message: 'Which area would you like to explore first? I can compare all the listed options in a category, or several named products.', suggestions: ['Compare all whitening options', 'Compare all dry mouth options', 'Compare countertop and cordless water flossers'], context };
    const scoped = scopeProducts(question, context, products);
    context = scoped.context;
    // Explicit new questions take priority over abbreviated product references.
    const followup = dentalFollowup(question, answers, context, products);
    if (followup && !q.any('before', 'after', 'first', 'when') && !rank(question, answers).some(match => match.entry.clinicalPriority)) return remember(followup, context, products);
    const exploring = scoped.group && /^i (?:need|would like|am interested|m interested)\b/.test(text) && q.any('portable', 'travel', 'countertop', 'cordless', 'options');
    let result = resolveOne(exploring ? `${scoped.question} recommendations` : scoped.question, answers, context, products);
    if (result.entries?.[0]?.id === 'floss-alternatives' && scoped.group === 'water flosser' && /\b(?:need|necessary|worth|benefit|help)\b/.test(text) && !q.any('bleed', 'pain', 'hurt', 'swelling')) result = advice(lookup('water-floss-basics'));
    // Product preferences survive an educational topic change, while active product references do not.
    return remember(result, context, products);
  }
  return { normalize, analyze, rank, resolve, cleanContext };
});
