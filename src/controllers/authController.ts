import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { findUserByEmail, findUserById, createUser } from "../models/authModel";
import { getPrimaryOrganization } from "../models/organizationModel";
import { sendSuccess, sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";
import { AuthRequest } from "../middlewares/authentication";
import { env } from "../config/env.config";

export async function login(req: Request, res: Response) {
  try {
    const usernameOrEmail = req.body.username || req.body.email;
    const { password } = req.body;

    if (!usernameOrEmail || !password) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Username and password are required",
      );
    }

    const user = await findUserByEmail(usernameOrEmail);
    if (!user) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid username or password",
      );
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Invalid username or password",
      );
    }

    if (user.status && user.status.toLowerCase() === "inactive") {
      return sendError(
        res,
        HTTP_STATUS.UNAUTHORIZED,
        "Your account is inactive. Please contact the administrator.",
      );
    }

    const userRoleCode = user.userRoleCode;
    const secret = env.JWT.SECRET;
    const token = jwt.sign(
      { id: user.id, email: user.email, userRoleCode },
      secret,
      { expiresIn: "1h" },
    );

    console.log("LOGIN: User found and password matched");
console.log("LOGIN: JWT token generated:", Boolean(token));
console.log("LOGIN: Organization lookup starting");

    const organization = await getPrimaryOrganization();

    return sendSuccess(res, HTTP_STATUS.OK, "", {
      token,
      user: {
        id: user.id,
        name: user.name,
        mobileNo: user.phone,
        imageUrl: user.imageUrl || "",
        userRoleCode,
      },
      organization,
      allowedAppModules: [
        "Dashboard",
        "Masters",
        "Transactions",
        "Reports",
        "Users",
        "Settings",
      ],
      allowedAppActivities: [
        "Dashboard.View",
        "Masters.View",
        "Transactions.View",
        "Reports.View",
        "Users.View",
        "Settings.View",
      ],
    });
  } catch (error: any) {
    console.error("LOGIN ERROR:", error);

    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Server error during authentication",
      error.message,
    );
  }
}

export async function register(req: Request, res: Response) {
  try {
    const { name, username, email, password, phone, userRoleCode } = req.body;

    if (!name || !email || !password) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Name, email, and password are required",
      );
    }

    const existing = await findUserByEmail(email);
    if (existing) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "User with this email already exists",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userId = await createUser({
      name,
      username,
      email,
      passwordHash: hashedPassword,
      phone,
      userRoleCode,
    });

    return sendSuccess(
      res,
      HTTP_STATUS.CREATED,
      "User registered successfully",
      { userId },
    );
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Server error during registration",
      error.message,
    );
  }
}

export async function getProfile(req: Request, res: Response) {
  try {
    const authReq = req as AuthRequest;
    if (!authReq.user?.id) {
      return sendError(res, HTTP_STATUS.UNAUTHORIZED, "Unauthorized");
    }

    const user = await findUserById(authReq.user.id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "User profile not found");
    }

    const organization = await getPrimaryOrganization();

    return sendSuccess(
      res,
      HTTP_STATUS.OK,
      "User profile fetched successfully",
      {
        user,
        organization,
      },
    );
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Error fetching user profile",
      error.message,
    );
  }
}
