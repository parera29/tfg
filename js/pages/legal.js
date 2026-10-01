/* Política de cookies: estado y cambio de consentimiento */
(function () {
  var el = document.getElementById('consentState');
  if (!el) return;
  var v = null;
  try { v = localStorage.getItem('ga_cookie_consent'); } catch (e) {}
  el.textContent = v === 'accepted' ? 'Cookies de terceros aceptadas' : v === 'rejected' ? 'Cookies de terceros rechazadas' : 'Sin elección todavía';
  document.getElementById('resetConsent').addEventListener('click', function () {
    try { localStorage.removeItem('ga_cookie_consent'); } catch (e) {}
    location.reload();
  });
})();
