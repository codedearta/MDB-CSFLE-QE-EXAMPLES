const mongodb = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");
const { MongoClient, Binary } = mongodb;

const { getConfig } = require("./your_config");
const configuration = getConfig();

// start-local-cmk
const fs = require("fs");
const crypto = require("crypto");
const { config } = require("dotenv");
try {
  fs.writeFileSync("master-key.txt", crypto.randomBytes(96));
} catch (err) {
  console.error(err);
}
// end-local-cmk

// start-kmsproviders
const provider = "local";
const path = "./master-key.txt";
const localMasterKey = fs.readFileSync(path);
const kmsProviders = {
  local: {
    key: localMasterKey,
  },
};
// end-kmsproviders

// start-datakeyopts
// end-datakeyopts

async function main() {
  // start-create-index
  const uri = configuration.MONGODB_URI;
  const keyVaultDatabase = configuration.KEY_VAULT_DATABASE;
  const keyVaultCollection = configuration.KEY_VAULT_COLLECTION;
  const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;
  const keyVaultClient = new MongoClient(uri);
  await keyVaultClient.connect();
  const keyVaultDB = keyVaultClient.db(keyVaultDatabase);
  // Drop the Key Vault Collection in case you created this collection
  // in a previous run of this application.
  await keyVaultDB.dropDatabase();
  // Drop the database storing your encrypted fields as all
  // the DEKs encrypting those fields were deleted in the preceding line.
  await keyVaultClient.db("medicalRecords").dropDatabase();
  const keyVaultColl = keyVaultDB.collection(keyVaultCollection);
  await keyVaultColl.createIndex(
    { keyAltNames: 1 },
    {
      unique: true,
      partialFilterExpression: { keyAltNames: { $exists: true } },
    }
  );
  // end-create-index

  // start-create-dek
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  await client.connect();

  const encryption = new ClientEncryption(client, {
    keyVaultNamespace,
    kmsProviders,
  });

  let key = await encryption.createDataKey(provider, {
    keyAltNames: ["app_key"],
  });
  console.log("app_key [base64]: ", key.toString("base64"));

  key = await encryption.createDataKey(provider, {
    keyAltNames: ["user_key_1"],
  });
  console.log("user_key_sepp [base64]: ", key.toString("base64"));

  key = await encryption.createDataKey(provider, {
    keyAltNames: ["user_key_2"],
  });
  console.log("user_key_myyen [base64]: ", key.toString("base64"));

  key = await encryption.createDataKey(provider, {
    keyAltNames: ["user_key_3"],
  });
  console.log("user_key_nyla [base64]: ", key.toString("base64"));

  key = await encryption.createDataKey(provider, {
    keyAltNames: ["user_key_4"],
  });
  console.log("user_key_timo [base64]: ", key.toString("base64"));

  await keyVaultClient.close();
  await client.close();
  // end-create-dek
}
main();