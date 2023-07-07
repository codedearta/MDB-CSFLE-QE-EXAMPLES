const config = {
  // Mongo Paths + URI
  KEY_VAULT_DATABASE: "encryption_CSFLE_SHREDDING",
  KEY_VAULT_COLLECTION: "__keyVault",
  MONGODB_URI: "mongodb+srv://sepp:sepp@cryptotalk.lyp3u.mongodb.net/",
  SHARED_LIB_PATH: "/Users/sepp.renfer/vietnamTalk/nodeapp/mongo_crypt_shared_v1-macos-x86_64-enterprise-6.0.7/lib"
};



/*
return credentials object and ensure it has been populated
**/
function getConfig() {
  checkForPlaceholders();
  return config;
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

module.exports = { getConfig };
