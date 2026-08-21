(function () {
  'use strict';

  /* ---------- Header: тень и меню при скролле ---------- */
  var header = document.getElementById('header');
  function onScroll() {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ---------- Мобильное меню ---------- */
  var burger = document.getElementById('burger');
  var nav = document.getElementById('nav');

  function closeMenu() {
    nav.classList.remove('open');
    burger.classList.remove('active');
    burger.setAttribute('aria-expanded', 'false');
  }

  burger.addEventListener('click', function () {
    var open = nav.classList.toggle('open');
    burger.classList.toggle('active', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  nav.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') closeMenu();
  });

  /* ---------- Hero-слайдер ---------- */
  var slides = document.querySelectorAll('.hero__slide');
  var dotsWrap = document.getElementById('heroDots');
  var current = 0;
  var timer;

  if (slides.length) {
    slides.forEach(function (_, i) {
      var dot = document.createElement('button');
      dot.className = 'hero__dot' + (i === 0 ? ' active' : '');
      dot.setAttribute('aria-label', 'Слайд ' + (i + 1));
      dot.addEventListener('click', function () {
        goTo(i);
        restart();
      });
      dotsWrap.appendChild(dot);
    });
  }

  function goTo(index) {
    slides[current].classList.remove('active');
    dotsWrap.children[current].classList.remove('active');
    current = (index + slides.length) % slides.length;
    slides[current].classList.add('active');
    dotsWrap.children[current].classList.add('active');
  }

  function next() { goTo(current + 1); }
  function prev() { goTo(current - 1); }
  function restart() {
    clearInterval(timer);
    timer = setInterval(next, 6000);
  }

  document.getElementById('nextSlide').addEventListener('click', function () {
    next();
    restart();
  });
  document.getElementById('prevSlide').addEventListener('click', function () {
    prev();
    restart();
  });

  restart();

  /* ---------- Отзывы: слайдер ---------- */
  var track = document.getElementById('reviewTrack');
  var reviewIndex = 0;
  var reviewCount = track ? track.children.length : 0;

  if (reviewCount > 1) {
    function moveReviews() {
      track.style.transform = 'translateX(-' + reviewIndex * 100 + '%)';
    }
    document.getElementById('nextReview').addEventListener('click', function () {
      reviewIndex = (reviewIndex + 1) % reviewCount;
      moveReviews();
    });
    document.getElementById('prevReview').addEventListener('click', function () {
      reviewIndex = (reviewIndex - 1 + reviewCount) % reviewCount;
      moveReviews();
    });
    setInterval(function () {
      reviewIndex = (reviewIndex + 1) % reviewCount;
      moveReviews();
    }, 7000);
  }

  /* ---------- Reveal-анимация при скролле ---------- */
  var revealBlocks = document.querySelectorAll('.section, .promo, .quote');
  revealBlocks.forEach(function (el) { el.classList.add('reveal'); });

  var revealItems = document.querySelectorAll(
    '.promo__item, .stat-card, .direction-card, .team__photo, .benefit, ' +
    '.price-card, .event-card, .review, .partners__logo'
  );
  var STAGGER = 80;
  var MAX_DELAY = 400;

  revealItems.forEach(function (el) {
    el.classList.add('reveal-item');

    var delay = 0;
    if (el.parentElement) {
      var group = Array.prototype.filter.call(el.parentElement.children, function (child) {
        return child.classList.contains('reveal-item');
      });
      delay = Math.min(group.indexOf(el) * STAGGER, MAX_DELAY);
    }
    el.style.setProperty('--reveal-delay', delay + 'ms');
  });

  var observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });

  revealBlocks.forEach(function (el) { observer.observe(el); });
  revealItems.forEach(function (el) { observer.observe(el); });

  /* ---------- Форма заявки (демо, без бэкенда) ---------- */
  var form = document.getElementById('leadForm');
  var success = document.getElementById('formSuccess');

  function validateField(field) {
    var wrapper = field.closest('.form__field');
    var value = field.value.trim();
    var valid = true;

    if (field.id === 'name') {
      valid = value.length >= 2;
    }
    if (field.id === 'phone') {
      var digits = value.replace(/\D/g, '');
      valid = digits.length >= 10;
    }

    if (!wrapper) return valid;
    wrapper.classList.toggle('invalid', !valid);
    return valid;
  }

  ['name', 'phone'].forEach(function (id) {
    var el = document.getElementById(id);
    el.addEventListener('blur', function () { validateField(el); });
    el.addEventListener('input', function () {
      el.closest('.form__field').classList.remove('invalid');
    });
  });

  /* Маска телефона */
  var phoneInput = document.getElementById('phone');
  phoneInput.addEventListener('input', function () {
    var d = phoneInput.value.replace(/\D/g, '').slice(0, 11);
    if (d.length === 0) {
      phoneInput.value = '';
      return;
    }
    var first = d[0] === '8' ? '7' : d[0] === '9' ? '7' : d[0];
    if (d[0] === '8') d = '7' + d.slice(1);
    var out = '+' + first;
    if (d.length > 1) out += ' (' + d.slice(1, 4);
    if (d.length >= 4) out += ')';
    if (d.length > 4) out += ' ' + d.slice(4, 7);
    if (d.length > 7) out += '-' + d.slice(7, 9);
    if (d.length > 9) out += '-' + d.slice(9, 11);
    phoneInput.value = out;
  });

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    var nameOk = validateField(document.getElementById('name'));
    var phoneOk = validateField(document.getElementById('phone'));

    if (!nameOk || !phoneOk) {
      (nameOk ? document.getElementById('phone') : document.getElementById('name')).focus();
      return;
    }

    var submitBtn = form.querySelector('[type="submit"]');
    var agree = document.getElementById('agree').checked;
    submitBtn.disabled = true;
    submitBtn.textContent = 'Отправка...';

    fetch('api/send-lead.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: document.getElementById('name').value.trim(),
        phone: phoneInput.value.trim(),
        direction: document.getElementById('direction').value,
        agree: agree,
        website: document.getElementById('website')
          ? document.getElementById('website').value
          : ''
      })
    }).then(function (res) {
      return res.json().catch(function () { return { ok: false, error: 'Некорректный ответ сервера.' }; }).then(function (data) {
        return { res: res, data: data };
      });
    }).then(function (result) {
      if (result.res.ok && result.data.ok) {
        form.reset();
        success.textContent = result.data.message || 'Данные успешно отправлены. Спасибо! Мы свяжемся с вами в ближайшее время.';
        success.hidden = false;
      } else {
        var errors = result.data.errors || {};
        var msg = result.data.error || 'Проверьте заполненные поля.';
        alert(msg);
        if (errors.name) {
          var nameField = document.getElementById('name');
          nameField.closest('.form__field').classList.add('invalid');
          nameField.focus();
        }
        if (errors.phone) {
          document.getElementById('phone').closest('.form__field').classList.add('invalid');
        }
        if (errors.agree) {
          document.getElementById('agree').closest('.form__agree').classList.add('invalid');
        }
      }
    }).catch(function () {
      alert('Не удалось подключиться к серверу. Попробуйте ещё раз.');
    }).finally(function () {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Отправить заявку';
      setTimeout(function () { success.hidden = true; }, 6000);
    });
  });
})();
