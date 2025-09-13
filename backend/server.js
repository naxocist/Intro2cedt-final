import "dotenv/config";
import path from "path"
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

import MALRoute from "./src/routes/MALRoute.js"

import express from "express"
const app = express();

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend/")));

app.use("/api/mal", MALRoute);

const PORT = 3221;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Website ready at http://localhost:${PORT}`);
});

