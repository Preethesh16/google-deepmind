const MongoStore = require('connect-mongo');
console.log('Type of MongoStore:', typeof MongoStore);
console.log('MongoStore keys:', Object.keys(MongoStore));
console.log('MongoStore.create:', MongoStore.create);
console.log('MongoStore.default:', MongoStore.default);
if (MongoStore.default) {
    console.log('MongoStore.default.create:', MongoStore.default.create);
}
