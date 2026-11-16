/* Shared UI code of the analysis pages: SVG plots, downloads, small DOM helpers. Needs stats.js. */
(function(){
  'use strict';
  var TK = window.TK;

  // ---------- Colours ----------
  var LIGHT = { bg: '#ffffff', text: '#15171c', faint: '#6f7383', grid: '#e6e3da', axis: '#b9b4a6',
                series: ['#2747f5', '#0f9d7a', '#e0672b', '#a23bd6', '#b8930a', '#d6336c', '#3a8fb7', '#6b7280'] };
  var DARK  = { bg: 'transparent', text: '#eef0f5', faint: '#8b91a3', grid: '#262a36', axis: '#474d5e',
                series: ['#8ea1ff', '#3fdcb2', '#ff9a62', '#c58cff', '#f0cf4a', '#ff7aa5', '#6cc5ee', '#a3a9b8'] };
  function isDark(){
    var t = document.documentElement.getAttribute('data-theme');
    return t ? t === 'dark' : !!(window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches);
  }
  function screenPalette(){ var p = isDark() ? DARK : LIGHT, q = {}; for(var k in p) q[k] = p[k]; if(!isDark()) q.bg = 'transparent'; return q; }

  // ---------- Plot ----------
  function niceTicks(lo, hi, count){
    if(!(hi > lo)){ hi = lo + 1; }
    var raw = (hi - lo) / (count || 5), mag = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / mag;
    var step = (f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10) * mag;
    var a = Math.floor(lo / step) * step, b = Math.ceil(hi / step) * step, t = [];
    for(var v = a; v <= b + step * 1e-9; v += step) t.push(Number(v.toPrecision(12)));
    return t;
  }
  function esc(t){ return String(t).replace(/[&<>"]/g, function(c){ return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* spec: { xlabel, ylabel, series: [{ kind: 'points'|'line', x, y, color (index), label, dash, width, hollow }],
             vlines: [{ x, color, label }], zeroX, zeroY, height } */
  function plot(spec, pal){
    pal = pal || screenPalette();
    var W = 720, T = spec.title ? 46 : 16, H = (spec.height || 420) + (spec.title ? 30 : 0), L = 64, R = 18, B = 52;
    var xs = [], ys = [];
    spec.series.forEach(function(s){ s.x.forEach(function(v, i){ if(isFinite(v) && isFinite(s.y[i])){ xs.push(v); ys.push(s.y[i]); } }); });
    if(!xs.length) return '';
    var x0 = Math.min.apply(null, xs), x1 = Math.max.apply(null, xs), y0 = Math.min.apply(null, ys), y1 = Math.max.apply(null, ys);
    if(spec.zeroX) x0 = Math.min(0, x0);
    if(spec.zeroY) y0 = Math.min(0, y0);
    var xt = niceTicks(x0, x1, 6), yt = niceTicks(y0, y1 + (y1 - y0) * 0.04, 5);
    x0 = xt[0]; x1 = xt[xt.length - 1]; y0 = yt[0]; y1 = yt[yt.length - 1];
    var px = function(v){ return L + (v - x0) / (x1 - x0) * (W - L - R); };
    var py = function(v){ return H - B - (v - y0) / (y1 - y0) * (H - T - B); };
    var f = function(v){ return (Math.round(v * 100) / 100).toString(); };
    var font = 'font-family="Helvetica, Arial, sans-serif"';
    var o = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" role="img">';
    if(pal.bg !== 'transparent') o += '<rect width="' + W + '" height="' + H + '" fill="' + pal.bg + '"/>';
    yt.forEach(function(v){
      o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + f(py(v)) + '" y2="' + f(py(v)) + '" stroke="' + pal.grid + '" stroke-width="1"/>' +
           '<text x="' + (L - 9) + '" y="' + f(py(v) + 4) + '" text-anchor="end" font-size="12.5" fill="' + pal.faint + '" ' + font + '>' + TK.sig(v, 6) + '</text>';
    });
    xt.forEach(function(v){
      o += '<line x1="' + f(px(v)) + '" x2="' + f(px(v)) + '" y1="' + (H - B) + '" y2="' + (H - B + 5) + '" stroke="' + pal.axis + '"/>' +
           '<text x="' + f(px(v)) + '" y="' + (H - B + 20) + '" text-anchor="middle" font-size="12.5" fill="' + pal.faint + '" ' + font + '>' + TK.sig(v, 6) + '</text>';
    });
    o += '<line x1="' + L + '" x2="' + (W - R) + '" y1="' + (H - B) + '" y2="' + (H - B) + '" stroke="' + pal.axis + '"/>' +
         '<line x1="' + L + '" x2="' + L + '" y1="' + T + '" y2="' + (H - B) + '" stroke="' + pal.axis + '"/>';
    (spec.vlines || []).forEach(function(v){
      if(!isFinite(v.x) || v.x < x0 || v.x > x1) return;
      var c = pal.series[(v.color || 0) % pal.series.length];
      o += '<line x1="' + f(px(v.x)) + '" x2="' + f(px(v.x)) + '" y1="' + T + '" y2="' + (H - B) + '" stroke="' + c + '" stroke-width="1.2" stroke-dasharray="4 4" opacity=".8"/>';
      if(v.label) o += '<text x="' + f(px(v.x) + 5) + '" y="' + (T + 12) + '" font-size="12" fill="' + c + '" ' + font + '>' + esc(v.label) + '</text>';
    });
    spec.series.forEach(function(s){
      var c = pal.series[(s.color || 0) % pal.series.length];
      if(s.kind === 'line'){
        var d = '', pen = false;
        for(var i = 0; i < s.x.length; i++){
          if(!isFinite(s.x[i]) || !isFinite(s.y[i])){ pen = false; continue; }
          d += (pen ? 'L' : 'M') + f(px(s.x[i])) + ' ' + f(py(s.y[i])) + ' '; pen = true;
        }
        o += '<path d="' + d + '" fill="none" stroke="' + c + '" stroke-width="' + (s.width || 2.4) + '" stroke-linejoin="round" stroke-linecap="round"' +
             (s.dash ? ' stroke-dasharray="' + s.dash + '"' : '') + (s.opacity ? ' opacity="' + s.opacity + '"' : '') + '/>';
      } else {
        for(var k = 0; k < s.x.length; k++){
          if(!isFinite(s.x[k]) || !isFinite(s.y[k])) continue;
          o += '<circle cx="' + f(px(s.x[k])) + '" cy="' + f(py(s.y[k])) + '" r="' + (s.r || 4.2) + '" fill="' + (s.hollow ? (pal.bg === 'transparent' ? 'none' : pal.bg) : c) +
               '" stroke="' + c + '" stroke-width="1.8"' + (s.hollow ? '' : ' fill-opacity=".85"') + '/>';
        }
      }
    });
    o += '<text x="' + ((L + W - R) / 2) + '" y="' + (H - 10) + '" text-anchor="middle" font-size="13.5" fill="' + pal.text + '" ' + font + '>' + esc(spec.xlabel || '') + '</text>' +
         '<text transform="translate(16 ' + ((T + H - B) / 2) + ') rotate(-90)" text-anchor="middle" font-size="13.5" fill="' + pal.text + '" ' + font + '>' + esc(spec.ylabel || '') + '</text>';
    // Watermark of the free version. It sits in the margin so it never covers data.
    var brand = document.body.getAttribute('data-brand');
    if(brand && !spec.noMark) o += '<text x="' + (W - R) + '" y="' + (H - 8) + '" text-anchor="end" font-size="10.5" fill="' + pal.faint + '" opacity=".85" ' + font + '>made with ' + esc(brand) + '</text>';
    if(spec.title) o += '<text x="' + ((L + W - R) / 2) + '" y="24" text-anchor="middle" font-size="16" font-weight="600" fill="' + pal.text + '" ' + font + '>' + esc(spec.title) + '</text>';
    // legend
    var seen = {}, items = [];
    spec.series.forEach(function(s){ if(s.label && !seen[s.label]){ seen[s.label] = 1; items.push(s); } });
    if(items.length > 1 || spec.legend){
      var lx = spec.legendLeft ? L + 14 : W - R - 150, ly = spec.legendBottom ? H - B - 14 - items.length * 18 : T + 10;
      items.forEach(function(s, i){
        var c = pal.series[(s.color || 0) % pal.series.length], y = ly + i * 18;
        o += (s.kind === 'line'
          ? '<line x1="' + lx + '" x2="' + (lx + 18) + '" y1="' + y + '" y2="' + y + '" stroke="' + c + '" stroke-width="2.4"/>'
          : '<circle cx="' + (lx + 9) + '" cy="' + y + '" r="4" fill="' + (s.hollow ? 'none' : c) + '" stroke="' + c + '" stroke-width="1.8"/>') +
          '<text x="' + (lx + 25) + '" y="' + (y + 4) + '" font-size="12.5" fill="' + pal.text + '" ' + font + '>' + esc(s.label) + '</text>';
      });
    }
    return o + '</svg>';
  }

  // Lets the user override title and axis labels. Empty field = default; the default is shown as placeholder.
  function applyLabels(spec, map){
    map = map || { title: 'f_title', x: 'f_x', y: 'f_y' };
    var set = function(id, key){
      var e = id && document.getElementById(id); if(!e) return;
      if(key !== 'title') e.placeholder = spec[key];
      var v = e.value.trim(); if(v) spec[key] = v;
    };
    set(map.title, 'title'); set(map.x, 'xlabel'); set(map.y, 'ylabel');
    return spec;
  }

  // ---------- Downloads ----------
  function download(name, blob){
    var a = document.createElement('a'), url = URL.createObjectURL(blob);
    a.href = url; a.download = name; document.body.appendChild(a); a.click();
    setTimeout(function(){ URL.revokeObjectURL(url); a.remove(); }, 500);
  }
  function downloadText(name, text, mime){ download(name, new Blob([text], { type: (mime || 'text/plain') + ';charset=utf-8' })); }
  function downloadSVG(name, spec){ downloadText(name, plot(spec, LIGHT), 'image/svg+xml'); }
  function downloadPNG(name, spec){
    var svg = plot(spec, LIGHT), img = new Image(), scale = 3;
    img.onload = function(){
      var c = document.createElement('canvas'); c.width = img.width * scale; c.height = img.height * scale;
      var g = c.getContext('2d'); g.scale(scale, scale); g.drawImage(img, 0, 0);
      c.toBlob(function(b){ if(b) download(name, b); }, 'image/png');
    };
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  }
  function csv(rows){
    return rows.map(function(r){ return r.map(function(c){ c = String(c == null ? '' : c); return /[",\n]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(','); }).join('\n') + '\n';
  }

  // ---------- DOM helpers ----------
  function el(id){ return document.getElementById(id); }
  function table(head, rows, cls){
    return '<div class="calc-scroll"><table class="calc-tbl ' + (cls || '') + '"><tr>' + head.map(function(h){ return '<th>' + h + '</th>'; }).join('') + '</tr>' +
      rows.map(function(r){ return '<tr>' + r.map(function(c){ return '<td>' + c + '</td>'; }).join('') + '</tr>'; }).join('') + '</table></div>';
  }
  function notes(list){
    return list.map(function(n){ return '<div class="' + (n.warn ? 'calc-warn' : 'calc-note') + '">' + n.text + '</div>'; }).join('');
  }
  // Wires a page: recompute on every input, on theme change, file -> textarea, demo button.
  function wire(opts){
    var run = function(){ try { opts.run(); } catch(e){ console.error(e); if(opts.fail) opts.fail(e); } };
    document.addEventListener('input', run);
    document.addEventListener('change', function(ev){
      var t = ev.target;
      if(t && t.type === 'file' && t.files && t.files[0]){
        var target = el(t.getAttribute('data-target')), r = new FileReader(), file = t.files[0];
        var done = function(text){ target.value = text; t.value = ''; run(); };
        var failed = function(e){ t.value = ''; var n = el('out_notes'); if(n) n.innerHTML = notes([{ warn: true, text: 'Could not open ' + esc(file.name) + ': ' + esc(e && e.message ? e.message : 'unknown error') }]); };
        if(/\.(xlsx|xlsm)$/i.test(file.name)){
          r.onload = function(){ window.TKXlsx.read(r.result).then(done, failed); };
          r.readAsArrayBuffer(file);
        } else if(/\.xls$/i.test(file.name)){
          failed(new Error('the old .xls format is not supported. Save the file as .xlsx or copy and paste the cells.'));
        } else {
          r.onload = function(){ done(String(r.result)); };
          r.readAsText(file);
        }
      }
    });
    document.addEventListener('click', function(ev){
      var t = ev.target.closest ? ev.target.closest('[data-act]') : null;
      if(!t) return;
      var act = t.getAttribute('data-act');
      if(act === 'demo'){ opts.demo(); run(); }
      else if(act === 'clear'){ (t.getAttribute('data-target') || '').split(',').forEach(function(id){ if(el(id)) el(id).value = ''; }); run(); }
      else if(act === 'pro'){
        var box = el('pro'); box.hidden = !box.hidden;
        // Click counter (site.js): sends only the event name, and only if build.py sets an endpoint.
        if(!box.hidden && window.tcCount) window.tcCount('pro-' + (location.pathname.split('/').pop().replace('.html', '') || 'index'));
      }
      else if(opts.actions && opts.actions[act]) opts.actions[act]();
    });
    var th = el('theme'); if(th) th.addEventListener('click', function(){ setTimeout(run, 0); });
    if(window.matchMedia) try { matchMedia('(prefers-color-scheme: dark)').addEventListener('change', run); } catch(e){}
    run();
  }

  window.TKUI = { plot: plot, downloadText: downloadText, downloadSVG: downloadSVG, downloadPNG: downloadPNG, csv: csv,
                  el: el, table: table, notes: notes, wire: wire, esc: esc, applyLabels: applyLabels };
})();
