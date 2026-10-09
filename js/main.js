// developsacramento.com: shared site behavior
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
      var subject = encodeURIComponent(form.getAttribute('data-subject') || 'New inquiry from developsacramento.com');
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
});
