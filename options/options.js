const DEFAULTS={enabled:true,ollamaUrl:'http://127.0.0.1:11434',model:'mistral',maxCharsPerPost:2400,timeoutMs:45000};
function getCfg(){return new Promise(r=>chrome.storage.sync.get(DEFAULTS,r));}
function setCfg(p){return new Promise(r=>chrome.storage.sync.set(p,r));}
async function load(){
  const c=await getCfg();
  enabled.checked=!!c.enabled; ollamaUrl.value=c.ollamaUrl; model.value=c.model; maxCharsPerPost.value=c.maxCharsPerPost; timeoutMs.value=c.timeoutMs;
}
async function save(){
  const p={enabled:enabled.checked,ollamaUrl:ollamaUrl.value.trim()||'http://127.0.0.1:11434',model:model.value.trim()||'mistral',
           maxCharsPerPost:Math.max(200,Math.min(8000,parseInt(maxCharsPerPost.value,10)||2400)),
           timeoutMs:Math.max(3000,Math.min(60000,parseInt(timeoutMs.value,10)||45000))};
  await setCfg(p); saveMsg.textContent='Saved.'; setTimeout(()=>saveMsg.textContent='',1500);
}
async function checkHealth(){
  const h = await chrome.runtime.sendMessage({type:'HEALTH',force:true});
  }
saveBtn.addEventListener('click', save); healthBtn.addEventListener('click', checkHealth); load();