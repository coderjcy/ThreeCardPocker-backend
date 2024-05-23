import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";

const curPath = dirname(fileURLToPath(import.meta.url));
const PRIVATE_KEY = fs.readFileSync(path.resolve(curPath, "./keys/private.key"));
const PUBLIC_KEY = fs.readFileSync(path.resolve(curPath, "./keys/public.key"));

// 创建私钥和公钥
// npm i openssl -g
// openssl genpkey -algorithm RSA -out private_key.pem -pkeyopt rsa_keygen_bits:2048
// openssl rsa -pubout -in private_key.pem -out public_key.pem
export { PRIVATE_KEY, PUBLIC_KEY };
