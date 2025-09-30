// small loader to initialize optional scripts
(function(){
  // load search script
  const script = document.createElement('script');
  script.src = '/epsm/assets/js/search.js';
  script.defer = true;
  document.head.appendChild(script);
})();
// Replace hrefs ending in .md with .html so links work when served as static files
(function(){
  if(typeof window === 'undefined') return;
  function rewrite(){
    document.querySelectorAll('a[href$=".md"]').forEach(a=>{
      try{
        const href = a.getAttribute('href');
        // split off hash and query string
        const [pathAndQuery, hash=''] = href.split('#');
        const newPath = pathAndQuery.replace(/\.md(\?.*)?$/i, '.html$1');
        a.setAttribute('href', newPath + (hash ? '#'+hash : ''));
      }catch(e){/* ignore */}
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
})();

// Sidebar toggle behavior
(function(){
  function qs(id){return document.getElementById(id)}
  const toggle = qs('sidebar-toggle');
  const sidebar = qs('sidebar');
  const closeBtn = qs('sidebar-close');
  if(!toggle || !sidebar) return;
  toggle.addEventListener('click', ()=>{
    const open = sidebar.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open? 'true':'false');
  });
  if(closeBtn) closeBtn.addEventListener('click', ()=>{ sidebar.classList.remove('open'); toggle.setAttribute('aria-expanded','false'); });
})();

// Logo fallback loader and remove noisy top nav
(function(){
  if(typeof window === 'undefined') return;
  function tryLogo(){
    const img = document.getElementById('brand-logo');
    if(!img) return;
    // if image loads fine, nothing to do
    img.addEventListener('error', async ()=>{
      const candidates = [img.dataset.srcAbs, img.dataset.srcRepo, img.dataset.srcRelative].filter(Boolean);
      for(const c of candidates){
        try{
          // test the URL by loading into a temporary Image
          await new Promise((resolve, reject)=>{
            const tester = new Image();
            tester.onload = ()=>resolve(true);
            tester.onerror = ()=>reject(false);
            // try absolute or relative as provided
            tester.src = c;
          });
          img.src = c;
          return;
        }catch(e){/* try next */}
      }
      // last resort: hide image and show text instead
      img.style.display = 'none';
      const span = document.createElement('span');
      span.textContent = document.title || 'EPSM';
      span.className = 'brand-title fallback';
      img.parentNode && img.parentNode.appendChild(span);
    });
    // if the image is empty or missing, trigger error handler
    if(!img.src) img.dispatchEvent(new Event('error'));
  }
  function hideNoisyTop(){
    // Remove any elements that appear before the header to prevent legacy top-of-doc content
    const header = document.querySelector('.site-header');
    if(!header) return;
    while(header.previousElementSibling){
      try{ header.previousElementSibling.remove(); }catch(e){ break }
    }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{ tryLogo(); hideNoisyTop(); });
  else { tryLogo(); hideNoisyTop(); }
})();
