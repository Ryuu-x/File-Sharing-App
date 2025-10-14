import express from "express";
import router from "./routes/route.js";
import cors from "cors";
import DBConnection from "./database/db.js";
import dotenv from "dotenv";

const app = express();
const port = process.env.PORT || 8000;

dotenv.config();

app.use(
  cors({
    origin: [process.env.cors],
    exposedHeaders: ["Retry-After", "RateLimit-Limit", "RateLimit-Remaining"],
  })
);
app.use("/", router);

DBConnection();

app.listen(port, () => console.log(`Listening on ${port}`));
