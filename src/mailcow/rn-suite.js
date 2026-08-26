// SPDX-License-Identifier: GPL-3.0-only
// Copyright (C) 2026 RN Design & Serviços
(function () {
  'use strict';

  var CONFIG = window.RN_MAIL_CONFIG || {};
  var BRAND = String(CONFIG.brand || 'RN Mail');
  var COMPANY = String(CONFIG.company || 'RN Design & Serviços');
  var configuredDomain = String(CONFIG.defaultDomain || '').trim().replace(/^@/, '');
  var DOMAIN = configuredDomain ? '@' + configuredDomain.toLowerCase() : '';
  var LOGO_URL = String(CONFIG.logoUrl || '/img/rn-logo.png');
  var ADMIN_DOMAINS_LANDING = CONFIG.adminDomainsLanding !== false;
  var ADMIN_LANDING_KEY = 'rn_admin_domains_landing';
  var ADMIN_DOMAIN_FOCUS_KEY = 'rn_admin_focus_domains';
  var observerTimer = null;

  function pathStartsWith(segment) {
    return window.location.pathname === segment ||
      window.location.pathname.indexOf(segment + '/') === 0;
  }

  function pathIs(path) {
    return window.location.pathname.replace(/\/+$/, '') === path;
  }

  function isAdminDomainPage() {
    var forcedContext = document.body && document.body.dataset.rnContext;
    return forcedContext === 'admin-domains' || pathIs('/admin/mailbox');
  }

  function getContext() {
    var forcedContext = document.body && document.body.dataset.rnContext;

    if (forcedContext === 'admin-domains' || isAdminDomainPage()) {
      return {
        key: 'admin-domains',
        eyebrow: 'ADMINISTRAÇÃO DE E-MAIL',
        title: 'Domínios',
        description: 'Gerencie os domínios existentes, acompanhe limites e acesse as configurações de cada operação.'
      };
    }

    if (forcedContext === 'admin') {
      return {
        key: 'admin',
        eyebrow: 'CENTRAL RN MAIL',
        title: 'Administração',
        description: 'Gerencie contas, domínios, segurança e a operação do seu e-mail.'
      };
    }

    if (pathStartsWith('/admin')) {
      return {
        key: 'admin',
        eyebrow: 'CENTRAL RN MAIL',
        title: 'Administração',
        description: 'Gerencie contas, domínios, segurança e a operação do seu e-mail.'
      };
    }

    if (pathStartsWith('/domainadmin')) {
      return {
        key: 'domain-admin',
        eyebrow: 'GESTÃO DE DOMÍNIO',
        title: 'Administração do domínio',
        description: 'Organize usuários, caixas postais e políticas do seu domínio.'
      };
    }

    if (pathStartsWith('/quarantine')) {
      return {
        key: 'quarantine',
        eyebrow: 'PROTEÇÃO DE MENSAGENS',
        title: 'Quarentena',
        description: 'Revise com segurança as mensagens que exigem sua atenção.'
      };
    }

    if (pathStartsWith('/user')) {
      return {
        key: 'user',
        eyebrow: 'MINHA CONTA',
        title: 'Preferências de e-mail',
        description: 'Ajuste sua conta, segurança, filtros e integrações pessoais.'
      };
    }

    return {
      key: 'portal',
      eyebrow: 'RN MAIL',
      title: 'E-mail profissional',
      description: 'Comunicação, segurança e produtividade em um só lugar.'
    };
  }

  function replacePlatformName(value) {
    if (!value || typeof value !== 'string') return value;

    return value
      .replace(/cow_mailcow/gi, 'rn-mail')
      .replace(/mailcow/gi, BRAND)
      .replace(/🐮\s*\+\s*🐋\s*=\s*💕/g, COMPANY)
      .replace(/🛠️?🐮\s*\+\s*🐋\s*=\s*💕/g, COMPANY);
  }

  function shouldSkipTextNode(node) {
    var parent = node.parentElement;
    if (!parent) return true;

    return /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA|CODE|PRE)$/i.test(parent.tagName) ||
      Boolean(parent.closest(
        '[data-rn-keep-technical-name], table, .dataTables_wrapper, [contenteditable="true"]'
      ));
  }

  function scrubVisibleBrand(root) {
    var scope = root && root.nodeType === 1 ? root : document.body;
    if (!scope) return;

    var walker = document.createTreeWalker(scope, NodeFilter.SHOW_TEXT);
    var textNodes = [];
    var current;

    while ((current = walker.nextNode())) {
      if (!shouldSkipTextNode(current) && /mailcow|🐮/i.test(current.nodeValue || '')) {
        textNodes.push(current);
      }
    }

    textNodes.forEach(function (node) {
      var replacement = replacePlatformName(node.nodeValue);
      if (replacement !== node.nodeValue) node.nodeValue = replacement;
    });

    var attributes = ['title', 'aria-label', 'alt', 'placeholder'];
    scope.querySelectorAll('[title], [aria-label], [alt], [placeholder]').forEach(function (element) {
      if (element.closest('table, .dataTables_wrapper, [contenteditable="true"]')) return;

      attributes.forEach(function (attribute) {
        if (!element.hasAttribute(attribute)) return;
        var original = element.getAttribute(attribute);
        var replacement = replacePlatformName(original);
        if (replacement !== original) element.setAttribute(attribute, replacement);
      });
    });
  }

  function removePlatformArtifacts() {
    var darkTheme = document.getElementById('dark-mode-theme');
    if (darkTheme) darkTheme.remove();

    try {
      window.localStorage.setItem('mailcow_theme', 'light');
    } catch (error) {
      // Storage can be unavailable in privacy modes; the CSS still locks the RN theme.
    }

    document.querySelectorAll(
      '.footer .version, .footer a[href*="mailcow"], a[href*="mailcow.email"], ' +
      'a[href*="github.com/mailcow"]'
    ).forEach(function (element) {
      element.remove();
    });
  }

  function removeAlternateLogin(cardBody) {
    var alternateTitle = cardBody.querySelector('.hr-title');
    if (alternateTitle) alternateTitle.remove();

    var fidoButton = cardBody.querySelector('#fido2-login');
    if (fidoButton) {
      var alternateContainer = fidoButton.closest('.d-flex.flex-column');
      if (alternateContainer) alternateContainer.remove();
      else fidoButton.remove();
    }

    var fidoAlerts = cardBody.querySelector('#fido2-alerts');
    if (fidoAlerts) fidoAlerts.remove();
  }

  function addLoginIntro(cardBody, context, isUserLogin) {
    if (cardBody.querySelector('.rn-login-intro')) return;

    var logo = cardBody.querySelector('.mailcow-logo');
    if (!logo) return;

    var intro = document.createElement('section');
    intro.className = 'rn-login-intro';
    intro.setAttribute('aria-label', isUserLogin ? 'Recursos do RN Mail' : context.title);

    var eyebrow = document.createElement('div');
    eyebrow.className = 'rn-login-eyebrow';
    eyebrow.textContent = isUserLogin ? 'WEBMAIL RN DESIGN' : context.eyebrow;

    var description = document.createElement('p');
    description.textContent = isUserLogin
      ? 'Acesse suas mensagens e ferramentas de trabalho em um só lugar.'
      : context.description;

    intro.appendChild(eyebrow);
    intro.appendChild(description);
    logo.insertAdjacentElement('afterend', intro);

    if (isUserLogin) {
      var slogan = document.createElement('p');
      slogan.className = 'rn-login-slogan';
      slogan.textContent = 'Onde ideias se transformam em inovação';

      var submitButton = cardBody.querySelector('button[type="submit"]');
      var submitRow = submitButton && submitButton.closest('.d-flex');
      if (submitRow) submitRow.insertAdjacentElement('afterend', slogan);
    }
  }

  function compactUsername(input) {
    if (!DOMAIN) return;
    var value = input.value.trim();
    if (value.toLowerCase().endsWith(DOMAIN)) {
      input.value = value.slice(0, -DOMAIN.length);
    }
  }

  function configureLogin(context) {
    var input = document.getElementById('login_user');
    if (!input) return false;

    var isUserLogin = !pathStartsWith('/admin') && !pathStartsWith('/domainadmin');
    var cardBody = input.closest('.card-body');

    document.body.classList.add('rn-login');

    if (pathStartsWith('/admin')) {
      try {
        window.sessionStorage.removeItem(ADMIN_LANDING_KEY);
      } catch (error) {
        // The admin login still works when session storage is unavailable.
      }
    }

    document.title = isUserLogin
      ? 'Entrar | ' + COMPANY
      : context.title + ' | ' + BRAND;

    if (cardBody) {
      removeAlternateLogin(cardBody);
      addLoginIntro(cardBody, context, isUserLogin);
    }

    if (!isUserLogin || input.type === 'email') return true;

    input.placeholder = 'Usuário';
    input.setAttribute('aria-label', 'Usuário');
    input.setAttribute('autocomplete', 'username');
    input.setAttribute('spellcheck', 'false');

    var password = document.getElementById('pass_user');
    if (password) password.setAttribute('autocomplete', 'current-password');

    var label = document.querySelector('label[for="login_user"]');
    if (label) label.textContent = 'Usuário';

    if (cardBody) {
      var legend = cardBody.querySelector(':scope > legend');
      if (legend) {
        var divider = legend.nextElementSibling;
        legend.remove();
        if (divider && divider.tagName === 'HR') divider.remove();
      }
    }

    compactUsername(input);
    window.setTimeout(function () { compactUsername(input); }, 250);
    window.setTimeout(function () { compactUsername(input); }, 900);
    input.addEventListener('focus', function () { compactUsername(input); });

    var form = input.closest('form');
    if (form && !form.dataset.rnDomainConfigured) {
      form.dataset.rnDomainConfigured = 'true';
      form.addEventListener('submit', function () {
        var username = input.value.trim().toLowerCase();
        if (DOMAIN && username && username.indexOf('@') === -1) {
          input.value = username + DOMAIN;
        }
      }, true);
    }

    return true;
  }

  function addSkipLink(main) {
    if (document.querySelector('.rn-skip-link')) return;

    var link = document.createElement('a');
    link.className = 'rn-skip-link';
    link.href = '#rn-main';
    link.textContent = 'Ir para o conteúdo principal';
    document.body.insertBefore(link, document.body.firstChild);

    main.id = 'rn-main';
    main.setAttribute('role', 'main');
    main.setAttribute('tabindex', '-1');
  }

  function addPageIntro(main, context) {
    if (main.querySelector(':scope > .rn-page-intro')) return;

    var intro = document.createElement('header');
    intro.className = 'rn-page-intro';

    var copy = document.createElement('div');
    copy.className = 'rn-page-intro-copy';

    var eyebrow = document.createElement('p');
    eyebrow.className = 'rn-page-eyebrow';
    eyebrow.textContent = context.eyebrow;

    var title = document.createElement('h1');
    title.textContent = context.title;

    var description = document.createElement('p');
    description.className = 'rn-page-description';
    description.textContent = context.description;

    copy.appendChild(eyebrow);
    copy.appendChild(title);
    copy.appendChild(description);
    intro.appendChild(copy);
    main.insertBefore(intro, main.firstChild);
  }

  function useDomainsAsAdminLanding() {
    if (!ADMIN_DOMAINS_LANDING || !pathStartsWith('/admin')) return false;

    try {
      if (pathIs('/admin/dashboard') && !window.sessionStorage.getItem(ADMIN_LANDING_KEY)) {
        window.sessionStorage.setItem(ADMIN_LANDING_KEY, 'true');
        window.sessionStorage.setItem(ADMIN_DOMAIN_FOCUS_KEY, 'true');
        window.location.replace('/admin/mailbox');
        return true;
      }

      window.sessionStorage.setItem(ADMIN_LANDING_KEY, 'true');
    } catch (error) {
      // Keep the requested page when session storage is unavailable.
    }

    return false;
  }

  function updateAdminWorkspaceIntro(main, target) {
    if (!main || !target) return;

    var contexts = {
      '#tab-domains': {
        title: 'Domínios',
        description: 'Gerencie os domínios existentes, acompanhe limites e acesse as configurações de cada operação.'
      },
      '#tab-mailboxes': {
        title: 'Caixas postais',
        description: 'Gerencie contas, limites de armazenamento, acessos e recursos de cada endereço.'
      },
      '#tab-resources': {
        title: 'Recursos',
        description: 'Organize salas, equipamentos e demais recursos compartilhados do ambiente de e-mail.'
      },
      '#tab-domain-aliases': {
        title: 'Aliases de domínio',
        description: 'Conecte domínios alternativos aos domínios principais da sua operação.'
      },
      '#tab-mbox-aliases': {
        title: 'Aliases',
        description: 'Gerencie endereços alternativos e seus destinos de entrega.'
      }
    };

    var context = contexts[target];
    var intro = main.querySelector(':scope > .rn-page-intro');
    if (!context || !intro) return;

    var title = intro.querySelector('h1');
    var description = intro.querySelector('.rn-page-description');
    var actions = intro.querySelector('.rn-page-intro-actions');
    if (title) title.textContent = context.title;
    if (description) description.textContent = context.description;
    if (actions) actions.classList.toggle('d-none', target !== '#tab-domains');
    document.title = context.title + ' | ' + BRAND;
  }

  function configureAdminWorkspaceTabs(main) {
    if (!isAdminDomainPage()) return;

    var workspace = document.getElementById('mail-content');
    if (!workspace) return;

    document.querySelectorAll('#mail-content [data-bs-toggle="tab"]').forEach(function (control) {
      if (control.dataset.rnIntroConfigured) return;
      control.dataset.rnIntroConfigured = 'true';
      control.addEventListener('shown.bs.tab', function (event) {
        updateAdminWorkspaceIntro(main, event.target.getAttribute('data-bs-target'));
      });
    });

    if (!workspace.dataset.rnIntroSyncConfigured) {
      workspace.dataset.rnIntroSyncConfigured = 'true';
      window.setTimeout(function () {
        var active = workspace.querySelector(
          '[data-bs-toggle="tab"].active[data-bs-target], .dropdown-item.active[data-bs-target]'
        );
        if (active) updateAdminWorkspaceIntro(main, active.getAttribute('data-bs-target'));
      }, 220);
    }
  }

  function focusAdminDomains(main, force) {
    if (!isAdminDomainPage()) return;

    var shouldFocus = Boolean(force);
    try {
      shouldFocus = shouldFocus || window.sessionStorage.getItem(ADMIN_DOMAIN_FOCUS_KEY) === 'true';
      if (shouldFocus) window.sessionStorage.removeItem(ADMIN_DOMAIN_FOCUS_KEY);
    } catch (error) {
      // A direct click can still focus the tab without session storage.
    }

    if (!shouldFocus) return;

    var showDomains = function () {
      var control = document.querySelector('#mail-content [data-bs-target="#tab-domains"]');
      if (!control) return;

      if (window.bootstrap && window.bootstrap.Tab) {
        window.bootstrap.Tab.getOrCreateInstance(control).show();
      } else {
        control.click();
      }

      updateAdminWorkspaceIntro(main, '#tab-domains');
    };

    if (force) showDomains();
    else window.setTimeout(showDomains, 180);
  }

  function addDomainsNavigation(navbar) {
    if ((!pathStartsWith('/admin') && !isAdminDomainPage()) || navbar.querySelector('.rn-domains-nav')) return;

    var sourceLink = navbar.querySelector('a.dropdown-item[href="/admin/mailbox"]');
    var menu = navbar.querySelector('.navbar-nav');
    if (!sourceLink || !menu) return;

    var sourceMenu = sourceLink.closest('.nav-item.dropdown');
    var item = document.createElement('li');
    item.className = 'nav-item rn-domains-nav';

    var link = document.createElement('a');
    link.className = 'nav-link';
    link.href = '/admin/mailbox';
    link.innerHTML = '<i class="bi bi-globe2" aria-hidden="true"></i><span>Domínios</span>';
    link.addEventListener('click', function (event) {
      try {
        window.sessionStorage.setItem(ADMIN_DOMAIN_FOCUS_KEY, 'true');
      } catch (error) {
        // The same-page action below remains available.
      }

      if (isAdminDomainPage()) {
        event.preventDefault();
        focusAdminDomains(document.querySelector('.container.flex-grow-1'), true);
      }
    });

    if (isAdminDomainPage()) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }

    item.appendChild(link);
    menu.insertBefore(item, sourceMenu || menu.firstChild);
  }

  function addDomainIntroActions(main) {
    if (!isAdminDomainPage()) return;

    var intro = main.querySelector(':scope > .rn-page-intro');
    if (!intro || intro.querySelector('.rn-page-intro-actions')) return;

    var actions = document.createElement('div');
    actions.className = 'rn-page-intro-actions';
    actions.setAttribute('aria-label', 'Ações de domínio');

    var refreshSource = document.querySelector('#tab-domains .refresh_table');
    if (refreshSource) {
      var refresh = document.createElement('button');
      refresh.type = 'button';
      refresh.className = 'btn btn-secondary';
      refresh.innerHTML = '<i class="bi bi-arrow-clockwise" aria-hidden="true"></i><span>Atualizar lista</span>';
      refresh.addEventListener('click', function () { refreshSource.click(); });
      actions.appendChild(refresh);
    }

    var addSource = document.querySelector('[data-bs-target="#addDomainModal"]');
    if (addSource) {
      var add = document.createElement('button');
      add.type = 'button';
      add.className = 'btn btn-primary';
      add.setAttribute('data-bs-toggle', 'modal');
      add.setAttribute('data-bs-target', '#addDomainModal');
      add.innerHTML = '<i class="bi bi-plus-lg" aria-hidden="true"></i><span>Adicionar domínio</span>';
      actions.appendChild(add);
    }

    if (actions.childElementCount) intro.appendChild(actions);
  }

  function enhanceDomainManagement(main) {
    if (!isAdminDomainPage()) return;

    document.body.classList.add('rn-domain-management');

    var workspace = document.getElementById('mail-content');
    if (workspace) workspace.classList.add('rn-domain-workspace');

    configureAdminWorkspaceTabs(main);

    var domainPane = document.getElementById('tab-domains');
    if (domainPane) {
      var card = domainPane.querySelector('.card');
      if (card) card.classList.add('rn-domain-card');

      domainPane.querySelectorAll('.mass-actions-mailbox').forEach(function (toolbar) {
        toolbar.setAttribute('aria-label', 'Ações para os domínios selecionados');
      });
    }

    var table = document.getElementById('domain_table');
    if (table) table.setAttribute('aria-label', 'Domínios existentes');

    addDomainIntroActions(main);
  }

  function addProductSignature() {
    var footer = document.querySelector('.container.footer, footer');
    if (!footer || footer.querySelector('.rn-product-signature')) return;

    var signature = document.createElement('div');
    signature.className = 'rn-product-signature';
    signature.innerHTML = '<strong>RN Mail</strong><span>Uma solução ' + COMPANY + '</span>';
    footer.appendChild(signature);
  }

  function configureApplication(context) {
    var navbar = document.querySelector('.navbar');
    var main = document.querySelector('.container.flex-grow-1');
    if (!navbar || !main) return;

    if (useDomainsAsAdminLanding()) return;

    document.body.classList.add('rn-app-shell', 'rn-context-' + context.key);
    document.documentElement.classList.add('rn-app');
    document.documentElement.style.setProperty(
      '--rn-logo-url',
      'url("' + LOGO_URL.replace(/["\\]/g, '\\$&') + '")'
    );
    document.documentElement.lang = 'pt-BR';
    document.title = context.title + ' | ' + BRAND;

    navbar.setAttribute('aria-label', 'Navegação principal do RN Mail');
    addSkipLink(main);
    addPageIntro(main, context);
    addDomainsNavigation(navbar);
    enhanceDomainManagement(main);
    focusAdminDomains(main, false);
    addProductSignature();

    document.querySelectorAll('.main-logo, .main-logo-dark, .mailcow-logo img').forEach(function (logo) {
      logo.setAttribute('alt', COMPANY);
      logo.setAttribute('src', LOGO_URL);
    });

    document.querySelectorAll('table').forEach(function (table) {
      if (!table.hasAttribute('aria-label')) table.setAttribute('aria-label', 'Dados do RN Mail');
    });
  }

  function applyBrand() {
    var context = getContext();
    var isLogin = configureLogin(context);

    if (!isLogin) configureApplication(context);
    removePlatformArtifacts();
    scrubVisibleBrand(document.body);

    document.documentElement.classList.add('rn-ready');
  }

  function scheduleRefresh() {
    window.clearTimeout(observerTimer);
    observerTimer = window.setTimeout(function () {
      removePlatformArtifacts();
      scrubVisibleBrand(document.body);
      var main = document.querySelector('.container.flex-grow-1');
      if (main) enhanceDomainManagement(main);
      addProductSignature();
    }, 60);
  }

  function start() {
    applyBrand();

    var observer = new MutationObserver(scheduleRefresh);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, { once: true });
  } else {
    start();
  }
})();
