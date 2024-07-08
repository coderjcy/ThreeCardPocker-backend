import connection from "../app/database.js";

class UserService {
  async queryFriends(userId) {
    const statement = "SELECT * FROM user WHERE id = ?;";
    const res = await connection.execute(statement, [userId]);
    const friendIds = res[0][0].friends?.split(",") || [];
    const statement2 = "SELECT nickname,id FROM user WHERE id = ?;";

    const friendList = [];
    for (const friendId of friendIds) {
      const info = await connection.execute(statement2, [friendId]);
      friendList.push(info[0][0]);
    }
    return friendList;
  }

  async queryUserByUserName(username) {
    const statement = "SELECT * FROM user WHERE username = ?;";
    const res = await connection.execute(statement, [username]);
    return res[0][0];
  }

  async queryUserInfo(key, value) {
    const statement = `SELECT * FROM user WHERE ${key} = ?;`;
    const res = await connection.execute(statement, [value]);
    return res[0][0];
  }

  async queryBalanceById(id) {
    const statement = "SELECT balance FROM user WHERE id = ?;";
    const res = await connection.execute(statement, [id]);
    return res[0][0].balance;
  }

  async updateBalanceByUserId(userId, balance) {
    const statement = `UPDATE user SET balance = ? WHERE id = ?;`;
    const res = await connection.execute(statement, [balance, userId]);
    return res[0][0];
  }

  async create(username, password, email) {
    const statement = `INSERT INTO user (username,nickname,password,email) values(?,?,?,?);`;
    const res = await connection.execute(statement, [username, username, password, email]);
    return res[0][0];
  }

  async update(userId, key, value) {
    const statement = `UPDATE user SET ${key} = ? WHERE id = ?;`;
    const res = await connection.execute(statement, [value, userId]);
    return res[0][0];
  }
}

export default new UserService();
