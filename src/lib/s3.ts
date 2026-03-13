import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand, CreateBucketCommand } from "@aws-sdk/client-s3";
import { Readable } from "stream";

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT || "http://localhost:8333",
  region: process.env.S3_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || "any",
    secretAccessKey: process.env.S3_SECRET_KEY || "any",
  },
  forcePathStyle: true, // Required for SeaweedFS/Minio
});

export const BUCKET_NAME = process.env.S3_BUCKET_NAME || "movie-script";

let bucketChecked = false;

async function ensureBucket() {
  if (bucketChecked) return;
  try {
    await s3Client.send(new CreateBucketCommand({ Bucket: BUCKET_NAME }));
    console.log(`Bucket ${BUCKET_NAME} created.`);
  } catch (error: any) {
    if (error.name !== "BucketAlreadyExists" && error.name !== "BucketAlreadyOwnedByYou") {
      console.warn(`Could not ensure bucket ${BUCKET_NAME}:`, error.message);
    }
  }
  bucketChecked = true;
}

export async function uploadToS3(key: string, body: Buffer | string, contentType: string = "image/png") {
  await ensureBucket();
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: body,
    ContentType: contentType,
  });
  return s3Client.send(command);
}

export async function getFromS3(key: string): Promise<Buffer | null> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    const response = await s3Client.send(command);
    if (!response.Body) return null;

    // Convert stream to buffer
    const stream = response.Body as Readable;
    return new Promise((resolve, reject) => {
      const chunks: Buffer[] = [];
      stream.on("data", (chunk) => chunks.push(chunk));
      stream.on("error", reject);
      stream.on("end", () => resolve(Buffer.concat(chunks)));
    });
  } catch (error: any) {
    if (error.name === "NoSuchKey") return null;
    throw error;
  }
}

export async function existsInS3(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === "NotFound" || error.name === "NoSuchKey") return false;
    throw error;
  }
}

export default s3Client;
