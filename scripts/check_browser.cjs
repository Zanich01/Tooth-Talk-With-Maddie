const { chromium } = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const assert = require('node:assert/strict');
const base = process.env.TEST_DENTAL_URL || 'http://127.0.0.1:8000';
async function run() {
 const browser = await chromium.launch({...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {}),headless:true,args:['--no-sandbox']});
 try {
  for (const width of [390,1280]) for (const fallback of [true,false]) {
   const context = await browser.newContext({viewport:{width,height:900},hasTouch:width===390});
   const page = await context.newPage();
   const errors=[]; page.on('pageerror',error=>errors.push(error.message));
   if(fallback) await page.route('**/api/**',route=>route.fulfill({status:404,body:'{}',contentType:'application/json'}));
   await page.goto(`${base}/index.html`,{waitUntil:'domcontentloaded'});
   await page.locator('.chat-launcher').click();
   await page.locator('#visitor-question').waitFor({state:'visible'});
   const dialog=page.locator('.floating-chat');
   const latest=()=>page.locator('.chat-assistant .chat-bubble').last();
   async function waitReply() {
    await page.waitForFunction(()=>!document.querySelector('#question-finder-form button[type="submit"]').disabled);
    assert.equal(await dialog.evaluate(node=>node.open),true);
    assert.equal(await page.locator('#finder-status').textContent(),'');
   }
   async function ask(question) {
    await page.locator('#visitor-question').fill(question);
    await page.locator('#question-finder-form button[type="submit"]').click();
    await waitReply();
    return latest();
   }
   await ask('Do I need an electric toothbrush?');
   assert.match(await latest().innerText(),/highly recommends/);
   assert.equal(await latest().locator('.chat-product').count(),0);
   await page.locator('#chat-suggestions button').filter({hasText:'Show electric toothbrush recommendations'}).click();
   await waitReply();
   assert.equal(await latest().locator('.chat-product').count(),2);
   await ask('Compare the two');
   assert.equal(await latest().locator('table thead th').count(),3);
   assert.match(await latest().innerText(),/round/);
   assert.match(await latest().innerText(),/Elongated/);
   await page.locator('#new-question').click();
   await ask("I'm interested in a water flosser");
   assert.equal(await latest().locator('.chat-product').count(),2);
   await ask('Which is portable?');
   assert.equal(await latest().locator('.chat-product').count(),1);
   await ask('When should I floss?');
   assert.match(await latest().innerText(),/sweeping before you mop/);
   assert.equal(await latest().locator('.chat-product').count(),0);
   await ask('Recommend a water flosser');
   assert.equal(await latest().locator('.chat-product').count(),1);
   assert.match(await latest().innerText(),/Cordless/);
   await page.locator('#new-question').click();
   await ask('Show water flosser options');
   assert.equal(await latest().locator('.chat-product').count(),2);
   await ask('When should I floss? How hard should I brush?');
   assert.equal(await latest().locator('.chat-answer-title').count(),2);
   assert.match(await latest().innerText(),/sweeping before you mop/);
   assert.match(await latest().innerText(),/Brush gently/);
   await page.locator('#new-question').click();
   await ask('Compare all whitening options');
   assert.equal(await latest().locator('thead th').count(),4);
   assert.equal(await latest().locator('.chat-product').count(),3);
   assert.equal(await latest().locator('.chat-comparison-wide').getAttribute('tabindex'),'0');
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   if(width===390) {
    assert.ok(await latest().locator('.chat-comparison-wide').evaluate(node=>node.scrollWidth>node.clientWidth));
    const horizontalAllowed=await page.evaluate(()=>{
     const table=document.querySelector('.chat-assistant:last-child table');
     const start=new Event('touchstart',{bubbles:true,cancelable:true});
     Object.defineProperty(start,'touches',{value:[{clientX:240,clientY:400}]});table.dispatchEvent(start);
     const move=new Event('touchmove',{bubbles:true,cancelable:true});
     Object.defineProperty(move,'touches',{value:[{clientX:100,clientY:402}]});table.dispatchEvent(move);
     return !move.defaultPrevented;
    });
    assert.ok(horizontalAllowed,'mobile chat handler must allow a sideways table swipe');
    await page.screenshot({path:`/tmp/dental-whitening-${fallback?'static':'backend'}-mobile.png`});
   }
   await ask('Compare the first and third ones');
   assert.equal(await latest().locator('thead th').count(),3);
   await ask('Compare all electric toothbrush and water flosser options');
   assert.equal(await latest().locator('table').count(),2);
   assert.equal(await latest().locator('.chat-answer-title').count(),2);
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
   await page.screenshot({path:`/tmp/dental-multiple-${width}-${fallback?'static':'backend'}.png`});
   await page.keyboard.press('Escape');
   assert.equal(await dialog.evaluate(node=>node.open),false);
   await page.locator('.chat-launcher').click();
   assert.equal(await latest().locator('table').count(),2);
   await page.goto(`${base}/questions.html`,{waitUntil:'domcontentloaded'});
   await page.locator('.chat-launcher').click();
   await page.locator('#visitor-question').waitFor({state:'visible'});
   await ask('When should I floss?');
   assert.match(await latest().innerText(),/sweeping before you mop/);
   assert.equal(await page.locator('#visitor-question').count(),1);
   assert.equal(await page.locator('#visitor-question').getAttribute('maxlength'),'1500');
   assert.deepEqual(errors,[]);
   console.log(`PASS ${width}px ${fallback?'GitHub Pages browser engine':'Node API'}: advice, quick buttons, preferences, multi-answers, wide tables, multiple comparisons, reopen and Q&A page`);
   await context.close();
  }
 } finally { await browser.close(); }
}
run().catch(error=>{console.error(error);process.exitCode=1;});
