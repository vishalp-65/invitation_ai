#!/bin/sh
# Idempotent local bucket setup for the S3-compatible dev server.
set -e
EP="--endpoint-url http://minio:9000"

until aws $EP s3api list-buckets >/dev/null 2>&1; do
  echo "waiting for object storage..."; sleep 1
done

aws $EP s3api create-bucket --bucket cardai 2>/dev/null || true
aws $EP s3api put-bucket-policy --bucket cardai --policy file:///init/public-read-policy.json
aws $EP s3api put-bucket-cors --bucket cardai --cors-configuration file:///init/cors.json || echo "CORS not supported by this server; uploads from the browser may need a proxy"
echo "bucket ready"
