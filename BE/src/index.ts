import dotenv from "dotenv";
dotenv.config();
import express from "express";
import morgan from "morgan";
import helmet from "helmet";
import compression from "compression";
import router from "./routers/index.ts";
import { ApiError } from "./utils/apiError.ts";
import type { NextFunction, Request, Response } from "express";
//init middleware
const app = express();
app.use(morgan("dev"));
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

//init db
const db = await import("./dbs/init.db.ts");


//init route
app.use("", router);

// handling error
app.use((req: Request, res: Response) => {
  return res.status(404).json({ code: "NOT_FOUND", message: "Không tìm thấy route." });
});

app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({ code: err.code, message: err.message, details: err.details });
  }
  console.error(err);
  return res.status(500).json({ code: "INTERNAL_ERROR", message: "Lỗi hệ thống." });
});

export default app;