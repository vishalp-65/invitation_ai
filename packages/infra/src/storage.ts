import {
  DeleteObjectCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

/** Object keys never change content, so browsers and the CDN may keep them for a year. */
const LONG_CACHE = 'public, max-age=31536000, immutable';

export interface StorageConfig {
  endpoint?: string;
  region: string;
  bucket: string;
  accessKeyId: string;
  secretAccessKey: string;
  forcePathStyle: boolean;
  /** Public (CDN) base URL objects are served from. */
  publicUrl: string;
  /**
   * Stamp every object with the `public-read` ACL. Needed on DigitalOcean Spaces (no bucket-wide
   * public policy); leave off for R2 / S3 buckets that are made public by policy instead.
   */
  publicRead?: boolean;
}

/** The S3_* / STORAGE_PUBLIC_URL variables shared by the API and the worker. */
export interface StorageEnv {
  S3_ENDPOINT?: string;
  S3_REGION: string;
  S3_BUCKET: string;
  S3_ACCESS_KEY_ID: string;
  S3_SECRET_ACCESS_KEY: string;
  S3_FORCE_PATH_STYLE: boolean;
  S3_PUBLIC_READ_ACL?: boolean;
  STORAGE_PUBLIC_URL: string;
}

/** One place that maps env to storage config, so the API and worker can never drift apart. */
export function storageFromEnv(env: StorageEnv): S3Storage {
  return new S3Storage({
    endpoint: env.S3_ENDPOINT,
    region: env.S3_REGION,
    bucket: env.S3_BUCKET,
    accessKeyId: env.S3_ACCESS_KEY_ID,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY,
    forcePathStyle: env.S3_FORCE_PATH_STYLE,
    publicUrl: env.STORAGE_PUBLIC_URL,
    publicRead: env.S3_PUBLIC_READ_ACL,
  });
}

/** S3-compatible object storage (DigitalOcean Spaces, Cloudflare R2, AWS S3, MinIO). */
export class S3Storage {
  private readonly client: S3Client;

  constructor(private readonly config: StorageConfig) {
    this.client = new S3Client({
      endpoint: config.endpoint || undefined,
      region: config.region,
      forcePathStyle: config.forcePathStyle,
      // Newer SDKs add x-amz-checksum-* headers to every write, which DigitalOcean Spaces answers with 501.
      requestChecksumCalculation: 'WHEN_REQUIRED',
      responseChecksumValidation: 'WHEN_REQUIRED',
      credentials: { accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey },
    });
  }

  private get acl() {
    return this.config.publicRead ? ('public-read' as const) : undefined;
  }

  publicUrl(key: string): string {
    return `${this.config.publicUrl.replace(/\/$/, '')}/${key}`;
  }

  async put(key: string, body: Buffer | Uint8Array, contentType: string, cacheControl = LONG_CACHE) {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, Body: body, ContentType: contentType, CacheControl: cacheControl, ACL: this.acl }),
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
      new PutObjectCommand({ Bucket: this.config.bucket, Key: key, ContentType: contentType, ContentLength: bytes, CacheControl: LONG_CACHE, ACL: this.acl }),
      // These are signed as headers, so the browser must send them back (see uploadHeaders).
      { expiresIn, unhoistableHeaders: new Set(this.acl ? ['x-amz-acl', 'cache-control'] : ['cache-control']) },
    );
  }

  /** Headers the browser must send with the presigned PUT. */
  uploadHeaders(contentType: string): Record<string, string> {
    return { 'Content-Type': contentType, 'Cache-Control': LONG_CACHE, ...(this.acl ? { 'x-amz-acl': this.acl } : {}) };
  }
}
