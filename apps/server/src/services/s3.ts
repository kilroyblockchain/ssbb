import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config';

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

export async function writeObject(bucket: string, key: string, body: string) {
  await s3.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: 'application/json'
    })
  );
}
