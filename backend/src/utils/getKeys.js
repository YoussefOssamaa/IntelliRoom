import fs from "fs";
import path, { dirname } from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const adminAuthPrivateKeyPath = path.join(__dirname, "src/keys/AdminAuthPrivate.pem");
const adminAuthPublicKeyPath = path.join(__dirname, "src/keys/AdminAuthPublic.pem");

const adminAuthPrivateKey = fs.readFileSync(adminAuthPrivateKeyPath, "utf8");
const adminAuthPublicKey = fs.readFileSync(adminAuthPublicKeyPath, "utf8");

const adminRefreshPrivateKeyPath = path.join(__dirname, "src/keys/AdminRefreshPrivate.pem");
const adminRefreshPublicKeyPath = path.join(__dirname, "src/keys/AdminRefreshPublic.pem");

const adminRefreshPrivateKey = fs.readFileSync(adminRefreshPrivateKeyPath, "utf8");
const adminRefreshPublicKey = fs.readFileSync(adminRefreshPublicKeyPath, "utf8");

const authPrivateKeyPath = path.join(__dirname, "src/keys/AuthPrivate.pem");
const authPublicKeyPath = path.join(__dirname, "src/keys/AuthPublic.pem");

const authPrivateKey = fs.readFileSync(authPrivateKeyPath, "utf8");
const authPublicKey = fs.readFileSync(authPublicKeyPath, "utf8");

const refreshPrivateKeyPath = path.join(__dirname, "src/keys/RefreshPrivate.pem");
const refreshPublicKeyPath = path.join(__dirname, "src/keys/RefreshPublic.pem");

const refreshPrivateKey = fs.readFileSync(refreshPrivateKeyPath, "utf8");
const refreshPublicKey = fs.readFileSync(refreshPublicKeyPath, "utf8");

const resetPrivateKeyPath = path.join(__dirname, "src/keys/ResetPrivate.pem");
const resetPublicKeyPath = path.join(__dirname, "src/keys/ResetPublic.pem");

const resetPrivateKey = fs.readFileSync(resetPrivateKeyPath, "utf8");
const resetPublicKey = fs.readFileSync(resetPublicKeyPath, "utf8");


export { adminAuthPrivateKey, adminAuthPublicKey, adminRefreshPrivateKey, adminRefreshPublicKey, authPrivateKey, authPublicKey, refreshPrivateKey, refreshPublicKey, resetPrivateKey, resetPublicKey };