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
    recommended: 'recommend', comparing: 'compare', compared: 'compare', comparisons: 'comparison', different: 'difference', quieter: 'quiet', cheaper: 'cheap'
  };
  const normalize = text => String(text).toLowerCase().replace(/[’']/g, '')
    .replace(/water[ -]?floss/gi, 'water floss').replace(/tooth[ -]brush/gi, 'toothbrush')
    .replace(/counter[ -]?top|(?:bathroom|sink) counter/g, 'countertop')
    .replace(/x[ -]?rays?/g, 'xray').replace(/check[ -]?ups?/g, 'visit').replace(/[^a-z0-9]+/g, ' ').trim();
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
  const groupForIntent = { 'electric-brush': 'electric toothbrush', 'floss-alternatives': 'water flosser', 'water-floss-basics': 'water flosser', 'fluoride-basics': 'fluoride', 'dry-mouth': 'dry mouth', 'bad-breath': 'bad breath', mouthwash: 'mouthwash', 'bleeding-gums': 'gum care' };
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
    const compare = q.any('compare', 'comparison', 'versus', 'vs', 'difference', 'better');
    const shop = purchaseQuestion || q.any('recommend', 'recommendation', 'suggest', 'suggestions', 'buy', 'purchase', 'looking for', 'pick', 'choose', 'product options', 'products', 'show', 'options', 'what should i get', 'i want');
    const detail = q.any('tell me about', 'describe', 'description', 'details', 'features', 'specifications', 'what does', 'how does');
    let group = productGroups.find(([, terms]) => terms.some(q.contains))?.[0];
    if (!products.length) {
      if (group && (purchaseQuestion || q.any('show', 'buy', 'choose', 'recommendation', 'product options', 'compare') || /^recommend /.test(text))) return { type: 'unknown', message: 'The product details are unavailable right now. Please try again shortly. I can still help with your daily-care questions.', suggestions: ['Do I need an electric toothbrush?', 'When should I floss?'], context: {} };
      return null;
    }
    const named = products.filter(product => q.contains(product.name) || q.contains(product.shortName || product.name) || (product.chatTags || []).some(tag =>
      ['protectiveclean', 'fluoridex', 'xylimelts', 'xyli melts', 'opalescence go', 'io', 'io3', 'crest', 'therabreath'].includes(tag) && q.contains(tag)));
    const negativePreference = /\b(?:do not want|dont want|not .+ instead)\b/.test(normalize(question));
    const referBack = negativePreference || /^what should i (?:get|buy|choose|pick|purchase)$/.test(text) || q.any('these', 'those', 'them', 'the two', 'the 2', 'both', 'one', 'it', 'that', 'heads', 'head shape', 'bristles', 'pressure', 'timer', 'battery', 'cleaning action', 'format') ||
      /^(compare|what is the difference|how are they different|show (?:me )?(?:the |some )?options|tell me more|which (?:is|has|costs) .+|how much(?: do they cost)?|i travel(?: a lot)?|recommend something|what do you recommend)$/.test(normalize(question));
    const contextual = !named.length && context.productGroup && referBack && (!group || group === 'mouthwash') && (!matches.length || matches[0].score < 15 || q.any('options') && context.pending === 'product-options');
    if (contextual) group = context.productGroup;
    // Asking whether a tool is needed or useful is advice, even if 'need' or 'recommended' appears.
    const needAdvice = /\b(do i (?:really )?need|do i have to|should i (?:use|switch|buy|get)|is .+ (?:necessary|worth|recommended)|are .+ (?:necessary|worth|recommended)|would you recommend switching)\b/.test(normalize(question)) || /^do you recommend (?:an? |using )?(?:electric|powered|manual)/.test(normalize(question));
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
    if (!group && !named.length) return matches.length ? null : clarifyProducts();
    // A topic switch into a specific educational question must leave product context behind.
    if (contextual && matches[0]?.score >= 15 && !(q.any('options') && context.pending === 'product-options')) return null;
    let choices = named.length ? named : products.filter(product => (product.chatTags || []).some(tag => tokenize(tag).join(' ') === tokenize(group).join(' ')));
    const mentionedBrands = ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'opalescence', 'crest'].filter(q.contains);
    if (compare && group && named.length && mentionedBrands.length) {
      const candidates = products.filter(product => (product.chatTags || []).includes(group) && mentionedBrands.some(brand => (product.chatTags || []).includes(brand)));
      choices = products.filter(product => choices.includes(product) || candidates.includes(product));
    }
    if (contextual && context.productNames?.length) choices = products.filter(product => context.productNames.includes(product.name));
    const ordinal = q.any('second', '2nd') ? 1 : q.any('third', '3rd') ? 2 : q.any('first', '1st') ? 0 : -1;
    if (contextual && ordinal >= 0 && !compare) choices = choices[ordinal] ? [choices[ordinal]] : [];
    const formats = [['countertop', ['countertop']], ['cordless', ['cordless', 'portable', 'travel']], ['rinse', ['rinse', 'mouthwash']], ['lozenge', ['lozenge', 'lozenges']], ['tablet', ['tablet', 'tablets']], ['strip', ['strip', 'strips']], ['gel', ['gel']], ['tray', ['tray', 'trays']], ['toothpaste', ['toothpaste']], ['varnish', ['varnish']]]
      .filter(([, terms]) => terms.some(q.contains)).map(([format]) => format);
    if (formats.length && !(compare && contextual && q.any('both', 'these', 'those', 'them', 'the two', 'the 2'))) choices = choices.filter(product => compare
      ? formats.some(format => (product.chatTags || []).includes(format))
      : formats.every(format => (product.chatTags || []).includes(format)));
    const brands = ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'opalescence', 'crest'].filter(q.contains);
    if (brands.length) choices = choices.filter(product => brands.some(brand => (product.chatTags || []).includes(brand)));
    // Respect exclusions, such as 'not cordless', instead of recommending the excluded format.
    const exclusions = ['countertop', 'cordless', 'philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'crest', 'opalescence'].filter(term => {
      const pattern = tokenize(term).join(' ');
      return new RegExp(`(?:not(?: want)?|no|without|dont want) (?:a |an |the )?${pattern}(?: |$)`).test(q.tokens.join(' '));
    });
    choices = choices.filter(product => !exclusions.some(tag => (product.chatTags || []).includes(tag)));
    if (!choices.length) return { type: 'unknown', message: 'I don’t have a matching product in Maddie’s recommendations. I can help you look at another format or explain what to consider when choosing.', suggestions: productSuggestions(group), context: {} };
    choices = choices.slice(0, 4);
    const nextContext = { lastIntent: 'product-recommendations', productGroup: group, productNames: choices.map(product => product.name) };
    if (compare && choices.length < 2) return { type: 'clarify', message: 'I found one matching product. Which other product would you like to compare it with?', suggestions: productSuggestions(group), context: nextContext };
    const featureTerms = [['pressure', ['pressure', 'sensor']], ['timer', ['timer']], ['power', ['battery', 'charging', 'charge']], ['mode', ['modes', 'settings']], ['head', ['heads', 'head shape', 'bristles']]]
      .filter(([, terms]) => terms.some(q.contains)).map(([label]) => label);
    const featureQuestion = featureTerms.length && (contextual || named.length || detail || specificChoice) && !q.any('cost', 'quiet');
    const featureRows = featureQuestion ? comparisonRows(choices, true).filter(row => featureTerms.some(term => normalize(row.label).includes(term))) : [];
    const comparison = compare || featureRows.length ? { products: choices, rows: featureRows.length ? featureRows : comparisonRows(choices), caption: featureRows.length ? 'Features you asked about' : 'How these options differ' } : undefined;
    if (comparison && !comparison.rows.length) return { type: 'clarify', message: 'I don’t have enough verified details to explain differences between those products yet. Would you like to compare another pair?', suggestions: productSuggestions(group), context: nextContext };
    let answer = compare ? 'Here are the differences between these options.' : detail || named.length ? 'Here’s what to know about the matching option' + (choices.length > 1 ? 's.' : '.') : 'These are options Maddie recommends. Here’s what each offers.';
    if (featureQuestion) answer = featureRows.length ? 'Here is the recorded information for the feature you asked about.' : `I don’t have verified ${featureTerms.join(' or ')} information for these models in the product records. Check the exact model’s specifications before choosing.`;
    if (group === 'water flosser' && !compare) answer += ' Use water flossing alongside string flossing and brushing in Maddie’s routine.';
    if (q.any('cost', 'cheap', 'budget', 'affordable')) answer = 'I don’t have current retailer prices, so I can’t say which costs less. Check the linked listings, and include replacement heads or accessories in your budget.';
    if (q.any('quiet', 'noise', 'loud')) answer = 'I don’t have verified noise measurements for these products, so I can’t say which is quieter. I can compare the features recorded in the product guide.';
    const sources = [...new Map(choices.flatMap(product => product.factSources || []).map(source => [source.url, source])).values()];
    const entry = {
      id: 'product-recommendations', question, answer, products: choices, comparison,
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
  function resolve(question, answers, context = {}, products = []) {
    const q = analyze(question);
    const text = normalize(question);
    const previous = answers.find(entry => entry.id === context.lastIntent);
    const comparing = q.any('compare', 'comparison', 'difference', 'versus', 'vs', 'better');
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
    if (comparing && q.any('water floss', 'water flosser', 'waterpik') && (q.any('string floss', 'dental floss', 'regular floss') || q.tokens.filter(token => token === 'floss').length > 1)) {
      const entry = answers.find(entry => entry.id === 'floss-alternatives');
      return respond({ ...entry, answer: 'String floss and water floss clean in different ways. Maddie recommends using both in your routine:', bullets: ['String floss touches the sides of each tooth to remove plaque between teeth. Curve it around each tooth and move it gently along the surface.', 'A water flosser directs a stream of water along the gumline and between teeth. Maddie uses it as additional gum care, alongside string flossing.', 'Maddie’s order is string floss, water floss, mouthwash, then brushing.'], followups: ['Should I string floss or water floss first?', 'How do I floss properly?'] }, { productGroup: 'water flosser' });
    }
    if (comparing && q.any('manual') && q.any('electric', 'powered')) {
      const entry = answers.find(entry => entry.id === 'electric-brush');
      return respond({ ...entry, answer: 'The main difference is who does the brushing movement. Maddie highly recommends electric toothbrushes, but a manual brush can also clean effectively with good technique.', bullets: ['Manual: you move the brush by hand to clean each surface.', 'Electric: a motor moves the bristles; you guide the head gently along each tooth. Features such as pressure feedback or timers depend on the model.'], followups: productSuggestions('electric toothbrush') }, { productGroup: 'electric toothbrush', pending: 'product-options' });
    }
    const accepted = /^(yes|yeah|yep|sure|ok|okay|please|yes please|sure please|yes show me|sure show me|go ahead|show me|sounds good|lets see them)$/.test(text);
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
      const clinical = matches.find(match => ['injury', 'loose-adult', 'loose-baby', 'loose-tooth', 'sensitivity', 'pain', 'bleeding-gums'].includes(match.entry.id));
      return advice((clinical || matches[0]).entry);
    }
    // Both daily care questions can be answered in one reply without discarding either subject.
    if (q.any('brush', 'toothbrush') && q.any('floss') && q.any('how often', 'how many times') && !symptoms) return { type: 'answer', entries: ['brushing', 'flossing'].map(id => answers.find(entry => entry.id === id)), context: {} };
    if (matches[0] && (normalize(matches[0].entry.question) === text || specificCare.includes(matches[0].entry.id) && matches[0].score >= 30)) {
      // Explicitly asking for products still works after a general educational topic.
      if (!q.any('recommend', 'recommendation', 'show', 'buy', 'purchase', 'product options')) return advice(matches[0].entry);
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
  return { normalize, analyze, rank, resolve };
});
