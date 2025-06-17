import express, { Request, Response } from 'express';
import cors from 'cors';

const app = express();
app.use(cors({
  origin: 'http://localhost:4200',
  credentials: true
}));

app.get('/', (req: Request, res: Response) => {
  res.json({ message: 'Hello from Express BFF!' });
});

app.listen(3000, () => console.log('Express BFF running on port 3000'));
