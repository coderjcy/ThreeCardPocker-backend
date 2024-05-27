// 链接数据库 mysql
import mysql from "mysql2";

const connectionPool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: "123456",
  database: "three_card_poker",
  connectionLimit: 10,
});
connectionPool.getConnection((err, connection) => {
  if (err) return console.log("连接数据库失败", err);

  connection.connect((err) => {
    if (err) return console.log("和数据交互失败", err);
  });
});
const connection = connectionPool.promise();

export default connection;
