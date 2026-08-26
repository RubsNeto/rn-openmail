// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 RN Design & Serviços
// Keep mailcow's SSO entry point while applying RN Design branding.
document.documentElement.classList.add('rn-mail-theme');

// SOGo renders the compose control as a speed dial. The RN theme presents it
// as one primary action, so route the visible trigger to the native inline
// compose command instead of opening a hidden secondary menu.
document.addEventListener('click', function (event) {
  var target = event.target;
  if (!target || typeof target.closest !== 'function') return;

  var triggerButton = target.closest(
    'md-fab-speed-dial.sg-fab-bottom-center > md-fab-trigger > .md-button'
  );
  if (!triggerButton) return;

  var speedDial = triggerButton.closest('md-fab-speed-dial');
  var composeAction = speedDial && speedDial.querySelector(
    'md-fab-actions button[ng-click="mailbox.newMessage($event)"]'
  );
  if (!composeAction) return;

  event.preventDefault();
  event.stopImmediatePropagation();
  composeAction.click();
}, true);

document.addEventListener('DOMContentLoaded', function () {
  document.documentElement.lang = 'pt-BR';
  document.title = 'RN Mail | RN Design & Serviços';

  var loginForm = document.forms.namedItem('loginForm');
  if (loginForm) {
    window.location.href = '/user';
  }
});

async function mc_logout() {
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
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'logout=1'
    });
    window.location.href = '/';
  }
}

// Keep the message editor readable without changing the outgoing font.
CKEDITOR.addCss('body {font-size: 16px !important; line-height: 1.55 !important}');
