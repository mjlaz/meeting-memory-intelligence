import IBM from 'ibm-cos-sdk';

const cos = new IBM.S3({
  endpoint: process.env.COS_ENDPOINT!,
  apiKeyId: process.env.COS_API_KEY_ID!,
  serviceInstanceId: process.env.COS_INSTANCE_CRN!,
  signatureVersion: 'iam',
});

export async function uploadObject(
  key: string,
  body: Buffer | Uint8Array | string,
  contentType?: string
) {
  await cos
    .putObject({ Bucket: process.env.COS_BUCKET!, Key: key, Body: body, ContentType: contentType })
    .promise();
  return { bucket: process.env.COS_BUCKET!, key };
}

export async function downloadObject(key: string): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await cos
    .getObject({ Bucket: process.env.COS_BUCKET!, Key: key })
    .promise();
  
  return {
    buffer: response.Body as Buffer,
    contentType: response.ContentType || 'application/octet-stream',
  };
}

export async function listObjects(prefix?: string): Promise<string[]> {
  const response = await cos
    .listObjectsV2({
      Bucket: process.env.COS_BUCKET!,
      Prefix: prefix,
    })
    .promise();
  
  return (response.Contents || []).map(obj => obj.Key!);
}

export async function deleteObject(key: string): Promise<void> {
  await cos
    .deleteObject({ Bucket: process.env.COS_BUCKET!, Key: key })
    .promise();
}

// Made with Bob
