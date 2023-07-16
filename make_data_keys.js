const { MongoClient } = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");

const { getConfig } = require("./your_config");
const configuration = getConfig();

const keyVaultDatabase = configuration.KEY_VAULT_DATABASE;
const keyVaultCollection = configuration.KEY_VAULT_COLLECTION;
const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;

// start-local-cmk
const fs = require("fs");
const crypto = require("crypto");
try {
  fs.writeFileSync("master-key.txt", crypto.randomBytes(96));
} catch (err) {
  console.error(err);
}
// end-local-cmk

// start-kmsproviders
const provider = "local";
const path = "./master-key.txt";
// WARNING: Do not use a local key file in a production application
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
  const keyVaultClient = new MongoClient(uri);
  await keyVaultClient.connect();
  const keyVaultDB = keyVaultClient.db(keyVaultDatabase);
  // Drop the Key Vault Collection in case you created this collection
  // in a previous run of this application.
  await keyVaultDB.dropDatabase();
  await keyVaultClient.db(configuration.MEDICAL_RECORDS_DATABASE).dropDatabase();

  // Drop the database storing your encrypted fields as all
  // the DEKs encrypting those fields were deleted in the preceding line.
  const keyVaultColl = keyVaultDB.collection(keyVaultCollection);
  await keyVaultColl.createIndex(
    { keyAltNames: 1 },
    {
      unique: true,
      partialFilterExpression: { keyAltNames: { $exists: true } },
    }
  );
  // end-create-index

  const encryption = new ClientEncryption(keyVaultClient, {
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







  // QE keys
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["email_key"],
  });
  console.log("email_key [base64]: ", key.toString("base64"));

  key = await encryption.createDataKey(provider, {
    keyAltNames: ["name_key"],
  });
  console.log("name_key [base64]: ", key.toString("base64"));
  
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["ssn_key"],
  });
  console.log("ssn_key [base64]: ", key.toString("base64")); 
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["phone_key"],
  });
  console.log("phone_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["street_key"],
  });
  console.log("street_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["city_key"],
  });
  console.log("city_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["zipCode_key"],
  });
  console.log("zipCode_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["policyNumber_key"],
  });
  console.log("policyNumber_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["provider_key"],
  });
  console.log("provider_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["bloodType_key"],
  });
  console.log("bloodType_key [base64]: ", key.toString("base64"));
   
  key = await encryption.createDataKey(provider, {
    keyAltNames: ["condition_key"],
  });
  console.log("condition_key [base64]: ", key.toString("base64"));

  await keyVaultClient.close();
  // await client.close();
  // end-create-dek
}
main();