import redisClient from '../utils/redis';
import dbClient from '../utils/db';

const { ObjectId } = require('mongodb');
const uuid4 = require('uuid').v4;
const fs = require('fs');

const rootDir = process.env.FOLDER_PATH || '/tmp/files_manager';

class FilesController {
  static async postUpload(req, res) {
    // get files collection
    const files = await dbClient.db.collection('files');

    // retrieve user based on token
    const token = req.headers['x-token'];
    const userId = await redisClient.get(`auth_${token}`);
    if (!userId) return res.status(401).send({ error: 'Unauthorized' });

    const users = await dbClient.db.collection('users');
    const user = await users.findOne({ _id: ObjectId(userId) });
    if (!user) return res.status(401).send({ error: 'Unauthorized' });

    // validate data from requests
    const data = { ...req.body };
    if (!data.name) return res.status(400).send({ error: 'Missing name' });
    if (!data.type) return res.status(400).send({ error: 'Missing type' });
    if (!['folder', 'file', 'image'].includes(data.type)) {
      return res.status(400).send({ error: 'Missing type' });
    }
    if (data.type !== 'folder' && !data.data) {
      return res.status(400).send({ error: 'Missing data' });
    }
    if (data.parentId) {
      const queryResult = await files.findOne({ _id: ObjectId(data.parentId) });
      if (!queryResult) {
        return res.status(400).send({ error: 'Parent not found' });
      }
      if (queryResult.type !== 'folder') {
        return res.status(400).send({ error: 'Parent is not a folder' });
      }
    }

    if (data.type !== 'folder') {
      const fileUuid = uuid4();
      data.localPath = fileUuid;
      const content = Buffer.from(data.data, 'base64');
      fs.mkdir(rootDir, { recursive: true }, (error) => {
        if (error) {
          console.log(error);
        }
        fs.writeFile(`${rootDir}/${fileUuid}`, content, (error) => {
          if (error) {
            console.log(error);
          }
          return true;
        });
        return true;
      });
    }

    // save file
    data.userId = userId;
    data.parentId = data.parentId || 0;
    data.isPublic = data.isPublic || false;
    delete data.data;
    const queryResult = await files.insertOne(data);
    const objFromQuery = { ...queryResult.ops[0] };
    delete objFromQuery.localPath;
    return res
      .status(201)
      .send({ ...objFromQuery, id: queryResult.insertedId });
  }
}

module.exports = FilesController;
