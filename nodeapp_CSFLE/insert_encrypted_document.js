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
  encryptMetadata: {
    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
    keyId: "/user_key"
  },
  properties: {
    email: {
      encrypt: {
        bsonType: "string", 
      },
    },
    name: {
      encrypt: {
        bsonType: "string",
      },
    },
    ssn: {
      encrypt: {
        bsonType: "int",
      },
    },
    phone: {
      encrypt: {
        bsonType: "string",
      },
    },
    address: {
      bsonType: "object",
      properties: {
        street: {
          encrypt: {
            bsonType: "string",
          }
        },
        city: {
          encrypt: {
            bsonType: "string",
          }
        },
        zipCode: {
          encrypt: {
            bsonType: "string",
          }
        }
      },
    },
    healthInfo: {
      bsonType: "object",
      properties: {
        policyNumber: {
          encrypt: {
            bsonType: "int",
          },
        },
        provider: {
          encrypt: {
            bsonType: "string",
          }
        },
        // bloodType: {
        //   encrypt: {
        //     bsonType: "string",
        //   }
        // },
        condition: {
          encrypt: {
            bsonType: "string",
          }
        }
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

async function main() {
  try {
    await regularClient.connect();
    console.log("regular client created.");
    try {
      await secureClient.connect();
      console.log("secure client created.");
      // start-insert
      try {
        let writeResult = await secureClient
          .db(db)
          .collection(coll)
          .insertOne({
            user_key: "user_key_1",
            email: "sepp.renfer@mongodb.com",
            name: "Sepp Renfer",
            ssn: 241014209,
            phone: "+41 077 497 77 66",
            address: {
              street: "Stapfenackerstrasse 35",
              city: "Bern",
              zipCode: "3018"
            },
            healthInfo: {
              policyNumber: 123142,
              provider: "KPT",
              bloodType: "AB+",
              condition: "lazy"
            },
          });

        writeResult = await secureClient
          .db(db)
          .collection(coll)
          .insertOne({
            user_key: "user_key_2",
            email: "myyen.ngo@bluewin.ch",
            name: "My Yen Ngo",
            ssn: 1234567890,
            phone: "+41 079 523 19 18",
            address: {
              street: "Stapfenackerstrasse 35",
              city: "Bern",
              zipCode: "3018"
            },
            healthInfo: {
              policyNumber: 567894,
              provider: "KPT",
              bloodType: "AB-",
              condition: "eager"
            },
          });
      } catch (writeError) {
        console.error("writeError occurred:", writeError);
      }
      // end-insert
    } finally {
      await secureClient.close();
    }
  } finally {
    await regularClient.close();
  }
}
main();