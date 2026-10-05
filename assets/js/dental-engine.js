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
    change: 'replace', changing: 'replace', changed: 'replace'
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
            !tokens.slice(Math.max(0, start - 3), start).some(word => negations.has(word))) return true;
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
    if (any('floss') && any('before', 'after', 'first', 'order')) boost('floss-order', 45);
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
    return answers.map(entry => {
      let score = boosts.get(entry.id) || 0;
      const terms = new Set(entry.terms.map(term => tokenize(term).join(' ')));
      for (const term of terms) if (has(term)) score += broad.has(term) ? 1 : term.includes(' ') ? 8 : 5;
      if (entry.matchGroups?.every(group => group.some(has))) score += 15;
      if (normalize(question) === normalize(entry.question)) score += 100;
      return { entry, score };
    }).filter(match => match.score >= 5).sort((a, b) => b.score - a.score);
  }
  function productAnswer(question, products, context) {
    if (!products.length) return null;
    const q = analyze(question);
    const recommend = q.any('recommend', 'recommendation', 'recommendations', 'suggest', 'suggestions', 'buy', 'purchase', 'which', 'looking for', 'pick', 'product options', 'products', 'best', 'i want', 'i need', 'what should i get') ||
      (q.any('countertop', 'cordless', 'portable') && !q.any('how often', 'how to', 'before', 'after', 'first', 'order', 'then'));
    const compare = q.any('compare', 'comparison', 'versus', 'vs', 'difference', 'better');
    const detail = compare || q.any('tell me about', 'describe', 'description', 'details', 'features', 'what is', 'what does', 'how does');
    const groups = [
      ['water flosser', ['water floss', 'water flosser', 'waterpik', 'oral irrigator', 'countertop', 'cordless']],
      ['electric toothbrush', ['electric toothbrush', 'powered brush', 'electric brush', 'toothbrush', 'sonicare', 'oral b io']],
      ['dry mouth', ['dry mouth', 'dryness', 'xylimelts', 'xyli melts']],
      ['bad breath', ['bad breath', 'tongue scraper', 'tongue cleaner']],
      ['whitening', ['whitening', 'whiten', 'white strips', 'opalescence']],
      ['fluoride', ['fluoride', 'fluoridex', 'varnish', 'prescription toothpaste', 'cavity prevention']],
      ['gum care', ['gum care', 'gum health', 'healthy gums']],
      ['mouthwash', ['mouthwash', 'mouth rinse', 'rinse']]
    ];
    let group = groups.find(([, terms]) => terms.some(q.contains))?.[0];
    const named = products.filter(product => q.contains(product.name) || (product.chatTags || []).some(tag =>
      ['protectiveclean', 'fluoridex', 'xylimelts', 'xyli melts', 'opalescence go', 'io3', 'crest', 'therabreath'].includes(tag) && q.contains(tag)));
    const contextual = !group && !named.length && context.productGroup && (recommend || detail || q.any('countertop', 'cordless', 'portable'));
    if (contextual) group = context.productGroup;
    if (!recommend && !detail && !named.length) return null;
    if (!group && !named.length) {
      if (!recommend) return null;
      return { type: 'clarify', message: 'What would you like a product recommendation for?', suggestions: ['Electric toothbrush recommendations', 'Recommend a countertop water flosser', 'Recommend products for dry mouth'], context: {} };
    }
    let choices = named.length ? named : products.filter(product => (product.chatTags || []).some(tag => tokenize(tag).join(' ') === tokenize(group).join(' ')));
    if (compare && contextual && context.productNames?.length) choices = products.filter(product => context.productNames.includes(product.name));
    // Apply requested formats instead of silently substituting another kind of product.
    const formats = [['countertop', ['countertop']], ['cordless', ['cordless', 'portable', 'travel']], ['rinse', ['rinse', 'mouthwash']], ['lozenge', ['lozenge', 'lozenges']], ['tablet', ['tablet', 'tablets']], ['strip', ['strip', 'strips']], ['gel', ['gel']], ['tray', ['tray', 'trays']], ['toothpaste', ['toothpaste']], ['varnish', ['varnish']]]
      .filter(([, terms]) => terms.some(q.contains)).map(([format]) => format);
    if (formats.length) choices = choices.filter(product => compare
      ? formats.some(format => (product.chatTags || []).includes(format))
      : formats.every(format => (product.chatTags || []).includes(format)));
    const brands = ['philips', 'sonicare', 'oral b', 'oralb', 'therabreath', 'opalescence', 'crest'].filter(q.contains);
    if (brands.length) choices = choices.filter(product => brands.some(brand => (product.chatTags || []).includes(brand)));
    if (!choices.length) return { type: 'unknown', message: 'I don’t have a matching product in Maddie’s recommendations yet. Try another format, or browse the Product Recommendations page.', suggestions: ['Electric toothbrush recommendations', 'Recommend a water flosser', 'Recommend products for dry mouth'], context: {} };
    if (compare && choices.length < 2) return { type: 'clarify', message: 'I only found one matching product in Maddie’s recommendations. Which other product or format would you like to compare it with?', suggestions: ['Compare Oral-B iO and Sonicare electric toothbrushes', 'Compare countertop and cordless water flossers', 'Compare whitening strips and trays'], context: { productGroup: group, productNames: choices.map(product => product.name) } };
    const title = group || 'product';
    const entry = {
      id: 'product-recommendations', question, answer: `${compare ? 'Here is a comparison of the matching options from Maddie’s recommendations' : detail ? 'Here are the matching products' : 'Here are options from Maddie’s product recommendations'}. ${group === 'water flosser' ? 'Maddie uses water flossing as additional gum care alongside daily string flossing and brushing. ' : ''}${compare && group === 'water flosser' ? 'The Philips option is a countertop unit for use at your sink; the Oral-B option is cordless and portable. Consider your counter space and whether you want to travel with it. ' : compare && group === 'electric toothbrush' ? 'Both are electric toothbrush options. Compare replacement-head cost and availability, handle comfort, and the features of the exact model. ' : ''}Choose a product you can use comfortably and consistently. Check the retailer’s current specifications, price, and directions.`,
      products: choices.slice(0, 4), url: 'pr.html', prompt: `Which ${title} option fits my needs and routine?`,
      sources: [{ title: 'Maddie’s Product Recommendations', url: 'pr.html' }], checked: 'October 5, 2026',
      followups: group === 'water flosser' ? ['Should I string floss or water floss first?', 'Recommend a countertop water flosser'] : ['Electric toothbrush recommendations', 'Recommend products for dry mouth']
    };
    return { type: 'answer', entries: [entry], context: { lastIntent: entry.id, productGroup: group, productNames: choices.map(product => product.name) } };
  }
  function resolve(question, answers, context = {}, products = []) {
    const previous = answers.find(entry => entry.id === context.lastIntent);
    const q = analyze(question);
    if (previous && /^(what should i ask|what should i ask (my|the) (dentist|hygienist))[?!.]*$/i.test(question.trim())) {
      return { type: 'answer', entries: [{ ...previous, answer: 'A useful question to bring to your dental team is:', bullets: [previous.prompt] }], context: { lastIntent: previous.id } };
    }
    if (previous?.id.startsWith('loose-') && q.any('adult', 'permanent', 'baby', 'child') && q.tokens.length <= 8) {
      const id = q.any('adult') ? 'loose-adult' : 'loose-baby';
      const entry = answers.find(entry => entry.id === id);
      return { type: 'answer', entries: [entry], context: { lastIntent: id } };
    }
    const matches = rank(question, answers);
    // Sequencing and symptom questions take precedence over product descriptions.
    if (matches[0]?.entry.id !== 'water-floss-order' && !q.any('bleed', 'blood', 'hurt', 'pain', 'swelling', 'injury', 'knocked out')) {
      const recommendation = productAnswer(question, products, context);
      if (recommendation) return recommendation;
    }
    if (!matches.length) {
      if (q.any('how often', 'how long', 'how much') || /^(tell me more|is (that|it) normal)[?!.]*$/i.test(question.trim())) {
        return { type: 'clarify', message: 'Could you name the topic you mean? I can help with brushing, flossing, dental visits, symptoms, or questions to bring to your dentist.', suggestions: ['How often should I floss?', 'How often should I come back?', 'What questions should I ask at my next dental visit?'], context: {} };
      }
      return { type: 'unknown', message: 'I don’t have a sourced answer for that question yet. I can help with daily care, common dental concerns, and preparing for a visit. For personal symptoms or treatment decisions, contact your dental team.', suggestions: ['What questions should I ask at my next dental visit?', 'Why do my gums bleed?', 'How often should I floss?'], context: {} };
    }
    // Closely competing intents require a choice, rather than silently choosing one.
    if (matches[1] && matches[0].score < 30 && matches[0].score - matches[1].score < 3) {
      return { type: 'clarify', message: 'Which of these best matches what you want to know?', suggestions: matches.slice(0, 3).map(match => match.entry.question), context: {} };
    }
    const best = matches[0].entry;
    return { type: 'answer', entries: [best], context: { lastIntent: best.id } };
  }
  return { normalize, analyze, rank, resolve };
});
