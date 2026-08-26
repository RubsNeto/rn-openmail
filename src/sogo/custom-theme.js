// SPDX-License-Identifier: GPL-2.0-only
// Copyright (C) 2026 RN Design & Serviços
(function() {
  'use strict';

  angular.module('SOGo.Common').config(configure);

  configure.$inject = ['$mdThemingProvider'];

  function configure($mdThemingProvider) {
    var rnBlue = $mdThemingProvider.extendPalette('blue', {
      '50': 'EAF9FD',
      '100': 'CFF2FA',
      '200': '9BE5F3',
      '300': '6BD8EC',
      '400': '3FD0E9',
      '500': '31BBD8',
      '600': '2399C3',
      '700': '1A6FAE',
      '800': '14538C',
      '900': '0A2540',
      'A100': '8AD9F4',
      'A200': '5A9AEE',
      'A400': '47ABE1',
      'A700': '3FD0E9',
      'contrastDefaultColor': 'light',
      'contrastDarkColors': ['50', '100', '200', '300', '400', 'A100', 'A700']
    });

    var rnSurface = $mdThemingProvider.extendPalette('grey', {
      '50': 'FFFFFF',
      '100': 'F8FBFD',
      '200': 'F4F8FB',
      '300': 'EAF2F7',
      '400': 'D9E6EE',
      '500': 'B7CBD7',
      '600': '86A9BC',
      '700': '526B7A',
      '800': '26465B',
      '900': '102A3D',
      '1000': '07141F'
    });

    $mdThemingProvider.definePalette('rn-blue', rnBlue);
    $mdThemingProvider.definePalette('rn-surface', rnSurface);

    $mdThemingProvider.theme('default')
      .primaryPalette('rn-blue', {
        'default': '700',
        'hue-1': '400',
        'hue-2': '800',
        'hue-3': 'A400'
      })
      .accentPalette('rn-blue', {
        'default': '400',
        'hue-1': '100',
        'hue-2': '200',
        'hue-3': 'A400'
      })
      .backgroundPalette('rn-surface');

    $mdThemingProvider.generateThemesOnDemand(false);
  }
})();
