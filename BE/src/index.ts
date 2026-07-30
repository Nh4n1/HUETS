import dotenv from "dotenv";
dotenv.config();
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";

//init middleware
const app = express();
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());

//init db
const db = await import("./dbs/init.db.ts");
const pool = db.default.getPool();

//init route
app.get("/", (req, res) => {
  res.send("Hello World");
});
pool.query('select * from provinces')
    .then((result: any) => console.log('Database connection result:', result))
    .catch((err: any) => console.error('Database connection error:', err));
//handle error




export default app;