const mongodb = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");
const { MongoClient, Binary } = mongodb;

const { getConfig } = require("./your_config");
const configuration = getConfig();

var db = "medicalRecords";
var coll = "patients";
var namespace = `${db}.${coll}`;
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
patientSchema[namespace] = schema;
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
const regularClient = new MongoClient(connectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const encryption = new ClientEncryption(regularClient, {
  keyVaultNamespace,
  kmsProviders,
});

async function main() {
  try {
    await regularClient.connect();
    console.log("regular client created.");
    try {
      await secureClient.connect();
      console.log("secure client created.");
      
      // start-find
      console.log("Finding a document with regular (non-encrypted) client.");
      console.log(
        await regularClient.db(db).collection(coll).findOne({ "healthInfo.bloodType": "AB+" })
      );

      console.log(
        await regularClient.db(db).collection(coll).findOne({ "healthInfo.bloodType": "AB-" })
      );

      console.log(
        "Finding a document with encrypted client, searching on an encrypted field"
      );

      console.log(
        await secureClient.db(db).collection(coll).findOne({ "healthInfo.bloodType": "AB+" })
      );


      const key2 = await encryption.getKeyByAltName("user_key_2")
      const result = await encryption.deleteKey(key2._id);
      console.log(
        await secureClient.db(db).collection(coll).findOne({ "healthInfo.bloodType": "AB-" })
      );
      // end-find
    } finally {
      await secureClient.close();
    }
  } finally {
    await regularClient.close();
  }
}
main();