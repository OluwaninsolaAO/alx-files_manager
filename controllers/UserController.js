import dbClient from '../utils/db';

const sha1 = require('sha1');

class UserController {
  static async postNew(req, res) {
    const users = await dbClient.db.collection('users');
    const { email, password } = req.body;

    // if email or password not in request.body
    if (!email) return res.status(400).send({ error: 'Missing email' });
    if (!password) return res.status(400).send({ error: 'Missing password' });

    // if user already exists
    let queryResult = await users.findOne({ email });
    if (queryResult) {
      return res.status(400).send({ error: 'Already exist' });
    }

    const sha1Password = sha1(password);
    queryResult = await users.insertOne({ email, password: sha1Password });
    return res.status(201).send({ id: queryResult.insertedId, email });
  }
}

module.exports = UserController;
