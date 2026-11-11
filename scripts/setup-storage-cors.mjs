import { Storage } from "@google-cloud/storage";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const corsFile = path.join(__dirname, "..", "cors.json");
const corsConfig = JSON.parse(fs.readFileSync(corsFile, "utf8"));
const bucketName = "go7-delivery.firebasestorage.app";
const storage = new Storage({ projectId: "go7-delivery" });
const bucket = storage.bucket(bucketName);

await bucket.setCorsConfiguration(corsConfig);
const [metadata] = await bucket.getMetadata();
console.log(`CORS applied to ${bucketName}`);
console.log(JSON.stringify(metadata.cors || [], null, 2));
