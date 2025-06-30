class ObjectId {
  constructor(id) {
    this._id = id || Math.random().toString(36).substring(2, 15);
  }

  toString() {
    return this._id;
  }

  equals(other) {
    return this._id === (other?._id || other);
  }
}

class MongoClient {
  constructor(uri, options) {
    this.uri = uri;
    this.options = options;
  }

  async connect() {
    return this;
  }

  db(name) {
    return {
      collection: jest.fn(() => ({
        findOne: jest.fn(),
        find: jest.fn(() => ({
          toArray: jest.fn(),
          sort: jest.fn().mockReturnThis(),
          limit: jest.fn().mockReturnThis(),
        })),
        insertOne: jest.fn(),
        updateOne: jest.fn(),
        deleteOne: jest.fn(),
        deleteMany: jest.fn(),
        countDocuments: jest.fn(),
        replaceOne: jest.fn(),
        command: jest.fn(),
      })),
      command: jest.fn(),
    };
  }
}

module.exports = {
  ObjectId,
  MongoClient,
  Db: jest.fn(),
};