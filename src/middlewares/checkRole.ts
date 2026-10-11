import { Response, NextFunction } from "express";
import { AuthRequest } from "./authentication";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export function checkRole(...allowedRoles: string[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.userRoleCode)) {
      return sendError(res, HTTP_STATUS.FORBIDDEN, "Access Denied");
    }
    next();
  };
}
