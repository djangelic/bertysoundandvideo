/* image-views.js — 2026-08-14
 *
 * Counts which photos actually get LOOKED AT, not merely downloaded.
 * An image counts once per session when it has been at least half visible
 * for a full second, which is the closest a browser can get to "a person
 * saw this". Sends a custom event straight to the self-hosted Umami
 * endpoint rather than through window.umami, because two tracker scripts
 * share that global and only the last one to load owns it.
 *
 * Deliberate limits: one event per image per session (sessionStorage),
 * a hard per-page cap, and nothing fires for a visitor who opted out
 * with ?notme=1.
 */
(function () {
   var ENDPOINT = 'https://stats.aztechsol.com/api/send';
   var WEBSITE  = '4307b43b-6e37-4f7d-84ce-2d51e44a6cf4';
   var VISIBLE_RATIO = 0.5;     // half the image in frame
   var DWELL_MS = 1000;         // ...held for a second
   var PAGE_CAP = 60;           // safety valve on a long wall scroll

   if (location.hostname !== 'djangelic.com') return;
   try { if (localStorage.getItem('umami.disabled')) return; } catch (e) {}
   if (!('IntersectionObserver' in window)) return;

   var sent = 0;
   var seen = loadSeen();

   function loadSeen() {
      try { return JSON.parse(sessionStorage.getItem('iv.seen') || '{}'); }
      catch (e) { return {}; }
   }
   function remember(key) {
      seen[key] = 1;
      try { sessionStorage.setItem('iv.seen', JSON.stringify(seen)); } catch (e) {}
   }

   function postTitle() {
      // the <title> carries the site name; the post's own H1 is the honest label
      var h = document.querySelector('.post__title, .single__title, h1.post-title, article h1, h1');
      var t = (h && h.textContent || document.title || '').trim();
      t = t.replace(/\s*[-–|]\s*Djangelic'?s Journal\s*$/i, '').trim();
      if (/^(the wall|blog|djangelic)$/i.test(t)) t = 'The Wall';
      return t.slice(0, 80);
   }

   function nameOf(img) {
      var src = img.currentSrc || img.src || '';
      var m = src.split('?')[0].split('/').pop();
      // derivative suffixes describe the screen, not the photo — strip them
      return m.replace(/-(sm|md|lg|xl|xs|hero|tile)(\.[a-z]+)$/i, '$2');
   }

   function post(img) {
      if (sent >= PAGE_CAP) return;
      var file = nameOf(img);
      if (!file) return;
      var key = location.pathname + '|' + file;
      if (seen[key]) return;
      remember(key);
      sent++;
      var body = {
         type: 'event',
         payload: {
            website: WEBSITE,
            hostname: location.hostname,
            url: location.pathname,
            title: document.title,
            referrer: '',
            language: navigator.language || '',
            screen: screen.width + 'x' + screen.height,
            name: 'image-view',
            data: { image: file, page: location.pathname, post: postTitle() }
         }
      };
      try {
         fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
            keepalive: true,
            credentials: 'omit'
         }).catch(function () {});
      } catch (e) {}
   }

   var timers = new WeakMap();
   var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
         var img = entry.target;
         if (entry.isIntersecting && entry.intersectionRatio >= VISIBLE_RATIO) {
            if (timers.has(img)) return;
            timers.set(img, setTimeout(function () {
               post(img);
               io.unobserve(img);
            }, DWELL_MS));
         } else {
            var t = timers.get(img);
            if (t) { clearTimeout(t); timers.delete(img); }
         }
      });
   }, { threshold: [VISIBLE_RATIO] });

   function watch() {
      var imgs = document.querySelectorAll('img.tile__img, .post-gallery img, .post__hero img, figure img');
      Array.prototype.forEach.call(imgs, function (img) { io.observe(img); });
   }

   if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', watch);
   } else {
      watch();
   }
})();
