import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Config() {
  return {
    region: process.env.AWS_REGION || "eu-north-1",
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    bucketName: process.env.AWS_S3_BUCKET || "",
  };
}

/**
 * Checks if AWS S3 credentials are configured in the environment.
 */
export function hasS3Credentials(): boolean {
  const { accessKeyId, secretAccessKey, bucketName } = getS3Config();
  return Boolean(accessKeyId && secretAccessKey && bucketName);
}

/**
 * Returns configured S3 client or throws an explicit configuration error.
 */
function getS3Client(): { client: S3Client; bucketName: string } {
  const { region, accessKeyId, secretAccessKey, bucketName } = getS3Config();

  if (!accessKeyId || !secretAccessKey || !bucketName) {
    const missing = [
      ...(!accessKeyId ? ["AWS_ACCESS_KEY_ID"] : []),
      ...(!secretAccessKey ? ["AWS_SECRET_ACCESS_KEY"] : []),
      ...(!bucketName ? ["AWS_S3_BUCKET"] : []),
    ];
    throw new Error(
      `AWS S3 storage configuration error: Missing environment variable(s): ${missing.join(", ")}. Please set them in your server environment.`
    );
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return { client, bucketName };
}

/**
 * Logical S3 key structure based on venture ID and submission ID.
 * Example: ventures/venture-123/submissions/sub-456/customer-validation.zip
 */
export function buildSubmissionS3Key(ventureId: string, submissionId: string, filename: string): string {
  const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `ventures/${ventureId}/submissions/${submissionId}/${safeFilename}`;
}

/**
 * Uploads a file buffer/Uint8Array to AWS S3.
 * Throws an explicit error if credentials are missing or S3 upload fails.
 */
export async function uploadToS3(params: {
  key: string;
  body: Buffer | Uint8Array;
  contentType?: string;
}): Promise<{ key: string; bucket: string }> {
  const { client, bucketName } = getS3Client();

  try {
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: params.key,
      Body: params.body,
      ContentType: params.contentType || "application/octet-stream",
    });

    await client.send(command);
    return { key: params.key, bucket: bucketName };
  } catch (err: any) {
    console.error("[S3 Upload Error]", err);
    throw new Error(`AWS S3 Upload Failed: ${err.message || String(err)}`);
  }
}

/**
 * Generates an authenticated presigned download URL for an S3 object (valid for 1 hour).
 * Throws an explicit error if credentials are missing or link generation fails.
 */
export async function getSignedDownloadUrl(params: {
  key: string;
  filename?: string;
  expiresInSeconds?: number;
}): Promise<string> {
  const { client, bucketName } = getS3Client();
  const expiresIn = params.expiresInSeconds || 3600;

  try {
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: params.key,
      ResponseContentDisposition: params.filename
        ? `attachment; filename="${encodeURIComponent(params.filename)}"`
        : undefined,
    });

    return await getSignedUrl(client, command, { expiresIn });
  } catch (err: any) {
    console.error("[S3 Presigned URL Error]", err);
    throw new Error(`AWS S3 Presigned URL Failed: ${err.message || String(err)}`);
  }
}

/**
 * Deletes an object from S3.
 */
export async function deleteFromS3(params: { key: string }): Promise<void> {
  if (!hasS3Credentials()) return;
  const { client, bucketName } = getS3Client();

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: params.key,
  });

  await client.send(command);
}
