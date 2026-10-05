"use strict";
const finder = document.querySelector('.answer-finder');
if (finder) {
  const form = document.querySelector('#question-finder-form');
  const input = document.querySelector('#visitor-question');
  const log = document.querySelector('#chat-messages');
  const suggestions = document.querySelector('#chat-suggestions');
  const status = document.querySelector('#finder-status');
  const submit = form.querySelector('button[type="submit"]');
  const greeting = log.firstElementChild.cloneNode(true);
  let version = 0;
  let context = {};
  let useBackend = false;
  fetch('api/health', {signal: AbortSignal.timeout(2000)}).then(response => response.ok ? response.json() : null).then(data => { useBackend = data?.engine === 'dental-intents'; }).catch(() => {});
  finder.hidden = false;
  function element(tag,text,cls) {
    const node = document.createElement(tag);
    if(text) node.textContent=text;
    if(cls) node.className=cls;
    if(tag==='a' && document.documentElement.classList.contains('chat-embedded')) node.target='_top';
    return node;
  }
  function message(text,user=false) {
    const row=element('article',null,`chat-message ${user?'chat-user':'chat-assistant'}`);
    row.append(element('p',user?'You':'Tooth Talk guide','chat-sender'));
    const bubble=element('div',null,'chat-bubble');
    bubble.append(element('p',text));row.append(bubble);log.append(row);
    return {row,bubble};
  }
  function bringIntoView(row) {
    log.scrollTop = Math.max(0,row.getBoundingClientRect().top-log.getBoundingClientRect().top+log.scrollTop-12);
    if (!finder.closest('.floating-chat') && !document.documentElement.classList.contains('chat-embedded')) finder.scrollIntoView({behavior:'instant',block:'nearest'});
  }
  function setSuggestions(questions) {
    suggestions.replaceChildren();
    for(const question of questions.slice(0,3)) {
      const button=element('button',question);button.type='button';
      button.addEventListener('click',()=> {input.value=question;sendMessage();});
      suggestions.append(button);
    }
  }
  async function sendMessage() {
    const question=input.value.trim();
    if(!question || submit.disabled) {input.focus();return;}
    const request=++version;
    message(question,true);input.value='';submit.disabled=true;
    suggestions.replaceChildren();
    const reply=message('');
    reply.row.classList.add('chat-typing');
    const dots=element('span',null,'typing-dots');
    dots.setAttribute('aria-hidden','true');
    for(let i=0;i<3;i++) dots.append(element('span'));
    reply.bubble.replaceChildren(dots);
    // Give the waiting state a brief readable beat even for instant local replies.
    const loadingBeat=new Promise(resolve=>setTimeout(resolve,450));
    reply.row.setAttribute('aria-busy','true');
    status.textContent='Finding an answer…';bringIntoView(reply.row);
    try {
      let result;
      if (useBackend) {
        try {
          const response = await fetch('api/answer', {method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({question, context}), signal:AbortSignal.timeout(4000)});
          if (!response.ok) throw new Error('Backend unavailable');
          result = await response.json();
        } catch { useBackend = false; }
      }
      if (!result) {
        const answers = await loadCatalog('data/answers.json?v=20261004-cleanup');
        result = DentalEngine.resolve(question, answers, context);
      }
      await loadingBeat;
      if(request!==version)return;
      reply.row.classList.remove('chat-typing');
      context = result.context || {};
      reply.bubble.replaceChildren();
      if(result.type !== 'answer') {
        reply.bubble.append(element('p',result.message));
        if(result.type === 'unknown') {
          const link=element('a','Build a question list for your dentist →');link.href='visit-planner.html';reply.bubble.append(link);
        }
        setSuggestions(result.suggestions || []);
      } else {
        for(const entry of result.entries) {
          reply.bubble.append(element('p',entry.answer));
          if(entry.bullets?.length) {
            const list = element('ul',null,'chat-answer-list');
            for(const bullet of entry.bullets) list.append(element('li',bullet));
            reply.bubble.append(list);
          }
          const link=element('a',entry.url.startsWith('https:')?'Read more from the source':'Explore the full guide →','chat-guide-link');link.href=entry.url;reply.bubble.append(link);
          const details=element('details',null,'chat-evidence');
          details.append(element('summary','Sources & a question for your dentist'));
          details.append(element('p',entry.prompt,'chat-dentist-question'));
          for(const source of entry.sources || []) {
            const sourceLink=element('a',source.title);sourceLink.href=source.url;details.append(sourceLink);
          }
          details.append(element('p',`Sources checked ${entry.checked || 'October 4, 2026'}. Clinician review pending.`,'chat-source-date'));
          reply.bubble.append(details);
        }
        setSuggestions(result.entries[0].followups || []);
      }
      status.textContent='';
    } catch {
      await loadingBeat;
      if(request!==version)return;
      reply.row.classList.remove('chat-typing');
      reply.bubble.replaceChildren(element('p','The answer library couldn’t load. Please try again, or use the guides below.'));
      status.textContent='Unable to load answers. Your conversation has not been saved.';
      setSuggestions(['Why do my gums bleed?','How often should I floss?']);
    } finally {
      if(request===version) {
        reply.row.removeAttribute('aria-busy');submit.disabled=false;
        input.focus({preventScroll:true});bringIntoView(reply.row);
      }
    }
  }
  form.addEventListener('submit',event=> {event.preventDefault();sendMessage();});
  input.addEventListener('keydown',event=> {
    if(event.key==='Enter' && !event.shiftKey && !event.isComposing) {event.preventDefault();sendMessage();}
  });
  document.querySelector('#new-question').addEventListener('click',()=> {
    version++;context={};log.replaceChildren(greeting.cloneNode(true));
    status.textContent='';input.value='';submit.disabled=false;
    setSuggestions(['Do I need an electric toothbrush?','Why do my gums bleed?','How often should I floss?']);
    input.focus({preventScroll:true});log.scrollTop=0;
  });
  setSuggestions(['Do I need an electric toothbrush?','Why do my gums bleed?','How often should I floss?']);
}
