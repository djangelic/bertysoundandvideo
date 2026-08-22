// Journalgram lightbox — polaroid-aware, dependency-free.
(function () {
  var items = [], idx = 0;
  var polaroidPost = !!document.querySelector('.post--travel');

  function collect() {
    var seen = [];
    document.querySelectorAll('.post-gallery a').forEach(function (a) {
      var img = a.querySelector('img');
      if (!img) return;
      seen.push({ src: a.getAttribute('href') || img.src, cap: img.getAttribute('alt') || '', pol: polaroidPost, el: a });
    });
    document.querySelectorAll('.post__body figure img, .post__hero img, .page__body img').forEach(function (img) {
      if (img.closest('.post-gallery')) return;
      var fig = img.closest('figure');
      var cap = fig && fig.querySelector('figcaption') ? fig.querySelector('figcaption').textContent : (img.getAttribute('alt') || '');
      seen.push({ src: img.getAttribute('data-full') || img.currentSrc || img.src, cap: cap, pol: polaroidPost && !!(fig && fig.querySelector('figcaption')), el: img });
    });
    return seen;
  }

  items = collect();
  if (!items.length) return;

  var lb = document.createElement('div');
  lb.className = 'lb';
  lb.hidden = true;
  lb.innerHTML =
    '<button class="lb__btn lb__close" aria-label="Close">&times;</button>' +
    '<button class="lb__btn lb__prev" aria-label="Previous">&#8249;</button>' +
    '<button class="lb__btn lb__next" aria-label="Next">&#8250;</button>' +
    '<figure class="lb__frame"><img class="lb__img" alt=""><figcaption class="lb__cap"></figcaption></figure>' +
    '<div class="lb__count"></div>';
  document.body.appendChild(lb);
  var frame = lb.querySelector('.lb__frame'), img = lb.querySelector('.lb__img'),
      cap = lb.querySelector('.lb__cap'), count = lb.querySelector('.lb__count');

  function show(i) {
    idx = (i + items.length) % items.length;
    var it = items[idx];
    frame.classList.toggle('lb__frame--pol', !!it.pol);
    img.src = it.src;
    img.alt = it.cap;
    cap.textContent = it.cap;
    cap.style.display = it.cap ? '' : 'none';
    count.textContent = items.length > 1 ? (idx + 1) + ' / ' + items.length : '';
  }
  function open(i) {
    show(i);
    lb.hidden = false;
    document.documentElement.classList.add('lb-open');
    requestAnimationFrame(function () { lb.classList.add('lb--in'); });
  }
  function close() {
    lb.classList.remove('lb--in');
    document.documentElement.classList.remove('lb-open');
    setTimeout(function () { lb.hidden = true; }, 200);
  }

  items.forEach(function (it, i) {
    it.el.addEventListener('click', function (e) { e.preventDefault(); open(i); });
    if (it.el.tagName === 'IMG') it.el.style.cursor = 'zoom-in';
  });

  lb.querySelector('.lb__close').addEventListener('click', close);
  lb.querySelector('.lb__prev').addEventListener('click', function () { show(idx - 1); });
  lb.querySelector('.lb__next').addEventListener('click', function () { show(idx + 1); });
  lb.addEventListener('click', function (e) { if (e.target === lb) close(); });
  document.addEventListener('keydown', function (e) {
    if (lb.hidden) return;
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === 'ArrowRight') show(idx + 1);
  });
  var tx = null;
  lb.addEventListener('touchstart', function (e) { tx = e.changedTouches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (tx === null) return;
    var dx = e.changedTouches[0].clientX - tx;
    if (Math.abs(dx) > 40) show(idx + (dx < 0 ? 1 : -1));
    tx = null;
  }, { passive: true });
})();
