import fs from "fs";
import { fileURLToPath } from "url";
import { dirname } from "path";

const regisetrRouters = async (app) => {
  const curPath = dirname(fileURLToPath(import.meta.url));

  const files = fs.readdirSync(curPath);
  for (const file of files) {
    if (!file.endsWith(".router.js")) continue;
    const router = (await import(`./${file}`)).default;
    app.use(router.routes());
    app.use(router.allowedMethods());
  }
};

export default regisetrRouters;
