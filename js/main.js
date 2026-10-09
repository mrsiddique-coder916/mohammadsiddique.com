// mohammadsiddique.com: shared site behavior
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    });
  }

  // Mark the current page in the nav
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a[data-page]').forEach(function (link) {
    if (link.getAttribute('data-page') === path) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  // Forms open the visitor's email app, addressed to Mohammad
  document.querySelectorAll('form[data-form]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var note = form.querySelector('.form-status');
      var subject = encodeURIComponent(form.getAttribute('data-subject') || 'New inquiry from mohammadsiddique.com');
      var lines = [];
      Array.from(form.elements).forEach(function (el) {
        if (!el.name) return;
        lines.push(el.previousElementSibling && el.previousElementSibling.tagName === 'LABEL'
          ? el.previousElementSibling.textContent + ': ' + el.value
          : el.name + ': ' + el.value);
      });
      var body = encodeURIComponent(lines.join('\n'));
      window.location.href = 'mailto:mohammad@developsacramento.com?subject=' + subject + '&body=' + body;
      if (note) {
        note.textContent = 'Opening your email app to send this to Mohammad.';
        note.style.display = 'block';
      }
    });
  });

  // Home hero: photos rotating inside the Capitol outline
  var svg = document.querySelector('.capitol');
  if (!svg) return;
  var images = Array.prototype.slice.call(svg.querySelectorAll('image'));
  var dotsWrap = document.getElementById('cap-dots');
  var dots = dotsWrap ? Array.prototype.slice.call(dotsWrap.querySelectorAll('button')) : [];
  var labels = dotsWrap ? JSON.parse(dotsWrap.getAttribute('data-labels')) : [];
  var label = document.getElementById('cap-label');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var current = 0, timer = null, HOLD = 4500;

  function load(img) {
    var src = img.getAttribute('data-href');
    if (!src) return;
    img.setAttribute('href', src);
    img.removeAttribute('data-href');
  }
  function show(i) {
    i = (i + images.length) % images.length;
    load(images[i]);
    load(images[(i + 1) % images.length]); // warm the next one
    images[current].classList.remove('is-on');
    images[i].classList.add('is-on');
    if (dots[current]) dots[current].removeAttribute('aria-current');
    if (dots[i]) dots[i].setAttribute('aria-current', 'true');
    if (label && labels[i]) label.textContent = labels[i];
    current = i;
  }
  function play() {
    if (reduce || timer) return;
    timer = setInterval(function () { show(current + 1); }, HOLD);
  }
  function pause() { clearInterval(timer); timer = null; }

  dots.forEach(function (dot, i) {
    dot.addEventListener('click', function () { pause(); show(i); play(); });
  });
  document.addEventListener('visibilitychange', function () { document.hidden ? pause() : play(); });
  window.addEventListener('load', function () { load(images[1]); play(); });

  // Photos shift slightly with the pointer
  var photos = svg.querySelector('.cap-photos');
  if (photos && !reduce && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    var stage = svg.parentNode;
    stage.addEventListener('pointermove', function (e) {
      var r = stage.getBoundingClientRect();
      var x = ((e.clientX - r.left) / r.width - 0.5) * -28;
      var y = ((e.clientY - r.top) / r.height - 0.5) * -18;
      photos.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ')');
    });
    stage.addEventListener('pointerleave', function () { photos.setAttribute('transform', ''); });
  }
});
