import { S3Client, PutObjectCommand, ListObjectsV2Command } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";

// Simple .env parser
const envPath = path.join(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
      const idx = trimmed.indexOf("=");
      const key = trimmed.slice(0, idx).trim();
      let val = trimmed.slice(idx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      process.env[key] = val;
    }
  }
}

const client = new S3Client({
  region: "auto",
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

async function main() {
  console.log("Testing connection to R2 bucket:", process.env.R2_BUCKET_NAME);
  const testKey = "test-connection.txt";
  await client.send(
    new PutObjectCommand({
      Bucket: process.env.R2_BUCKET_NAME,
      Key: testKey,
      Body: "Cloudflare R2 connection successful for SGSITS Notes Vault!",
      ContentType: "text/plain",
    })
  );
  console.log("Successfully uploaded test file to R2!");

  const res = await client.send(
    new ListObjectsV2Command({
      Bucket: process.env.R2_BUCKET_NAME,
      MaxKeys: 5,
    })
  );
  console.log("Objects currently in bucket:", res.Contents ? res.Contents.map((c) => c.Key) : []);
  console.log("Public URL to test:", `${process.env.R2_PUBLIC_URL}/${testKey}`);
}

main().catch(console.error);
