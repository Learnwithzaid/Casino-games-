import { config } from 'dotenv';
import path from 'path';

config({ path: path.join(__dirname, '../../.env.test') });

jest.setTimeout(30000);
