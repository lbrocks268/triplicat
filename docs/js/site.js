/* Theme switch and active-section highlight. No dependencies. */
(function(){
  var root = document.documentElement, btn = document.getElementById('theme');
  if(btn){
    btn.addEventListener('click', function(){
      var cur = root.getAttribute('data-theme') ||
        (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      var next = cur === 'dark' ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch(e){}
    });
  }

  var links = document.querySelectorAll('.calc-nav a');
  if(!links.length || !('IntersectionObserver' in window)) return;
  var byId = {};
  for(var i = 0; i < links.length; i++) byId[links[i].getAttribute('href').slice(1)] = links[i];
  function mark(id){
    for(var k in byId) byId[k].classList.toggle('on', k === id);
    var a = byId[id];
    // On the phone the nav is a horizontal strip: keep the active chip in view.
    if(a && a.parentNode.scrollWidth > a.parentNode.clientWidth){
      a.parentNode.scrollTo({ left: a.offsetLeft - 20, behavior: 'smooth' });
    }
  }
  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){ if(e.isIntersecting) mark(e.target.id); });
  }, { rootMargin: '-25% 0px -65% 0px' });
  document.querySelectorAll('.calc-card').forEach(function(c){ io.observe(c); });
  mark(links[0].getAttribute('href').slice(1));
})();
