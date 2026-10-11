import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";
import { env } from "../config/env.config";

export interface AuthRequest extends Request {
  user?: {
    id: number;
    email: string;
    userRoleCode: string;
  };
}

export function authenticate(
  req: Request & AuthRequest,
  res: Response,
  next: NextFunction,
) {
  const authHeader = req.get("authorization");
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return sendError(res, HTTP_STATUS.UNAUTHORIZED, "Access Denied");
  }

  try {
    const secret = env.JWT.SECRET;
    const decoded = jwt.verify(token, secret) as {
      id: number;
      email: string;
      userRoleCode: string;
    };
    req.user = {
      id: decoded.id,
      email: decoded.email,
      userRoleCode: decoded.userRoleCode,
    };
    next();
  } catch (err) {
    return sendError(res, HTTP_STATUS.FORBIDDEN, "Invalid or Expired Token");
  }
}
