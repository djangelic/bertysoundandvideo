(function () {
  function slugify(t) {
    return (t || 'workflow').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'workflow';
  }

  function getJson(wrap) {
    var el = wrap.querySelector('.n8n-embed__json');
    return el ? el.textContent : null;
  }

  function saveBlob(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }

  // --- minimal store-only ZIP writer (no compression, CRC32) ---
  var crcTable = (function () {
    var t = [], c, n, k;
    for (n = 0; n < 256; n++) {
      c = n;
      for (k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      t[n] = c >>> 0;
    }
    return t;
  })();
  function crc32(bytes) {
    var c = 0xFFFFFFFF;
    for (var i = 0; i < bytes.length; i++) c = crcTable[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  function le(n, bytes) {
    var out = [];
    for (var i = 0; i < bytes; i++) out.push((n >>> (8 * i)) & 0xFF);
    return out;
  }
  function makeZip(files) { // files: [{name, bytes(Uint8Array)}]
    var chunks = [], central = [], offset = 0;
    files.forEach(function (f) {
      var nameBytes = new TextEncoder().encode(f.name);
      var crc = crc32(f.bytes);
      var local = [].concat(le(0x04034b50, 4), le(20, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2),
        le(crc, 4), le(f.bytes.length, 4), le(f.bytes.length, 4), le(nameBytes.length, 2), le(0, 2));
      chunks.push(new Uint8Array(local), nameBytes, f.bytes);
      central.push({ nameBytes: nameBytes, crc: crc, size: f.bytes.length, offset: offset });
      offset += local.length + nameBytes.length + f.bytes.length;
    });
    var centralStart = offset, centralSize = 0;
    central.forEach(function (c) {
      var rec = [].concat(le(0x02014b50, 4), le(20, 2), le(20, 2), le(0, 2), le(0, 2), le(0, 2), le(0, 2),
        le(c.crc, 4), le(c.size, 4), le(c.size, 4), le(c.nameBytes.length, 2), le(0, 2), le(0, 2),
        le(0, 2), le(0, 2), le(0, 4), le(c.offset, 4));
      chunks.push(new Uint8Array(rec), c.nameBytes);
      centralSize += rec.length + c.nameBytes.length;
    });
    chunks.push(new Uint8Array([].concat(le(0x06054b50, 4), le(0, 2), le(0, 2),
      le(central.length, 2), le(central.length, 2), le(centralSize, 4), le(centralStart, 4), le(0, 2))));
    return new Blob(chunks, { type: 'application/zip' });
  }

  document.addEventListener('click', function (e) {
    var copyBtn = e.target.closest('.n8n-embed__copy');
    if (copyBtn) {
      var wrap = copyBtn.closest('.n8n-embed');
      var json = getJson(wrap);
      if (json) navigator.clipboard.writeText(json).then(function () {
        var old = copyBtn.textContent;
        copyBtn.textContent = 'Copied — paste into your n8n editor';
        setTimeout(function () { copyBtn.textContent = old; }, 2500);
      });
      return;
    }

    var dlBtn = e.target.closest('.n8n-embed__download');
    if (dlBtn) {
      var wrap2 = dlBtn.closest('.n8n-embed');
      var json2 = getJson(wrap2);
      if (json2) saveBlob(new Blob([json2], { type: 'application/json' }), slugify(dlBtn.getAttribute('data-title')) + '.json');
      return;
    }

    var zipBtn = e.target.closest('.n8n-embed__zip');
    if (zipBtn) {
      var files = Array.prototype.map.call(document.querySelectorAll('.n8n-embed'), function (w, i) {
        var t = w.querySelector('.n8n-embed__download');
        return {
          name: slugify(t ? t.getAttribute('data-title') : 'workflow-' + (i + 1)) + '.json',
          bytes: new TextEncoder().encode(getJson(w) || '{}')
        };
      });
      saveBlob(makeZip(files), 'n8n-workflows.zip');
    }
  });

  document.addEventListener('DOMContentLoaded', function () {
    var embeds = document.querySelectorAll('.n8n-embed');
    if (embeds.length >= 2) {
      var first = embeds[0].querySelector('.n8n-embed__actions');
      if (first) {
        var zip = document.createElement('button');
        zip.className = 'n8n-embed__zip';
        zip.type = 'button';
        zip.textContent = 'Download all ' + embeds.length + ' as .zip';
        first.appendChild(zip);
      }
    }
  });
})();
