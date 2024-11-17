import Service from './service';
import { ModuleProvider, Modules } from '@medusajs/framework/utils';

export default ModuleProvider(Modules.AUTH, {
  services: [Service],
});

export const TMA_AUTH_MODULE = 'tma-auth';
