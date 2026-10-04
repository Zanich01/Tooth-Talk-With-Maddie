(function (root, factory) {
  const engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  else root.DentalEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const aliases = {
    teeth: 'tooth', gums: 'gum', bleeding: 'bleed', bleeds: 'bleed', flossing: 'floss',
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
  function resolve(question, answers, context = {}) {
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
