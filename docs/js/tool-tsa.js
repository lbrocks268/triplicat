/* Thermal shift assay: Tm from the maximum of dF/dT, group means and shift against a reference. */
(function(){
  'use strict';
  var TK = window.TK, UI = window.TKUI, el = UI.el, last = null;

  // Synthetic demo curves (not measured data): sigmoid unfolding, signal decay after the maximum, fixed pseudo-noise.
  function demo(){
    var wells = [['Reference_1', 55.1], ['Reference_2', 54.8], ['Reference_3', 55.3], ['Ligand_1', 58.4], ['Ligand_2', 58.9], ['Ligand_3', 58.6]];
    var out = 'temp\t' + wells.map(function(w){ return w[0]; }).join('\t') + '\n', seed = 3;
    var rnd = function(){ seed = (seed * 16807) % 2147483647; return seed / 2147483647 - 0.5; };
    for(var T = 25; T <= 95; T += 0.5){
      out += T + '\t' + wells.map(function(w){
        var f = 120 + 880 / (1 + Math.exp((w[1] - T) / 1.9));
        if(T > w[1] + 6) f -= (T - w[1] - 6) * 14;
        return (f + rnd() * 14).toFixed(1);
      }).join('\t') + '\n';
    }
    return out;
  }

  // ---------- Long format (one row per well and reading), as many qPCR instruments export it ----------
  // Recognised by a header with a well column, a temperature column and a fluorescence column. Only the first
  // block is used: instruments often append further blocks (derivative, fitted curves) after an empty line.
  var converted = null;   // { text, note } of the last conversion, so the note stays while the text is unchanged
  function findCol(h, re, not){ for(var i = 0; i < h.length; i++) if(re.test(h[i]) && !(not && not.test(h[i]))) return i; return -1; }
  function fromLong(text){
    var first = text.split(/\r?\n[ \t;,]*\r?\n/)[0], t = TK.parseTable(first), h = t.header;
    var w = findCol(h, /position/i); if(w < 0) w = findCol(h, /^(well|sample|pos)/i);
    var tc = findCol(h, /temp/i), fc = findCol(h, /fluor|rfu|intensity|signal/i, /deriv|boltz|fit/i);
    if(w < 0 || tc < 0 || fc < 0 || t.rows.length < 10) return null;
    var wells = {}, order = [];
    t.rows.forEach(function(r){
      var k = (r[w] || '').trim(), x = TK.toNum(r[tc], t.delim), y = TK.toNum(r[fc], t.delim);
      if(!k || !isFinite(x) || !isFinite(y)) return;
      if(!wells[k]){ wells[k] = { T: [], F: [] }; order.push(k); }
      wells[k].T.push(x); wells[k].F.push(y);
    });
    if(order.length < 1 || wells[order[0]].T.length < 10) return null;
    // common temperature grid: the first well's readings, inside the range that every well covers
    var lo = -Infinity, hi = Infinity, same = true, ref = wells[order[0]].T;
    order.forEach(function(k){
      var T = wells[k].T; lo = Math.max(lo, Math.min.apply(null, T)); hi = Math.min(hi, Math.max.apply(null, T));
      if(T.length !== ref.length || T.some(function(v, i){ return Math.abs(v - ref[i]) > 0.05; })) same = false;
    });
    var grid = ref.filter(function(v){ return v >= lo && v <= hi; });
    var at = function(W, x){   // linear interpolation, readings sorted by temperature
      for(var i = 1; i < W.T.length; i++) if(W.T[i] >= x){ var a = W.T[i - 1], b = W.T[i]; return b === a ? W.F[i] : W.F[i - 1] + (W.F[i] - W.F[i - 1]) * (x - a) / (b - a); }
      return W.T[0] === x ? W.F[0] : NaN;
    };
    var out = 'temp\t' + order.join('\t') + '\n';
    grid.forEach(function(x, i){
      out += TK.sig(x, 8) + '\t' + order.map(function(k){ return TK.sig(same ? wells[k].F[ref.indexOf(x)] : at(wells[k], x), 8); }).join('\t') + '\n';
    });
    var more = text.length > first.length + 5;
    return { text: out, note: 'Converted from one row per well and reading: ' + order.length + ' wells, ' + grid.length + ' temperature steps, columns &ldquo;' + UI.esc(h[w]) + '&rdquo;, &ldquo;' + UI.esc(h[tc]) + '&rdquo; and &ldquo;' + UI.esc(h[fc]) + '&rdquo;' +
      (more ? '. Further blocks after the first empty line (for example the instrument&rsquo;s own derivative) were not used' : '') +
      (same ? '' : '. The wells had slightly different temperatures, so their readings were interpolated onto the temperatures of ' + UI.esc(order[0])) + '.' };
  }

  // ---------- Plate layout: sample name per well position ----------
  // Accepts a plate map pasted from a spreadsheet (row letters down, column numbers across) or a list "well, name".
  function wellKey(n){ var m = /^\s*([A-Pa-p])\s*0*(\d{1,2})\s*$/.exec(n || ''); return m ? m[1].toUpperCase() + Number(m[2]) : null; }
  function readLayout(text){
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function(l){ return l.trim() !== ''; });
    if(!lines.length) return null;
    var d = lines[0].indexOf('\t') >= 0 || lines.some(function(l){ return l.indexOf('\t') >= 0; }) ? '\t' : lines[0].indexOf(';') >= 0 ? ';' : ',';
    var cells = lines.map(function(l){ return l.split(d).map(function(c){ return c.trim().replace(/^"(.*)"$/, '$1'); }); });
    var map = {}, n = 0;
    // list form: first cell is a well position, second the name
    if(cells.filter(function(r){ return wellKey(r[0]); }).length >= cells.length / 2 && cells.every(function(r){ return r.length <= 3; })){
      cells.forEach(function(r){ var k = wellKey(r[0]); if(k && r[1]){ map[k] = r[1]; n++; } });
      return { map: map, n: n };
    }
    // grid form: a header row with column numbers (optional), rows starting with a letter
    var nums = null;
    cells.forEach(function(r){ if(!nums && r.slice(1).filter(Boolean).length && r.slice(1).every(function(c){ return c === '' || /^\d{1,2}$/.test(c); })) nums = r.map(function(c){ return Number(c); }); });
    cells.forEach(function(r){
      if(!/^[A-Pa-p]$/.test(r[0])) return;
      for(var j = 1; j < r.length; j++){ var col = nums ? nums[j] : j; if(r[j] && col){ map[r[0].toUpperCase() + col] = r[j]; n++; } }
    });
    return { map: map, n: n };
  }

  function read(){
    var raw = el('in').value;
    if(!(converted && raw === converted.text) && /temp/i.test(raw.slice(0, 300)) && /(position|well)/i.test(raw.slice(0, 300))){
      var c = fromLong(raw);
      if(c){ el('in').value = c.text; converted = c; }
    }
    var t = TK.parseTable(el('in').value), T = [], cols = [];
    var lay = readLayout(el('lay') ? el('lay').value : ''), ignored = [];
    for(var j = 1; j < t.header.length; j++){
      var nm = t.header[j], group = nm.replace(/[_\s.-]*\d+$/, '') || nm;
      if(lay && lay.n){
        var k = wellKey(nm);
        if(!k || !lay.map[k]){ ignored.push(nm); continue; }
        group = lay.map[k];
      }
      cols.push({ name: nm, group: group, F: [], k: j });
    }
    t.rows.forEach(function(r){
      var x = TK.toNum(r[0], t.delim); if(!isFinite(x)) return;
      T.push(x); cols.forEach(function(c){ c.F.push(TK.toNum(r[c.k], t.delim)); });
    });
    cols = cols.filter(function(c){ return c.F.filter(isFinite).length === T.length && T.length; });
    return { T: T, cols: cols, lay: lay, ignored: ignored, names: t.header.slice(1), conv: converted && el('in').value === converted.text ? converted.note : '' };
  }

  // Display helpers: '—' for missing values, NaN-safe mean and SD across wells at one temperature.
  function fx(v, d){ return isFinite(v) ? v.toFixed(d) : '—'; }
  function finite(a){ return a.filter(function(v){ return isFinite(v); }); }

  function median(a){ var b = a.slice().sort(function(x, y){ return x - y; }), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  // Wells the user unticked, by column name. Cleared when the set of column names changes (new data).
  var ex = UI.exclusions();
  // Groups the user took out of the figure (they stay in the table and the statistics). Cleared when the groups change.
  var hidden = {}, groupKey = null;
  document.addEventListener('input', function(ev){
    var t = ev.target;
    if(t && t.type === 'checkbox' && t.hasAttribute('data-show')){ if(t.checked) delete hidden[t.getAttribute('data-show')]; else hidden[t.getAttribute('data-show')] = 1; }
  });
  var bzCache = {};
  function boltz(name, T, F, tmin, tmax, start){
    var s = 0; for(var i = 0; i < F.length; i++) s += F[i] * (i + 1);
    var key = name + '|' + T.length + '|' + T[0] + '|' + T[T.length - 1] + '|' + s + '|' + tmin + '|' + tmax;
    if(!(key in bzCache)) bzCache[key] = TK.boltzFit(T, F, tmin, tmax, start);
    return bzCache[key];
  }
  var OUTLIER = 2;   // °C away from the group median: a rule of thumb for "look at this well", not a statistical test

  // Plate map of the wells as named in the data (positions like A01), coloured by group. Clicking a well ticks or
  // unticks it, the same as the checkbox in the well table.
  function plateMap(cols, ignored, colorOf){
    var info = {}, rows = {}, nums = {}, named = 0;
    cols.forEach(function(c){ var k = wellKey(c.name); if(k){ info[k] = c; named++; } });
    ignored.forEach(function(nm){ var k = wellKey(nm); if(k) info[k] = { name: nm, none: true }; });
    if(named < Math.max(2, cols.length / 2)) return '';
    Object.keys(info).forEach(function(k){ rows[k[0]] = 1; nums[Number(k.slice(1))] = 1; });
    var R = Object.keys(rows).sort(), N = Object.keys(nums).map(Number).sort(function(a, b){ return a - b; });
    var head = '<tr><th></th>' + N.map(function(n){ return '<th>' + n + '</th>'; }).join('') + '</tr>';
    var body = R.map(function(r){
      return '<tr><th>' + r + '</th>' + N.map(function(n){
        var c = info[r + n];
        if(!c) return '<td></td>';
        if(c.none) return '<td><span class="well none" title="' + UI.esc(c.name) + ': no name in the layout">' + UI.esc(c.name) + '</span></td>';
        var tip = c.name + ', ' + c.group + ', Tm ' + fx(c.tm, 2) + ' °C' + (c.off ? ', left out' : '') + (c.odd ? ', far from its group' : '');
        return '<td><label class="well' + (c.off ? ' off' : '') + (c.odd ? ' odd' : '') + '" style="--c:' + colorOf(c) + '" title="' + UI.esc(tip) + '">' +
          '<input type="checkbox" data-pt="' + UI.esc(c.name) + '"' + (c.off ? '' : ' checked') + ' aria-label="Use ' + UI.esc(c.name) + '">' +
          '<b>' + UI.esc(c.group) + '</b><span>' + fx(c.tm, 2) + '</span></label></td>';
      }).join('') + '</tr>';
    }).join('');
    return '<div class="plate-head"><span class="meta">Plate</span><span class="muted">as named in the data. Click a well to leave it out or take it back.</span></div>' +
      '<div class="calc-scroll"><table class="plate">' + head + body + '</table></div>';
  }

  // ---------- Plate editor: assign sample names by clicking wells ----------
  // Shown when the data columns are named by position. It reads and writes the "Plate layout" field, so pasting a
  // plate map and the editor always show the same thing.
  var pedSel = {}, pedR = [], pedN = [], pedHtml = '', pedDrag = null;
  function pedKeys(){ var a = []; pedR.forEach(function(r){ pedN.forEach(function(n){ if(document.querySelector('.pw[data-w="' + r + n + '"]')) a.push(r + n); }); }); return a; }
  function pedPaint(){ Array.prototype.forEach.call(document.querySelectorAll('.pw'), function(b){ b.classList.toggle('sel', !!pedSel[b.getAttribute('data-w')]); }); }
  function writeLayout(map){
    var rows = {}, nums = {};
    pedR.forEach(function(r){ rows[r] = 1; }); pedN.forEach(function(n){ nums[n] = 1; });
    Object.keys(map).forEach(function(k){ rows[k[0]] = 1; nums[Number(k.slice(1))] = 1; });
    var R = Object.keys(rows).sort(), N = Object.keys(nums).map(Number).sort(function(a, b){ return a - b; });
    var txt = '\t' + N.join('\t') + '\n' + R.map(function(r){ return r + '\t' + N.map(function(n){ return map[r + n] || ''; }).join('\t'); }).join('\n') + '\n';
    var lay = el('lay'); lay.value = Object.keys(map).length ? txt : '';
    lay.dispatchEvent(new Event('input', { bubbles: true }));
  }
  function currentMap(){ var l = readLayout(el('lay').value); return l && l.n ? l.map : {}; }
  // short label for a small well: "Sample 12" -> "S12", "Reference" -> "Refe."; the full name is in the tooltip
  function shortName(g){
    if(g.length <= 5) return g;
    var m = /^(.*?)[\s_-]*(\d+)$/.exec(g);
    if(m && m[1]) return m[1].slice(0, m[2].length > 1 ? 1 : 2) + m[2];
    return g.slice(0, 4).trim() + '.';
  }
  function renderEditor(names, layMap){
    var box = el('ped'); if(!box) return;
    var pos = names.map(wellKey).filter(Boolean);
    if(pos.length < Math.max(2, names.length / 2)){ box.hidden = true; pedHtml = ''; return; }
    box.hidden = false;
    var rows = {}, nums = {}; pos.forEach(function(k){ rows[k[0]] = 1; nums[Number(k.slice(1))] = 1; });
    pedR = Object.keys(rows).sort(); pedN = Object.keys(nums).map(Number).sort(function(a, b){ return a - b; });
    var have = {}; pos.forEach(function(k){ have[k] = 1; });
    // colours in the order in which groups appear in the data, the same order as the results table
    var order = [], seen = {};
    names.forEach(function(nm){ var k = wellKey(nm), g = k && layMap[k]; if(g && !seen[g]){ seen[g] = 1; order.push(g); } });
    var html = '<table class="plate ped-grid"><tr><th></th>' + pedN.map(function(n){ return '<th>' + n + '</th>'; }).join('') + '</tr>' + pedR.map(function(r){
      return '<tr><th>' + r + '</th>' + pedN.map(function(n){
        var k = r + n; if(!have[k]) return '<td></td>';
        var g = layMap[k], st = g ? ' style="--c:' + UI.seriesColor(order.indexOf(g)) + '"' : '';
        return '<td><button type="button" class="pw' + (g ? '' : ' unset') + '" data-w="' + k + '"' + st + ' title="' + k + (g ? ': ' + UI.esc(g) : ': empty') + '">' +
          '<span>' + k + '</span><b>' + (g ? UI.esc(shortName(g)) : '&nbsp;') + '</b></button></td>';
      }).join('') + '</tr>';
    }).join('') + '</table>';
    if(html !== pedHtml){ el('ped_grid').innerHTML = html; pedHtml = html; }
    Object.keys(pedSel).forEach(function(k){ if(!have[k]) delete pedSel[k]; });
    pedPaint();
  }
  function rect(a, b){
    var r0 = pedR.indexOf(a[0]), r1 = pedR.indexOf(b[0]), n0 = pedN.indexOf(Number(a.slice(1))), n1 = pedN.indexOf(Number(b.slice(1))), out = [];
    for(var i = Math.min(r0, r1); i <= Math.max(r0, r1); i++) for(var j = Math.min(n0, n1); j <= Math.max(n0, n1); j++) out.push(pedR[i] + pedN[j]);
    return out;
  }
  function wellAt(x, y){ var e = document.elementFromPoint(x, y); e = e && e.closest ? e.closest('.pw') : null; return e ? e.getAttribute('data-w') : null; }
  document.addEventListener('pointerdown', function(ev){
    var b = ev.target.closest ? ev.target.closest('.pw') : null; if(!b || ev.button > 0) return;
    ev.preventDefault();
    var k = b.getAttribute('data-w'), base = {}; Object.keys(pedSel).forEach(function(x){ base[x] = 1; });
    pedDrag = { anchor: k, base: base, add: !pedSel[k] };
    if(pedDrag.add) pedSel[k] = 1; else delete pedSel[k];
    pedPaint();
  });
  document.addEventListener('pointermove', function(ev){
    if(!pedDrag) return;
    var k = wellAt(ev.clientX, ev.clientY); if(!k) return;
    var s = {}; Object.keys(pedDrag.base).forEach(function(x){ s[x] = 1; });
    rect(pedDrag.anchor, k).forEach(function(x){ if(pedDrag.add) s[x] = 1; else delete s[x]; });
    pedSel = s; pedPaint();
  });
  document.addEventListener('pointerup', function(){ if(pedDrag){ pedDrag = null; var f = el('ped_name'); if(f && Object.keys(pedSel).length) f.focus(); } });
  document.addEventListener('click', function(ev){
    var b = ev.target.closest ? ev.target.closest('.pw') : null;
    if(b && ev.detail === 0){ var k = b.getAttribute('data-w'); if(pedSel[k]) delete pedSel[k]; else pedSel[k] = 1; pedPaint(); return; }   // keyboard
    var a = ev.target.closest ? ev.target.closest('[data-ped]') : null; if(!a || /^t/.test(a.getAttribute('data-ped'))) return;
    var act = a.getAttribute('data-ped'), keys = pedKeys(), chosen = keys.filter(function(k){ return pedSel[k]; }), map = currentMap();
    if(act === 'all'){ keys.forEach(function(k){ pedSel[k] = 1; }); pedPaint(); return; }
    if(act === 'none'){ pedSel = {}; pedPaint(); return; }
    if(!chosen.length) return;
    if(act === 'assign' || act === 'clear'){
      var name = act === 'assign' ? el('ped_name').value.trim() : '';
      chosen.forEach(function(k){ if(name) map[k] = name; else delete map[k]; });
    } else if(act === 'down' || act === 'across'){
      var size = Math.max(1, parseInt(el('ped_n').value, 10) || 3), next = 1;
      Object.keys(map).forEach(function(k){ var m = /^Sample (\d+)$/.exec(map[k]); if(m && !pedSel[k]) next = Math.max(next, Number(m[1]) + 1); });
      var seq = chosen.slice().sort(function(p, q){
        var pr = pedR.indexOf(p[0]), qr = pedR.indexOf(q[0]), pn = Number(p.slice(1)), qn = Number(q.slice(1));
        return act === 'down' ? (pn - qn || pr - qr) : (pr - qr || pn - qn);
      });
      seq.forEach(function(k, i){ map[k] = 'Sample ' + (next + Math.floor(i / size)); });
    }
    pedSel = {};
    writeLayout(map);
    var f = el('ped_name'); if(f && act === 'assign'){ f.select(); }
  });
  document.addEventListener('keydown', function(ev){
    if(ev.key === 'Enter' && ev.target && ev.target.id === 'ped_name'){ ev.preventDefault(); var b = document.querySelector('[data-ped="assign"]'); if(b) b.click(); }
  });
  // ---------- Templates: named plate layouts in this browser's local storage, written only on "Save layout" ----------
  var TPL = 'triplicat-plate-templates';
  function tplAll(){ try { return JSON.parse(localStorage.getItem(TPL) || '{}') || {}; } catch(e){ return {}; } }
  function tplPut(all){ try { localStorage.setItem(TPL, JSON.stringify(all)); return true; } catch(e){ return false; } }
  function tplMsg(t){ var m = el('tpl_msg'); if(m) m.textContent = t; }
  function tplRender(pick){
    var s = el('tpl_sel'); if(!s) return;
    var names = Object.keys(tplAll()).sort(function(a, b){ return a.localeCompare(b); });
    s.innerHTML = names.length ? names.map(function(n){ return '<option>' + UI.esc(n) + '</option>'; }).join('') : '<option value="">No templates yet</option>';
    s.disabled = !names.length;
    if(pick && names.indexOf(pick) >= 0) s.value = pick;
  }
  document.addEventListener('click', function(ev){
    var a = ev.target.closest ? ev.target.closest('[data-ped^="t"]') : null; if(!a) return;
    var act = a.getAttribute('data-ped'), all = tplAll(), lay = el('lay'), sel = el('tpl_sel');
    if(act === 'tsave'){
      var name = el('tpl_name').value.trim();
      if(!lay.value.trim()){ tplMsg('There is no layout to save yet. Assign samples on the plate first.'); return; }
      if(!name){ tplMsg('Type a name for the template first.'); el('tpl_name').focus(); return; }
      var existed = name in all; all[name] = lay.value;
      if(!tplPut(all)){ tplMsg('This browser does not allow storing data, so the template could not be saved. Use "Download layout" instead.'); return; }
      tplRender(name); el('tpl_name').value = '';
      tplMsg((existed ? 'Template "' : 'Saved template "') + name + (existed ? '" updated.' : '".'));
    } else if(act === 'tload'){
      if(!sel.value || !(sel.value in all)) return;
      lay.value = all[sel.value]; lay.dispatchEvent(new Event('input', { bubbles: true }));
      tplMsg('Loaded template "' + sel.value + '".');
    } else if(act === 'tdel'){
      if(!sel.value || !(sel.value in all)) return;
      var gone = sel.value; delete all[gone]; tplPut(all); tplRender();
      tplMsg('Deleted template "' + gone + '".');
    } else if(act === 'tdown'){
      if(!lay.value.trim()){ tplMsg('There is no layout to download yet.'); return; }
      UI.downloadText('plate-layout.tsv', lay.value, 'text/tab-separated-values');
      tplMsg('Downloaded as plate-layout.tsv. Open it later with "Open file" next to the plate layout.');
    }
  });
  tplRender();

  // a group with one of these names is taken as the reference when the groups change
  var REF_RE = /\b(ref|reference|wt|wild[\s_-]?type|apo|control|ctrl|dmso|no[\s_-]?ligand)\b/i;

  function run(){
    var d = read(), plotBox = el('out_plot'), plot2 = el('out_plot2'), res = el('out_res'), nt = el('out_notes');
    renderEditor(el('in').value.trim() ? d.names : [], d.lay && d.lay.n ? d.lay.map : {});
    last = null; el('dl').hidden = true; plot2.innerHTML = '';
    if(!el('in').value.trim()){
      plotBox.innerHTML = '<div class="empty">Paste your melting curves or load the demo data.</div>'; res.innerHTML = ''; nt.innerHTML = ''; return;
    }
    var win = parseInt(el('o_win').value, 10); if(!(win >= 3)) win = 9; if(win % 2 === 0) win += 1;
    if(d.T.length < win + 2 || !d.cols.length){
      plotBox.innerHTML = '<div class="empty">Not enough data: at least ' + (win + 2) + ' temperature steps and one complete well column are needed.</div>'; res.innerHTML = '';
      nt.innerHTML = UI.notes([d.lay && d.lay.n && d.ignored.length ? { warn: true, text: 'The plate layout names none of the wells in the data. Use positions like A1 or A01 in the layout and in the column names.' } : { warn: true, text: 'Could read ' + d.T.length + ' temperature steps and ' + d.cols.length + ' complete well column(s). Expected: first column temperature, one column per well, header like Reference_1, Reference_2, Ligand_1, or one row per well and reading with columns for well, temperature and fluorescence.' + UI.exampleHint() }]); return;
    }
    ex.sync(d.cols.map(function(c){ return c.name; }).join('|'));
    var meanMode = el('v_mean').checked, norm = el('n_norm').checked, useB = el('t_bol').checked;
    var tmin = TK.toNum(el('o_min').value, ';'), tmax = TK.toNum(el('o_max').value, ';');
    var groups = [], gi = {};
    d.cols.forEach(function(c){
      if(!(c.group in gi)){ gi[c.group] = groups.length; groups.push({ name: c.group, tm: [], wells: [] }); }
      var m = TK.meltTm(d.T, c.F, win, tmin, tmax);
      var bz = boltz(c.name, d.T, c.F, tmin, tmax, m.tm);
      // a Boltzmann Tm outside the fitted range means there was no transition to fit (e.g. a blank)
      c.tmD = m.tm; c.tmB = bz.converged && bz.inside ? bz.tm : NaN; c.bz = bz;
      c.tm = useB ? c.tmB : c.tmD; c.deriv = m.deriv; c.gi = gi[c.group]; c.edge = m.index != null && (m.index <= (win - 1) / 2 || m.index >= d.T.length - 1 - (win - 1) / 2);
      c.off = ex.off(c.name);
      // 0 to 1 scaling per well (minimum and maximum of the whole curve); the derivative scales by the same factor
      var lo = Math.min.apply(null, c.F), span = Math.max.apply(null, c.F) - lo;
      c.Fn = c.F.map(function(v){ return span > 0 ? (v - lo) / span : NaN; });
      c.dn = c.deriv.map(function(v){ return span > 0 ? v / span : NaN; });
      if(c.off) return;
      groups[c.gi].wells.push(c);
      if(isFinite(c.tm)) groups[c.gi].tm.push(c.tm);
    });
    // reference selector keeps its choice while the group list is unchanged
    var sel = el('o_ref'), key = groups.map(function(g){ return g.name; }).join('|');
    if(sel.getAttribute('data-key') !== key){
      sel.innerHTML = groups.map(function(g){ return '<option>' + UI.esc(g.name) + '</option>'; }).join('');
      sel.setAttribute('data-key', key);
      var guess = groups.map(function(g){ return REF_RE.test(g.name); }).indexOf(true);
      sel.selectedIndex = guess >= 0 ? guess : 0;
    }
    var ref = groups[Math.max(0, sel.selectedIndex)];
    // wells far from the median of their group (only with at least three wells, otherwise there is no majority)
    groups.forEach(function(g){
      if(g.tm.length < 3) return;
      var med = median(g.tm);
      g.wells.forEach(function(c){ c.odd = isFinite(c.tm) && Math.abs(c.tm - med) > OUTLIER; });
    });
    var fKey = norm ? 'Fn' : 'F', dKey = norm ? 'dn' : 'deriv';
    // mean and SD across the included wells of each group, point by point (display only; Tm comes from the single wells)
    groups.forEach(function(g){
      g.curve = {}; g.curveSd = {};
      [fKey, dKey].forEach(function(k){
        g.curve[k] = d.T.map(function(_, i){ return TK.mean(finite(g.wells.map(function(c){ return c[k][i]; }))); });
        g.curveSd[k] = d.T.map(function(_, i){ return TK.sd(finite(g.wells.map(function(c){ return c[k][i]; }))); });
      });
    });
    var gk = groups.map(function(g){ return g.name; }).join('|');
    if(gk !== groupKey){ hidden = {}; groupKey = gk; }
    var rank = 0;
    groups.forEach(function(g){ g.show = !hidden[g.name]; g.ci = g.show ? rank++ : -1; });
    var gcol = function(g){ return g.show ? UI.seriesColor(g.ci) : UI.mutedColor(); };
    var mk = function(k, ylabel){
      var series = [];
      if(meanMode){
        groups.forEach(function(g){
          if(!g.show || g.wells.length < 2) return;
          series.push({ kind: 'band', x: d.T, y: g.curve[k].map(function(v, j){ return v - g.curveSd[k][j]; }), y2: g.curve[k].map(function(v, j){ return v + g.curveSd[k][j]; }), color: g.ci });
        });
        groups.forEach(function(g){
          if(g.show && g.wells.length) series.push({ kind: 'line', x: d.T, y: g.curve[k], color: g.ci, label: g.name + ' (n = ' + g.wells.length + ')', width: 2.2 });
        });
      } else {
        d.cols.forEach(function(c){ if(c.off && groups[c.gi].show) series.push({ kind: 'line', x: d.T, y: c[k], muted: true, dash: '5 4', label: 'left out', width: 1.3, opacity: 0.8 }); });
        d.cols.forEach(function(c){ if(!c.off && groups[c.gi].show) series.push({ kind: 'line', x: d.T, y: c[k], color: groups[c.gi].ci, label: c.group, width: 1.7, opacity: 0.9 }); });
      }
      return { xlabel: 'Temperature / °C', ylabel: ylabel, height: 330, legend: true, legendLeft: true, series: series,
        vlines: groups.filter(function(g){ return g.show; }).map(function(g){ return { x: TK.mean(g.tm), color: g.ci }; }) };
    };
    var spec = mk(fKey, norm ? 'Normalised fluorescence' : 'Fluorescence'), spec2 = mk(dKey, norm ? 'dF/dT (normalised)' : 'dF/dT');
    UI.applyLabels(spec); UI.applyLabels(spec2, { x: 'f_x', y: 'f_y2' });
    plotBox.innerHTML = UI.plot(spec) || '<div class="empty">No group is ticked for the figure. Tick at least one in the table.</div>'; plot2.innerHTML = UI.plot(spec2);
    // means first: the shift of every group needs the reference mean, wherever the reference sits in the list
    groups.forEach(function(g){ g.mean = TK.mean(g.tm); g.sd = TK.sd(g.tm); });
    var grow = groups.map(function(g){
      var w = g === ref ? null : TK.welch(g.tm, ref.tm);
      g.d = g.mean - ref.mean; g.p = w ? w.p : NaN; g.ci = w ? w.ci : [NaN, NaN];
      var sgn = function(v){ return (v >= 0 ? '+' : '') + v.toFixed(2); };
      return ['<label class="pt"><input type="checkbox" data-show="' + UI.esc(g.name) + '" aria-label="Show ' + UI.esc(g.name) + ' in the figure"' + (g.show ? ' checked' : '') + '>' +
              '<span class="gdot" style="background:' + gcol(g) + '"></span></label>' + (g.show ? '' : '<span class="muted">') + UI.esc(g.name) + (g.show ? '' : '</span>') + (g === ref ? ' <span class="meta">reference</span>' : ''), g.tm.length, '<b>' + fx(g.mean, 2) + '</b>', fx(g.sd, 2),
              g === ref || !isFinite(g.d) ? '—' : sgn(g.d), isFinite(g.ci[0]) ? sgn(g.ci[0]) + ' to ' + sgn(g.ci[1]) : '—',
              isFinite(g.p) ? (g.p < 0.001 ? '&lt; 0.001' : g.p.toFixed(3)) : '—'];
    });
    var off = d.cols.filter(function(c){ return c.off; });
    res.innerHTML = UI.table(['Group', 'n', 'Mean T<sub>m</sub> / °C', 'SD', 'ΔT<sub>m</sub> / °C', '95 % CI of ΔT<sub>m</sub>', 'p (Welch)'], grow, 'res pts') +
      '<p class="muted" style="margin:6px 0 0; font-size:13px">Untick a group to take it out of the figure. It stays in the table and the statistics.</p>' +
      plateMap(d.cols, d.ignored, function(c){ return gcol(groups[c.gi]); }) +
      UI.ptsBox('T<sub>m</sub> per well' + (off.length ? ' (' + off.length + ' left out)' : '') + '. Untick a well to leave it out.',
        UI.table(['Well', 'Group', 'T<sub>m</sub> derivative / °C', 'T<sub>m</sub> Boltzmann / °C', ''], d.cols.map(function(c){
          var cell = function(v, used){ var t = fx(v, 2); if(c.off) return '<s>' + t + '</s>'; return used ? '<b>' + t + '</b>' : '<span class="muted">' + t + '</span>'; };
          return [UI.check(c.name, c.off, c.name), UI.esc(c.group), cell(c.tmD, !useB), cell(c.tmB, useB),
                  c.odd ? '<span class="flag">check</span>' : ''];
        }), 'pts'));
    var n = [], diffs = [];
    for(var i = 1; i < d.T.length; i++) diffs.push(d.T[i] - d.T[i - 1]);
    var step = TK.mean(diffs);
    if(d.conv) n.push({ text: d.conv });
    var nHidden = groups.filter(function(g){ return !g.show; }).length;
    if(nHidden) n.push({ text: nHidden + ' group(s) not shown in the figure. They are still in the table, the statistics and the CSV.' });
    if(d.lay && !d.lay.n) n.push({ warn: true, text: 'The plate layout could not be read. Paste the plate map with row letters in the first column and column numbers in the first row, or a list of well and name.' });
    if(d.lay && d.lay.n) n.push({ text: 'Groups from the plate layout' + (d.ignored.length ? '. ' + d.ignored.length + ' well(s) without a name in the layout are ignored: ' + d.ignored.map(UI.esc).join(', ') : '') + '.' });
    var byPos = d.names.filter(function(nm){ return wellKey(nm); }).length >= Math.max(2, d.names.length / 2);
    if(byPos && !(d.lay && d.lay.n)) n.push({ warn: true, text: 'The wells are named by position, but no plate layout is given, so the groups are only the row letters (A, B, ...). Assign your samples on the plate under &ldquo;Plate layout&rdquo;.' });
    var odd = d.cols.filter(function(c){ return c.odd; });
    if(odd.length) n.push({ warn: true, text: odd.map(function(c){ return UI.esc(c.name) + ' (' + fx(c.tm, 1) + ' °C)'; }).join(', ') + (odd.length > 1 ? ' are' : ' is') + ' more than ' + OUTLIER + ' °C away from the median of ' + (odd.length > 1 ? 'their groups' : 'its group') + '. If the well failed, untick it in the table above.' });
    if(off.length) n.push({ text: off.length + ' well(s) left out (' + off.map(function(c){ return UI.esc(c.name); }).join(', ') + '). They are left out of means, SD, ΔT<sub>m</sub> and p values' + (meanMode ? ' and the mean curves' : ' and drawn grey and dashed') + '. Say so in your methods.' });
    if(groups.some(function(g){ return !g.wells.length; })) n.push({ warn: true, text: 'All wells of a group are left out, so that group has no result.' });
    if(Math.max.apply(null, diffs.map(function(x){ return Math.abs(x - step); })) > Math.abs(step) * 0.02) n.push({ warn: true, text: 'The temperature steps are not evenly spaced. The derivative assumes equal steps, so T<sub>m</sub> may be off.' });
    var edge = d.cols.filter(function(c){ return c.edge && !c.off; }).length;
    if(edge) n.push({ warn: true, text: edge + ' well(s) have their steepest point at the edge of the temperature range or search window. That is usually not a melting transition: check the curves and set a search window, or exclude the well.' });
    if(groups.some(function(g){ return g !== ref && Math.abs(g.d) < 1; })) n.push({ text: 'Shifts below about 1 °C are often within the noise of the method.' });
    if(groups.some(function(g){ return g.tm.length < 3; })) n.push({ text: 'Groups with fewer than three wells: no meaningful SD or p value.' });
    else n.push({ text: 'With three wells per group the p value is an orientation only.' });
    if(meanMode) n.push({ text: 'Mean per group: each curve is the point-by-point mean of the included wells, the shaded band ± 1 SD. The curves are for display. T<sub>m</sub>, SD and p still come from the single wells, and the dashed lines mark the mean T<sub>m</sub>, which can sit slightly off the peak of the mean derivative.' });
    if(norm) n.push({ text: 'Normalised: each well is scaled to 0 at its lowest and 1 at its highest reading over the whole range. This does not change T<sub>m</sub>.' });
    var noB = d.cols.filter(function(c){ return !c.off && !isFinite(c.tmB); });
    if(useB && noB.length) n.push({ warn: true, text: noB.length + ' well(s) without a Boltzmann T<sub>m</sub> (' + noB.map(function(c){ return UI.esc(c.name); }).join(', ') + '): the fit found no transition in the search range, which is usual for blanks. They are not in the group results.' });
    if(useB) n.push({ text: 'T<sub>m</sub> from a Boltzmann fit, F = F<sub>min</sub> + (F<sub>max</sub> &minus; F<sub>min</sub>) / (1 + exp((T<sub>m</sub> &minus; T) / a)), by nonlinear least squares from the lowest reading before the maximum up to the maximum; the fall after the maximum is left out. The derivative values are shown in the well table for comparison.' });
    else n.push({ text: 'T<sub>m</sub> is the temperature of the steepest increase: first derivative from a Savitzky-Golay filter (quadratic, ' + win + ' points = ' + TK.sig((win - 1) * step, 3) + ' °C), maximum refined with a parabola. The Boltzmann values are shown in the well table for comparison.' });
    n.push({ text: 'The 95 % confidence interval of &Delta;T<sub>m</sub> comes from the same Welch test as the p value. If it does not include 0, the shift is distinguishable from the scatter of the replicates.' + (d.lay && d.lay.n ? '' : ' Wells are grouped by their column name without the trailing number, or by the plate layout if you paste one.') });
    nt.innerHTML = UI.notes(n);
    last = { spec: spec, spec2: spec2, d: d, groups: groups, ref: ref, win: win, fKey: fKey, norm: norm, useB: useB }; el('dl').hidden = false;
  }

  UI.wire({ run: run, demo: function(){ el('in').value = demo(); },
    actions: {
      svg: function(){ if(last){ UI.downloadSVG('melting-curves.svg', last.spec); UI.downloadSVG('melting-derivative.svg', last.spec2); } },
      png: function(){ if(last){ UI.downloadPNG('melting-curves.png', last.spec); setTimeout(function(){ UI.downloadPNG('melting-derivative.png', last.spec2); }, 400); } },
      csv: function(){ if(!last) return;
        var rows = [['tm_method', last.useB ? 'boltzmann' : 'first derivative'], [],
          ['group', 'n', 'Tm_mean', 'Tm_sd', 'dTm_vs_' + last.ref.name, 'dTm_ci95_low', 'dTm_ci95_high', 'p_welch']];
        last.groups.forEach(function(g){ rows.push([g.name, g.tm.length, g.mean, isFinite(g.sd) ? g.sd : '', g === last.ref ? '' : g.d,
          isFinite(g.ci[0]) ? g.ci[0] : '', isFinite(g.ci[1]) ? g.ci[1] : '', isFinite(g.p) ? g.p : '']); });
        rows.push([]); rows.push(['well', 'group', 'Tm_derivative', 'Tm_boltzmann', 'Tm_boltzmann_se', 'included']);
        last.d.cols.forEach(function(c){ rows.push([c.name, c.group, isFinite(c.tmD) ? c.tmD : '', isFinite(c.tmB) ? c.tmB : '', isFinite(c.tmB) ? c.bz.se : '', c.off ? 'no' : 'yes']); });
        // mean curve per group over the included wells, as shown in "Mean per group"
        var sfx = last.norm ? '_norm' : '', head = ['temp'];
        last.groups.forEach(function(g){ head.push(g.name + '_mean' + sfx, g.name + '_sd' + sfx); });
        rows.push([]); rows.push(head);
        last.d.T.forEach(function(t, i){
          var r = [t];
          last.groups.forEach(function(g){ var m = g.curve[last.fKey][i], s2 = g.curveSd[last.fKey][i]; r.push(isFinite(m) ? m : '', isFinite(s2) ? s2 : ''); });
          rows.push(r);
        });
        UI.downloadText('thermal-shift-results.csv', UI.csv(rows), 'text/csv'); }
    } });
})();
