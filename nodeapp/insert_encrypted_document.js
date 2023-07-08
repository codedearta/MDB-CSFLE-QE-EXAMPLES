const mongodb = require("mongodb");
const { ClientEncryption } = require("mongodb-client-encryption");
const { MongoClient, Binary } = mongodb;

const { getConfig, getQeFieldMap } = require("./your_config");
const configuration = getConfig();

const db = configuration.MEDICAL_RECORDS_DATABASE;
const csfle_collection = configuration.PATIENTS_COLLECTION_CSFLE;
const qe_collection = configuration.PATIENTS_COLLECTION_QE;
const csfle_namespace = `${db}.${csfle_collection}`;
const qe_namespace = `${db}.${qe_collection}`;
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

// start-key-vault
const keyVaultDatabase = configuration.KEY_VAULT_DATABASE;
const keyVaultCollection = configuration.KEY_VAULT_COLLECTION;
const keyVaultNamespace = `${keyVaultDatabase}.${keyVaultCollection}`;
// end-key-vault

// start-schema
const csfle_schema = {
  bsonType: "object",
  encryptMetadata: {
    algorithm: "AEAD_AES_256_CBC_HMAC_SHA_512-Random",
    keyId: "/user_key",
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
          },
        },
        city: {
          encrypt: {
            bsonType: "string",
          },
        },
        zipCode: {
          encrypt: {
            bsonType: "string",
          },
        },
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
          },
        },
        // bloodType: {
        //   encrypt: {
        //     bsonType: "string",
        //   }
        // },
        condition: {
          encrypt: {
            bsonType: "string",
          },
        },
      },
    },
  },
};

var csfle_patientSchema = {};
csfle_patientSchema[csfle_namespace] = csfle_schema;
// end-schema

// start-extra-options
const extraOptions = {
  mongocryptdSpawnPath: configuration["MONGOCRYPTD_PATH"],
};
// end-extra-options

// start-client
const csfle_secureClient = new MongoClient(configuration.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  autoEncryption: {
    keyVaultNamespace,
    kmsProviders,
    schemaMap: csfle_patientSchema,
    extraOptions: extraOptions,
  },
});

// start-client

// end-client
const regularClient = new MongoClient(configuration.MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const encryption = new ClientEncryption(regularClient, {
  keyVaultNamespace,
  kmsProviders,
});

async function csfle_insert_docs() {
  try {
    await regularClient.connect();
    console.log("csfle regular client created.");
    try {
      await csfle_secureClient.connect();
      console.log("csfle secure client created.");
      // start-insert
      try {
        let writeResult = await csfle_secureClient
          .db(db)
          .collection(csfle_collection)
          .insertOne({
            user_key: "user_key_1",
            email: "sepp.renfer@mongodb.com",
            name: "Sepp Renfer",
            ssn: 241014209,
            phone: "+41 077 497 77 66",
            address: {
              street: "Stapfenackerstrasse 35",
              city: "Bern",
              zipCode: "3018",
            },
            healthInfo: {
              policyNumber: 123142,
              provider: "KPT",
              bloodType: "AB+",
              condition: "lazy",
            },
          });

        writeResult = await csfle_secureClient
          .db(db)
          .collection(csfle_collection)
          .insertOne({
            user_key: "user_key_2",
            email: "myyen.ngo@bluewin.ch",
            name: "My Yen Ngo",
            ssn: 1234567890,
            phone: "+41 079 523 19 18",
            address: {
              street: "Stapfenackerstrasse 35",
              city: "Bern",
              zipCode: "3018",
            },
            healthInfo: {
              policyNumber: 567894,
              provider: "KPT",
              bloodType: "AB-",
              condition: "eager",
            },
          });
      } catch (writeError) {
        console.error("csfle writeError occurred:", writeError);
      }
      // end-insert
    } finally {
      await csfle_secureClient.close();
    }
  } finally {
    await regularClient.close();
  }
}

async function qe_insert_docs() {
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
    // start-insert

    let writeResult = await qe_secureClient
      .db(db)
      .collection(qe_collection)
      .insertOne({
        email: "sepp.renfer@mongodb.com",
        name: "Sepp Renfer",
        ssn: 241014209,
        phone: "+41 077 497 77 66",
        address: {
          street: "Stapfenackerstrasse 35",
          city: "Bern",
          zipCode: "3018",
        },
        healthInfo: {
          policyNumber: 123142,
          provider: "KPT",
          bloodType: "AB+",
          condition: "lazy",
        },
      });

    writeResult = await qe_secureClient
      .db(db)
      .collection(qe_collection)
      .insertOne({
        email: "myyen.ngo@bluewin.ch",
        name: "My Yen Ngo",
        ssn: 1234567890,
        phone: "+41 079 523 19 18",
        address: {
          street: "Stapfenackerstrasse 35",
          city: "Bern",
          zipCode: "3018",
        },
        healthInfo: {
          policyNumber: 567894,
          provider: "KPT",
          bloodType: "AB-",
          condition: "eager",
        },
      });
  } catch (writeError) {
    console.error("qe writeError occurred:", writeError);
  } finally {
    await qe_secureClient.close();
  }
}
csfle_insert_docs();
qe_insert_docs();
