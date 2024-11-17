import type { TmaCustomerWorkflowInput } from '../types';
import { MedusaError, Modules } from '@medusajs/framework/utils';
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk';

export const upsertAuthIdentityStep = createStep(
  'upsert-auth-identity',
  async (input: TmaCustomerWorkflowInput, { container }) => {
    const service = container.resolve(Modules.AUTH);
    const payload = {
      body: {
        initDataRaw: input.initRawData,
      },
    };

    const exists = await service.authenticate(input.providerId, payload);

    if (exists.success) {
      return new StepResponse(exists.authIdentity, null);
    }

    const created = await service.register(input.providerId, payload);

    if (!created.success) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, created.error);
    }

    return new StepResponse(created.authIdentity, created.authIdentity.id);
  },
  async (createdAuthIdentityId, { container }) => {
    const service = container.resolve(Modules.AUTH);

    if (createdAuthIdentityId) {
      await service.deleteAuthIdentities([createdAuthIdentityId]);
    }
  },
);
