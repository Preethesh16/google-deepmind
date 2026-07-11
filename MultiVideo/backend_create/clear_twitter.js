const mongoose = require('mongoose');
require('dotenv').config();
const Account = require('./models/Account');

mongoose.connect(process.env.MONGO_URI).then(async () => {
    console.log('Connected to MongoDB');

    const result = await Account.deleteMany({ platform: 'twitter' });
    console.log(`Deleted ${result.deletedCount} Twitter accounts.`);

    process.exit();
}).catch(err => {
    console.error(err);
    process.exit(1);
});
