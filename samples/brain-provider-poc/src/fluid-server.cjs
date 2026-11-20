const path = require('node:path');
const fs = require('node:fs');
// Override Tinylicious's /var/tmp defaults BEFORE loading the official server.
const root = path.resolve(__dirname, '..', '.runs', 'tinylicious');
fs.mkdirSync(root, { recursive: true });
process.env.storage = path.join(root, 'storage');
process.env.db__path = path.join(root, 'db');
process.env.db__inMemory = 'true';
process.env.PORT = process.env.BRAIN_FLUID_PORT || '17070';
require('tinylicious');
