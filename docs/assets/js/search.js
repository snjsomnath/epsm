// Minimal client-side search: try to fetch `search-index.json` and use simple scoring
(function(){
  const input = document.getElementById('site-search');
  if(!input) return;

  let index = null;
  async function loadIndex(){
    try{
      const resp = await fetch('/epsm/search-index.json');
      if(!resp.ok) throw new Error('no index');
      index = await resp.json();
    }catch(e){
      index = null;
    }
  }

  function simpleSearch(q){
    q = q.trim().toLowerCase();
    if(!q) return [];
    const results = [];
    if(index && Array.isArray(index.docs)){
      for(const doc of index.docs){
        const title = (doc.title||'').toLowerCase();
        const body = (doc.content||'').toLowerCase();
        let score = 0;
        if(title.includes(q)) score += 5;
        if(body.includes(q)) score += 1;
        if(score>0) results.push({score, href: doc.url, title: doc.title});
      }
      results.sort((a,b)=>b.score-a.score);
      return results.slice(0,10);
    }
    // fallback: search page titles from the nav
    const anchors = Array.from(document.querySelectorAll('.site-sidebar a'));
    for(const a of anchors){
      if(a.textContent.toLowerCase().includes(q)) results.push({score:1,href:a.getAttribute('href'),title:a.textContent});
    }
    return results.slice(0,10);
  }

  function renderResults(results){
    let box = document.getElementById('search-results');
    if(!box){
      box = document.createElement('div');
      box.id = 'search-results';
      box.style.position = 'absolute';
      box.style.right = '20px';
      box.style.top = '64px';
      box.style.background = 'rgba(11,18,32,0.95)';
      box.style.border = '1px solid rgba(255,255,255,0.04)';
      box.style.padding = '8px';
      box.style.borderRadius = '8px';
      box.style.minWidth = '260px';
      document.body.appendChild(box);
    }
    box.innerHTML = '';
    if(results.length===0){ box.innerHTML = '<div style="color:var(--muted);padding:6px">No results</div>'; return }
    for(const r of results){
      const a = document.createElement('a');
      a.href = r.href;
      a.textContent = r.title||r.href;
      a.style.display = 'block';
      a.style.padding = '6px 8px';
      a.style.color = 'var(--fg)';
      a.style.textDecoration = 'none';
      box.appendChild(a);
    }
  }

  input.addEventListener('input', async (e)=>{
    if(!index) await loadIndex();
    const q = e.target.value;
    const results = simpleSearch(q);
    renderResults(results);
  });

  document.addEventListener('click', e=>{
    const box = document.getElementById('search-results');
    if(!box) return;
    if(e.target.closest('#search-results') || e.target===input) return;
    box.remove();
  });
})();
