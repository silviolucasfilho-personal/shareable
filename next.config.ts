import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  env: {
    ...(process.env.S3_BUCKET_NAME ? { S3_BUCKET_NAME: process.env.S3_BUCKET_NAME } : {}),
    ...(process.env.BUCKET_NAME ? { BUCKET_NAME: process.env.BUCKET_NAME } : {}),
    ...(process.env.S3_REGION ? { S3_REGION: process.env.S3_REGION } : {}),
    ...(process.env.AWS_REGION ? { AWS_REGION: process.env.AWS_REGION } : {}),
    ...(process.env.S3_ACCESS_KEY_ID ? { S3_ACCESS_KEY_ID: process.env.S3_ACCESS_KEY_ID } : {}),
    ...(process.env.APP_AWS_ACCESS_KEY_ID ? { APP_AWS_ACCESS_KEY_ID: process.env.APP_AWS_ACCESS_KEY_ID } : {}),
    ...(process.env.S3_SECRET_ACCESS_KEY ? { S3_SECRET_ACCESS_KEY: process.env.S3_SECRET_ACCESS_KEY } : {}),
    ...(process.env.APP_AWS_SECRET_ACCESS_KEY ? { APP_AWS_SECRET_ACCESS_KEY: process.env.APP_AWS_SECRET_ACCESS_KEY } : {}),
    ...(process.env.S3_ENDPOINT ? { S3_ENDPOINT: process.env.S3_ENDPOINT } : {}),
    ...(process.env.S3_FORCE_PATH_STYLE ? { S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE } : {}),
  },
  ...(process.env.BUILD_STANDALONE === "true" ? { output: "standalone" } : {}),
};

export default nextConfig;

