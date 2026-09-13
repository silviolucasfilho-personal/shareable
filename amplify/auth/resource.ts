import { defineAuth, secret } from '@aws-amplify/backend';

/**
 * AWS Amplify Gen 2 Auth definition with Amazon Cognito & Google Federation
 * Documentation: https://docs.amplify.aws/nextjs/build-a-backend/auth/
 */
export const auth = defineAuth({
  loginWith: {
    email: true,
    externalProviders: {
      google: {
        clientId: secret('GOOGLE_CLIENT_ID'),
        clientSecret: secret('GOOGLE_CLIENT_SECRET'),
        scopes: ['email', 'profile', 'openid'],
        attributeMapping: {
          email: 'email',
          fullname: 'name',
          profilePicture: 'picture',
        },
      },
      callbackUrls: [
        'http://localhost:3000/',
        'https://main.*.amplifyapp.com/',
      ],
      logoutUrls: [
        'http://localhost:3000/',
        'https://main.*.amplifyapp.com/',
      ],
    },
  },
});
