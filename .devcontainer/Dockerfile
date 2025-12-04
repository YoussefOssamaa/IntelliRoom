# Base dev image with Node.js 20 LTS
FROM mcr.microsoft.com/devcontainers/javascript-node:20

# Install Python and common tools
RUN apt-get update && apt-get install -y \
    python3 python3-pip \
    curl wget unzip git nano vim \
    && rm -rf /var/lib/apt/lists/*

    

# Default working directory
WORKDIR /workspace



