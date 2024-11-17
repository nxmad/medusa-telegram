export type TmaCustomerWorkflowInput = {
  initRawData: string;
  providerId: string;
  jwtOptions: {
    secret: string;
    expiresIn: string;
  };
};
