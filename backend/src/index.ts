import dotenv from 'dotenv';
import { createApp } from './app';

dotenv.config();

const port = Number.parseInt(process.env.PORT ?? '3010', 10);

const app = createApp();

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Server is running at http://localhost:${port}`);
});
