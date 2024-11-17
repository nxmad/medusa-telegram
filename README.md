# Medusa Telegram

[Medusa v2](https://github.com/medusajs/medusa) plugin that provides Telegram integration.

## Installation
Add the plugin to your project
```bash
pnpm add @nxmad/medusa-telegram
```

Add your [telegram bot token](https://core.telegram.org/bots/api#authorizing-your-bot) to `.env` file
```bash
TELEGRAM_BOT_TOKEN=123456789:ABCdefghIJKLmnopQRSTuvwxyz
```

Add auth provider in `medusa.config.ts`
```ts
modules: [
  // other modules...
  {
    resolve: "@medusajs/medusa/auth",
    options: {
      providers: [
        // other providers...
        {
          id: "tma",
          resolve: "@nxmad/medusa-telegram/tma-auth",
          options: {
            token: process.env.TELEGRAM_BOT_TOKEN,
          },
        },
      ],
    },
  }
]
```

## Built-in Medusa auth routes usage example
TMA auth provider verifies that init data is not tampered or malformed.
To receive auth identity you need to pass stringified `initDataRaw` in the body of the request, e.g.:
```ts
import { retrieveLaunchParams } from '@telegram-apps/sdk';

const { initDataRaw } = retrieveLaunchParams();

medusa.auth.login('customer', 'tma', { initDataRaw });
// or...
medusa.auth.register('customer', 'tma', { initDataRaw });
```
> Note that `@telegram-apps/sdk` should be installed separately

## Workflow usage example
However, the idea behind TMA assumes that user doesn't not need neither to login nor to register since Telegram account already acts as an identity.
So, this package provides `tmaCustomerWorkflow` that:
- creates auth identity from init data if it doesn't exist;
- creates customer and links it to the identity if it doesn't exist;
- generates Medusa JWT token for existing or newly created customer.

You'll need a custom route to run this workflow, for example:

```ts
// ./src/api/store/telegram-customer/route.ts

import { tmaCustomerWorkflow } from '@nxmad/medusa-telegram';
import { ContainerRegistrationKeys } from '@medusajs/framework/utils';
import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export const GET = async (
  req: MedusaRequest,
  res: MedusaResponse
) => {
  const [authType, initRawData = ''] = (req.header('authorization') || '').split(' ');

  if (authType !== 'tma' || !initRawData) {
    return res.status(401).json({
      message: 'Authorization header is missing or invalid',
    });
  }

  const config = req.scope.resolve(ContainerRegistrationKeys.CONFIG_MODULE);
  const { http } = config.projectConfig;

  const run = await tmaCustomerWorkflow.run({
    input: {
      initRawData,
      providerId: 'tma',
      jwtOptions: {
        secret: http.jwtSecret,
        expiresIn: http.jwtExpiresIn,
      }
    }
  })

  return res.json(run.result);
}
```

> Note that `providerId` should match with provider id registered in `medusa.config.ts`

`tmaCustomerWorkflow` workflow returns Medusa JWT token for the customer. You can use it for subsequent API calls from your storefront.

```ts
import { retrieveLaunchParams } from '@telegram-apps/sdk';

const { initDataRaw } = retrieveLaunchParams();

const res = await medusa.client.fetch<{ token: string }>('/store/telegram-customer', {
  headers: {
    authorization: `tma ${initDataRaw}`,
  }
})

medusa.client.setToken(res.token);
```

### Roadmap
- [x] TMA auth provider
- [ ] Telegram OAuth2 provider 
- [ ] Telegram notifications provider
