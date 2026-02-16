require('dotenv').config();
const { MongoClient, ServerApiVersion } = require('mongodb');

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        console.log("Testing connection with username: Gaurav (Case-Sensitive)...");
        await client.connect();
        await client.db("admin").command({ ping: 1 });
        console.log("✅ Pinged your deployment. You successfully connected to MongoDB!");
        process.exit(0);
    } catch (err) {
        console.error("❌ Connection failed!");
        console.dir(err);
        process.exit(1);
    } finally {
        await client.close();
    }
}
run();
