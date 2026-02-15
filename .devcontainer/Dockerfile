# Base dev image with Node.js 20 LTS
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install common tools
RUN apt-get update && apt-get install -y \
    curl wget unzip git nano \
    && rm -rf /var/lib/apt/lists/*

# Download and install mongosh directly
RUN curl -fsSL https://downloads.mongodb.com/compass/mongosh-2.3.8-linux-x64.tgz -o mongosh.tgz \
    && tar -xzf mongosh.tgz \
    && mv mongosh-2.3.8-linux-x64/bin/mongosh /usr/local/bin/ \
    && mv mongosh-2.3.8-linux-x64/bin/mongosh_crypt_v1.so /usr/local/lib/ || true \
    && rm -rf mongosh.tgz mongosh-2.3.8-linux-x64

# Install MongoDB Database Tools (mongodump, mongorestore, mongoexport)
RUN curl -fsSL "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-debian12-x86_64-100.9.4.deb" -o mongodb-tools.deb \
    && dpkg -i mongodb-tools.deb \
    && rm mongodb-tools.deb


# Default working directory
WORKDIR /workspace
