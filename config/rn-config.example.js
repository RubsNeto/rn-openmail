// SPDX-License-Identifier: GPL-3.0-only
// Copy this file to rn-config.js and adapt it. rn-config.js is ignored by Git.
window.RN_OPENMAIL_CONFIG = Object.freeze({
  brand: 'RN OpenMail',
  company: 'Example Company',
  defaultDomain: 'example.com',
  directoryLabel: 'Internal directory',
  logoUrl: '/img/rn-logo.png',
  adminDomainsLanding: true
});

// Backward-compatible alias for installations upgrading from earlier releases.
window.RN_MAIL_CONFIG = window.RN_OPENMAIL_CONFIG;
