// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 RN Design & Serviços
/* RN OpenMail workspace enhancements.
 * Keeps SOGo's native actions and data model, changing only presentation and
 * adding client-side guidance around recipients and profile photos.
 */
(function () {
  'use strict';

  var MAIL_CONFIG = window.RN_OPENMAIL_CONFIG || window.RN_MAIL_CONFIG || {};
  var PRODUCT_NAME = String(MAIL_CONFIG.brand || 'RN OpenMail').trim() || 'RN OpenMail';
  var COMPANY_NAME = String(MAIL_CONFIG.company || 'RN Design & Services').trim() || 'RN Design & Services';
  var CONFIGURED_DOMAIN = String(MAIL_CONFIG.defaultDomain || '').trim().toLowerCase();
  var DIRECTORY_LABEL = String(MAIL_CONFIG.directoryLabel || 'Diretório interno').trim() || 'Diretório interno';
  var EMAIL_PATTERN = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;
  var observerTimer = 0;
  var avatarCounter = 0;
  var nativePhotoVersion = Date.now();

  document.documentElement.classList.add('rn-mail-theme');

  function isMessageRoute() {
    var route = window.location.hash.replace(/^#!?\/?/, '').split('/').filter(Boolean);
    return route[0] === 'Mail' && route.length >= 4 && /^\d+$/.test(route[route.length - 1]);
  }

  function syncMessageRouteState() {
    var active = isMessageRoute();
    document.documentElement.classList.toggle('rn-message-route', active);
    if (!document.body || document.body.getAttribute('ng-app') !== 'SOGo.MailerUI') return;

    var detail = document.querySelector('#detailView');
    var ready = !!(detail && !detail.classList.contains('sg-close') && detail.querySelector('.sg-face > md-card'));
    document.body.classList.toggle('rn-message-route', active);
    document.body.classList.toggle('rn-message-reading', active || ready);
    document.body.classList.toggle('rn-message-loading', active && !ready);
  }

  // The route changes synchronously when a message is selected. Mark the
  // document before SOGo finishes fetching the message so the split view can
  // never be painted between the inbox and the focused reader.
  syncMessageRouteState();
  window.addEventListener('hashchange', syncMessageRouteState);

  function createElement(tag, className, text) {
    var element = document.createElement(tag);
    if (className) element.className = className;
    if (typeof text === 'string') element.textContent = text;
    return element;
  }

  function icon(name, className) {
    var element = createElement('md-icon', 'material-icons' + (className ? ' ' + className : ''), name);
    element.setAttribute('aria-hidden', 'true');
    return element;
  }

  function currentUserRoot() {
    var match = window.location.pathname.match(/^(.*\/SOGo\/so\/[^/]+)(?:\/|$)/i);
    return match ? match[1] : '/SOGo/so/';
  }

  function mailHref() {
    return currentUserRoot().replace(/\/$/, '') + '/Mail';
  }

  function preferencesHref() {
    return currentUserRoot().replace(/\/$/, '') + '/Preferences';
  }

  function readIdentity(sideToolbar) {
    var nameElement = sideToolbar && sideToolbar.querySelector('.sg-md-title');
    var emailElement = sideToolbar && sideToolbar.querySelector('.md-caption');
    var email = emailElement ? emailElement.textContent.trim() : '';
    var name = nameElement ? nameElement.textContent.trim() : '';

    return {
      name: name || (email ? email.split('@')[0] : 'Minha conta'),
      email: email
    };
  }

  function initials(value) {
    var clean = (value || '').split('@')[0].replace(/[._-]+/g, ' ').trim();
    var parts = clean.split(/\s+/).filter(Boolean);
    return ((parts[0] || 'R').charAt(0) + (parts[1] || '').charAt(0)).toUpperCase();
  }

  function fallbackAvatar(email, size) {
    var fallback = createElement('span', 'rn-avatar-fallback', initials(email));
    fallback.style.width = size + 'px';
    fallback.style.height = size + 'px';
    fallback.setAttribute('aria-hidden', 'true');
    return fallback;
  }

  function internalDomain() {
    if (CONFIGURED_DOMAIN) return CONFIGURED_DOMAIN;
    var emailElement = document.querySelector('md-sidenav.md-sidenav-left > md-toolbar .md-caption');
    var email = emailElement ? emailElement.textContent.trim().toLowerCase() : '';
    return EMAIL_PATTERN.test(email) ? email.split('@')[1] : '';
  }

  function isRnEmail(email) {
    var domain = internalDomain();
    return !!domain && EMAIL_PATTERN.test(email || '') && email.toLowerCase().split('@')[1] === domain;
  }

  function nativePhotoUrl(email) {
    return '/rn-profile-photo.php?email=' + encodeURIComponent((email || '').toLowerCase()) + '&v=' + nativePhotoVersion;
  }

  function updatePhotoControls(available) {
    document.querySelectorAll('.rn-photo-remove').forEach(function (button) {
      button.hidden = !available;
    });
  }

  function isOwnProfileEmail(email) {
    var card = document.querySelector('.rn-avatar-preference');
    return !!card && card.dataset.rnProfileEmail === (email || '').toLowerCase();
  }

  function nativePhoto(email, size) {
    if (!isRnEmail(email)) return null;
    var image = document.createElement('img');
    image.className = 'rn-native-profile-photo';
    image.dataset.rnPhotoEmail = email.toLowerCase();
    image.alt = '';
    image.width = size;
    image.height = size;
    image.hidden = true;
    image.addEventListener('load', function () {
      image.hidden = false;
      image.parentElement && image.parentElement.classList.add('rn-has-native-photo');
      if (isOwnProfileEmail(email)) updatePhotoControls(true);
    });
    image.addEventListener('error', function () {
      image.hidden = true;
      image.parentElement && image.parentElement.classList.remove('rn-has-native-photo');
      if (isOwnProfileEmail(email)) updatePhotoControls(false);
    });
    image.src = nativePhotoUrl(email);
    return image;
  }

  function appendNativePhoto(host, email, size) {
    var image = nativePhoto(email, size);
    if (image) host.appendChild(image);
  }

  function refreshNativePhotos(email) {
    nativePhotoVersion = Date.now();
    document.querySelectorAll('.rn-native-profile-photo').forEach(function (image) {
      if (!email || image.dataset.rnPhotoEmail === email.toLowerCase()) {
        image.hidden = true;
        image.src = nativePhotoUrl(image.dataset.rnPhotoEmail);
      }
    });
  }

  function closeCropper(modal, objectUrl) {
    if (modal && modal.parentElement) modal.parentElement.removeChild(modal);
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    document.body.classList.remove('rn-cropper-open');
  }

  function openProfileCropper(file, email, onSaved) {
    if (!file || !/^image\/(jpeg|png|webp)$/i.test(file.type) || file.size > 10 * 1024 * 1024) {
      onSaved(false, 'Escolha uma imagem JPG, PNG ou WebP de até 10 MB.');
      return;
    }

    var objectUrl = URL.createObjectURL(file);
    var sourceImage = new Image();
    sourceImage.onload = function () {
      var cropSize = 320;
      var zoom = 1;
      var offsetX = 0;
      var offsetY = 0;
      var dragging = false;
      var dragStartX = 0;
      var dragStartY = 0;
      var offsetStartX = 0;
      var offsetStartY = 0;

      var modal = createElement('div', 'rn-cropper-backdrop');
      modal.setAttribute('role', 'dialog');
      modal.setAttribute('aria-modal', 'true');
      modal.setAttribute('aria-labelledby', 'rn-cropper-title');
      var panel = createElement('div', 'rn-cropper-panel');
      var header = createElement('div', 'rn-cropper-header');
      var heading = createElement('div', 'rn-cropper-heading');
      heading.appendChild(createElement('span', '', 'FOTO DO PERFIL'));
      var title = createElement('h2', '', 'Ajuste sua foto');
      title.id = 'rn-cropper-title';
      heading.appendChild(title);
      heading.appendChild(createElement('p', '', 'Arraste a imagem e use o zoom. A área dentro do círculo será exibida no ' + PRODUCT_NAME + '.'));
      var closeButton = createElement('button', 'rn-cropper-close');
      closeButton.type = 'button';
      closeButton.setAttribute('aria-label', 'Cancelar e fechar');
      closeButton.appendChild(icon('close'));
      header.appendChild(heading);
      header.appendChild(closeButton);

      var workspace = createElement('div', 'rn-cropper-workspace');
      var stage = createElement('div', 'rn-cropper-stage');
      var canvas = document.createElement('canvas');
      canvas.className = 'rn-cropper-canvas';
      canvas.width = cropSize * 2;
      canvas.height = cropSize * 2;
      canvas.setAttribute('aria-label', 'Pré-visualização circular da foto');
      var mask = createElement('div', 'rn-cropper-mask');
      mask.setAttribute('aria-hidden', 'true');
      stage.appendChild(canvas);
      stage.appendChild(mask);
      workspace.appendChild(stage);

      var zoomControl = createElement('label', 'rn-cropper-zoom');
      zoomControl.appendChild(icon('zoom_out'));
      var range = document.createElement('input');
      range.type = 'range';
      range.min = '1';
      range.max = '3';
      range.step = '0.01';
      range.value = '1';
      range.setAttribute('aria-label', 'Zoom da foto');
      zoomControl.appendChild(range);
      zoomControl.appendChild(icon('zoom_in'));
      workspace.appendChild(zoomControl);

      var status = createElement('div', 'rn-cropper-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      var actions = createElement('div', 'rn-cropper-actions');
      var cancelButton = createElement('button', 'rn-cropper-cancel', 'Cancelar');
      cancelButton.type = 'button';
      var saveButton = createElement('button', 'rn-cropper-save');
      saveButton.type = 'button';
      saveButton.appendChild(icon('check'));
      saveButton.appendChild(createElement('span', '', 'Usar esta foto'));
      actions.appendChild(cancelButton);
      actions.appendChild(saveButton);

      panel.appendChild(header);
      panel.appendChild(workspace);
      panel.appendChild(status);
      panel.appendChild(actions);
      modal.appendChild(panel);
      document.body.appendChild(modal);
      document.body.classList.add('rn-cropper-open');

      var context = canvas.getContext('2d');
      var baseScale = Math.max(cropSize / sourceImage.naturalWidth, cropSize / sourceImage.naturalHeight);

      function geometry() {
        var scale = baseScale * zoom;
        var width = sourceImage.naturalWidth * scale;
        var height = sourceImage.naturalHeight * scale;
        var maxX = Math.max(0, (width - cropSize) / 2);
        var maxY = Math.max(0, (height - cropSize) / 2);
        offsetX = Math.max(-maxX, Math.min(maxX, offsetX));
        offsetY = Math.max(-maxY, Math.min(maxY, offsetY));
        return {
          x: (cropSize - width) / 2 + offsetX,
          y: (cropSize - height) / 2 + offsetY,
          width: width,
          height: height
        };
      }

      function render() {
        var position = geometry();
        context.setTransform(2, 0, 0, 2, 0, 0);
        context.clearRect(0, 0, cropSize, cropSize);
        context.drawImage(sourceImage, position.x, position.y, position.width, position.height);
      }

      function pointerPosition(event) {
        var rect = stage.getBoundingClientRect();
        return {
          x: event.clientX * (cropSize / rect.width),
          y: event.clientY * (cropSize / rect.height)
        };
      }

      stage.addEventListener('pointerdown', function (event) {
        var point = pointerPosition(event);
        dragging = true;
        dragStartX = point.x;
        dragStartY = point.y;
        offsetStartX = offsetX;
        offsetStartY = offsetY;
        stage.setPointerCapture(event.pointerId);
        stage.classList.add('rn-is-dragging');
      });
      stage.addEventListener('pointermove', function (event) {
        if (!dragging) return;
        var point = pointerPosition(event);
        offsetX = offsetStartX + point.x - dragStartX;
        offsetY = offsetStartY + point.y - dragStartY;
        render();
      });
      function endDrag() {
        dragging = false;
        stage.classList.remove('rn-is-dragging');
      }
      stage.addEventListener('pointerup', endDrag);
      stage.addEventListener('pointercancel', endDrag);
      range.addEventListener('input', function () {
        zoom = Number(range.value);
        render();
      });

      function cancel() {
        closeCropper(modal, objectUrl);
      }
      closeButton.addEventListener('click', cancel);
      cancelButton.addEventListener('click', cancel);
      modal.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') cancel();
      });

      saveButton.addEventListener('click', function () {
        saveButton.disabled = true;
        status.textContent = 'Salvando sua foto...';
        var output = document.createElement('canvas');
        output.width = 512;
        output.height = 512;
        var outputContext = output.getContext('2d');
        var position = geometry();
        var factor = 512 / cropSize;
        outputContext.drawImage(sourceImage, position.x * factor, position.y * factor, position.width * factor, position.height * factor);
        output.toBlob(async function (blob) {
          if (!blob) {
            status.textContent = 'Não foi possível preparar a imagem.';
            saveButton.disabled = false;
            return;
          }
          try {
            var response = await fetch('/rn-profile-photo.php', {
              method: 'POST',
              credentials: 'same-origin',
              headers: {
                'Content-Type': 'image/jpeg',
                'X-RN-Profile': '1'
              },
              body: blob
            });
            var result = await response.json().catch(function () { return {}; });
            if (!response.ok || !result.ok) throw new Error(result.error || 'upload_failed');
            closeCropper(modal, objectUrl);
            refreshNativePhotos(email);
            onSaved(true, 'Foto atualizada com sucesso.');
          } catch (error) {
            status.textContent = 'Não foi possível salvar. Tente novamente.';
            saveButton.disabled = false;
          }
        }, 'image/jpeg', 0.9);
      });

      render();
      window.setTimeout(function () { saveButton.focus(); }, 60);
    };
    sourceImage.onerror = function () {
      URL.revokeObjectURL(objectUrl);
      onSaved(false, 'Não foi possível abrir essa imagem.');
    };
    sourceImage.src = objectUrl;
  }

  function compiledAvatar(email, size, className) {
    var host = createElement('span', className || 'rn-avatar-host');
    host.classList.add('rn-compiled-avatar');
    host.style.width = size + 'px';
    host.style.height = size + 'px';

    try {
      if (!window.angular || !email) throw new Error('Angular avatar unavailable');

      var angularBody = window.angular.element(document.body);
      var injector = angularBody.injector();
      if (!injector) throw new Error('Angular injector unavailable');

      var compile = injector.get('$compile');
      var rootScope = injector.get('$rootScope');
      var scope = rootScope.$new(true);
      var property = 'rnAvatarEmail' + (++avatarCounter);
      scope[property] = email;

      var avatar = document.createElement('sg-avatar-image');
      avatar.setAttribute('sg-email', property);
      avatar.setAttribute('size', String(size));
      avatar.textContent = 'person';
      var compiled = compile(avatar)(scope);
      host.appendChild(compiled[0]);
      host.__rnScope = scope;
      rootScope.$evalAsync();
    } catch (error) {
      host.appendChild(fallbackAvatar(email, size));
    }

    appendNativePhoto(host, email, size);

    return host;
  }

  function destroyCompiledAvatars(root) {
    if (!root || root.nodeType !== 1) return;
    var hosts = [];
    if (root.classList.contains('rn-compiled-avatar')) hosts.push(root);
    root.querySelectorAll('.rn-compiled-avatar').forEach(function (host) {
      hosts.push(host);
    });
    hosts.forEach(function (host) {
      if (host.__rnScope && !host.__rnScope.$$destroyed) host.__rnScope.$destroy();
      delete host.__rnScope;
    });
  }

  function renderedAvatar(source, size, className, email) {
    var host = createElement('span', className || 'rn-avatar-host');
    host.style.width = size + 'px';
    host.style.height = size + 'px';
    if (source) {
      var clone = source.cloneNode(true);
      clone.removeAttribute('class');
      clone.style.width = size + 'px';
      clone.style.height = size + 'px';
      var image = clone.querySelector('img');
      if (image) {
        image.width = size;
        image.height = size;
      }
      var mainIcon = clone.querySelector('md-icon:first-child');
      if (mainIcon) mainIcon.style.fontSize = size + 'px';
      host.appendChild(clone);
    } else {
      host.appendChild(fallbackAvatar(email, size));
    }
    appendNativePhoto(host, email, size);
    return host;
  }

  function findMainToolbar() {
    var toolbars = document.querySelectorAll('md-toolbar');
    for (var index = 0; index < toolbars.length; index += 1) {
      var toolbar = toolbars[index];
      if (!toolbar.closest('md-sidenav') && !toolbar.closest('md-dialog') && toolbar.querySelector('.sg-toolbar-group-last')) {
        return toolbar;
      }
    }
    return null;
  }

  function ensureShellHeader() {
    var sideToolbar = document.querySelector('md-sidenav.md-sidenav-left > md-toolbar.sg-padded.md-hue-2.md-tall');
    var mainToolbar = findMainToolbar();
    if (!sideToolbar || !mainToolbar) return;

    var identity = readIdentity(sideToolbar);
    var originalAvatar = sideToolbar.querySelector(':scope > sg-avatar-image');
    sideToolbar.classList.add('rn-shell-branded');

    if (!sideToolbar.querySelector('.rn-shell-brand')) {
      var brand = createElement('a', 'rn-shell-brand');
      brand.href = mailHref();
      brand.setAttribute('aria-label', PRODUCT_NAME + ' - abrir caixa de entrada');
      var logo = document.createElement('img');
      logo.src = '/SOGo.woa/WebServerResources/img/sogo-logo.png';
      logo.alt = COMPANY_NAME;
      brand.appendChild(logo);
      sideToolbar.appendChild(brand);
    }

    var actions = mainToolbar.querySelector('.sg-toolbar-group-last');
    if (!actions) return;

    var account = actions.querySelector('.rn-account-pill');
    if (!account) {
      account = createElement('a', 'rn-account-pill');
      account.href = preferencesHref();
      account.setAttribute('aria-label', 'Abrir perfil e configurações');

      var copy = createElement('span', 'rn-account-copy');
      copy.appendChild(createElement('strong', 'rn-account-name', identity.name));
      if (identity.email) copy.appendChild(createElement('small', 'rn-account-email', identity.email));
      account.appendChild(copy);

      var avatarSlot = createElement('span', 'rn-account-avatar');
      account.appendChild(avatarSlot);

      var logout = actions.querySelector('[aria-label="Sair"]');
      actions.insertBefore(account, logout || null);
    }

    var nameTarget = account.querySelector('.rn-account-name');
    var emailTarget = account.querySelector('.rn-account-email');
    if (nameTarget && nameTarget.textContent !== identity.name) nameTarget.textContent = identity.name;
    if (emailTarget && emailTarget.textContent !== identity.email) emailTarget.textContent = identity.email;

    var avatarTarget = account.querySelector('.rn-account-avatar');
    var avatarSignature = originalAvatar ? originalAvatar.innerHTML : identity.email;
    if (avatarTarget && avatarTarget.__rnSignature !== avatarSignature) {
      avatarTarget.__rnSignature = avatarSignature;
      avatarTarget.textContent = '';
      avatarTarget.appendChild(renderedAvatar(originalAvatar, 38, 'rn-account-avatar-rendered', identity.email));
    }
  }

  function ensurePreferences() {
    if (document.body.getAttribute('ng-app') !== 'SOGo.PreferencesUI') return;
    document.body.classList.add('rn-preferences-v8');

    var mainToolbar = findMainToolbar();
    var sideToolbar = document.querySelector('md-sidenav.md-sidenav-left > md-toolbar');
    var identity = readIdentity(sideToolbar);

    if (mainToolbar) {
      var actions = mainToolbar.querySelector('.sg-toolbar-group-last');
      if (actions && !actions.querySelector('.rn-back-mail')) {
        var back = createElement('a', 'rn-back-mail');
        back.href = mailHref();
        back.setAttribute('aria-label', 'Voltar para o e-mail');
        back.appendChild(icon('arrow_back'));
        back.appendChild(createElement('span', '', 'Voltar ao e-mail'));
        actions.insertBefore(back, actions.firstChild);
      }
    }

    var checkbox = document.querySelector('[ng-model="app.preferences.defaults.SOGoGravatarEnabled"]');
    if (!checkbox) return;
    if (checkbox.closest('.rn-avatar-preference')) return;
    var card = checkbox.parentElement;
    if (!card) return;

    card.classList.add('rn-avatar-preference');
    card.dataset.rnProfileEmail = identity.email.toLowerCase();
    var controls = createElement('div', 'rn-avatar-controls');
    var fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/jpeg,image/png,image/webp';
    fileInput.className = 'rn-photo-input';
    fileInput.setAttribute('aria-label', 'Escolher foto do perfil');
    var uploadButton = createElement('button', 'rn-avatar-action');
    uploadButton.type = 'button';
    uploadButton.appendChild(icon('add_a_photo'));
    uploadButton.appendChild(createElement('span', '', 'Escolher e ajustar foto'));
    var removeButton = createElement('button', 'rn-photo-remove');
    removeButton.type = 'button';
    removeButton.hidden = true;
    removeButton.appendChild(icon('delete_outline'));
    removeButton.appendChild(createElement('span', '', 'Remover foto'));
    var uploadStatus = createElement('div', 'rn-photo-upload-status');
    uploadStatus.setAttribute('role', 'status');
    uploadStatus.setAttribute('aria-live', 'polite');
    checkbox.classList.add('rn-gravatar-toggle');
    controls.appendChild(checkbox);
    controls.appendChild(fileInput);
    controls.appendChild(uploadButton);
    controls.appendChild(removeButton);
    controls.appendChild(uploadStatus);

    var preview = renderedAvatar(sideToolbar && sideToolbar.querySelector(':scope > sg-avatar-image'), 64, 'rn-profile-avatar', identity.email);
    var copy = createElement('div', 'rn-avatar-description');
    copy.appendChild(createElement('span', 'rn-preference-kicker', 'FOTO DO PERFIL'));
    copy.appendChild(createElement('h2', '', 'Sua foto no ' + PRODUCT_NAME));
    copy.appendChild(createElement('p', '', 'Envie uma imagem e ajuste posição e zoom dentro do círculo antes de salvar.'));
    copy.appendChild(createElement('small', '', 'A foto é salva automaticamente e aparece no cabeçalho e nos contatos internos.'));

    card.textContent = '';
    card.appendChild(preview);
    card.appendChild(copy);
    card.appendChild(controls);

    uploadButton.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', function () {
      var file = fileInput.files && fileInput.files[0];
      if (!file) return;
      uploadStatus.textContent = '';
      openProfileCropper(file, identity.email, function (success, message) {
        uploadStatus.className = 'rn-photo-upload-status ' + (success ? 'rn-photo-success' : 'rn-photo-error');
        uploadStatus.textContent = message;
        fileInput.value = '';
      });
    });
    removeButton.addEventListener('click', async function () {
      if (!window.confirm('Remover sua foto de perfil?')) return;
      removeButton.disabled = true;
      uploadStatus.textContent = 'Removendo foto...';
      try {
        var response = await fetch('/rn-profile-photo.php', {
          method: 'DELETE',
          credentials: 'same-origin',
          headers: { 'X-RN-Profile': '1' }
        });
        var result = await response.json().catch(function () { return {}; });
        if (!response.ok || !result.ok) throw new Error(result.error || 'delete_failed');
        refreshNativePhotos(identity.email);
        updatePhotoControls(false);
        uploadStatus.className = 'rn-photo-upload-status rn-photo-success';
        uploadStatus.textContent = 'Foto removida.';
      } catch (error) {
        uploadStatus.className = 'rn-photo-upload-status rn-photo-error';
        uploadStatus.textContent = 'Não foi possível remover a foto.';
      } finally {
        removeButton.disabled = false;
      }
    });
  }

  function enhanceComposeButtons(dialog) {
    var tools = dialog.querySelector('md-toolbar .md-toolbar-tools');
    if (!tools) return;

    if (!tools.querySelector('.rn-compose-heading')) {
      var heading = createElement('div', 'rn-compose-heading');
      heading.appendChild(createElement('span', '', PRODUCT_NAME.toUpperCase()));
      heading.appendChild(createElement('strong', '', 'Nova mensagem'));
      var fullscreen = tools.querySelector('[ng-click="editor.toggleFullscreen($event)"]');
      tools.insertBefore(heading, fullscreen ? fullscreen.nextSibling : tools.firstChild);
    }

    var buttonDefinitions = [
      ['editor.send()', 'rn-compose-send', 'Enviar mensagem', 'Enviar'],
      ['editor.save()', 'rn-compose-save', 'Salvar rascunho', 'Salvar'],
      ['editor.cancel()', 'rn-compose-close', 'Fechar mensagem', '']
    ];

    buttonDefinitions.forEach(function (definition) {
      var button = tools.querySelector('[ng-click="' + definition[0] + '"]');
      if (!button) return;
      button.classList.add(definition[1]);
      button.setAttribute('aria-label', definition[2]);
      button.title = definition[2];
      if (definition[3] && !button.querySelector('.rn-button-label')) {
        button.appendChild(createElement('span', 'rn-button-label', definition[3]));
      }
    });
  }

  function visibleRecipientSuggestions() {
    return Array.prototype.filter.call(document.querySelectorAll('[role="option"], md-autocomplete-parent-scope'), function (option) {
      var rect = option.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && option.closest('.md-autocomplete-suggestions-container');
    });
  }

  function hasMatchingSuggestion(value) {
    var query = value.toLowerCase();
    return visibleRecipientSuggestions().some(function (option) {
      return (option.textContent || '').toLowerCase().indexOf(query) !== -1;
    });
  }

  function setRecipientState(container, state, text, email) {
    var status = container.querySelector('.rn-recipient-status');
    if (!status) {
      status = createElement('div', 'rn-recipient-status');
      status.setAttribute('role', 'status');
      status.setAttribute('aria-live', 'polite');
      container.appendChild(status);
    }

    status.className = 'rn-recipient-status rn-state-' + state;
    destroyCompiledAvatars(status);
    status.textContent = '';
    status.appendChild(icon(state === 'valid' ? 'verified' : state === 'invalid' ? 'error_outline' : state === 'gmail' ? 'alternate_email' : 'info'));
    status.appendChild(createElement('span', '', text));

    if (email && (state === 'gmail' || state === 'valid')) {
      status.insertBefore(compiledAvatar(email, 24, 'rn-recipient-preview'), status.firstChild);
    }
  }

  function recipientValue(input) {
    return (input.value || '').trim().replace(/^[^<]*<([^>]+)>$/, '$1').toLowerCase();
  }

  function updateRecipientGuidance(input) {
    var container = input.closest('.pseudo-input-container');
    if (!container) return;
    var value = recipientValue(input);

    if (!value) {
      setRecipientState(container, 'idle', 'Digite um nome ou endereço de e-mail.');
      return;
    }

    if (!value.includes('@')) {
      if (hasMatchingSuggestion(value)) {
        setRecipientState(container, 'valid', 'Contato encontrado. Selecione a sugestão para confirmar.');
      } else {
        setRecipientState(container, 'idle', 'Continue digitando ou informe o endereço completo.');
      }
      return;
    }

    if (!EMAIL_PATTERN.test(value)) {
      setRecipientState(container, 'invalid', 'Endereço incompleto ou inválido.');
      return;
    }

    var domain = value.split('@')[1];
    if (domain === internalDomain()) {
      if (hasMatchingSuggestion(value)) {
        setRecipientState(container, 'valid', 'Endereço confirmado no diretório interno.', value);
      } else {
        setRecipientState(container, 'invalid', 'Este endereço não foi encontrado no diretório interno.');
      }
      return;
    }

    if (domain === 'gmail.com' || domain === 'googlemail.com') {
      setRecipientState(container, 'gmail', 'Gmail: formato válido. Foto pública quando disponível; conta confirmada somente na entrega.', value);
      return;
    }

    setRecipientState(container, 'external', 'Formato válido. A existência da conta será confirmada pelo servidor de destino.');
  }

  function blockInvalidRecipient(event) {
    if (!['Enter', 'Tab', ',', ';'].includes(event.key)) return;
    var input = event.currentTarget;
    var value = recipientValue(input);
    if (!value) return;

    if (hasMatchingSuggestion(value)) return;

    var isInternal = EMAIL_PATTERN.test(value) && value.split('@')[1] === internalDomain();
    var isInvalid = !EMAIL_PATTERN.test(value);
    if (!isInternal && !isInvalid) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    updateRecipientGuidance(input);
    var status = input.closest('.pseudo-input-container').querySelector('.rn-recipient-status');
    if (status) status.classList.add('rn-shake');
    window.setTimeout(function () {
      if (status) status.classList.remove('rn-shake');
    }, 360);
  }

  function enhanceRecipientInputs(dialog) {
    var inputs = dialog.querySelectorAll('.pseudo-input-container input[aria-label="Chips input."]');
    inputs.forEach(function (input) {
      if (input.dataset.rnRecipientEnhanced) return;
      input.dataset.rnRecipientEnhanced = 'true';
      var timer = 0;
      input.addEventListener('input', function () {
        window.clearTimeout(timer);
        timer = window.setTimeout(function () { updateRecipientGuidance(input); }, 520);
      });
      input.addEventListener('focus', function () { updateRecipientGuidance(input); });
      input.addEventListener('blur', function () {
        window.setTimeout(function () { updateRecipientGuidance(input); }, 180);
      });
      input.addEventListener('keydown', blockInvalidRecipient, true);
      updateRecipientGuidance(input);
    });
  }

  function ensureCompose() {
    var dialogs = document.querySelectorAll('#mailEditor.sg-mail-editor');
    dialogs.forEach(function (dialog) {
      dialog.classList.add('rn-compose-v8');
      enhanceComposeButtons(dialog);
      enhanceRecipientInputs(dialog);
    });
  }

  function extractEmail(text) {
    var match = (text || '').match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
    return match ? match[0].toLowerCase() : '';
  }

  function enhanceSuggestions() {
    var suggestions = document.querySelectorAll('md-autocomplete-parent-scope');
    suggestions.forEach(function (suggestion) {
      if (suggestion.dataset.rnSuggestionEnhanced) return;
      var email = extractEmail(suggestion.textContent);
      if (!email) return;
      suggestion.dataset.rnSuggestionEnhanced = 'true';
      var content = suggestion.querySelector(':scope > .sg-tile-content') || suggestion;
      content.classList.add('rn-recipient-suggestion');
      content.insertBefore(compiledAvatar(email, 40, 'rn-suggestion-avatar'), content.firstChild);

      var domain = email.split('@')[1];
      var badge = createElement('span', 'rn-recipient-trust');
      if (domain === internalDomain()) {
        badge.classList.add('rn-trust-internal');
        badge.appendChild(icon('verified'));
        badge.appendChild(createElement('span', '', DIRECTORY_LABEL));
      } else if (domain === 'gmail.com' || domain === 'googlemail.com') {
        badge.classList.add('rn-trust-gmail');
        badge.appendChild(icon('alternate_email'));
        badge.appendChild(createElement('span', '', 'Gmail'));
      } else {
        badge.appendChild(icon('person_search'));
        badge.appendChild(createElement('span', '', 'Contato encontrado'));
      }
      content.appendChild(badge);
    });
  }

  function ensureMailListChrome() {
    if (document.body.getAttribute('ng-app') !== 'SOGo.MailerUI') return;
    document.body.classList.add('rn-mail-list-v8');

    var sortSource = document.querySelector('#messagesList [ng-bind="mailbox.sort() | loc"]');
    var sortButton = document.querySelector('button[aria-label="Ordenar"]');
    if (!sortButton) return;

    var folderToolbar = sortButton.closest('md-toolbar');
    if (folderToolbar) {
      folderToolbar.style.setProperty('height', '46px', 'important');
      folderToolbar.style.setProperty('min-height', '46px', 'important');
      folderToolbar.style.setProperty('margin-top', '7px', 'important');
      folderToolbar.style.setProperty('margin-bottom', '4px', 'important');
      var toolbarTools = folderToolbar.querySelector('.md-toolbar-tools');
      if (toolbarTools) {
        toolbarTools.style.setProperty('height', '46px', 'important');
        toolbarTools.style.setProperty('min-height', '46px', 'important');
      }
    }

    var sortText = sortSource ? sortSource.textContent.trim() : 'Ordenar';
    sortButton.setAttribute('aria-label', 'Ordenar mensagens - ' + sortText);
    sortButton.title = 'Ordenar mensagens - ' + sortText;

    var toolbar = folderToolbar;
    var status = toolbar && toolbar.querySelector('.rn-sort-current');
    if (!status && toolbar) {
      status = createElement('button', 'rn-sort-current');
      status.type = 'button';
      status.addEventListener('click', function () { sortButton.click(); });
      var menu = sortButton.closest('md-menu');
      if (menu && menu.parentElement) menu.parentElement.insertBefore(status, menu.nextSibling);
    }
    if (status) {
      if (status.textContent !== sortText) status.textContent = sortText;
      status.setAttribute('aria-label', 'Alterar ordenação. Atual: ' + sortText);
      status.title = 'Alterar ordenação';
    }
  }

  function ensureMessageReading() {
    if (document.body.getAttribute('ng-app') !== 'SOGo.MailerUI') return;

    var detail = document.querySelector('#detailView');
    var card = detail && detail.querySelector('.sg-face > md-card');
    var isOpen = !!(detail && card && !detail.classList.contains('sg-close'));
    var routeOpen = isMessageRoute();
    document.documentElement.classList.toggle('rn-message-route', routeOpen);
    document.body.classList.toggle('rn-message-route', routeOpen);
    document.body.classList.toggle('rn-message-reading', isOpen || routeOpen);
    document.body.classList.toggle('rn-message-loading', routeOpen && !isOpen);
    if (!isOpen) return;

    var actions = card.querySelector(':scope > md-card-actions');
    if (actions && !actions.querySelector('.rn-message-back')) {
      var back = createElement('button', 'rn-message-back');
      back.type = 'button';
      back.setAttribute('aria-label', 'Voltar para a lista de e-mails');
      back.title = 'Voltar para a caixa de entrada';
      back.appendChild(icon('arrow_back'));
      back.addEventListener('click', function () {
        var listHash = window.location.hash.replace(/\/[^/]+$/, '');
        if (listHash && listHash !== window.location.hash) {
          window.location.hash = listHash;
        } else {
          window.location.href = mailHref();
        }
      });
      actions.insertBefore(back, actions.firstChild);
    }

    var content = card.querySelector(':scope > md-card-content');
    if (content && !content.querySelector('.rn-message-footer-actions')) {
      var footer = createElement('div', 'rn-message-footer-actions');
      var reply = createElement('button', 'rn-message-footer-button');
      reply.type = 'button';
      reply.appendChild(icon('reply'));
      reply.appendChild(createElement('span', '', 'Responder'));
      reply.addEventListener('click', function () {
        var nativeReply = card.querySelector('button[ng-click="viewer.reply($event)"]');
        if (nativeReply) nativeReply.click();
      });

      var forward = createElement('button', 'rn-message-footer-button');
      forward.type = 'button';
      forward.appendChild(icon('forward'));
      forward.appendChild(createElement('span', '', 'Encaminhar'));
      forward.addEventListener('click', function () {
        var nativeForward = card.querySelector('button[ng-click="viewer.forward($event)"]');
        if (nativeForward) nativeForward.click();
      });

      footer.appendChild(reply);
      footer.appendChild(forward);
      content.appendChild(footer);
    }
  }

  function enhanceAll() {
    ensureShellHeader();
    ensurePreferences();
    ensureCompose();
    enhanceSuggestions();
    ensureMailListChrome();
    ensureMessageReading();
  }

  // SOGo renders the compose control as a speed dial. The RN theme presents it
  // as one primary action and routes it to SOGo's native compose command.
  document.addEventListener('click', function (event) {
    var target = event.target;
    if (!target || typeof target.closest !== 'function') return;

    var triggerButton = target.closest('md-fab-speed-dial.sg-fab-bottom-center > md-fab-trigger > .md-button');
    if (!triggerButton) return;

    var speedDial = triggerButton.closest('md-fab-speed-dial');
    var composeAction = speedDial && speedDial.querySelector('md-fab-actions button[ng-click="mailbox.newMessage($event)"]');
    if (!composeAction) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    composeAction.click();
  }, true);

  function bootRnMail() {
    document.documentElement.lang = 'pt-BR';
    document.title = PRODUCT_NAME + ' | ' + COMPANY_NAME;

    var loginForm = document.forms.namedItem('loginForm');
    if (loginForm) {
      window.location.href = '/user';
      return;
    }

    syncMessageRouteState();
    enhanceAll();
    var observer = new MutationObserver(function (mutations) {
      mutations.forEach(function (mutation) {
        mutation.removedNodes.forEach(destroyCompiledAvatars);
      });
      syncMessageRouteState();
      window.clearTimeout(observerTimer);
      observerTimer = window.setTimeout(enhanceAll, 80);
    });
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['src', 'class'] });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootRnMail, { once: true });
  } else {
    bootRnMail();
  }

  // SOGo 5.12 uses CKEditor 5. Keep compatibility with older installations
  // without throwing on pages where the legacy global does not exist.
  if (window.CKEDITOR && typeof window.CKEDITOR.addCss === 'function') {
    window.CKEDITOR.addCss('body {font-size: 16px !important; line-height: 1.55 !important}');
  }

  window.mc_logout = async function mcLogout() {
    try {
      await fetch('/SOGo/so/signout', {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store'
      });
    } finally {
      await fetch('/', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: 'logout=1'
      });
      window.location.href = '/';
    }
  };
}());
