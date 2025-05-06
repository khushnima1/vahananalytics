// Database utility for sharing the connection between routes
let db = null;

const setDb = (database) => {
  db = database;
};

const getDb = () => {
  if (!db) {
    throw new Error('Database not initialized. Call setDb first.');
  }
  return db;
};

module.exports = {
  setDb,
  getDb
}; 