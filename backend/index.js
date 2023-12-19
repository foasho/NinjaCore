import dotenv from 'dotenv';
import express from 'express';
import { SkywayTokenApi, NpcApi } from "@ninjagl/api";

dotenv.config();

const app = express();
const port = 5174;

app.get('/api/skyway/token', async (req, res) => {
  const response = await SkywayTokenApi();
  res.send(response);
});

app.post('/api/npc/conversations', async (req, res) => {
  const { conversations } = req.body;
  const response = await NpcApi(conversations);
  res.send(response.data);
});

app.listen(port, () => {
  console.log(`Backend listening at http://localhost:${port}`);
});