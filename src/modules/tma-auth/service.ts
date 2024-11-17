import { AbstractAuthModuleProvider, MedusaError } from '@medusajs/framework/utils';
import type {
  AuthenticationInput,
  AuthenticationResponse,
  AuthIdentityProviderService,
} from '@medusajs/framework/types';

type Options = {
  token: string;
  expiresIn: number;
};

class TmaAuthService extends AbstractAuthModuleProvider {
  static identifier = 'tma';

  #options: Options;

  constructor(_, options: Options) {
    super();

    this.#options = options;
  }

  async parseInitData(initDataRaw: string) {
    const { validate, parse } = await import('@telegram-apps/init-data-node');

    try {
      validate(initDataRaw, this.#options.token, {
        expiresIn: this.#options.expiresIn,
      });
    } catch (e) {
      throw new MedusaError(MedusaError.Types.UNAUTHORIZED, 'Incorrect credentials');
    }

    return parse(initDataRaw);
  }

  async authenticate(
    data: AuthenticationInput,
    authIdentityProviderService: AuthIdentityProviderService,
  ): Promise<AuthenticationResponse> {
    const parsed = await this.parseInitData(data.body.initDataRaw);

    const authIdentity = await authIdentityProviderService.retrieve({
      entity_id: String(parsed.user.id),
    });

    return {
      success: true,
      authIdentity,
    };
  }

  async register(data: AuthenticationInput, authIdentityProviderService: AuthIdentityProviderService) {
    const parsed = await this.parseInitData(data.body.initDataRaw);

    try {
      await authIdentityProviderService.retrieve({
        entity_id: String(parsed.user.id),
      });
    } catch (e) {
      if (e.type === MedusaError.Types.NOT_FOUND) {
        const createdAuthIdentity = await authIdentityProviderService.create({
          entity_id: String(parsed.user.id),
          user_metadata: parsed.user as unknown as Record<string, unknown>,
        });

        return {
          success: true,
          authIdentity: createdAuthIdentity,
        };
      }

      return { success: false, error: e.message };
    }
  }
}

export default TmaAuthService;
