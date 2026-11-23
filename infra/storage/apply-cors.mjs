// Applies infra/storage/cors.prod.json to the Spaces bucket.
// Usage (from the repo root), with the Spaces key in the environment:
//   $env:S3_ACCESS_KEY_ID="..."; $env:S3_SECRET_ACCESS_KEY="..."; node infra/storage/apply-cors.mjs
// Optional: S3_ENDPOINT (default https://sgp1.digitaloceanspaces.com), S3_REGION (default sgp1),
// S3_BUCKET (default noyta-media), CORS_FILE (default infra/storage/cors.prod.json).
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { GetBucketCorsCommand, PutBucketCorsCommand, S3Client } from '@aws-sdk/client-s3';

const { S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
if (!S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
  console.error('Set S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY first.');
  process.exit(1);
}
const Bucket = process.env.S3_BUCKET ?? 'noyta-media';
const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? 'https://sgp1.digitaloceanspaces.com',
  region: process.env.S3_REGION ?? 'sgp1',
  // Spaces answers 501 to the SDK's newer default checksum headers.
  requestChecksumCalculation: 'WHEN_REQUIRED',
  responseChecksumValidation: 'WHEN_REQUIRED',
  credentials: { accessKeyId: S3_ACCESS_KEY_ID, secretAccessKey: S3_SECRET_ACCESS_KEY },
});
// Spaces wants the classic Content-MD5 on PutBucketCors, not the SDK's newer x-amz-checksum-* headers.
client.middlewareStack.add(
  (next) => async (args) => {
    const req = args.request;
    if (req?.body && req.method === 'PUT' && req.query && 'cors' in req.query) {
      for (const h of Object.keys(req.headers)) {
        if (h.toLowerCase().startsWith('x-amz-checksum') || h.toLowerCase() === 'x-amz-sdk-checksum-algorithm') delete req.headers[h];
      }
      req.headers['Content-MD5'] = createHash('md5').update(req.body).digest('base64');
    }
    return next(args);
  },
  { step: 'build', priority: 'low', name: 'spacesContentMd5' },
);
const rules = JSON.parse(readFileSync(process.env.CORS_FILE ?? 'infra/storage/cors.prod.json', 'utf8'));

const brief = (e) => `${e.name} (HTTP ${e.$metadata?.httpStatusCode})`;
// Spaces only supports part of the S3 CORS spec, so fall back to the plainest rule.
const minimal = {
  CORSRules: rules.CORSRules.map((r) => ({
    AllowedOrigins: r.AllowedOrigins,
    AllowedMethods: r.AllowedMethods,
    AllowedHeaders: r.AllowedHeaders,
  })),
};
let applied = false;
for (const [label, cfg] of [['full rule', rules], ['minimal rule', minimal]]) {
  try {
    await client.send(new PutBucketCorsCommand({ Bucket, CORSConfiguration: cfg }));
    console.log(`PutBucketCors OK (${label})`);
    applied = true;
    break;
  } catch (e) {
    console.error(`PutBucketCors failed with ${label}: ${brief(e)}`);
  }
}
if (!applied) process.exit(1);
try {
  const now = await client.send(new GetBucketCorsCommand({ Bucket }));
  console.log(`CORS on ${Bucket}:`, JSON.stringify(now.CORSRules, null, 2));
} catch (e) {
  console.log(`Applied, but reading it back failed: ${brief(e)} (harmless)`);
}
