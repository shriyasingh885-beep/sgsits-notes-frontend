import { list, del } from "@vercel/blob";

async function main() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    console.error("Set BLOB_READ_WRITE_TOKEN first.");
    process.exit(1);
  }
  let cursor: string | undefined;
  let total = 0;
  do {
    const res = await list({ token, cursor, limit: 1000 });
    if (res.blobs.length) {
      await del(res.blobs.map((b) => b.url), { token });
      total += res.blobs.length;
    }
    cursor = res.cursor;
  } while (cursor);
  console.log("Deleted", total, "blobs");
}

main();
