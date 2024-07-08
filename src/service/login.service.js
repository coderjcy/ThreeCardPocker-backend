import connection from "../app/database.js";

class LoginService {
  async insetVerifyCodeRecord(userId, code) {
    const statement = `INSERT INTO verify_record (user_id,code) values(?,?);`;
    const res = await connection.execute(statement, [userId, code]);
    return res[0][0];
  }

  async queryCodeByUserId(userId) {
    const statement = `SELECT * FROM verify_record WHERE user_id = ? ORDER BY expiration_time DESC`;
    const res = await connection.execute(statement, [userId]);
    return res[0][0];
  }
}
new LoginService().queryCodeByUserId(2);
export default new LoginService();
