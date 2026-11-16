/* Minimal .xlsx reader: first worksheet -> tab-separated text. No dependencies.
   An .xlsx file is a zip archive of XML files; the browser's DecompressionStream does the inflating.
   Not supported: the old .xls format, password-protected files, zip64 (files beyond 4 GB). */
(function(){
  'use strict';

  function u16(v, o){ return v.getUint16(o, true); }
  function u32(v, o){ return v.getUint32(o, true); }

  // Returns { name: { method, offset, csize } } for all entries of the archive.
  function entries(buf){
    var v = new DataView(buf), n = buf.byteLength, eocd = -1;
    for(var i = n - 22; i >= Math.max(0, n - 22 - 65535); i--){ if(u32(v, i) === 0x06054b50){ eocd = i; break; } }
    if(eocd < 0) throw new Error('This is not an .xlsx file (no zip directory found).');
    var count = u16(v, eocd + 10), p = u32(v, eocd + 16), out = {}, dec = new TextDecoder();
    for(var k = 0; k < count; k++){
      if(u32(v, p) !== 0x02014b50) break;
      var method = u16(v, p + 10), csize = u32(v, p + 20), nl = u16(v, p + 28), xl = u16(v, p + 30), cl = u16(v, p + 32), lo = u32(v, p + 42);
      var name = dec.decode(new Uint8Array(buf, p + 46, nl));
      out[name] = { method: method, offset: lo, csize: csize };
      p += 46 + nl + xl + cl;
    }
    return out;
  }

  function readEntry(buf, e){
    var v = new DataView(buf);
    if(u32(v, e.offset) !== 0x04034b50) throw new Error('The file is damaged.');
    var start = e.offset + 30 + u16(v, e.offset + 26) + u16(v, e.offset + 28);
    var bytes = new Uint8Array(buf, start, e.csize);
    if(e.method === 0) return Promise.resolve(new TextDecoder().decode(bytes));
    if(e.method !== 8) return Promise.reject(new Error('Unsupported compression in this file.'));
    if(typeof DecompressionStream === 'undefined') return Promise.reject(new Error('This browser cannot open .xlsx files. Copy the cells from Excel and paste them instead.'));
    var stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    return new Response(stream).text();
  }

  function xml(text){ return new DOMParser().parseFromString(text, 'application/xml'); }
  function all(node, tag){ return node.getElementsByTagNameNS('*', tag); }
  function colIndex(ref){
    var m = /^([A-Z]+)/.exec(ref || ''), n = 0;
    if(!m) return -1;
    for(var i = 0; i < m[1].length; i++) n = n * 26 + (m[1].charCodeAt(i) - 64);
    return n - 1;
  }
  function textOf(node){
    var ts = all(node, 't'), s = '';
    for(var i = 0; i < ts.length; i++){ if(ts[i].parentNode.localName !== 'rPh') s += ts[i].textContent; }
    return s;
  }
  function clean(s){ return String(s).replace(/[\t\r\n]+/g, ' ').trim(); }

  function read(buf){
    var zip = entries(buf), find = function(name){ return zip[name] || zip[name.replace(/^\//, '')]; };
    if(!find('xl/workbook.xml')) return Promise.reject(new Error('This is not an Excel workbook (.xlsx).'));
    var get = function(name){ var e = find(name); return e ? readEntry(buf, e) : Promise.resolve(null); };
    return Promise.all([get('xl/workbook.xml'), get('xl/_rels/workbook.xml.rels'), get('xl/sharedStrings.xml')]).then(function(r){
      // first sheet in workbook order
      var path = 'xl/worksheets/sheet1.xml';
      try {
        var sheets = all(xml(r[0]), 'sheet'), rid = sheets[0].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships', 'id') || sheets[0].getAttribute('r:id');
        var rels = all(xml(r[1]), 'Relationship');
        for(var i = 0; i < rels.length; i++){
          if(rels[i].getAttribute('Id') === rid){
            var t = rels[i].getAttribute('Target');
            path = t.charAt(0) === '/' ? t.slice(1) : 'xl/' + t;
          }
        }
      } catch(e){}
      var shared = [];
      if(r[2]){ var si = all(xml(r[2]), 'si'); for(var k = 0; k < si.length; k++) shared.push(textOf(si[k])); }
      return get(path).then(function(sheetText){
        if(!sheetText) throw new Error('The first worksheet could not be read.');
        var rows = all(xml(sheetText), 'row'), table = [], width = 0;
        for(var a = 0; a < rows.length; a++){
          var cells = all(rows[a], 'c'), line = [], next = 0;
          for(var b = 0; b < cells.length; b++){
            var c = cells[b], idx = colIndex(c.getAttribute('r')); if(idx < 0) idx = next; next = idx + 1;
            var type = c.getAttribute('t'), vs = all(c, 'v'), raw = vs.length ? vs[0].textContent : '', val;
            if(type === 's') val = shared[parseInt(raw, 10)] || '';
            else if(type === 'inlineStr') val = textOf(c);
            else if(type === 'str' || type === 'e') val = raw;
            else if(type === 'b') val = raw === '1' ? 'TRUE' : 'FALSE';
            else { var num = Number(raw); val = raw !== '' && isFinite(num) ? String(Number(num.toPrecision(12))) : raw; }
            line[idx] = clean(val);
          }
          for(var z = 0; z < line.length; z++) if(line[z] == null) line[z] = '';
          while(line.length && line[line.length - 1] === '') line.pop();
          if(line.length){ table.push(line); width = Math.max(width, line.length); }
        }
        if(!table.length) throw new Error('The first worksheet is empty.');
        return table.map(function(l){ while(l.length < width) l.push(''); return l.join('\t'); }).join('\n') + '\n';
      });
    });
  }

  window.TKXlsx = { read: read };
})();
