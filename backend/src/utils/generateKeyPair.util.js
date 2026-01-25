import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const generateKeyPair = (prefix = '') => {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048,
        publicKeyEncoding: {
            type: 'spki',
            format: 'pem'
        },
        privateKeyEncoding: {
            type: 'pkcs8',
            format: 'pem'
        }
    });

    try {
        fs.writeFileSync(path.join("src","keys", prefix + 'Public.pem'), publicKey);
        fs.writeFileSync(path.join("src","keys", prefix + 'Private.pem'), privateKey);
        console.log(`✅ Success: Keys generated and saved `);
    } catch (err) {
        console.error('❌ Error saving keys:', err);
    }
}

generateKeyPair("Auth");
generateKeyPair("Refresh");
generateKeyPair("Reset");