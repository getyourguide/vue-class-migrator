import { supportedPropDecorators as vuexDecorators } from './vuex';
import { supportedDecorators as vueClassPropertyDecorators } from './vue-property-decorator';

export const vueSpecialMethods = [
  'beforeCreate',
  'created',
  'beforeMount',
  'mounted',
  'beforeUpdate',
  'updated',
  'beforeUnmount',
  'unmounted',
  'errorCaptured',
  'renderTracked',
  'renderTriggered',
  'activated',
  'deactivated',
  'serverPrefetch',
  'beforeDestroy',
  'destroyed',
]; // Vue methods that won't be included under methods: {...}, they go to the root.

export const supportedDecorators = [
  ...vuexDecorators,
  ...vueClassPropertyDecorators,
]; // Class Property decorators
