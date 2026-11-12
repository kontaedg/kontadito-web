// Página pública para borrar la cuenta de Kontadito (exigida por Google Play).
// Sin librerías externas. Solo usa la llave PUBLICABLE (hecha para ser pública).
// El token de la sesión solo vive en la memoria de esta página: nunca se guarda.
(function () {
  'use strict';

  var URL_NUBE = 'https://iqzmpsaviqpolgbrmxqt.supabase.co';
  var LLAVE_PUBLICA = 'sb_publishable_49rhAjxHaRMG0e2ow_mAbQ_dn7cuM1J';

  var correo = '';
  var token = null;

  function $(id) { return document.getElementById(id); }
  function mostrar(id) {
    ['paso-correo', 'paso-codigo', 'paso-confirmar', 'paso-listo'].forEach(function (p) {
      $(p).classList.toggle('oculto', p !== id);
    });
  }
  function mensaje(texto, esError) {
    var m = $('mensaje');
    m.textContent = texto || '';
    m.className = esError ? 'error' : '';
  }
  function ocupado(boton, si) { boton.disabled = si; }

  function pedir(ruta, cuerpo, cabeceras) {
    var h = { 'Content-Type': 'application/json', apikey: LLAVE_PUBLICA };
    for (var k in cabeceras || {}) h[k] = cabeceras[k];
    return fetch(URL_NUBE + ruta, {
      method: 'POST',
      headers: h,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
      credentials: 'omit',
      cache: 'no-store',
      referrerPolicy: 'no-referrer',
    });
  }

  function correoValido(c) {
    return c.length <= 254 && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(c) && !/[<>()[\]\\,;:"]/.test(c);
  }

  $('enviar').addEventListener('click', function () {
    var c = $('correo').value.trim().toLowerCase();
    if (!correoValido(c)) return mensaje('Ese correo no parece válido.', true);
    correo = c;
    mensaje('Enviando…');
    ocupado($('enviar'), true);
    // create_user: false → esta página nunca crea cuentas.
    pedir('/auth/v1/otp', { email: correo, create_user: false })
      .then(function (r) {
        if (r.status === 429) throw new Error('muchos');
        // Por privacidad, la respuesta es la misma exista o no la cuenta.
        $('texto-codigo').textContent =
          'Si hay una cuenta con ' + correo + ', te enviamos un código. Revisa también la carpeta de spam.';
        mensaje('');
        mostrar('paso-codigo');
        $('codigo').focus();
      })
      .catch(function (e) {
        mensaje(e && e.message === 'muchos'
          ? 'Demasiados intentos. Espera unos minutos.'
          : 'No hay conexión con el servidor. Inténtalo de nuevo.', true);
      })
      .then(function () { ocupado($('enviar'), false); });
  });

  $('verificar').addEventListener('click', function () {
    var codigo = $('codigo').value.replace(/\D/g, '');
    if (codigo.length < 6 || codigo.length > 10) return mensaje('El código tiene 6 números.', true);
    mensaje('Comprobando…');
    ocupado($('verificar'), true);
    pedir('/auth/v1/verify', { type: 'email', email: correo, token: codigo })
      .then(function (r) {
        if (!r.ok) throw new Error('codigo');
        return r.json();
      })
      .then(function (datos) {
        if (!datos || typeof datos.access_token !== 'string') throw new Error('codigo');
        token = datos.access_token;
        $('codigo').value = '';
        mensaje('');
        mostrar('paso-confirmar');
      })
      .catch(function () { mensaje('El código no es correcto o ya venció.', true); })
      .then(function () { ocupado($('verificar'), false); });
  });

  $('borrar').addEventListener('click', function () {
    if ($('confirmacion').value.trim().toUpperCase() !== 'BORRAR') {
      return mensaje('Escribe BORRAR para confirmar.', true);
    }
    if (!token) return mensaje('Vuelve a empezar.', true);
    mensaje('Borrando…');
    ocupado($('borrar'), true);
    pedir('/functions/v1/borrar-cuenta', null, { Authorization: 'Bearer ' + token })
      .then(function (r) {
        if (!r.ok) throw new Error('fallo');
        token = null;
        mensaje('');
        mostrar('paso-listo');
      })
      .catch(function () {
        mensaje('No se pudo borrar. No cambió nada. Inténtalo de nuevo en un rato.', true);
        ocupado($('borrar'), false);
      });
  });
})();
