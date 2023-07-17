const mongodb = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");
const { MongoClient, Binary } = mongodb;

const { getConfig, getQeFieldMap } = require("./your_config");
const configuration = getConfig();

const db = configuration.MEDICAL_RECORDS_DATABASE;
const csfleCollection = configuration.PATIENTS_COLLECTION_CSFLE;
const csfleNamespace = `${db}.${csfleCollection}`;

const qeCollection = configuration.PATIENTS_COLLECTION_QE;


// start-kmsproviders
const fs = require("fs");
const provider = "local";
const path = "./master-key.txt";
const localMasterKey = fs.readFileSync(path);
const kmsProviders = {
  local: {
    key: localMasterKey,
  },
};
// end-kmsproviders

const connectionString = configuration.MONGODB_URI;

// start-key-vault
const keyVaultDatabase = configuration.KEY_VAULT_DATABASE;
const keyVaultCollection = configuration.KEY_VAULT_COLLECTION;
const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;
// end-key-vault

// start-extra-options
const extraOptions = {
  mongocryptdSpawnPath: configuration["MONGOCRYPTD_PATH"],
};
// end-extra-options

// start-client
const secureClient = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoEncryption: {
    keyVaultNamespace,
    kmsProviders,
    extraOptions: extraOptions,
  },
});
// end-client
const csfleRegularClient = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// end-client
const qeRegularClient = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const encryption = new ClientEncryption(qeRegularClient, {
  keyVaultNamespace,
  kmsProviders,
});

async function manuallyEncrytpValue(value, keyAlias) {
  return encryption.encrypt(value,
    { 
      keyAltName: keyAlias, 
      algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Deterministic" 
    }
  );
}

async function manuallyDecrytpValue(cypherText) {
  return encryption.decrypt(cypherText);
}

async function csfleRun() {
  try {
    await csfleRegularClient.connect();
    console.log("csfle regular client created.");
    try {
      await secureClient.connect();
      console.log("csfle secure client created.");
      
      // start-find
      console.log("csfle finding a document with regular (non-encrypted) client:");
      const encryptedBloodTypeABPlus = await manuallyEncrytpValue("AB+", "bloodType_key");
      const encryptedBloodTypeABMinus = await manuallyEncrytpValue("AB-", "bloodType_key");
      console.log(`\x1b[32muse ${db}`);
      console.log(`db.${csfleCollection}.findOne({ "healthInfo.bllodType": ${encryptedBloodTypeABPlus}}):\n \x1b[0m`);
      console.log(
        await csfleRegularClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABPlus })
      );

      // encryptedBloodType = await manuallyEncrytpValue("AB-", "bloodType_key");
      // console.log(
      //   await csfleRegularClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABMinus })
      // );
      console.log(`\x1b[32muse ${db}`);
      console.log("csfle finding a document with encrypted client, searching on an encrypted field");
      console.log(`db.${csfleCollection}.findOne({ "healthInfo.bllodType": ${encryptedBloodTypeABPlus}}):\n \x1b[0m`);

      console.log(
        await secureClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABPlus })
      );


      try { 
        console.log("csfle deleting user_key_2")
        const key2 = await encryption.getKeyByAltName("user_key_2")
        await encryption.deleteKey(key2._id); 
      } catch (ex) {
        console.log(ex.message);
      }

      console.log("\x1b[31mcsfle trying to decrypt document with missing key: \x1b[0m");
      console.log("");
      console.log(
        await secureClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABMinus })
      );
      // end-find
    } catch (exception) {
      console.log("\x1b[31m")
      console.log(exception.message);
      console.log("\x1b[0m \n")
    } finally {
      await secureClient.close();
    }
  } finally {
    await csfleRegularClient.close();
  }
}

async function qeRun(){
  try {
    await qeRegularClient.connect();

    const qeFieldMap = await getQeFieldMap(encryption);

    const qe_secureClient = new MongoClient(configuration.MONGODB_URI, {
      autoEncryption: {
        keyVaultNamespace: keyVaultNamespace,
        kmsProviders: kmsProviders,
        extraOptions: extraOptions,
        encryptedFieldsMap: qeFieldMap,
      },
    });

    try {
      await qe_secureClient.connect();
      console.log("\x1b[33m")
      console.log("Queryable Encryption - secure client created.");
      
      
      // start-find
      console.log("finding a document with regular (non-encrypted) client.");
      console.log("");
      console.log(`use ${db}`);
      console.log(`db.${qeCollection}.find({})`);
      console.log("\x1b[0m \n");
      let allPAtients = await qeRegularClient.db(db).collection(qeCollection).find({}).toArray();
      allPAtients.forEach(p => console.log(p));

      // start-find
      console.log("\x1b[32m")
      console.log("finding a document with encrypted client, searching on an encrypted field");
      console.log("");
      console.log(`use ${db}`);
      console.log(`db.${qeCollection}.find({"healthInfo.bloodType": "AB+" })`);
      console.log("\x1b[0m");
      console.log(
        await qe_secureClient.db(db).collection(qeCollection).findOne({ "healthInfo.bloodType": "AB+" },{ projection: { __safeContent__: 0}})
      );


      // start-find
      console.log("\x1b[32m")
      console.log(`db.${qeCollection}.find({"healthInfo.bloodType": "AB-" })`);
      console.log("\x1b[0m");
      console.log(
        await qe_secureClient.db(db).collection(qeCollection).findOne({ "healthInfo.bloodType": "AB-" },{ projection: { __safeContent__: 0}})
      );
      // end-find
    } finally {
      await qe_secureClient.close();
    }
  } finally {
    await qeRegularClient.close();
  }
}
csfleRun();
qeRun();