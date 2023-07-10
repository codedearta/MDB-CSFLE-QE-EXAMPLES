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

// start-schema
const schema = {
  bsonType: "object",
  properties: {
    insurance: {
      bsonType: "object",
      properties: {
        policyNumber: {
          encrypt: {
            bsonType: "int",
            keyId: "/app_key",
            algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
          },
        },
      },
    },
    medicalRecords: {
      encrypt: {
        bsonType: "array",
        keyId: "/app_key",
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
      },
    },
    bloodType: {
      encrypt: {
        bsonType: "string",
        keyId: "/user_key",
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
      },
    },
    ssn: {
      encrypt: {
        bsonType: "int",
        keyId: "/app_key",
        algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
      },
    },
  },
};

var patientSchema = {};
patientSchema[csfleNamespace] = schema;
// end-schema

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
    schemaMap: patientSchema,
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
      console.log("csfle finding a document with regular (non-encrypted) client.");
      const encryptedBloodTypeABPlus = await manuallyEncrytpValue("AB+", "bloodType_key");
      const encryptedBloodTypeABMinus = await manuallyEncrytpValue("AB-", "bloodType_key");
      console.log(
        await csfleRegularClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABPlus })
      );

      encryptedBloodType = await manuallyEncrytpValue("AB-", "bloodType_key");
      console.log(
        await csfleRegularClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABMinus })
      );

      console.log(
        "csfle finding a document with encrypted client, searching on an encrypted field"
      );

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

      console.log("csfle trying to decrypt document with missing key");
      console.log(
        await secureClient.db(db).collection(csfleCollection).findOne({ "healthInfo.bloodType": encryptedBloodTypeABMinus })
      );
      // end-find
    } catch (exception) {
      console.log(exception.message);
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
    console.log("qe regular client created.");

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
      console.log("qe secure client created.");
      
      // start-find
      console.log("qe finding a document with regular (non-encrypted) client.");
      let allPAtients = await qeRegularClient.db(db).collection(qeCollection).find({}).toArray();
      allPAtients.forEach(p => console.log(p));
      // console.log(
      //   await qeRegularClient.db(db).collection(qeCollection).findOne({ "healthInfo.bloodType": "AB+" })
      // );

      // console.log(
      //   await qeRegularClient.db(db).collection(qeCollection).findOne({ "healthInfo.bloodType": "AB-" })
      // );

      console.log(
        "qe finding a document with encrypted client, searching on an encrypted field"
      );

      console.log(
        await qe_secureClient.db(db).collection(qeCollection).findOne({ "healthInfo.bloodType": "AB+" },{ projection: { __safeContent__: 0}})
      );

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