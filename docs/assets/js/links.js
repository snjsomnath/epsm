// Replace hrefs ending in .md with .html so links work when served as static files
(function(){
  if(typeof window === 'undefined') return;
  function rewrite(){
    document.querySelectorAll('a[href$=".md"]').forEach(a=>{
      try{
        const url = new URL(a.href, window.location.href);
        // only rewrite same-origin relative links
        if(url.origin === window.location.origin){
          a.href = url.pathname.replace(/\.md(#[^#]*)?$/,'$&').replace(/\.md(#[^#]*)?$/,'').replace(/\.md$/,'.html');
        }
      }catch(e){/* ignore */}
    });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rewrite);
  else rewrite();
})();
