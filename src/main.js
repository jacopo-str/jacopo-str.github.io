(function () {
  'use strict';
  var root = document.documentElement;
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu');

  function setMenu(open) {
    menu.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
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

  var year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());

  var copyBtn = document.getElementById('copy-mail');
  if (copyBtn) {
    var status = document.getElementById('copy-status');
    var label = copyBtn.textContent;
    copyBtn.addEventListener('click', function () {
      var addr = copyBtn.getAttribute('data-email');
      function done(ok) {
        copyBtn.textContent = ok ? 'Adresse copiée ✓' : 'Copie impossible : sélectionnez l\'adresse';
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
