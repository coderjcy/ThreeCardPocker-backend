import server from "./app/index.js";

server.listen(process.env.SERVER_PORT, () => {
  console.log(`启动成功`);
});
