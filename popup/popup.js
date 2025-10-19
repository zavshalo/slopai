async function getCfg(){return new Promise(r=>chrome.storage.sync.get({enabled:true,ollamaUrl:'http://127.0.0.1:11434',model:'mistral'},r));}
async function setCfg(p){return new Promise(r=>chrome.storage.sync.set(p,r));}
function setDot(el,state){el.className='dot '+(state||'');}
function showBanner(show){document.getElementById('edgeBanner').classList.toggle('hidden',!show);}
async function refresh(){
  const s=document.getElementById('statusLine'); s.textContent='Checking…';
  const h=await chrome.runtime.sendMessage({type:'HEALTH',force:true});
  setDot(document.getElementById('extDot'), h.extensionRunning ? 'ok':'bad');
  setDot(document.getElementById('ollamaDot'), h.ollamaReachable ? 'ok':'bad');
  setDot(document.getElementById('modelDot'), h.modelReady ? 'ok' : (h.pulling ? 'warn' : 'bad'));
  let line = h.lastError ? ('Issue: '+h.lastError) : (h.pulling ? 'Pulling model…' : 'All good.');
  if (h.usingFallback && h.fallbackModel) line = 'Using fallback: '+h.fallbackModel;
  showBanner(h.corsBlocked || h.edgeBlocked);
  s.textContent = line;
}
document.getElementById('retryBtn').addEventListener('click', refresh);
document.getElementById('genConfigBtn').addEventListener('click', async ()=>{
  const res = await chrome.runtime.sendMessage({type:'GEN_CONFIG'});
  if (!res || !res.yaml) { document.getElementById('genResult').textContent = 'Could not generate config.'; return; }
  const blob = new Blob([res.yaml], {type:'text/yaml'});
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'config.yaml';
  link.click();
  document.getElementById('genResult').innerHTML = 'Downloaded <code>config.yaml</code>. Place it at:<br><b>Windows</b>: %USERPROFILE%\\\\.ollama\\\\config.yaml<br><b>macOS/Linux</b>: ~/.ollama/config.yaml<br>Then restart Ollama: <code>ollama serve</code>';
});
(async()=>{
  const cfg = await getCfg();
  const toggle = document.getElementById('toggleEnabled');
  toggle.checked = !!cfg.enabled;
  document.getElementById('enabledLabel').textContent = toggle.checked ? 'Enabled':'Disabled';
  toggle.addEventListener('change', async (e)=>{
    await setCfg({enabled:e.target.checked});
    document.getElementById('enabledLabel').textContent = e.target.checked ? 'Enabled':'Disabled';
    await refresh();
  });
  await refresh();
})();