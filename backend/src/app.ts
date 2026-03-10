import "dotenv/config";

import cors from "cors";
import express, { type NextFunction, type Request, type Response } from "express";
import helmet from "helmet";
import { ZodError } from "zod";

import {
  createDeposit,
  createTrade,
  createWithdrawal,
  getBridgeRoutes,
  getMarkets,
  getOverview,
  getSystemFlows,
  getUserDashboard,
  listUsers,
} from "./gateway";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get("/api/status", (_req, res) => {
    res.json({
      status: "ok",
      service: "stacks-dydx-trading-gateway",
      timestamp: new Date().toISOString(),
    });
  });

  app.get("/api/overview", (_req, res) => {
    res.json(getOverview());
  });

  app.get("/api/users", (_req, res) => {
    res.json({ users: listUsers() });
  });

  app.get("/api/users/:userId/dashboard", (req, res) => {
    res.json(getUserDashboard(req.params.userId));
  });

  app.get("/api/markets", (_req, res) => {
    res.json({ markets: getMarkets() });
  });

  app.get("/api/system/flows", (_req, res) => {
    res.json({ flows: getSystemFlows() });
  });

  app.get("/api/bridge/routes", (_req, res) => {
    res.json(getBridgeRoutes());
  });

  app.post("/api/deposits", (req, res) => {
    const result = createDeposit(req.body);
    res.status(201).json(result);
  });

  app.post("/api/trades", (req, res) => {
    const result = createTrade(req.body);
    res.status(201).json(result);
  });

  app.post("/api/withdrawals", (req, res) => {
    const result = createWithdrawal(req.body);
    res.status(201).json(result);
  });

  app.use((error: Error, _req: Request, res: Response, _next: NextFunction) => {
    if (error instanceof ZodError) {
      res.status(400).json({
        error: "validation_error",
        details: error.flatten(),
      });
      return;
    }

    res.status(400).json({
      error: "request_failed",
      message: error.message,
    });
  });

  return app;
}
