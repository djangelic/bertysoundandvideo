(function () {
  var script = document.currentScript || document.querySelector('script[data-worker]');
  var WORKER = script ? script.getAttribute('data-worker') : '';
  var SITEKEY = script ? script.getAttribute('data-sitekey') : '';
  var turnstileLoaded = false;

  function loadTurnstile(cb) {
    if (turnstileLoaded || window.turnstile) return cb();
    var s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
    s.async = true;
    s.onload = function () { turnstileLoaded = true; cb(); };
    document.head.appendChild(s);
  }

  function showResults(poll, tally) {
    var opts = poll.querySelector('.jg-poll__options');
    var results = poll.querySelector('.jg-poll__results');
    var total = 0, k;
    for (k in tally) total += tally[k];
    var html = '';
    var labels = Array.prototype.map.call(poll.querySelectorAll('.jg-poll__option'), function (b) { return b.getAttribute('data-option'); });
    labels.forEach(function (label) {
      var n = tally[label] || 0;
      var pct = total ? Math.round((n / total) * 100) : 0;
      html += '<div class="jg-poll__bar"><span class="jg-poll__bar-fill" style="transform:scaleX(' + (pct / 100) + ')"></span>' +
              '<span class="jg-poll__bar-label"><span>' + label + '</span><span>' + pct + '% (' + n + ')</span></span></div>';
    });
    results.innerHTML = html;
    results.hidden = false;
    if (opts) opts.hidden = true;
    poll.querySelector('.jg-poll__note').textContent = total === 1 ? '1 vote' : total + ' votes';
  }

  function init(poll) {
    var slug = poll.getAttribute('data-slug');
    if (!WORKER) { poll.querySelector('.jg-poll__note').textContent = 'Poll backend not configured yet.'; return; }

    var votedLocal = false;
    try { votedLocal = !!localStorage.getItem('jgpoll_' + slug); } catch (e) {}
    if (votedLocal || document.cookie.indexOf('voted_' + slug + '=1') > -1) {
      fetch(WORKER + '/poll/' + slug).then(function (r) { return r.json(); }).then(function (t) { showResults(poll, t); });
    }

    poll.addEventListener('click', function (e) {
      var btn = e.target.closest('.jg-poll__option');
      if (!btn) return;
      var option = btn.getAttribute('data-option');
      var note = poll.querySelector('.jg-poll__note');
      note.textContent = 'Verifying…';

      if (!SITEKEY) {
        // Turnstile not configured — submit directly (the worker allows this until its secret is set)
        fetch(WORKER + '/poll/' + slug, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ option: option })
        }).then(function (r) { return r.json(); }).then(function (res) {
          var tally = res.tally || res;
          note.textContent = res.already ? 'Looks like you already voted.' : '';
          try { localStorage.setItem('jgpoll_' + slug, '1'); } catch (e) {}
          document.cookie = 'voted_' + slug + '=1; max-age=31536000; path=/; SameSite=Lax';
          showResults(poll, tally);
        }).catch(function () { note.textContent = 'Vote failed — try again.'; });
        return;
      }
      loadTurnstile(function () {
        var holder = poll.querySelector('.jg-poll__challenge');
        window.turnstile.render(holder, {
          sitekey: SITEKEY,
          callback: function (token) {
            fetch(WORKER + '/poll/' + slug, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ option: option, turnstile: token })
            }).then(function (r) { return r.json(); }).then(function (res) {
              var tally = res.tally || res;
              note.textContent = res.already ? 'Looks like you already voted.' : '';
              holder.innerHTML = '';
              try { localStorage.setItem('jgpoll_' + slug, '1'); } catch (e) {}
              document.cookie = 'voted_' + slug + '=1; max-age=31536000; path=/; SameSite=Lax';
              showResults(poll, tally);
            }).catch(function () { note.textContent = 'Vote failed — try again.'; });
          },
          'error-callback': function () { note.textContent = 'Verification failed — try again.'; }
        });
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    Array.prototype.forEach.call(document.querySelectorAll('.jg-poll'), init);
  });
})();
