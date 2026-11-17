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

  function read(){
    var t = TK.parseTable(el('in').value), T = [], cols = [];
    for(var j = 1; j < t.header.length; j++) cols.push({ name: t.header[j], group: t.header[j].replace(/[_\s.-]*\d+$/, '') || t.header[j], F: [] });
    t.rows.forEach(function(r){
      var x = TK.toNum(r[0], t.delim); if(!isFinite(x)) return;
      T.push(x); cols.forEach(function(c, k){ c.F.push(TK.toNum(r[k + 1], t.delim)); });
    });
    cols = cols.filter(function(c){ return c.F.filter(isFinite).length === T.length && T.length; });
    return { T: T, cols: cols };
  }

  // Display helpers: '—' for missing values, NaN-safe mean and SD across wells at one temperature.
  function fx(v, d){ return isFinite(v) ? v.toFixed(d) : '—'; }
  function finite(a){ return a.filter(function(v){ return isFinite(v); }); }

  function median(a){ var b = a.slice().sort(function(x, y){ return x - y; }), m = b.length >> 1; return b.length % 2 ? b[m] : (b[m - 1] + b[m]) / 2; }
  // Wells the user unticked, by column name. Cleared when the set of column names changes (new data).
  var ex = UI.exclusions();
  var OUTLIER = 2;   // °C away from the group median: a rule of thumb for "look at this well", not a statistical test

  function run(){
    var d = read(), plotBox = el('out_plot'), plot2 = el('out_plot2'), res = el('out_res'), nt = el('out_notes');
    last = null; el('dl').hidden = true; plot2.innerHTML = '';
    if(!el('in').value.trim()){
      plotBox.innerHTML = '<div class="empty">Paste your melting curves or load the demo data.</div>'; res.innerHTML = ''; nt.innerHTML = ''; return;
    }
    var win = parseInt(el('o_win').value, 10); if(!(win >= 3)) win = 9; if(win % 2 === 0) win += 1;
    if(d.T.length < win + 2 || !d.cols.length){
      plotBox.innerHTML = '<div class="empty">Not enough data: at least ' + (win + 2) + ' temperature steps and one complete well column are needed.</div>'; res.innerHTML = '';
      nt.innerHTML = UI.notes([{ warn: true, text: 'Could read ' + d.T.length + ' temperature steps and ' + d.cols.length + ' complete well column(s). Expected: first column temperature, one column per well, header like Reference_1, Reference_2, Ligand_1.' }]); return;
    }
    ex.sync(d.cols.map(function(c){ return c.name; }).join('|'));
    var meanMode = el('v_mean').checked, norm = el('n_norm').checked;
    var tmin = TK.toNum(el('o_min').value, ';'), tmax = TK.toNum(el('o_max').value, ';');
    var groups = [], gi = {};
    d.cols.forEach(function(c){
      if(!(c.group in gi)){ gi[c.group] = groups.length; groups.push({ name: c.group, tm: [], wells: [] }); }
      var m = TK.meltTm(d.T, c.F, win, tmin, tmax);
      c.tm = m.tm; c.deriv = m.deriv; c.gi = gi[c.group]; c.edge = m.index != null && (m.index <= (win - 1) / 2 || m.index >= d.T.length - 1 - (win - 1) / 2);
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
    var mk = function(k, ylabel){
      var series = [];
      if(meanMode){
        groups.forEach(function(g, i){
          if(!g.wells.length) return;
          if(g.wells.length > 1) series.push({ kind: 'band', x: d.T, y: g.curve[k].map(function(v, j){ return v - g.curveSd[k][j]; }), y2: g.curve[k].map(function(v, j){ return v + g.curveSd[k][j]; }), color: i });
        });
        groups.forEach(function(g, i){
          if(g.wells.length) series.push({ kind: 'line', x: d.T, y: g.curve[k], color: i, label: g.name + ' (n = ' + g.wells.length + ')', width: 2.2 });
        });
      } else {
        d.cols.forEach(function(c){ if(c.off) series.push({ kind: 'line', x: d.T, y: c[k], muted: true, dash: '5 4', label: 'left out', width: 1.3, opacity: 0.8 }); });
        d.cols.forEach(function(c){ if(!c.off) series.push({ kind: 'line', x: d.T, y: c[k], color: c.gi, label: c.group, width: 1.7, opacity: 0.9 }); });
      }
      return { xlabel: 'Temperature / °C', ylabel: ylabel, height: 330, legend: true, legendLeft: true, series: series,
        vlines: groups.map(function(g, i){ return { x: TK.mean(g.tm), color: i }; }) };
    };
    var spec = mk(fKey, norm ? 'Normalised fluorescence' : 'Fluorescence'), spec2 = mk(dKey, norm ? 'dF/dT (normalised)' : 'dF/dT');
    UI.applyLabels(spec); UI.applyLabels(spec2, { x: 'f_x', y: 'f_y2' });
    plotBox.innerHTML = UI.plot(spec); plot2.innerHTML = UI.plot(spec2);
    var grow = groups.map(function(g){
      g.mean = TK.mean(g.tm); g.sd = TK.sd(g.tm); g.d = g.mean - ref.mean; g.p = g === ref ? NaN : TK.welch(g.tm, ref.tm).p;
      return [UI.esc(g.name) + (g === ref ? ' <span class="meta">reference</span>' : ''), g.tm.length, '<b>' + fx(g.mean, 2) + '</b>', fx(g.sd, 2),
              g === ref || !isFinite(g.d) ? '—' : (g.d >= 0 ? '+' : '') + g.d.toFixed(2), isFinite(g.p) ? (g.p < 0.001 ? '&lt; 0.001' : g.p.toFixed(3)) : '—'];
    });
    var off = d.cols.filter(function(c){ return c.off; });
    res.innerHTML = UI.table(['Group', 'n', 'Mean T<sub>m</sub> / °C', 'SD', 'ΔT<sub>m</sub> / °C', 'p (Welch)'], grow, 'res') +
      UI.ptsBox('T<sub>m</sub> per well' + (off.length ? ' (' + off.length + ' left out)' : '') + '. Untick a well to leave it out.',
        UI.table(['Well', 'Group', 'T<sub>m</sub> / °C', ''], d.cols.map(function(c){
          return [UI.check(c.name, c.off, c.name), UI.esc(c.group), c.off ? '<s>' + fx(c.tm, 2) + '</s>' : fx(c.tm, 2),
                  c.odd ? '<span class="flag">check</span>' : ''];
        }), 'pts'));
    var n = [], diffs = [];
    for(var i = 1; i < d.T.length; i++) diffs.push(d.T[i] - d.T[i - 1]);
    var step = TK.mean(diffs);
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
    n.push({ text: 'T<sub>m</sub> is the temperature of the steepest increase: first derivative from a Savitzky-Golay filter (quadratic, ' + win + ' points = ' + TK.sig((win - 1) * step, 3) + ' °C), maximum refined with a parabola. A Boltzmann fit can give slightly different values. Wells are grouped by their column name without the trailing number.' });
    nt.innerHTML = UI.notes(n);
    last = { spec: spec, spec2: spec2, d: d, groups: groups, ref: ref, win: win, fKey: fKey, norm: norm }; el('dl').hidden = false;
  }

  UI.wire({ run: run, demo: function(){ el('in').value = demo(); },
    actions: {
      svg: function(){ if(last){ UI.downloadSVG('melting-curves.svg', last.spec); UI.downloadSVG('melting-derivative.svg', last.spec2); } },
      png: function(){ if(last){ UI.downloadPNG('melting-curves.png', last.spec); setTimeout(function(){ UI.downloadPNG('melting-derivative.png', last.spec2); }, 400); } },
      csv: function(){ if(!last) return;
        var rows = [['group', 'n', 'Tm_mean', 'Tm_sd', 'dTm_vs_' + last.ref.name, 'p_welch']];
        last.groups.forEach(function(g){ rows.push([g.name, g.tm.length, g.mean, isFinite(g.sd) ? g.sd : '', g === last.ref ? '' : g.d, isFinite(g.p) ? g.p : '']); });
        rows.push([]); rows.push(['well', 'group', 'Tm', 'included']);
        last.d.cols.forEach(function(c){ rows.push([c.name, c.group, c.tm, c.off ? 'no' : 'yes']); });
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
