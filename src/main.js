(function () {
  'use strict';
  var root = document.documentElement;
  var T = {
    fr: { open: 'Ouvrir le menu', close: 'Fermer le menu', copied: 'Adresse copiée ✓', fail: 'Copie impossible : sélectionnez l\'adresse', zoom: 'Agrandir : ', lb: 'Image agrandie', lbClose: 'Fermer l\'image' },
    en: { open: 'Open menu', close: 'Close menu', copied: 'Address copied ✓', fail: 'Copy failed: select the address manually', zoom: 'Enlarge: ', lb: 'Enlarged image', lbClose: 'Close image' }
  };
  var L = T[root.lang === 'en' ? 'en' : 'fr'];

  // Sélecteur de langue : mémorise le choix et conserve la section consultée.
  document.querySelectorAll('.lang a').forEach(function (a) {
    var base = a.getAttribute('href');
    function sync() { a.setAttribute('href', base + location.hash); }
    sync();
    window.addEventListener('hashchange', sync);
    a.addEventListener('click', function () {
      try { localStorage.setItem('lang', a.getAttribute('data-lang')); } catch (e) {}
    });
  });
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? L.close : L.open);
  }
  burger.addEventListener('click', function () {
    setMenu(burger.getAttribute('aria-expanded') !== 'true');
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') setMenu(false);
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') setMenu(false);
  });

  // Arrivée avec une ancre (ex. après changement de langue) : saut direct, sans défilement animé depuis le haut.
  if (location.hash.length > 1) {
    var target = document.getElementById(decodeURIComponent(location.hash.slice(1)));
    if (target) {
      root.style.scrollBehavior = 'auto';
      target.scrollIntoView();
      requestAnimationFrame(function () { root.style.scrollBehavior = ''; });
    }
  }

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  var copyBtn = document.getElementById('copy-mail');
  if (copyBtn) {
    var status = document.getElementById('copy-status');
    var label = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var addr = copyBtn.getAttribute('data-email');
      function done(ok) {
        copyBtn.textContent = ok ? L.copied : L.fail;
        status.textContent = copyBtn.textContent;
        setTimeout(function () { copyBtn.textContent = label; }, 2500);
      }
      function legacy() {
        var t = document.createElement('textarea');
        t.value = addr; t.setAttribute('readonly', ''); t.style.position = 'fixed'; t.style.opacity = '0';
        document.body.appendChild(t); t.select();
        var ok = false;
        try { ok = document.execCommand('copy'); } catch (e) {}
        document.body.removeChild(t); done(ok);
      }
      if (navigator.clipboard && window.isSecureContext) {
        navigator.clipboard.writeText(addr).then(function () { done(true); }, legacy);
      } else {
        legacy();
      }
    });
  }

  var imgs = document.querySelectorAll('.shots img');
  if (imgs.length && typeof HTMLDialogElement === 'function') {
    var dlg = document.createElement('dialog');
    dlg.className = 'lightbox';
    dlg.setAttribute('aria-label', L.lb);
    dlg.innerHTML = '<button type="button" class="lb-close" aria-label="' + L.lbClose + '">×</button><img alt=""><p class="lb-cap"></p>';
    document.body.appendChild(dlg);
    var big = dlg.querySelector('img'), cap = dlg.querySelector('.lb-cap');
    var lastBtn = null;
    imgs.forEach(function (img) {
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'zoom';
      btn.setAttribute('aria-label', L.zoom + img.alt);
      img.parentNode.insertBefore(btn, img);
      btn.appendChild(img);
      btn.addEventListener('click', function () {
        lastBtn = btn;
        big.src = img.currentSrc || img.src;
        big.alt = img.alt;
        cap.textContent = img.alt;
        dlg.showModal();
      });
    });
    dlg.addEventListener('click', function () { dlg.close(); });
    dlg.addEventListener('close', function () { if (lastBtn) lastBtn.focus(); });
  }

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if ('IntersectionObserver' in window && !reduce) {
    root.classList.add('js');
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); }
      });
    }, { threshold: 0.08 });
    document.querySelectorAll('.card, .sec h2, .limits li').forEach(function (el) {
      el.classList.add('reveal');
      io.observe(el);
    });
  }
})();
