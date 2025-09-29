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
