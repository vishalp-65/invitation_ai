import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

export interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** Public (CDN) base URL objects are served from. */
  publicUrl: string;
}

/** S3-compatible object storage (MinIO, Cloudflare R2, AWS S3). */
export class S3Storage {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  publicUrl(key: string): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string, cacheControl = 'public, max-age=31536000, immutable') {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl }),
    );
    return { key, url: this.publicUrl(key), bytes: body.byteLength };
  }

  async get(key: string): Promise<Buffer> {
    const res = await this.client.send(new GetObjectCommand({ Bucket: this.config.bucket, Key: key }));
    const bytes = await res.Body?.transformToByteArray();
    if (!bytes) throw new Error(`Empty object: ${key}`);
    return Buffer.from(bytes);
  }

  async head(key: string): Promise<{ bytes: number; contentType: string | undefined } | null> {
    try {
      const res = await this.client.send(new HeadObjectCommand({ Bucket: this.config.bucket, Key: key }));
      return { bytes: res.ContentLength ?? 0, contentType: res.ContentType };
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.config.bucket, Key: key }));
  }

  /** Browser uploads go straight to storage; the API never proxies file bytes. */
  presignPut(key: string, contentType: string, bytes: number, expiresIn = 600): Promise<string> {
    return getSignedUrl(
      this.client,
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: contentType, ContentLength: bytes }),
      { expiresIn },
    );
  }
}
