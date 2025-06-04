import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create certificates directory if it doesn't exist
const certsDir = path.join(__dirname, '..', 'certificates');
if (!fs.existsSync(certsDir)) {
    fs.mkdirSync(certsDir);
}

// Generate a key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create a certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

// Add attributes
const attrs = [{
    name: 'commonName',
    value: 'localhost'
}, {
    name: 'countryName',
    value: 'IT'
}, {
    shortName: 'ST',
    value: 'Italy'
}, {
    name: 'localityName',
    value: 'localhost'
}, {
    name: 'organizationName',
    value: 'TestAutomator Dev'
}, {
    shortName: 'OU',
    value: 'Development'
}];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Set extensions
cert.setExtensions([{
    name: 'basicConstraints',
    cA: true
}, {
    name: 'keyUsage',
    keyCertSign: true,
    digitalSignature: true,
    nonRepudiation: true,
    keyEncipherment: true,
    dataEncipherment: true
}, {
    name: 'subjectAltName',
    altNames: [{
        type: 2, // DNS
        value: 'localhost'
    }, {
        type: 7, // IP
        ip: '127.0.0.1'
    }]
}]);

// Self-sign the certificate
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convert to PEM format
const certPem = forge.pki.certificateToPem(cert);
const privateKeyPem = forge.pki.privateKeyToPem(keys.privateKey);

// Write files
fs.writeFileSync(path.join(certsDir, 'localhost.pem'), certPem);
fs.writeFileSync(path.join(certsDir, 'localhost-key.pem'), privateKeyPem);

console.log('Certificates generated successfully in the certificates directory.'); 