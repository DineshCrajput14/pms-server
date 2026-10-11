import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import v1Routes from "./routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();

app.use(helmet());
app.disable("x-powered-by");
app.use(compression());
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  }),
);
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

app.get("/", (req, res) => {
  res
    .status(200)
    .json({ status: "success", message: "PMS Backend API is running" });
});

app.get("/health", (req, res) => {
  res.status(200).json({ status: "UP" });
});

app.use("/api/v1", v1Routes);
app.use(errorHandler);

export default app;
