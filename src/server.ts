import 'dotenv/config';
import { AppDataSource } from './config/database';
import { createApp } from './app';

const PORT = process.env.PORT || 3000;

async function startServer() {
  try {
    await AppDataSource.initialize();
    console.log('Database connection established');

    const app = createApp();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
