import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';

export interface S3StorageEngine {
  getObject(key: string): Promise<string | null>;
  putObject(key: string, body: string, contentType?: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  listObjects(prefix: string): Promise<string[]>;
  getEngineType(): 'aws-s3' | 'local-s3';
}

export function isRealS3Configured(): boolean {
  if (!process.env.S3_BUCKET_NAME) {
    return false;
  }

  // 1. Static AWS credentials
  if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
    return true;
  }

  // 2. AWS IAM Roles (App Runner, ECS Task Role, EC2 Instance Profile, EKS, Lambda)
  if (
    process.env.USE_AWS_IAM_ROLE === 'true' ||
    Boolean(process.env.AWS_CONTAINER_CREDENTIALS_RELATIVE_URI) ||
    Boolean(process.env.AWS_CONTAINER_CREDENTIALS_FULL_URI) ||
    Boolean(process.env.AWS_WEB_IDENTITY_TOKEN_FILE) ||
    Boolean(process.env.AWS_EXECUTION_ENV)
  ) {
    return true;
  }

  return false;
}

// 1. Cloud S3 Storage Engine (AWS S3, MinIO, Cloudflare R2, LocalStack)
class AwsS3StorageEngine implements S3StorageEngine {
  private client: S3Client;
  private bucket: string;

  constructor() {
    this.bucket = process.env.S3_BUCKET_NAME || 'shareable-markdown-docs';

    const clientConfig: Record<string, unknown> = {
      region: process.env.AWS_REGION || 'us-east-1',
    };

    // If static keys provided, pass them explicitly; otherwise @aws-sdk/client-s3 resolves
    // credentials automatically via default provider chain (IAM Roles, ECS Task Roles, etc.)
    if (process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) {
      clientConfig.credentials = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      };
    }

    if (process.env.S3_ENDPOINT) {
      clientConfig.endpoint = process.env.S3_ENDPOINT;
    }

    if (process.env.S3_FORCE_PATH_STYLE === 'true') {
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
  }

  async getObject(key: string): Promise<string | null> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      const response = await this.client.send(command);
      const str = await response.Body?.transformToString();
      return str || null;
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw err;
    }
  }

  async putObject(key: string, body: string, contentType: string = 'text/plain'): Promise<void> {
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType,
    });
    await this.client.send(command);
  }

  async deleteObject(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      });
      await this.client.send(command);
    } catch (err: unknown) {
      const error = err as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (error?.name === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) {
        return;
      }
      throw err;
    }
  }

  async listObjects(prefix: string): Promise<string[]> {
    const command = new ListObjectsV2Command({
      Bucket: this.bucket,
      Prefix: prefix,
    });
    const response = await this.client.send(command);
    return (response.Contents || []).map((item) => item.Key || '').filter(Boolean);
  }

  getEngineType(): 'aws-s3' {
    return 'aws-s3';
  }
}

// 2. Local S3-Compatible Storage Engine (Filesystem S3 mirror)
// Emulates the S3 bucket directory structure at ./data/s3-bucket/ with identical key mappings
class LocalS3StorageEngine implements S3StorageEngine {
  private baseDir: string;

  constructor() {
    this.baseDir = path.join(process.cwd(), 'data', 's3-bucket');
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  private resolvePath(key: string): string {
    return path.join(this.baseDir, key);
  }

  async getObject(key: string): Promise<string | null> {
    const filePath = this.resolvePath(key);
    if (!fs.existsSync(filePath)) {
      return null;
    }
    return fs.promises.readFile(filePath, 'utf-8');
  }

  async putObject(key: string, body: string): Promise<void> {
    const filePath = this.resolvePath(key);
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(filePath, body, 'utf-8');
  }

  async deleteObject(key: string): Promise<void> {
    const filePath = this.resolvePath(key);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  }

  async listObjects(prefix: string): Promise<string[]> {
    const searchDir = this.resolvePath(prefix);
    if (!fs.existsSync(searchDir)) {
      return [];
    }

    const results: string[] = [];
    const readDirRecursive = (currentDir: string) => {
      const entries = fs.readdirSync(currentDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);
        if (entry.isDirectory()) {
          readDirRecursive(fullPath);
        } else if (entry.isFile()) {
          const relativeKey = path.relative(this.baseDir, fullPath);
          results.push(relativeKey);
        }
      }
    };

    readDirRecursive(searchDir);
    return results;
  }

  getEngineType(): 'local-s3' {
    return 'local-s3';
  }
}

let _engineInstance: S3StorageEngine | null = null;

export function getS3Engine(): S3StorageEngine {
  if (!_engineInstance) {
    if (isRealS3Configured()) {
      _engineInstance = new AwsS3StorageEngine();
    } else {
      _engineInstance = new LocalS3StorageEngine();
    }
  }
  return _engineInstance;
}

export function getStorageInfo() {
  const isReal = isRealS3Configured();
  return {
    type: isReal ? ('AWS S3' as const) : ('Local S3 (Emulated)' as const),
    bucket: process.env.S3_BUCKET_NAME || 'shareable-markdown-docs',
    region: process.env.AWS_REGION || 'us-east-1',
    endpoint: process.env.S3_ENDPOINT || null,
    isConfigured: isReal,
  };
}
