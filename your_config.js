require('dotenv').config();

const config = {
  // Mongo Paths + URI
  KEY_VAULT_DATABASE: "encryption",
  KEY_VAULT_COLLECTION: "__keyVault",
  MEDICAL_RECORDS_DATABASE: "medicalRecords",
  PATIENTS_COLLECTION_CSFLE: "patientsCSFLE",
  PATIENTS_COLLECTION_QE: "patientsQE",
  MONGODB_URI: process.env.MONGODB_URI,
  KEYVAULT_MONGODB_URI: process.env.KEYVAULT_MONGODB_URI,
  SHARED_LIB_PATH: process.env.SHARED_LIB_PATH,
};



/*
return credentials object and ensure it has been populated
**/
function getConfig() {
  checkForPlaceholders();
  return config;
}

async function getQeFieldMap(clientEncryption) {
  const db = config.MEDICAL_RECORDS_DATABASE;
  const coll = config.PATIENTS_COLLECTION_QE;
  const namespace = `${db}.${coll}`;

  const email_key = await clientEncryption.getKeyByAltName("email_key");
  const name_key = await clientEncryption.getKeyByAltName("name_key");
  const ssn_key = await clientEncryption.getKeyByAltName("ssn_key");
  const phone_key = await clientEncryption.getKeyByAltName("phone_key");
  const street_key = await clientEncryption.getKeyByAltName("street_key");
  const city_key = await clientEncryption.getKeyByAltName("city_key");
  const zipCode_key = await clientEncryption.getKeyByAltName("zipCode_key");
  const policyNumber_key = await clientEncryption.getKeyByAltName("policyNumber_key");
  const provider_key = await clientEncryption.getKeyByAltName("provider_key");
  const bloodType_key = await clientEncryption.getKeyByAltName("bloodType_key");
  const condition_key = await clientEncryption.getKeyByAltName("condition_key");

  const encryptedFieldsMap = {
    [namespace]: {
      fields: [
        {
          keyId: email_key._id,
          path: "email",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: name_key._id,
          path: "name",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: ssn_key._id,
          path: "ssn",
          bsonType: "int",
          queries: { queryType: "equality" },
        },
        {
          keyId: phone_key._id,
          path: "phone",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: street_key._id,
          path: "address.street",
          bsonType: "string",
          queries: { queryType: "equality" },
        },{
          keyId: city_key._id,
          path: "address.city",
          bsonType: "string",
          queries: { queryType: "equality" },
        },{
          keyId: zipCode_key._id,
          path: "address.zipCode",
          bsonType: "string",
          queries: { queryType: "equality" },
        },{
          keyId: policyNumber_key._id,
          path: "healthInfo.policyNumber",
          bsonType: "int",
          queries: { queryType: "equality" },
        },{
          keyId: provider_key._id,
          path: "healthInfo.provider",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: bloodType_key._id,
          path: "healthInfo.bloodType",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
        {
          keyId: condition_key._id,
          path: "healthInfo.condition",
          bsonType: "string",
          queries: { queryType: "equality" },
        },
      ],
    },
  };

  return encryptedFieldsMap;
}

/*
  check if credentials object contains placeholder values
  **/
function checkForPlaceholders() {
  const errorBuffer = Array();
  const placeholderPattern = /^<.*>$/;
  for (const [key, value] of Object.entries(config)) {
    // check for placeholder text
    if (`${value}`.match(placeholderPattern)) {
      errorMessage = `You must fill out the ${key} field of your credentials object.`;
      errorBuffer.push(errorMessage);
    }
    // check if value is empty
    else if (value == undefined) {
      error_message = `The value for ${key} is empty. Please enter something for this value.`;
    }
  }
  // raise an error if errors in buffer
  if (errorBuffer.length > 0) {
    message = errorBuffer.join("\n");
    throw message;
  }
}

module.exports = { getConfig, getQeFieldMap };
