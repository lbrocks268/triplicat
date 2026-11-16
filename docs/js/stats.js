/* Numerical core of the toolkit. Pure functions, no DOM.
   Works in the browser (window.TK) and in Node (module.exports) so it can be tested. */
(function(root){
  'use strict';

  // ---------- Table parsing ----------
  // Accepts pasted Excel cells (tabs), German CSV (semicolon, decimal comma) and plain CSV.
  function parseTable(text){
    var lines = String(text || '').replace(/\r/g, '').split('\n').filter(function(l){ return l.trim() !== ''; });
    if(!lines.length) return { header: [], rows: [], delim: null };
    var first = lines[0];
    var delim = first.indexOf('\t') >= 0 ? '\t' : first.indexOf(';') >= 0 ? ';' : first.indexOf(',') >= 0 ? ',' : /\s{2,}| /.test(first.trim()) ? 'ws' : ',';
    var split = function(l){
      var parts = delim === 'ws' ? l.trim().split(/\s+/) : l.split(delim);
      return parts.map(function(c){ return c.trim().replace(/^"(.*)"$/, '$1'); });
    };
    var cells = lines.map(split);
    var isNum = function(c){ return isFinite(toNum(c, delim)); };
    var hasHeader = cells[0].some(function(c){ return c !== '' && !isNum(c); });
    var header = hasHeader ? cells[0] : cells[0].map(function(_, i){ return 'col' + (i + 1); });
    return { header: header, rows: hasHeader ? cells.slice(1) : cells, delim: delim };
  }
  function toNum(c, delim){
    if(c == null) return NaN;
    var s = String(c).trim();
    if(s === '') return NaN;
    if(delim !== ',') s = s.replace(',', '.');     // decimal comma unless comma separates the columns
    return /^[-+]?(\d+\.?\d*|\.\d+)([eE][-+]?\d+)?$/.test(s) ? parseFloat(s) : NaN;
  }

  // ---------- Small helpers ----------
  function mean(a){ var s = 0; for(var i = 0; i < a.length; i++) s += a[i]; return a.length ? s / a.length : NaN; }
  function sd(a){
    if(a.length < 2) return NaN;
    var m = mean(a), s = 0;
    for(var i = 0; i < a.length; i++) s += (a[i] - m) * (a[i] - m);
    return Math.sqrt(s / (a.length - 1));
  }
  // Solve A x = b (Gaussian elimination with partial pivoting). Returns null if singular.
  function solve(A, b){
    var n = b.length, M = A.map(function(r, i){ return r.concat([b[i]]); }), i, j, k;
    for(i = 0; i < n; i++){
      var p = i;
      for(k = i + 1; k < n; k++) if(Math.abs(M[k][i]) > Math.abs(M[p][i])) p = k;
      if(Math.abs(M[p][i]) < 1e-300) return null;
      var t = M[i]; M[i] = M[p]; M[p] = t;
      for(k = i + 1; k < n; k++){
        var f = M[k][i] / M[i][i];
        for(j = i; j <= n; j++) M[k][j] -= f * M[i][j];
      }
    }
    var x = new Array(n);
    for(i = n - 1; i >= 0; i--){
      var s = M[i][n];
      for(j = i + 1; j < n; j++) s -= M[i][j] * x[j];
      x[i] = s / M[i][i];
    }
    return x;
  }
  function invert(A){
    var n = A.length, cols = [], i, j;
    for(j = 0; j < n; j++){
      var e = []; for(i = 0; i < n; i++) e.push(i === j ? 1 : 0);
      var c = solve(A, e); if(!c) return null; cols.push(c);
    }
    var inv = [];
    for(i = 0; i < n; i++){ inv.push([]); for(j = 0; j < n; j++) inv[i].push(cols[j][i]); }
    return inv;
  }

  // ---------- Student t distribution ----------
  function lgamma(x){
    var c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
    var y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
    var s = 1.000000000190015;
    for(var j = 0; j < 6; j++) s += c[j] / ++y;
    return -t + Math.log(2.5066282746310005 * s / x);
  }
  function betacf(a, b, x){
    var qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap, FP = 1e-300;
    if(Math.abs(d) < FP) d = FP; d = 1 / d; var h = d;
    for(var m = 1; m <= 300; m++){
      var m2 = 2 * m, aa = m * (b - m) * x / ((qam + m2) * (a + m2));
      d = 1 + aa * d; if(Math.abs(d) < FP) d = FP; c = 1 + aa / c; if(Math.abs(c) < FP) c = FP; d = 1 / d; h *= d * c;
      aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
      d = 1 + aa * d; if(Math.abs(d) < FP) d = FP; c = 1 + aa / c; if(Math.abs(c) < FP) c = FP; d = 1 / d;
      var del = d * c; h *= del;
      if(Math.abs(del - 1) < 3e-14) break;
    }
    return h;
  }
  function ibeta(a, b, x){
    if(x <= 0) return 0; if(x >= 1) return 1;
    var bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
    return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
  }
  // Two-sided p value for a t statistic
  function tP2(t, df){ return ibeta(df / 2, 0.5, df / (df + t * t)); }
  // Quantile t such that P(|T| <= t) = level (e.g. 0.95)
  function tCrit(level, df){
    if(!(df > 0)) return NaN;
    var lo = 0, hi = 1e3;
    for(var i = 0; i < 200; i++){ var mid = (lo + hi) / 2; if(1 - tP2(mid, df) < level) lo = mid; else hi = mid; }
    return (lo + hi) / 2;
  }

  // ---------- Linear / polynomial least squares ----------
  // y = b0 + b1 x (+ b2 x^2). Returns coefficients, standard errors, R^2, residual SE.
  function polyfit(x, y, degree){
    var n = x.length, p = degree + 1, i, j, k;
    if(n < p + 1) return null;
    var XtX = [], Xty = [];
    for(j = 0; j < p; j++){ XtX.push(new Array(p).fill(0)); Xty.push(0); }
    for(i = 0; i < n; i++){
      var row = [1]; for(j = 1; j < p; j++) row.push(row[j - 1] * x[i]);
      for(j = 0; j < p; j++){ Xty[j] += row[j] * y[i]; for(k = 0; k < p; k++) XtX[j][k] += row[j] * row[k]; }
    }
    var inv = invert(XtX); if(!inv) return null;
    var b = inv.map(function(r){ var s = 0; for(var q = 0; q < p; q++) s += r[q] * Xty[q]; return s; });
    var my = mean(y), sse = 0, sst = 0;
    var f = function(v){ var s = 0, t = 1; for(var q = 0; q < p; q++){ s += b[q] * t; t *= v; } return s; };
    for(i = 0; i < n; i++){ var r = y[i] - f(x[i]); sse += r * r; sst += (y[i] - my) * (y[i] - my); }
    var df = n - p, s2 = sse / df;
    return { coef: b, se: inv.map(function(r, q){ return Math.sqrt(s2 * r[q]); }), r2: sst > 0 ? 1 - sse / sst : NaN,
             sigma: Math.sqrt(s2), df: df, n: n, predict: f };
  }

  // ---------- Nonlinear least squares (Levenberg-Marquardt) ----------
  // model(x, params) -> y. Returns params, standard errors, 95 % CI, R^2.
  function nls(x, y, model, start){
    var p = start.slice(), np = p.length, n = x.length, lambda = 1e-3, i, j, k, it;
    if(n <= np) return { error: 'Not enough data points for ' + np + ' parameters.' };
    var sseOf = function(q){ var s = 0; for(var a = 0; a < n; a++){ var r = y[a] - model(x[a], q); s += r * r; } return s; };
    var jac = function(q){
      var J = [];
      for(var a = 0; a < n; a++){
        var row = [];
        for(var b = 0; b < np; b++){
          var h = Math.abs(q[b]) * 1e-6 + 1e-10, q1 = q.slice(), q2 = q.slice();
          q1[b] += h; q2[b] -= h;
          row.push((model(x[a], q1) - model(x[a], q2)) / (2 * h));
        }
        J.push(row);
      }
      return J;
    };
    var sse = sseOf(p), converged = false;
    if(!isFinite(sse)) return { error: 'The model cannot be evaluated at the starting values.' };
    for(it = 0; it < 200; it++){
      var J = jac(p), JtJ = [], Jtr = [];
      for(j = 0; j < np; j++){ JtJ.push(new Array(np).fill(0)); Jtr.push(0); }
      for(i = 0; i < n; i++){
        var r = y[i] - model(x[i], p);
        for(j = 0; j < np; j++){ Jtr[j] += J[i][j] * r; for(k = 0; k < np; k++) JtJ[j][k] += J[i][j] * J[i][k]; }
      }
      var improved = false;
      for(var tries = 0; tries < 30; tries++){
        var A = JtJ.map(function(row, a){ return row.map(function(v, b){ return a === b ? v * (1 + lambda) : v; }); });
        var step = solve(A, Jtr);
        if(step){
          var cand = p.map(function(v, a){ return v + step[a]; }), s2 = sseOf(cand);
          if(isFinite(s2) && s2 <= sse){
            var rel = Math.max.apply(null, step.map(function(v, a){ return Math.abs(v) / (Math.abs(p[a]) + 1e-12); }));
            var gain = (sse - s2) / (sse + 1e-300);
            p = cand; sse = s2; lambda = Math.max(lambda / 10, 1e-12); improved = true;
            if(rel < 1e-10 || gain < 1e-14) converged = true;
            break;
          }
        }
        lambda *= 10;
      }
      if(!improved || converged){ converged = true; break; }
    }
    var Jf = jac(p), JtJf = [];
    for(j = 0; j < np; j++) JtJf.push(new Array(np).fill(0));
    for(i = 0; i < n; i++) for(j = 0; j < np; j++) for(k = 0; k < np; k++) JtJf[j][k] += Jf[i][j] * Jf[i][k];
    var df = n - np, sig2 = sse / df, cov = invert(JtJf);
    var my = mean(y), sst = 0; for(i = 0; i < n; i++) sst += (y[i] - my) * (y[i] - my);
    var se = cov ? cov.map(function(r, a){ return Math.sqrt(sig2 * r[a]); }) : p.map(function(){ return NaN; });
    var tc = tCrit(0.95, df);
    return { params: p, se: se, ci: p.map(function(v, a){ return [v - tc * se[a], v + tc * se[a]]; }),
             r2: sst > 0 ? 1 - sse / sst : NaN, sigma: Math.sqrt(sig2), df: df, n: n, converged: converged };
  }

  // Michaelis-Menten: v = Vmax * S / (Km + S). Start values as in common practice
  // (Vmax a bit above the largest rate, Km at the median substrate concentration).
  function mmModel(S, q){ return q[0] * S / (q[1] + S); }
  function mmFit(S, v){
    var sorted = S.slice().sort(function(a, b){ return a - b; });
    var med = sorted[Math.floor(sorted.length / 2)] || 1;
    var fit = nls(S, v, mmModel, [Math.max.apply(null, v) * 1.2, med > 0 ? med : 1]);
    if(fit.error) return fit;
    fit.Vmax = fit.params[0]; fit.Km = fit.params[1];
    return fit;
  }

  // ---------- Thermal shift ----------
  // Savitzky-Golay first derivative: local quadratic over `window` points (odd), evaluated at the centre.
  // Assumes evenly spaced x. Edge points without a full window are returned as NaN.
  function savgolDeriv(x, y, window){
    var n = x.length, h = (window - 1) / 2, out = new Array(n).fill(NaN);
    if(n < window) return out;
    var dx = (x[n - 1] - x[0]) / (n - 1), den = 0, k;
    for(k = -h; k <= h; k++) den += k * k;
    for(var i = h; i < n - h; i++){
      var s = 0;
      for(k = -h; k <= h; k++) s += k * y[i + k];
      out[i] = s / den / dx;
    }
    return out;
  }
  // Tm = temperature of the steepest increase; refined by a parabola through the three points around the maximum.
  function meltTm(T, F, window, tmin, tmax){
    var d = savgolDeriv(T, F, window), best = -1;
    for(var i = 0; i < T.length; i++){
      if(!isFinite(d[i])) continue;
      if(isFinite(tmin) && T[i] < tmin) continue;
      if(isFinite(tmax) && T[i] > tmax) continue;
      if(best < 0 || d[i] > d[best]) best = i;
    }
    if(best < 0) return { tm: NaN, deriv: d };
    var tm = T[best];
    if(best > 0 && best < T.length - 1 && isFinite(d[best - 1]) && isFinite(d[best + 1])){
      var a = d[best - 1], b = d[best], c = d[best + 1], den = a - 2 * b + c;
      if(den < 0) tm = T[best] + 0.5 * (a - c) / den * (T[best + 1] - T[best]);
    }
    return { tm: tm, deriv: d, index: best };
  }
  // Welch's t test (unequal variances), two-sided.
  function welch(a, b){
    if(a.length < 2 || b.length < 2) return { p: NaN, t: NaN, df: NaN };
    var va = sd(a) * sd(a) / a.length, vb = sd(b) * sd(b) / b.length;
    if(va + vb === 0) return { p: NaN, t: NaN, df: NaN };
    var t = (mean(a) - mean(b)) / Math.sqrt(va + vb);
    var df = (va + vb) * (va + vb) / (va * va / (a.length - 1) + vb * vb / (b.length - 1));
    return { t: t, df: df, p: tP2(t, df) };
  }

  // Significant-figure formatting with a decimal point
  function sig(n, digits){
    if(!isFinite(n)) return '—';
    if(n === 0) return '0';
    var d = digits || 4, s = Number(n.toPrecision(d));
    var a = Math.abs(s);
    if(a >= 1e6 || a < 1e-4) return s.toExponential(d - 1);
    return String(s);
  }

  var TK = { parseTable: parseTable, toNum: toNum, mean: mean, sd: sd, polyfit: polyfit, nls: nls, mmFit: mmFit, mmModel: mmModel,
             savgolDeriv: savgolDeriv, meltTm: meltTm, welch: welch, tP2: tP2, tCrit: tCrit, sig: sig };
  if(typeof module !== 'undefined' && module.exports) module.exports = TK; else root.TK = TK;
})(typeof window !== 'undefined' ? window : this);
