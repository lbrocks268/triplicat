/* Lab calculators. Runs entirely in the browser, no network after load.
   Ported from the Jarvis dashboard module calc.py (German) to English. */
(function(){
  var SCALES = {
    conc: [[1,'M'],[1e-3,'mM'],[1e-6,'µM'],[1e-9,'nM']],
    vol:  [[1,'L'],[1e-3,'mL'],[1e-6,'µL']],
    mass: [[1,'g'],[1e-3,'mg'],[1e-6,'µg']]
  };

  function el(id){ return document.getElementById(id); }

  // Fill unit selects: <select data-u="conc" data-d="mM">
  var sels = document.querySelectorAll('select[data-u]');
  for(var k = 0; k < sels.length; k++){
    var s = SCALES[sels[k].getAttribute('data-u')], d = sels[k].getAttribute('data-d');
    for(var j = 0; j < s.length; j++){
      var o = document.createElement('option');
      o.value = String(s[j][0]); o.textContent = s[j][1];
      if(s[j][1] === d) o.selected = true;
      sels[k].appendChild(o);
    }
  }

  // Accept both comma and point as the decimal separator
  function num(str){
    var x = parseFloat(String(str || '').replace(',', '.').trim());
    return isFinite(x) ? x : NaN;
  }
  function val(id){ var e = el(id); return e ? num(e.value) : NaN; }
  function pnum(node){ return node ? num(node.value) : NaN; }
  function fac(id){ var e = el(id); return e ? parseFloat(e.value) : NaN; }
  function checked(name){ return document.querySelector('input[name="' + name + '"]:checked').value; }
  function show(id, on){ el(id).style.display = on ? '' : 'none'; }

  function sig(n){
    if(!isFinite(n)) return '—';
    // Cut floating-point dust before rounding, otherwise two equal quantities
    // can print differently (477.7 vs 477.8 in a dilution series).
    if(n !== 0) n = Number(n.toPrecision(12));
    var a = Math.abs(n);
    var d = a >= 100 ? 1 : a >= 10 ? 2 : a >= 1 ? 3 : 4;
    var s = n.toFixed(d);
    if(s.indexOf('.') >= 0){ s = s.replace(/0+$/, '').replace(/\.$/, ''); }
    return s;
  }

  function fmt(x, kind){
    if(!isFinite(x)) return '—';
    if(x === 0) return '0';
    var s = SCALES[kind], pick = s[s.length-1];
    for(var i=0; i<s.length; i++){ if(Math.abs(x)/s[i][0] >= 1){ pick = s[i]; break; } }
    return sig(x / pick[0]) + ' ' + pick[1];
  }

  // The balance reads grams: same number as the main result, written out in g.
  function gram(x){
    if(!isFinite(x) || x === 0) return '—';
    var exp = Math.floor(Math.log10(Math.abs(x)));
    var dec = Math.min(9, Math.max(2, 3 - exp));
    var s = x.toFixed(dec);
    if(s.indexOf('.') >= 0){ s = s.replace(/0+$/, '').replace(/\.$/, ''); }
    return s + ' g';
  }
  function massRows(label, m){
    var rows = [[label, fmt(m, 'mass')]];
    if(Math.abs(m) < 1) rows.push(['on the balance', gram(m)]);
    return rows;
  }

  function res(rows){
    return rows.map(function(r){
      return '<div class="calc-res"><span class="k">' + r[0] +
             '</span><span class="val">' + r[1] + '</span></div>';
    }).join('');
  }
  function hint(t){ return '<div class="calc-hint">' + t + '</div>'; }
  function warn(t){ return '<div class="calc-warn">' + t + '</div>'; }
  function note(t){ return '<div class="calc-note">' + t + '</div>'; }
  function esc(t){
    return String(t).replace(/[&<>"]/g, function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];
    });
  }

  // --- 1. Dilution C1V1 = C2V2 ------------------------------------------- //
  function dil(){
    var c1 = val('d_c1') * fac('d_c1u'),
        c2 = val('d_c2') * fac('d_c2u'),
        v2 = val('d_v2') * fac('d_v2u'),
        out = el('d_out');
    if(!isFinite(c1) || !isFinite(c2) || !isFinite(v2)){
      out.innerHTML = hint('Enter stock concentration, target concentration and final volume.');
      return;
    }
    if(c1 <= 0 || c2 <= 0 || v2 <= 0){
      out.innerHTML = warn('All values must be greater than 0.'); return;
    }
    if(c2 > c1){
      out.innerHTML = warn('The target concentration is higher than the stock. Dilution cannot reach it.');
      return;
    }
    var v1 = c2 * v2 / c1;
    out.innerHTML = res([
      ['Stock solution', fmt(v1, 'vol')],
      ['Solvent to add', fmt(v2 - v1, 'vol')],
      ['Dilution factor', '1 : ' + sig(c1 / c2)]
    ]) + note('Pipette the stock first, then fill up to ' + fmt(v2,'vol') + ' final volume.');
  }

  // --- 2. Mass / molarity -------------------------------------------------- //
  function weigh(){
    var mode = checked('w_mode'),
        M  = val('w_mw'),
        V  = val('w_v') * fac('w_vu'),
        out = el('w_out');
    show('w_row_c', mode === 'mass');
    show('w_row_m', mode === 'conc');
    if(!isFinite(M) || M <= 0){ out.innerHTML = hint('Enter the molar mass (g/mol).'); return; }
    if(!isFinite(V) || V <= 0){ out.innerHTML = hint('Enter the volume.'); return; }
    if(mode === 'mass'){
      var c = val('w_c') * fac('w_cu');
      if(!isFinite(c) || c <= 0){ out.innerHTML = hint('Enter the target concentration.'); return; }
      out.innerHTML = res(massRows('Mass to weigh', c * V * M)) +
        note('m = c · V · M. Dissolve and fill up to ' + fmt(V,'vol') + '.');
    } else {
      var m = val('w_m') * fac('w_mu');
      if(!isFinite(m) || m <= 0){ out.innerHTML = hint('Enter the weighed mass.'); return; }
      out.innerHTML = res([['Concentration', fmt(m / (V * M), 'conc')]]) +
        note('c = m / (V · M)');
    }
  }

  // --- 3. Percent solution ------------------------------------------------- //
  function pct(){
    var kind = checked('p_kind'),
        p = val('p_pct'),
        V = val('p_v') * fac('p_vu'),
        out = el('p_out');
    if(!isFinite(p) || !isFinite(V)){ out.innerHTML = hint('Enter the percentage and the final volume.'); return; }
    if(p <= 0 || V <= 0){ out.innerHTML = warn('Values must be greater than 0.'); return; }
    if(p > 100){ out.innerHTML = warn('More than 100 % is not a solution.'); return; }
    if(kind === 'wv'){
      // % (w/v) = g per 100 mL. V is in L: p/100 * V*1000 = p * V * 10
      var g = p * V * 10;
      out.innerHTML = res(massRows('Mass to weigh', g)) +
        note('% (w/v) means grams per 100 mL. Dissolve and fill up to ' + fmt(V,'vol') + '.');
    } else {
      var vc = p / 100 * V;
      out.innerHTML = res([
        ['Component', fmt(vc, 'vol')],
        ['Solvent', fmt(V - vc, 'vol')]
      ]) + note('% (v/v) means mL per 100 mL final volume.');
    }
  }

  // --- 4. Dilution series -------------------------------------------------- //
  function targetList(factor){
    var nodes = document.querySelectorAll('#s_rows .dyn-val'), out = [], i, x;
    for(i = 0; i < nodes.length; i++){
      x = pnum(nodes[i]);
      if(isFinite(x) && x > 0) out.push(x * factor);
    }
    return out;
  }

  function serial(){
    var mode = checked('s_mode'),
        how  = checked('s_how'),
        volMode = checked('s_vol'),
        free = (mode === 'free'),
        out  = el('s_out');
    show('s_row_f', !free);
    show('s_row_n', !free);
    show('s_row_list', free);
    show('s_row_how', free);
    // Without transfer from the previous step both readings are identical.
    show('s_row_vol', !(free && how === 'stock'));

    var c0 = val('s_c0') * fac('s_c0u'),
        V  = val('s_v')  * fac('s_vu'),
        minV = val('s_min');
    if(!isFinite(minV) || minV <= 0) minV = 0;
    minV *= 1e-6;                                  // entered in µL

    if(!isFinite(c0) || !isFinite(V)){
      out.innerHTML = hint('Enter the stock concentration and the volume per tube.'); return;
    }
    if(c0 <= 0 || V <= 0){
      out.innerHTML = warn('Concentration and volume must be greater than 0.'); return;
    }

    var cs = [], i;
    if(free){
      cs = targetList(fac('s_listu'));
      if(!cs.length){
        out.innerHTML = hint('Enter the target concentrations, one step per field. ' +
                             '&ldquo;+ step&rdquo; adds more.');
        return;
      }
      if(cs.length > 24){ out.innerHTML = warn('24 steps at most.'); return; }
    } else {
      var f = val('s_f'), n = Math.round(val('s_n'));
      if(!isFinite(f) || !isFinite(n)){
        out.innerHTML = hint('Enter the dilution factor and the number of steps.'); return;
      }
      if(f <= 1){ out.innerHTML = warn('The dilution factor must be greater than 1.'); return; }
      if(n < 1 || n > 24){ out.innerHTML = warn('Choose between 1 and 24 steps.'); return; }
      how = 'serial';
      for(i = 1; i <= n; i++) cs.push(c0 / Math.pow(f, i));
    }

    // Serial with "volume that remains" is computed BACKWARDS: each tube also
    // feeds the next step, so it needs more than what should remain in it,
    // and how much more depends on the next step.
    var source = function(i){
      return (how === 'stock' || i === 0) ? c0 : cs[i - 1];
    };
    var prep = new Array(cs.length), take = new Array(cs.length);
    if(volMode === 'rest' && how === 'serial'){
      for(i = cs.length - 1; i >= 0; i--){
        prep[i] = V + (i < cs.length - 1 ? take[i + 1] : 0);
        take[i] = prep[i] * cs[i] / source(i);
      }
    } else {
      for(i = 0; i < cs.length; i++){
        prep[i] = V;
        take[i] = V * cs[i] / source(i);
      }
    }
    var rows = [];
    for(i = 0; i < cs.length; i++){
      var rest = prep[i] - ((how === 'serial' && i < cs.length - 1) ? take[i + 1] : 0);
      rows.push({ c: cs[i], src: source(i), factor: source(i) / cs[i],
                  take: take[i], dil: prep[i] - take[i], prep: prep[i], rest: rest,
                  from: (how === 'stock' || i === 0) ? 'stock' : ('step ' + i) });
    }

    var tooHigh = rows.filter(function(r){ return r.c >= r.src; });
    if(tooHigh.length){
      out.innerHTML = warn('Step ' + (rows.indexOf(tooHigh[0]) + 1) + ' is not lower than what it is ' +
        'diluted from. Dilution cannot reach it. ' +
        (how === 'serial' ? 'The list must be descending.' : 'Set the target below the stock concentration.'));
      return;
    }

    var isSerial = (how === 'serial');
    var body = '', head = '<tr><th>Step</th><th>Target</th><th>Factor</th><th>Transfer</th>' +
               '<th>Diluent</th><th>Prepared</th>' + (isSerial ? '<th>Remains</th>' : '') + '</tr>';
    for(i = 0; i < rows.length; i++){
      var r = rows[i],
          small = (minV > 0 && r.take < minV) ? ' class="crit"' : '';
      body += '<tr><td>' + (i+1) + '</td><td>' + fmt(r.c, 'conc') + '</td><td>1 : ' + sig(r.factor) +
              '</td><td' + small + '>' + fmt(r.take, 'vol') +
              '<br><span class="meta">from ' + r.from + '</span></td><td>' +
              fmt(r.dil, 'vol') + '</td><td>' + fmt(r.prep, 'vol') + '</td>' +
              (isSerial ? '<td>' + fmt(r.rest, 'vol') + '</td>' : '') + '</tr>';
    }

    var stockNeed = (how === 'stock')
      ? rows.reduce(function(a, r){ return a + r.take; }, 0)
      : rows[0].take;

    var notes = note(
      !isSerial
        ? ('<strong>Prepared</strong> = transfer + diluent. Every step is made directly from the ' +
           'stock, so pipetting errors do not carry over. ' + fmt(stockNeed, 'vol') +
           ' of stock are needed in total.')
        : (volMode === 'rest'
            ? ('<strong>Prepared</strong> = transfer + diluent. <strong>Remains</strong> = what is left ' +
               'in the tube after the transfer to the next step. The extra is included, so ' +
               fmt(V, 'vol') + ' remain everywhere. Rounding up does no harm. ' +
               fmt(stockNeed, 'vol') + ' are taken from the stock.')
            : ('<strong>Prepared</strong> = transfer + diluent = ' + fmt(V, 'vol') + ' in every tube. ' +
               '<strong>Remains</strong> = what is left after the transfer to the next step, so the ' +
               'early steps hold less than the last one. In return the pipetting volumes are round. ' +
               'To have the same volume left everywhere, switch to &ldquo;volume that remains&rdquo; above. ' +
               fmt(stockNeed, 'vol') + ' are taken from the stock.')));

    var tooSmall = rows.filter(function(r){ return minV > 0 && r.take < minV; });
    if(tooSmall.length){
      notes += warn('Marked red: ' + tooSmall.length + ' step' + (tooSmall.length > 1 ? 's are' : ' is') +
        ' below ' + sig(minV * 1e6) + ' µL transfer volume. Such volumes cannot be pipetted reliably. ' +
        'Choose a larger tube volume or add an intermediate step' +
        (how === 'stock' ? ', or dilute serially.' : '.'));
    }

    out.innerHTML = '<div class="calc-scroll"><table class="calc-tbl">' + head + body +
                    '</table></div>' + notes;
  }

  // --- 5. Master mix ------------------------------------------------------- //
  // Always in microlitres: that is what the pipette shows.
  function uL(x){ return isFinite(x) ? sig(x) + ' µL' : '—'; }

  function mastermix(){
    var out = el('mm_out');
    var vr = val('mm_v'), n = val('mm_n'), ex = val('mm_ex'), tp = val('mm_t');
    if(!isFinite(ex)) ex = 0;
    if(!isFinite(tp)) tp = 0;
    if(!isFinite(vr) || !isFinite(n)){
      out.innerHTML = hint('Enter the reaction volume and the number of reactions.'); return;
    }
    if(vr <= 0){ out.innerHTML = warn('The reaction volume must be greater than 0.'); return; }
    if(n < 1){ out.innerHTML = warn('At least one reaction.'); return; }
    if(ex < 0 || ex > 100){ out.innerHTML = warn('Choose an excess between 0 and 100 %.'); return; }
    if(tp < 0){ out.innerHTML = warn('The template volume cannot be negative.'); return; }

    var neff = n * (1 + ex / 100);
    var rows = document.querySelectorAll('#mm_rows .dyn-row');
    var comps = [], sum = 0, i;
    for(i = 0; i < rows.length; i++){
      var v = pnum(rows[i].querySelector('.dyn-val'));
      if(!isFinite(v) || v <= 0) continue;
      var nm = String(rows[i].querySelector('.dyn-name').value || '').trim();
      comps.push([nm || ('Component ' + (i + 1)), v]);
      sum += v;
    }
    if(!comps.length){
      out.innerHTML = hint('Enter at least one component with a volume per reaction.'); return;
    }
    var water = vr - sum - tp;
    if(water < -1e-9){
      out.innerHTML = warn('Components and template add up to ' + sig(sum + tp) +
        ' µL, more than the reaction volume of ' + sig(vr) + ' µL.');
      return;
    }
    var body = '';
    for(i = 0; i < comps.length; i++){
      body += '<tr><td>' + esc(comps[i][0]) + '</td><td>' + uL(comps[i][1]) +
              '</td><td>' + uL(comps[i][1] * neff) + '</td></tr>';
    }
    if(water > 1e-9){
      body += '<tr><td>Water (remainder)</td><td>' + uL(water) + '</td><td>' +
              uL(water * neff) + '</td></tr>';
    }
    var perTube = sum + water;   // everything except the template goes into the mix
    var total = perTube * neff;
    body += '<tr><td><strong>Master mix</strong></td><td>' + uL(perTube) +
            '</td><td>' + uL(total) + '</td></tr>';

    var tail = perTube > 0
      ? ('Dispense ' + uL(perTube) + ' master mix per tube' +
         (tp > 0 ? ' and add ' + uL(tp) + ' template.' : '.'))
      : 'No master mix volume left.';
    out.innerHTML =
      '<div class="calc-scroll"><table class="calc-tbl">' +
      '<tr><th>Component</th><th>Per reaction</th><th>Mix total</th></tr>' +
      body + '</table></div>' +
      (total >= 1000 ? note('Total volume ' + sig(total / 1000) + ' mL.') : '') +
      note('Calculated for ' + sig(neff) + ' reactions (' + sig(n) + ' + ' + sig(ex) +
           ' % excess). ' + tail +
           (tp > 0 ? ' The template is deliberately not part of the mix.' : ''));
  }

  // --- 6. A280 -> protein concentration ------------------------------------ //
  function a280(){
    var mode = checked('a_mode'), out = el('a_out');
    show('a_row_eps', mode === 'molar');
    show('a_row_e1', mode === 'e1');

    var A = val('a_a'), d = val('a_d'), df = val('a_df'), M = val('a_mw');
    if(!isFinite(d) || d <= 0) d = 1;
    if(!isFinite(df) || df <= 0) df = 1;
    if(!isFinite(A)){ out.innerHTML = hint('Enter the absorbance at 280 nm.'); return; }
    if(A < 0){ out.innerHTML = warn('A negative absorbance points to a wrong blank.'); return; }

    var rows, tail;
    if(mode === 'molar'){
      var eps = val('a_eps');
      if(!isFinite(eps) || eps <= 0){
        out.innerHTML = hint('Enter the extinction coefficient ε in M⁻¹cm⁻¹. For your own protein it can be calculated from the sequence, e.g. with ProtParam.');
        return;
      }
      var cM = A / (eps * d) * df;                 // mol/L
      rows = [['Concentration', fmt(cM, 'conc')]];
      if(isFinite(M) && M > 0) rows.push(['Mass concentration', sig(cM * M) + ' mg/mL']);
      tail = 'c = A / (ε · d)';
    } else {
      var e1 = val('a_e1');
      if(!isFinite(e1) || e1 <= 0){
        out.innerHTML = hint('Enter the specific extinction coefficient ε<sub>0.1 %</sub> (absorbance of a 1 mg/mL solution at 1 cm).');
        return;
      }
      var cg = A / (e1 * d) * df;                  // mg/mL = g/L
      rows = [['Concentration', sig(cg) + ' mg/mL']];
      if(isFinite(M) && M > 0) rows.push(['Molar concentration', fmt(cg / M, 'conc')]);
      tail = 'c = A / (ε<sub>0.1 %</sub> · d)';
    }
    if(df !== 1) tail += ', × dilution factor ' + sig(df);
    var extra = '';
    if(A > 2){
      extra = warn('A₂₈₀ above 2 is outside the linear range of most photometers. Dilute and measure again.');
    } else if(A < 0.05){
      extra = note('A₂₈₀ below 0.05: the signal is close to the noise, so the value is uncertain.');
    }
    out.innerHTML = res(rows) + note(tail +
      '. Valid for clean samples only: nucleic acids absorb at 280 nm as well, ' +
      'and so do DTT and some detergents.') + extra;
  }

  // --- 7. rpm <-> RCF ------------------------------------------------------ //
  function spin(){
    var mode = checked('r_mode'), out = el('r_out');
    show('r_row_rpm', mode === 'torcf');
    show('r_row_g', mode === 'torpm');

    var r = val('r_r') * fac('r_ru');   // in mm
    if(!isFinite(r) || r <= 0){
      out.innerHTML = hint('Enter the rotor radius. Without it the conversion is not defined.');
      return;
    }
    var formula = note('RCF = 1.118 · 10⁻⁶ · r[mm] · rpm². The radius is the distance from the axis ' +
      'to the point in the tube that is meant, usually r<sub>max</sub> (bottom of the tube). ' +
      'It is listed in the rotor manual and differs clearly between rotors.');
    if(mode === 'torcf'){
      var rpm = val('r_rpm');
      if(!isFinite(rpm)){ out.innerHTML = hint('Enter the speed in rpm.'); return; }
      if(rpm < 0){ out.innerHTML = warn('The speed cannot be negative.'); return; }
      out.innerHTML = res([['RCF', sig(1.118e-6 * r * rpm * rpm) + ' × g']]) + formula;
    } else {
      var g = val('r_g');
      if(!isFinite(g)){ out.innerHTML = hint('Enter the acceleration in × g.'); return; }
      if(g < 0){ out.innerHTML = warn('The acceleration cannot be negative.'); return; }
      var v = Math.sqrt(g / (1.118e-6 * r));
      out.innerHTML = res([['Speed', Math.round(v).toLocaleString('en-US') + ' rpm']]) + formula;
    }
  }

  var ALL = [dil, weigh, pct, serial, mastermix, a280, spin];
  function recompute(){ ALL.forEach(function(fn){ try { fn(); } catch(e){ console.error(e); } }); }

  // Growing lists: add / remove a row (delegated, so new rows are covered).
  document.addEventListener('click', function(ev){
    var t = ev.target;
    if(t.classList && t.classList.contains('dyn-del')){
      var cont = t.parentNode.parentNode;
      if(cont.querySelectorAll('.dyn-row').length > 1){ t.parentNode.remove(); }
      else {  // keep the last row, only clear it
        var ins = t.parentNode.querySelectorAll('input');
        for(var i=0;i<ins.length;i++) ins[i].value = '';
      }
      recompute();
    } else if(t.classList && t.classList.contains('dyn-add')){
      var box = el(t.getAttribute('data-target'));
      if(!box) return;
      var rows = box.querySelectorAll('.dyn-row');
      var clone = rows[rows.length - 1].cloneNode(true);
      var f = clone.querySelectorAll('input');
      for(var j=0;j<f.length;j++) f[j].value = '';
      box.appendChild(clone);
      f[0].focus();
      recompute();
    }
  });

  document.addEventListener('input', recompute);
  document.addEventListener('change', recompute);
  recompute();
})();
