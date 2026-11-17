import dotenv from 'dotenv';
import fs from 'node:fs';
import path from 'node:path';

dotenv.config();

const envLocalPath = path.resolve(process.cwd(), '.env.local');
if (fs.existsSync(envLocalPath)) {
  dotenv.config({ path: envLocalPath, override: false });
}
