import express from 'express'
import router from './routes/route.js';
import cors from "cors"
import DBConnection from './database/db.js';
import dotenv from "dotenv";

const app = express();
const PORT = 8000;

dotenv.config();

app.use(cors());
app.use('/', router); 

DBConnection();

app.listen(PORT, () => {
    console.log(`Server is running on ${PORT}`);
})
