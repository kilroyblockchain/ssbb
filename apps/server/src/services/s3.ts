import { createReadStream } from 'fs';
import { S3Client, GetObjectCommand, PutObjectCommand, ListObjectsV2Command, DeleteObjectCommand, CopyObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { config } from '../config.js';

const s3 = new S3Client({ region: config.awsRegion });

async function getBodyAsString(body: any) {
  if (!body) return '';
  if (typeof body === 'string') return body;
  if (Buffer.isBuffer(body)) return body.toString('utf8');
  if (body.transformToString) return body.transformToString('utf-8');
  const chunks: Buffer[] = [];
  for await (const chunk of body) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString('utf8');
}

export async function readObject(bucket: string, key: string): Promise<string | null> {
  try {
    const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    return await getBodyAsString(res.Body);
  } catch (err: any) {
    if (err?.$metadata?.httpStatusCode === 404) return null;
    console.warn('[s3] read failed', key, err.message);
    return null;
  }
}

export async function writeObject(bucket: string, key: string, body: string, contentType = 'application/json') {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
}

export async function writeBuffer(bucket: string, key: string, body: Buffer, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: contentType
    })
  );
}

export async function writeFileStream(bucket: string, key: string, filePath: string, contentType: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: createReadStream(filePath),
      ContentType: contentType
    })
  );
}

export async function listObjects(bucket: string, prefix: string): Promise<{ key: string; lastModified: Date }[]> {
  const results: { key: string; lastModified: Date }[] = [];
  let continuationToken: string | undefined;
  do {
    const res = await s3.send(new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken
    }));
    for (const obj of res.Contents ?? []) {
      if (obj.Key) results.push({ key: obj.Key, lastModified: obj.LastModified ?? new Date(0) });
    }
    continuationToken = res.NextContinuationToken;
  } while (continuationToken);
  return results;
}

export async function getPresignedUrl(bucket: string, key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(s3, new GetObjectCommand({ Bucket: bucket, Key: key }), { expiresIn });
}

export async function deleteObject(bucket: string, key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    })
  );
}

export async function copyObject(bucket: string, sourceKey: string, targetKey: string) {
  await s3.send(
    new CopyObjectCommand({
      Bucket: bucket,
      CopySource: `${bucket}/${sourceKey}`,
      Key: targetKey,
      MetadataDirective: 'COPY'
    })
  );
}

async function getBodyAsBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  if (Buffer.isBuffer(body)) return body;
  if (body instanceof Uint8Array) return Buffer.from(body);
  if (typeof body.arrayBuffer === 'function') {
    const arr = await body.arrayBuffer();
    return Buffer.from(arr);
  }
  const chunks: Buffer[] = [];
  for await (const chunk of body as AsyncIterable<Uint8Array>) {
    chunks.push(Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

export async function readBuffer(bucket: string, key: string): Promise<{ buffer: Buffer; contentType: string | undefined }> {
  const res = await s3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const buffer = await getBodyAsBuffer(res.Body);
  return { buffer, contentType: res.ContentType };
}
