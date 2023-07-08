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

// start-datakeyopts
// end-datakeyopts

async function main() {
  // start-create-index
  const uri = configuration.MONGODB_URI;
  const db = configuration.MEDICAL_RECORDS_DATABASE;
  const coll = configuration.PATIENTS_COLLECTION_QE;
  const namespace = `${db}.${coll}`;


  const keyVaultClient = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });
  const encryption = new ClientEncryption(keyVaultClient, {
    keyVaultNamespace,
    kmsProviders,
  });

  const encryptedFieldsMap = getQeFieldMap(encryption);
  // const email_key = await encryption.getKeyByAltName("email_key");
  // const name_key = await encryption.getKeyByAltName("name_key");
  // const ssn_key = await encryption.getKeyByAltName("ssn_key");
  // const phone_key = await encryption.getKeyByAltName("phone_key");
  // const street_key = await encryption.getKeyByAltName("street_key");
  // const city_key = await encryption.getKeyByAltName("city_key");
  // const zipCode_key = await encryption.getKeyByAltName("zipCode_key");
  // const policyNumber_key = await encryption.getKeyByAltName("policyNumber_key");
  // const provider_key = await encryption.getKeyByAltName("provider_key");
  // const bloodType_key = await encryption.getKeyByAltName("bloodType_key");
  // const condition_key = await encryption.getKeyByAltName("condition_key");

  // const encryptedFieldsMap = {
  //   [namespace]: {
  //     fields: [
  //       {
  //         keyId: email_key._id,
  //         path: "email",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },
  //       {
  //         keyId: name_key._id,
  //         path: "name",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },
  //       {
  //         keyId: ssn_key._id,
  //         path: "ssn",
  //         bsonType: "int",
  //         queries: { queryType: "equality" },
  //       },
  //       {
  //         keyId: phone_key._id,
  //         path: "phone",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },
  //       {
  //         keyId: street_key._id,
  //         path: "address.street",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },{
  //         keyId: city_key._id,
  //         path: "address.city",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },{
  //         keyId: zipCode_key._id,
  //         path: "address.zipCode",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },{
  //         keyId: policyNumber_key._id,
  //         path: "healthInfo.policyNumber",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },{
  //         keyId: provider_key._id,
  //         path: "healthInfo.provider",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },{
  //         keyId: bloodType_key._id,
  //         path: "healthInfo.bloodType",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },{
  //         keyId: condition_key._id,
  //         path: "healthInfo.condition",
  //         bsonType: "string",
  //         queries: { queryType: "equality" },
  //       },
  //     ],
  //   },
  // };
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