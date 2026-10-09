// Asset Bridge Realty — shared site behavior
document.addEventListener('DOMContentLoaded', function () {
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.querySelector('.main-nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      nav.classList.toggle('open');
    });
    nav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', function () { nav.classList.remove('open'); });
    });
  }

  // Mark active nav link based on current page
  var path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a[data-page]').forEach(function (link) {
    if (link.getAttribute('data-page') === path) {
      link.classList.add('active');
    }
  });

  // Basic client-side handling for forms without a backend yet
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
        note.textContent = 'Opening your email client to send this to Mohammad…';
        note.style.display = 'block';
      }
    });
  });
});
