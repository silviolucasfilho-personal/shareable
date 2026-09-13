import { defineBackend } from '@aws-amplify/backend';
import { auth } from './auth/resource.ts';

/**
 * AWS Amplify Gen 2 Backend Definition
 * Documentation: https://docs.amplify.aws/nextjs/build-a-backend/
 */
export const backend = defineBackend({
  auth,
});
