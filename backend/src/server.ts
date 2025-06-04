import https from 'https';
import fs from 'fs';
import path from 'path';
import app from './app';

const port = process.env.PORT || 3001;

const sslOptions = {
  key: fs.readFileSync(path.join(__dirname, '../../certificates/localhost-key.pem')),
  cert: fs.readFileSync(path.join(__dirname, '../../certificates/localhost.pem'))
};

const server = https.createServer(sslOptions, app);

server.listen(port, () => {
  console.log(`Server running at https://localhost:${port}`);
}); 