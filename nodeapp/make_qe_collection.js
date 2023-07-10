const { MongoClient, Binary } = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");

const { getConfig, getQeFieldMap } = require("./your_config");
const configuration = getConfig();

const keyVaultDatabase = configuration.KEY_VAULT_DATABASE;
const keyVaultCollection = configuration.KEY_VAULT_COLLECTION;
const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;

// start-kmsproviders
const fs = require("fs");
const path = "./master-key.txt";
// WARNING: Do not use a local key file in a production application
const localMasterKey = fs.readFileSync(path);
const kmsProviders = {
  local: {
    key: localMasterKey,
  },
};
// end-kmsproviders

async function main() {
  // start-create-index
  const uri = configuration.MONGODB_URI;
  const db = configuration.MEDICAL_RECORDS_DATABASE;
  const coll = configuration.PATIENTS_COLLECTION_QE;

  const keyVaultClient = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const encryption = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace,
    kmsProviders,
  });

  const encryptedFieldsMap = getQeFieldMap(encryption);
 
  const extraOptions = {
    cryptSharedLibPath: configuration["SHARED_LIB_PATH"],
  };

  const encClient = new MongoClient(uri, {
    autoEncryption: {
      keyVaultNamespace,
      kmsProviders,
      extraOptions,
      encryptedFieldsMap,
    },
  });
  await encClient.connect();
  const newEncDB = encClient.db(db);
  // Drop the encrypted collection in case you created this collection
  // in a previous run of this application.
  //await newEncDB.collection(coll).drop();
  await newEncDB.createCollection(coll);
  console.log("Created encrypted collection!");
  // end-create-enc-collection
  await keyVaultClient.close();
  await encClient.close();
}
main();