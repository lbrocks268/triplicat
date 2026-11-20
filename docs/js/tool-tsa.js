/* Thermal shift assay: Tm from the maximum of dF/dT, group means and shift against a reference. */
(function(){
  'use strict';
  var TK = window.TK, UI = window.TKUI, el = UI.el, last = null;

  // Synthetic demo curves (not measured data): sigmoid unfolding, signal decay after the maximum, fixed pseudo-noise.
  // off: shift of every Tm in °C, seed: start of the pseudo-noise (the two-plate demo uses a second run)
  function demo(off, seed){
    off = off || 0; seed = seed || 3;
    var wells = [['Reference_1', 55.1], ['Reference_2', 54.8], ['Reference_3', 55.3], ['Ligand_1', 58.4], ['Ligand_2', 58.9], ['Ligand_3', 58.6],
                 ['Ligand + Additive_1', 60.2], ['Ligand + Additive_2', 59.8], ['Ligand + Additive_3', 60.4]];
    wells = wells.map(function(w){ return [w[0], w[1] + off]; });
    var out = 'temp\t' + wells.map(function(w){ return w[0]; }).join('\t') + '\n';
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

  // ---------- Combinations: several substances in one well, written "A + B" ----------
  // The separator is a plus with spaces on both sides, so names like "Mg2+" or "Ca2+ + EDTA" stay intact.
  function parts(name){ return String(name).split(/\s+\+\s+/).map(function(p){ return p.trim(); }).filter(Boolean); }
  // same substances in any order and spacing count as one group
  function comboKey(name){ return parts(name).slice().sort().join('\u0000'); }

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

  // Reads one plate. A long-format export is converted once; the conversion is cached on the plate object P, so its
  // note stays while the text is unchanged. spell: first spelling per combination, shared by all plates.
  function readPlate(raw, layText, P, spell){
    if(!(P.conv && raw === P.conv.text) && /temp/i.test(raw.slice(0, 300)) && /(position|well)/i.test(raw.slice(0, 300))){
      var c = fromLong(raw);
      if(c){ raw = c.text; P.conv = c; }
    }
    var t = TK.parseTable(raw), T = [], cols = [];
    var lay = readLayout(layText), ignored = [];
    for(var j = 1; j < t.header.length; j++){
      var nm = t.header[j], group = nm.replace(/[_\s.-]*\d+$/, '') || nm;
      if(lay && lay.n){
        var k = wellKey(nm);
        if(!k || !lay.map[k]){ ignored.push(nm); continue; }
        group = lay.map[k];
      }
      // the first spelling of a combination names the group ("B + A" joins "A + B")
      var ck = comboKey(group); if(ck && !(ck in spell)) spell[ck] = parts(group).join(' + '); if(ck) group = spell[ck];
      cols.push({ name: nm, group: group, F: [], k: j });
    }
    t.rows.forEach(function(r){
      var x = TK.toNum(r[0], t.delim); if(!isFinite(x)) return;
      T.push(x); cols.forEach(function(c){ c.F.push(TK.toNum(r[c.k], t.delim)); });
    });
    cols = cols.filter(function(c){ return c.F.filter(isFinite).length === T.length && T.length; });
    return { T: T, cols: cols, lay: lay, ignored: ignored, names: t.header.slice(1), text: raw, conv: P.conv && raw === P.conv.text ? P.conv.note : '' };
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
  function plateMap(cols, ignored, colorOf, title){
    var info = {}, rows = {}, nums = {}, named = 0;
    cols.forEach(function(c){ var k = wellKey(c.well || c.name); if(k){ info[k] = c; named++; } });
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
    return '<div class="plate-head"><span class="meta">' + (title || 'Plate') + '</span><span class="muted">as named in the data. Click a well to leave it out or take it back.</span></div>' +
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
    var p = parts(g); if(p.length > 1) return p.map(function(x){ return x.length <= 3 ? x : x.slice(0, 3); }).join('+');
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
    if(act === 'add'){
      var extra = parts(el('ped_name').value.trim()); if(!extra.length) return;
      chosen.forEach(function(k){
        var have = map[k] ? parts(map[k]) : [];
        extra.forEach(function(x){ if(have.indexOf(x) < 0) have.push(x); });
        map[k] = have.join(' + ');
      });
    } else if(act === 'assign' || act === 'clear'){
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
    var f = el('ped_name'); if(f && (act === 'assign' || act === 'add')){ f.select(); }
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

  // ---------- Several plates ----------
  // Each plate keeps its own data, layout and conversion. The textareas always show the current plate; the other plates
  // live in `plates`. A hidden field mirrors all plates so that "Remember my inputs" keeps them too.
  var plates = [{ in: '', lay: '', conv: null }], cur = 0, restored = false, demo2 = null;
  function restorePlates(){
    if(restored) return; restored = true;
    try {
      var s = JSON.parse(el('plates_store').value || 'null');
      if(s && s.plates && s.plates.length > 1){
        plates = s.plates.map(function(p){ return { in: String(p.in || ''), lay: String(p.lay || ''), conv: null }; });
        cur = Math.max(0, Math.min(Number(s.cur) || 0, plates.length - 1));
        plates[cur].in = el('in').value; plates[cur].lay = el('lay').value;
      }
    } catch(e){}
  }
  function storePlates(){
    var st = el('plates_store'); if(!st) return;
    // the current plate is already in the visible fields, so it is not stored twice
    st.value = plates.length > 1 ? JSON.stringify({ cur: cur, plates: plates.map(function(p, i){ return i === cur ? {} : { in: p.in, lay: p.lay }; }) }) : '';
  }
  function renderTabs(){
    var bar = el('ptabs'); if(!bar) return;
    bar.innerHTML = plates.map(function(p, i){
      return '<button type="button" class="chip' + (i === cur ? ' on' : ' quiet') + '" data-plate="' + i + '" aria-pressed="' + (i === cur) + '">Plate ' + (i + 1) + (p.in.trim() ? '' : ' (empty)') + '</button>';
    }).join('') + '<button type="button" class="chip quiet" data-plate="add">+ Add plate</button>' +
      (plates.length > 1 ? '<button type="button" class="chip quiet" data-plate="remove">Remove plate ' + (cur + 1) + '</button>'
        : '<button type="button" class="linkbtn" data-plate="demo2">Try with two demo plates</button>');
    var multi = plates.length > 1;
    ['pl_lbl', 'pl_box'].forEach(function(id){ if(el(id)) el(id).hidden = !multi; });
  }
  function showPlate(i){
    plates[cur].in = el('in').value; plates[cur].lay = el('lay').value;
    cur = i; el('in').value = plates[cur].in; el('lay').value = plates[cur].lay; pedSel = {};
    el('in').dispatchEvent(new Event('input', { bubbles: true }));
  }
  document.addEventListener('click', function(ev){
    var b = ev.target.closest ? ev.target.closest('[data-plate]') : null;
    if(b){
      var a = b.getAttribute('data-plate');
      if(a === 'demo2'){
        // two synthetic runs of the same plate; the second one reads about 1 °C higher, as can happen between days
        demo2 = [demo(0, 3), demo(1, 11)];
        plates = [{ in: demo2[0], lay: '', conv: null }, { in: demo2[1], lay: '', conv: null }]; cur = 0;
        el('in').value = plates[0].in; el('lay').value = ''; pedSel = {}; el('a_raw').checked = true;
        el('in').dispatchEvent(new Event('input', { bubbles: true }));
      } else if(a === 'add'){
        plates[cur].in = el('in').value; plates[cur].lay = el('lay').value;
        // a new plate starts with the layout of the current one: replicate plates usually share it, and it is easy to change
        plates.push({ in: '', lay: plates[cur].lay, conv: null }); showPlate(plates.length - 1);
      } else if(a === 'remove'){
        if(plates.length < 2) return;
        if((el('in').value.trim() || el('lay').value.trim()) && !confirm('Remove plate ' + (cur + 1) + ' with its data and layout?')) return;
        plates.splice(cur, 1); cur = Math.min(cur, plates.length - 1);
        el('in').value = plates[cur].in; el('lay').value = plates[cur].lay; pedSel = {};
        el('in').dispatchEvent(new Event('input', { bubbles: true }));
      } else if(Number(a) !== cur) showPlate(Number(a));
      return;
    }
    // "Clear" empties all plates (registered before UI.wire, so this runs before the fields are cleared)
    var c = ev.target.closest ? ev.target.closest('[data-act="clear"]') : null;
    if(c){ plates = [{ in: '', lay: '', conv: null }]; cur = 0; }
  });

  // linear interpolation on readings sorted by x; NaN outside the measured range
  function interp(x, y, v){
    if(!(v >= x[0] && v <= x[x.length - 1])) return NaN;
    for(var i = 1; i < x.length; i++) if(x[i] >= v){ var a = x[i - 1], b = x[i]; return b === a ? y[i] : y[i - 1] + (y[i] - y[i - 1]) * (v - a) / (b - a); }
    return y[0];
  }
  function onGrid(x, y, G){
    var same = x.length === G.length && x.every(function(v, i){ return v === G[i]; });
    return same ? y : G.map(function(g){ return interp(x, y, g); });
  }

  // a group with one of these names is taken as the reference when the groups change
  var REF_RE = /\b(ref|reference|wt|wild[\s_-]?type|apo|control|ctrl|dmso|no[\s_-]?ligand)\b/i;

  function run(){
    restorePlates();
    var plotBox = el('out_plot'), plot2 = el('out_plot2'), res = el('out_res'), nt = el('out_notes');
    var spell = {}, P = plates[cur], multi = plates.length > 1, D = [];
    var pre = function(i){ return multi ? 'Plate ' + (i + 1) + ': ' : ''; };
    for(var pi = 0; pi < plates.length; pi++){
      if(pi === cur){
        var dc = readPlate(el('in').value, el('lay').value, P, spell);
        if(dc.text !== el('in').value) el('in').value = dc.text;
        P.in = el('in').value; P.lay = el('lay').value; D.push(dc);
      } else D.push(readPlate(plates[pi].in, plates[pi].lay, plates[pi], spell));
    }
    storePlates(); renderTabs();
    var dCur = D[cur];
    renderEditor(el('in').value.trim() ? dCur.names : [], dCur.lay && dCur.lay.n ? dCur.lay.map : {});
    last = null; el('dl').hidden = true; plot2.innerHTML = '';
    var filled = plates.map(function(p){ return !!p.in.trim(); });
    if(filled.indexOf(true) < 0){
      plotBox.innerHTML = '<div class="empty">' + (multi ? 'Plate ' + (cur + 1) + ' is empty. ' : '') + 'Paste your melting curves or load the demo data.</div>'; res.innerHTML = ''; nt.innerHTML = ''; return;
    }
    var win = parseInt(el('o_win').value, 10); if(!(win >= 3)) win = 9; if(win % 2 === 0) win += 1;
    var n = [], usable = D.map(function(d, i){ return filled[i] && d.T.length >= win + 2 && d.cols.length > 0; });
    var badMsg = function(d){
      return d.lay && d.lay.n && d.ignored.length && !d.cols.length ? 'The plate layout names none of the wells in the data. Use positions like A1 or A01 in the layout and in the column names.'
        : 'Could read ' + d.T.length + ' temperature steps and ' + d.cols.length + ' complete well column(s); at least ' + (win + 2) + ' steps are needed. Expected: first column temperature, one column per well, header like Reference_1, Reference_2, Ligand_1, or one row per well and reading with columns for well, temperature and fluorescence.' + UI.exampleHint();
    };
    if(usable.indexOf(true) < 0){
      var bi = filled[cur] ? cur : filled.indexOf(true);
      plotBox.innerHTML = '<div class="empty">Not enough data: at least ' + (win + 2) + ' temperature steps and one complete well column are needed.</div>'; res.innerHTML = '';
      nt.innerHTML = UI.notes([{ warn: true, text: pre(bi) + badMsg(D[bi]) }]); return;
    }
    D.forEach(function(d, i){
      if(filled[i] && !usable[i]) n.push({ warn: true, text: pre(i) + 'not used. ' + badMsg(d) });
      if(multi && !filled[i]) n.push({ text: 'Plate ' + (i + 1) + ' is empty and not used.' });
    });
    // all wells of all usable plates; with several plates the well names get the plate number in front
    var cols = [];
    D.forEach(function(d, i){
      if(!usable[i]) return;
      d.cols.forEach(function(c){ c.plate = i; c.well = c.name; c.T = d.T; if(multi) c.name = 'P' + (i + 1) + ' ' + c.name; cols.push(c); });
    });
    ex.sync(cols.map(function(c){ return c.name; }).join('|'));
    var meanMode = el('v_mean').checked, norm = el('n_norm').checked, useB = el('t_bol').checked, align = multi && el('a_ref').checked;
    var tmin = TK.toNum(el('o_min').value, ';'), tmax = TK.toNum(el('o_max').value, ';');
    var groups = [], gi = {};
    cols.forEach(function(c){
      if(!(c.group in gi)){ gi[c.group] = groups.length; groups.push({ name: c.group, tm: [], wells: [] }); }
      var m = TK.meltTm(c.T, c.F, win, tmin, tmax);
      var bz = boltz(c.name, c.T, c.F, tmin, tmax, m.tm);
      // a Boltzmann Tm outside the fitted range means there was no transition to fit (e.g. a blank)
      c.tmD = m.tm; c.tmB = bz.converged && bz.inside ? bz.tm : NaN; c.bz = bz;
      c.tmRaw = useB ? c.tmB : c.tmD; c.deriv = m.deriv; c.gi = gi[c.group]; c.edge = m.index != null && (m.index <= (win - 1) / 2 || m.index >= c.T.length - 1 - (win - 1) / 2);
      c.off = ex.off(c.name);
      // 0 to 1 scaling per well (minimum and maximum of the whole curve); the derivative scales by the same factor
      var lo = Math.min.apply(null, c.F), span = Math.max.apply(null, c.F) - lo;
      c.Fn = c.F.map(function(v){ return span > 0 ? (v - lo) / span : NaN; });
      c.dn = c.deriv.map(function(v){ return span > 0 ? v / span : NaN; });
      if(!c.off) groups[c.gi].wells.push(c);
    });
    // reference selector keeps its choice while the group list is unchanged
    var sel = el('o_ref'), key = groups.map(function(g){ return g.name; }).join('|');
    if(sel.getAttribute('data-key') !== key){
      sel.innerHTML = groups.map(function(g){ return '<option>' + UI.esc(g.name) + '</option>'; }).join('');
      sel.setAttribute('data-key', key);
      var guess = groups.map(function(g){ return parts(g.name).length === 1 && REF_RE.test(g.name); }).indexOf(true);
      sel.selectedIndex = guess >= 0 ? guess : 0;
    }
    var ref = groups[Math.max(0, sel.selectedIndex)];
    // reference mean per plate; with "Align on the reference" every plate is shifted so that its reference mean
    // equals the mean of all plates' reference means
    var plateInfo = D.map(function(d, i){
      var r = finite(ref.wells.filter(function(c){ return c.plate === i; }).map(function(c){ return c.tmRaw; }));
      return { used: usable[i], n: cols.filter(function(c){ return c.plate === i && !c.off; }).length, nRef: r.length, refMean: r.length ? TK.mean(r) : NaN, offset: 0 };
    });
    var refMeans = finite(plateInfo.map(function(p){ return p.refMean; })), refAll = refMeans.length ? TK.mean(refMeans) : NaN;
    var noRefPlates = [];
    plateInfo.forEach(function(p, i){
      if(!p.used) return;
      if(align){ if(isFinite(p.refMean)) p.offset = p.refMean - refAll; else noRefPlates.push(i + 1); }
    });
    cols.forEach(function(c){
      var off = plateInfo[c.plate].offset;
      c.tm = c.tmRaw - off; c.Tx = off ? c.T.map(function(t){ return t - off; }) : c.T;
      if(!c.off && isFinite(c.tm)) groups[c.gi].tm.push(c.tm);
    });
    // wells far from the median of their group (only with at least three wells, otherwise there is no majority)
    groups.forEach(function(g){
      if(g.tm.length < 3) return;
      var med = median(g.tm);
      g.wells.forEach(function(c){ c.odd = isFinite(c.tm) && Math.abs(c.tm - med) > OUTLIER; });
    });
    var fKey = norm ? 'Fn' : 'F', dKey = norm ? 'dn' : 'deriv';
    // common temperature grid for the mean curves: the first usable plate's temperatures; other plates (and aligned
    // plates, whose curves are shifted) are interpolated onto it
    var G = D[usable.indexOf(true)].T;
    cols.forEach(function(c){ c.g = {}; [fKey, dKey].forEach(function(k){ c.g[k] = onGrid(c.Tx, c[k], G); }); });
    // mean and SD across the included wells of each group, point by point (display only; Tm comes from the single wells)
    groups.forEach(function(g){
      g.curve = {}; g.curveSd = {};
      [fKey, dKey].forEach(function(k){
        g.curve[k] = G.map(function(_, i){ return TK.mean(finite(g.wells.map(function(c){ return c.g[k][i]; }))); });
        g.curveSd[k] = G.map(function(_, i){ return TK.sd(finite(g.wells.map(function(c){ return c.g[k][i]; }))); });
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
          series.push({ kind: 'band', x: G, y: g.curve[k].map(function(v, j){ return v - g.curveSd[k][j]; }), y2: g.curve[k].map(function(v, j){ return v + g.curveSd[k][j]; }), color: g.ci });
        });
        groups.forEach(function(g){
          if(g.show && g.wells.length) series.push({ kind: 'line', x: G, y: g.curve[k], color: g.ci, label: g.name + ' (n = ' + g.wells.length + ')', width: 2.2 });
        });
      } else {
        cols.forEach(function(c){ if(c.off && groups[c.gi].show) series.push({ kind: 'line', x: c.Tx, y: c[k], muted: true, dash: '5 4', label: 'left out', width: 1.3, opacity: 0.8 }); });
        cols.forEach(function(c){ if(!c.off && groups[c.gi].show) series.push({ kind: 'line', x: c.Tx, y: c[k], color: groups[c.gi].ci, label: c.group, width: 1.7, opacity: 0.9 }); });
      }
      return { xlabel: align ? 'Temperature, aligned / °C' : 'Temperature / °C', ylabel: ylabel, height: 330, legend: true, legendLeft: true, series: series,
        vlines: groups.filter(function(g){ return g.show; }).map(function(g){ return { x: TK.mean(g.tm), color: g.ci }; }) };
    };
    var spec = mk(fKey, norm ? 'Normalised fluorescence' : 'Fluorescence'), spec2 = mk(dKey, norm ? 'dF/dT (normalised)' : 'dF/dT');
    UI.applyLabels(spec); UI.applyLabels(spec2, { x: 'f_x', y: 'f_y2' });
    plotBox.innerHTML = UI.plot(spec) || '<div class="empty">No group is ticked for the figure. Tick at least one in the table.</div>'; plot2.innerHTML = UI.plot(spec2);
    // means first: the shift of every group needs the reference mean, wherever the reference sits in the list
    groups.forEach(function(g){ g.mean = TK.mean(g.tm); g.sd = TK.sd(g.tm); });
    var sgn = function(v){ return isFinite(v) ? (v >= 0 ? '+' : '') + v.toFixed(2) : '—'; };
    var pfmt = function(p){ return isFinite(p) ? (p < 0.001 ? '&lt; 0.001' : p.toFixed(3)) : '—'; };
    var grow = groups.map(function(g){
      var w = g === ref ? null : TK.welch(g.tm, ref.tm);
      g.d = g.mean - ref.mean; g.p = w ? w.p : NaN; g.ci = w ? w.ci : [NaN, NaN];
      return ['<label class="pt"><input type="checkbox" data-show="' + UI.esc(g.name) + '" aria-label="Show ' + UI.esc(g.name) + ' in the figure"' + (g.show ? ' checked' : '') + '>' +
              '<span class="gdot" style="background:' + gcol(g) + '"></span></label>' + (g.show ? '' : '<span class="muted">') + UI.esc(g.name) + (g.show ? '' : '</span>') + (g === ref ? ' <span class="meta">reference</span>' : ''), g.tm.length, '<b>' + fx(g.mean, 2) + '</b>', fx(g.sd, 2),
              g === ref || !isFinite(g.d) ? '—' : sgn(g.d), isFinite(g.ci[0]) ? sgn(g.ci[0]) + ' to ' + sgn(g.ci[1]) : '—', pfmt(g.p)];
    });
    // every combination against each of its parts left out, where that group exists ("A + B" vs "A": what B adds)
    var byKey = {}, combos = [];
    groups.forEach(function(g){ byKey[comboKey(g.name)] = g; });
    groups.forEach(function(g){
      var p = parts(g.name); if(p.length < 2) return;
      p.forEach(function(x){
        var rest = p.filter(function(y){ return y !== x; }), base = byKey[rest.slice().sort().join('\u0000')];
        if(!base) return;
        var w = TK.welch(g.tm, base.tm);
        combos.push({ g: g, base: base, added: x, d: g.mean - base.mean, ci: w.ci, p: w.p });
      });
    });
    var comboHtml = combos.length ? '<div class="plate-head" style="margin-top:14px"><span class="meta">Combinations</span><span class="muted">each combination compared with the same wells without one of its substances</span></div>' +
      UI.table(['Combination', 'compared with', 'effect of adding', 'ΔT<sub>m</sub> / °C', '95 % CI of ΔT<sub>m</sub>', 'p (Welch)'], combos.map(function(c){
        return [UI.esc(c.g.name), UI.esc(c.base.name), UI.esc(c.added), sgn(c.d), isFinite(c.ci[0]) ? sgn(c.ci[0]) + ' to ' + sgn(c.ci[1]) : '—', pfmt(c.p)];
      }), 'res') : '';
    var plateHtml = multi ? '<div class="plate-head" style="margin-top:14px"><span class="meta">Plates</span><span class="muted">reference ' + UI.esc(ref.name) + ' on each plate' + (align ? ', and the shift applied to align the plates' : '') + '</span></div>' +
      UI.table(['Plate', 'Wells used', 'Reference wells', 'Reference T<sub>m</sub> / °C'].concat(align ? ['Shift applied / °C'] : []), plateInfo.map(function(p, i){
        if(!p.used) return ['Plate ' + (i + 1), '—', '—', 'not used'].concat(align ? ['—'] : []);
        return ['Plate ' + (i + 1), p.n, p.nRef, fx(p.refMean, 2)].concat(align ? [isFinite(p.refMean) ? sgn(-p.offset) : 'none'] : []);
      }), 'res') : '';
    var off = cols.filter(function(c){ return c.off; });
    var curCols = cols.filter(function(c){ return c.plate === cur; });
    res.innerHTML = UI.table(['Group', 'n', 'Mean T<sub>m</sub> / °C', 'SD', 'ΔT<sub>m</sub> / °C', '95 % CI of ΔT<sub>m</sub>', 'p (Welch)'], grow, 'res pts') +
      '<p class="muted" style="margin:6px 0 0; font-size:13px">Untick a group to take it out of the figure. It stays in the table and the statistics.</p>' + comboHtml + plateHtml +
      (usable[cur] ? plateMap(curCols, dCur.ignored, function(c){ return gcol(groups[c.gi]); }, multi ? 'Plate ' + (cur + 1) : '') : '') +
      UI.ptsBox('T<sub>m</sub> per well' + (off.length ? ' (' + off.length + ' left out)' : '') + '. Untick a well to leave it out.',
        UI.table(['Well', 'Group', 'T<sub>m</sub> derivative / °C', 'T<sub>m</sub> Boltzmann / °C'].concat(align ? ['T<sub>m</sub> aligned / °C'] : []).concat(['']), cols.map(function(c){
          var cell = function(v, used){ var t = fx(v, 2); if(c.off) return '<s>' + t + '</s>'; return used ? '<b>' + t + '</b>' : '<span class="muted">' + t + '</span>'; };
          return [UI.check(c.name, c.off, c.name), UI.esc(c.group), cell(c.tmD, !useB && !align), cell(c.tmB, useB && !align)].concat(align ? [cell(c.tm, true)] : [])
                  .concat([c.odd ? '<span class="flag">check</span>' : '']);
        }), 'pts'));
    D.forEach(function(d, i){ if(usable[i] && d.conv) n.push({ text: pre(i) + d.conv }); });
    var nHidden = groups.filter(function(g){ return !g.show; }).length;
    if(nHidden) n.push({ text: nHidden + ' group(s) not shown in the figure. They are still in the table, the statistics and the CSV.' });
    D.forEach(function(d, i){
      if(!usable[i]) return;
      if(d.lay && !d.lay.n) n.push({ warn: true, text: pre(i) + 'The plate layout could not be read. Paste the plate map with row letters in the first column and column numbers in the first row, or a list of well and name.' });
      if(d.lay && d.lay.n) n.push({ text: pre(i) + 'Groups from the plate layout' + (d.ignored.length ? '. ' + d.ignored.length + ' well(s) without a name in the layout are ignored: ' + d.ignored.map(UI.esc).join(', ') : '') + '.' });
      var byPos = d.names.filter(function(nm){ return wellKey(nm); }).length >= Math.max(2, d.names.length / 2);
      if(byPos && !(d.lay && d.lay.n)) n.push({ warn: true, text: pre(i) + 'The wells are named by position, but no plate layout is given, so the groups are only the row letters (A, B, ...). Assign your samples on the plate under &ldquo;Plate layout&rdquo;.' });
    });
    if(demo2 && plates.length === 2 && plates[0].in === demo2[0] && plates[1].in === demo2[1])
      n.push({ text: 'Demo: two synthetic plates (not measured data) with the same samples. Plate 2 reads about 1 °C higher, as two runs on different days can. Compare &ldquo;As measured&rdquo; with &ldquo;Align on reference&rdquo; under &ldquo;Plates&rdquo;.' });
    if(multi){
      n.push({ text: 'Several plates: wells with the same sample name on different plates are pooled into one group. Means, SD, &Delta;T<sub>m</sub> and p values use all plates.' });
      if(align){
        n.push({ text: 'Aligned on the reference: each plate is shifted so that its mean reference T<sub>m</sub> equals the mean over all plates (' + fx(refAll, 2) + ' °C). This removes differences between runs, but the reference wells are then used twice (for the shift and as the reference), so the p values are a little too optimistic. The curves in the figure are shifted by the same amount.' });
        if(noRefPlates.length) n.push({ warn: true, text: 'Plate ' + noRefPlates.join(', ') + ' has no reference wells and could not be aligned; its values are used as measured.' });
      } else {
        var spread = refMeans.length > 1 ? Math.max.apply(null, refMeans) - Math.min.apply(null, refMeans) : 0;
        // 0.5 °C: a rule of thumb for "the runs differ more than replicate wells usually do", not a statistical test
        if(spread > 0.5) n.push({ warn: true, text: 'The reference differs by ' + spread.toFixed(2) + ' °C between plates. If the plates are replicate runs, consider &ldquo;Align on reference&rdquo; under &ldquo;Plates&rdquo;.' });
      }
    }
    var odd = cols.filter(function(c){ return c.odd; });
    if(odd.length) n.push({ warn: true, text: odd.map(function(c){ return UI.esc(c.name) + ' (' + fx(c.tm, 1) + ' °C)'; }).join(', ') + (odd.length > 1 ? ' are' : ' is') + ' more than ' + OUTLIER + ' °C away from the median of ' + (odd.length > 1 ? 'their groups' : 'its group') + '. If the well failed, untick it in the table above.' });
    if(off.length) n.push({ text: off.length + ' well(s) left out (' + off.map(function(c){ return UI.esc(c.name); }).join(', ') + '). They are left out of means, SD, ΔT<sub>m</sub> and p values' + (meanMode ? ' and the mean curves' : ' and drawn grey and dashed') + '. Say so in your methods.' });
    if(groups.some(function(g){ return !g.wells.length; })) n.push({ warn: true, text: 'All wells of a group are left out, so that group has no result.' });
    var step = NaN;
    D.forEach(function(d, i){
      if(!usable[i]) return;
      var diffs = []; for(var j = 1; j < d.T.length; j++) diffs.push(d.T[j] - d.T[j - 1]);
      var s = TK.mean(diffs); if(!isFinite(step)) step = s;
      if(Math.max.apply(null, diffs.map(function(x){ return Math.abs(x - s); })) > Math.abs(s) * 0.02) n.push({ warn: true, text: pre(i) + 'The temperature steps are not evenly spaced. The derivative assumes equal steps, so T<sub>m</sub> may be off.' });
    });
    var edge = cols.filter(function(c){ return c.edge && !c.off; }).length;
    if(edge) n.push({ warn: true, text: edge + ' well(s) have their steepest point at the edge of the temperature range or search window. That is usually not a melting transition: check the curves and set a search window, or exclude the well.' });
    if(groups.some(function(g){ return g !== ref && Math.abs(g.d) < 1; })) n.push({ text: 'Shifts below about 1 °C are often within the noise of the method.' });
    if(groups.some(function(g){ return g.tm.length < 3; })) n.push({ text: 'Groups with fewer than three wells: no meaningful SD or p value.' });
    else n.push({ text: 'With three wells per group the p value is an orientation only.' });
    if(meanMode) n.push({ text: 'Mean per group: each curve is the point-by-point mean of the included wells, the shaded band ± 1 SD. The curves are for display. T<sub>m</sub>, SD and p still come from the single wells, and the dashed lines mark the mean T<sub>m</sub>, which can sit slightly off the peak of the mean derivative.' });
    if(norm) n.push({ text: 'Normalised: each well is scaled to 0 at its lowest and 1 at its highest reading over the whole range. This does not change T<sub>m</sub>.' });
    var noB = cols.filter(function(c){ return !c.off && !isFinite(c.tmB); });
    if(useB && noB.length) n.push({ warn: true, text: noB.length + ' well(s) without a Boltzmann T<sub>m</sub> (' + noB.map(function(c){ return UI.esc(c.name); }).join(', ') + '): the fit found no transition in the search range, which is usual for blanks. They are not in the group results.' });
    if(useB) n.push({ text: 'T<sub>m</sub> from a Boltzmann fit, F = F<sub>min</sub> + (F<sub>max</sub> &minus; F<sub>min</sub>) / (1 + exp((T<sub>m</sub> &minus; T) / a)), by nonlinear least squares from the lowest reading before the maximum up to the maximum; the fall after the maximum is left out. The derivative values are shown in the well table for comparison.' });
    else n.push({ text: 'T<sub>m</sub> is the temperature of the steepest increase: first derivative from a Savitzky-Golay filter (quadratic, ' + win + ' points = ' + TK.sig((win - 1) * step, 3) + ' °C), maximum refined with a parabola. The Boltzmann values are shown in the well table for comparison.' });
    n.push({ text: 'The 95 % confidence interval of &Delta;T<sub>m</sub> comes from the same Welch test as the p value. If it does not include 0, the shift is distinguishable from the scatter of the replicates.' + (D.some(function(d, i){ return usable[i] && d.lay && d.lay.n; }) ? '' : ' Wells are grouped by their column name without the trailing number, or by the plate layout if you paste one.') });
    if(combos.length) n.push({ text: 'Combinations: a group named &ldquo;A + B&rdquo; is also compared with &ldquo;A&rdquo; and with &ldquo;B&rdquo; if those groups exist, with the same Welch test. The &Delta;T<sub>m</sub> there is the shift caused by adding the second substance to the first.' });
    else if(groups.some(function(g){ return parts(g.name).length > 1; })) n.push({ text: 'A combination is compared with its single substances only if those are on the plate as groups of their own, named the same way.' });
    nt.innerHTML = UI.notes(n);
    last = { spec: spec, spec2: spec2, d: { T: G, cols: cols }, groups: groups, ref: ref, win: win, fKey: fKey, norm: norm, useB: useB, combos: combos, multi: multi, align: align, plateInfo: plateInfo }; el('dl').hidden = false;
  }

  UI.wire({ run: run, demo: function(){ el('in').value = demo(); },
    actions: {
      svg: function(){ if(last){ UI.downloadSVG('melting-curves.svg', last.spec); UI.downloadSVG('melting-derivative.svg', last.spec2); } },
      png: function(){ if(last){ UI.downloadPNG('melting-curves.png', last.spec); setTimeout(function(){ UI.downloadPNG('melting-derivative.png', last.spec2); }, 400); } },
      csv: function(){ if(!last) return;
        var rows = [['tm_method', last.useB ? 'boltzmann' : 'first derivative']];
        if(last.multi) rows.push(['plates', last.plateInfo.filter(function(p){ return p.used; }).length, 'aligned_on_reference', last.align ? 'yes' : 'no']);
        rows.push([]); rows.push(
          ['group', 'n', 'Tm_mean', 'Tm_sd', 'dTm_vs_' + last.ref.name, 'dTm_ci95_low', 'dTm_ci95_high', 'p_welch']);
        last.groups.forEach(function(g){ rows.push([g.name, g.tm.length, g.mean, isFinite(g.sd) ? g.sd : '', g === last.ref ? '' : g.d,
          isFinite(g.ci[0]) ? g.ci[0] : '', isFinite(g.ci[1]) ? g.ci[1] : '', isFinite(g.p) ? g.p : '']); });
        if(last.combos.length){
          rows.push([]); rows.push(['combination', 'compared_with', 'added', 'dTm', 'dTm_ci95_low', 'dTm_ci95_high', 'p_welch']);
          last.combos.forEach(function(c){ rows.push([c.g.name, c.base.name, c.added, isFinite(c.d) ? c.d : '', isFinite(c.ci[0]) ? c.ci[0] : '', isFinite(c.ci[1]) ? c.ci[1] : '', isFinite(c.p) ? c.p : '']); });
        }
        if(last.multi){
          rows.push([]); rows.push(['plate', 'wells_used', 'reference_wells', 'reference_Tm_mean', 'shift_applied']);
          last.plateInfo.forEach(function(p, i){ if(p.used) rows.push([i + 1, p.n, p.nRef, isFinite(p.refMean) ? p.refMean : '', last.align ? -p.offset : 0]); });
        }
        rows.push([]); rows.push(['plate', 'well', 'group', 'Tm_derivative', 'Tm_boltzmann', 'Tm_boltzmann_se', 'Tm_used', 'included']);
        last.d.cols.forEach(function(c){ rows.push([c.plate + 1, c.well, c.group, isFinite(c.tmD) ? c.tmD : '', isFinite(c.tmB) ? c.tmB : '', isFinite(c.tmB) ? c.bz.se : '', isFinite(c.tm) ? c.tm : '', c.off ? 'no' : 'yes']); });
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
