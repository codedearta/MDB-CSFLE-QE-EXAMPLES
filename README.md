install on amazon linux 2

sudo yum install git

install https://github.com/mongodb/libmongocrypt

sudo vi /etc/yum.repos.d/libmongocrypt.repo

[libmongocrypt]
name=libmongocrypt repository
baseurl=https://libmongocrypt.s3.amazonaws.com/yum/amazon/2/libmongocrypt/1.8/x86_64
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/libmongocrypt.asc

sudo yum install libmongocrypt

git clone git@github.com:codedearta/MDB-CSFLE-QE-EXAMPLES.git

cd MDB-CSFLE-QE-EXAMPLES/nodeapps

curl -O https://downloads.mongodb.com/linux/mongo_crypt_shared_v1-linux-x86_64-enterprise-amazon2-6.0.7.tgz

tar -xvf mongo_crypt_shared_v1-linux-x86_64-enterprise-amazon2-6.0.7.tgz

rm mongo_crypt_shared_v1-linux-x86_64-enterprise-amazon2-6.0.7.tgz
rm MPL-2
rm THIRD-PARTY-NOTICES
rm README
rm LICENSE-Enterprise.txt

curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

source ~/.bashrc

nvm install 16

npm install

create a .env-file in the project root specifing the connection strings to your MongoDB clusters and the SHARED_LIB_PATH

```bash
cat <<-EOF >> .env
MONGODB_URI=mongodb+srv://<username>:<password>@clustername
KEYVAULT_MONGODB_URI=mongodb+srv://<username>:<password>`@clustername
SHARED_LIB_PATH=lib/mongo_crypt_v1.so
EOF
```

sudo vi /etc/yum.repos.d/mongodb-enterprise-6.0.repo

[mongodb-enterprise-6.0]
name=MongoDB Enterprise Repository
baseurl=https://repo.mongodb.com/yum/amazon/2/mongodb-enterprise/6.0/$basearch/
gpgcheck=1
enabled=1
gpgkey=https://www.mongodb.org/static/pgp/server-6.0.asc

sudo yum install -y mongodb-enterprise

in the nodeapp folder create a master key
openssl rand 96 > master-key.txt

npm run create_vault
npm run create_qe_collection
npm run insert
npm run query
