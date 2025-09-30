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
