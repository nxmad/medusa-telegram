import {
  when,
  transform,
  createWorkflow,
  WorkflowResponse,
  type WorkflowData,
} from '@medusajs/framework/workflows-sdk';

// @ts-expect-error: types don't care about this
import type { InitData } from '@telegram-apps/init-data-node';

import type { TmaCustomerWorkflowInput } from './types';
import type { CreateCustomerDTO } from '@medusajs/framework/types';
import { upsertAuthIdentityStep } from './steps/upsert-auth-identity';
import { createCustomersWorkflow, setAuthAppMetadataStep } from '@medusajs/medusa/core-flows';
import { generateJwtTokenForAuthIdentity } from '@medusajs/medusa/api/auth/utils/generate-jwt-token';

export const tmaCustomerWorkflow = createWorkflow('tma-customer', (input: WorkflowData<TmaCustomerWorkflowInput>) => {
  const authIdentity = upsertAuthIdentityStep(input);

  // Prepare input
  const createCustomerInput = transform({ input, authIdentity }, ({ input, authIdentity }): CreateCustomerDTO[] => {
    const providerIdentity = authIdentity.provider_identities?.find((p) => p.provider === input.providerId);

    const metadata = providerIdentity?.user_metadata as unknown as InitData['user'];

    return [
      {
        last_name: metadata.lastName,
        first_name: metadata.firstName,
      },
    ];
  });

  // When no actor is linked to the auth identity, create a customer
  const created = when(authIdentity, (i) => !i.app_metadata).then(() =>
    createCustomersWorkflow.runAsStep({
      input: {
        customersData: createCustomerInput,
      },
    }),
  );

  // Prepare input to link the customer to the auth identity
  const authMetadataInput = transform({ created, authIdentity }, ({ created, authIdentity }) =>
    created
      ? {
          value: created[0].id,
          actorType: 'customer',
          authIdentityId: authIdentity.id,
        }
      : null,
  );

  when(created, (c) => !!c).then(() => setAuthAppMetadataStep(authMetadataInput));

  const token = transform({ input, authIdentity }, ({ input, authIdentity }) =>
    generateJwtTokenForAuthIdentity(
      {
        authIdentity,
        actorType: 'customer',
      },
      input.jwtOptions,
    ),
  );

  return new WorkflowResponse({
    token,
  });
});
