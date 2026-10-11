import { Request, Response } from "express";
import {
  getUsersList,
  getUserById,
  checkDuplicateUserIdentifier,
  checkUserInUse,
  createUser,
  updateUser,
  deleteUser,
} from "../models/userModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getUsersListHandler(req: Request, res: Response) {
  try {
    const keyword = req.query.keyword as string;
    const userRoleCode = req.query.userRoleCode as string;

    const users = await getUsersList(keyword, userRoleCode);
    return res.status(HTTP_STATUS.OK).json({ users });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch users",
      error.message,
    );
  }
}

export async function getUserDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid User ID");
    }

    const user = await getUserById(id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    return res.status(HTTP_STATUS.OK).json({ user });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch user detail",
      error.message,
    );
  }
}

export async function createNewUserHandler(req: Request, res: Response) {
  try {
    const { name, email, phone, userRoleCode, password, status } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Full Name is required");
    }

    if (!email || !email.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Email / Username is required",
      );
    }

    if (!password || !password.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Password is required");
    }

    if (!userRoleCode || !userRoleCode.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "User Role is required");
    }

    const trimmedIdentifier = email.trim();

    const isDuplicate = await checkDuplicateUserIdentifier(trimmedIdentifier);
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `User "${trimmedIdentifier}" already exists`,
      );
    }

    const userId = await createUser({
      name: name.trim(),
      email: trimmedIdentifier,
      phone: phone ? phone.trim() : null,
      userRoleCode: userRoleCode.trim(),
      password: password.trim(),
      status: status ? status.trim() : "Active",
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "User Added Successfully",
      id: userId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create user",
      error.message,
    );
  }
}

export async function editUserHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid User ID");
    }

    const { name, email, phone, userRoleCode, password, status } = req.body;

    if (!name || !name.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Full Name is required");
    }

    if (!email || !email.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Email / Username is required",
      );
    }

    if (!userRoleCode || !userRoleCode.trim()) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "User Role is required");
    }

    if (
      userRoleCode.trim() === "ADMIN" &&
      status &&
      status.trim().toLowerCase() === "inactive"
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Administrator account cannot be made Inactive",
      );
    }

    const trimmedIdentifier = email.trim();

    const isDuplicate = await checkDuplicateUserIdentifier(
      trimmedIdentifier,
      id,
    );
    if (isDuplicate) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `User "${trimmedIdentifier}" already exists`,
      );
    }

    const success = await updateUser(id, {
      name: name.trim(),
      email: trimmedIdentifier,
      phone: phone ? phone.trim() : null,
      userRoleCode: userRoleCode.trim(),
      password: password && password.trim() ? password.trim() : undefined,
      status: status ? status.trim() : "Active",
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "User not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "User Updated Successfully",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update user",
      error.message,
    );
  }
}

export async function removeUserHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid User ID");
    }

    const user = await getUserById(id);
    if (!user) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    if (user.userRoleCode === "ADMIN") {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Administrator account cannot be deleted",
      );
    }

    const usageCheck = await checkUserInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This user is currently in use and cannot be deleted",
      );
    }

    const success = await deleteUser(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "User not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "User Deleted Successfully",
    });
  } catch (error: any) {
    if (
      error &&
      (error.code === "ER_ROW_IS_REFERENCED" ||
        error.code === "ER_ROW_IS_REFERENCED_2" ||
        error.errno === 1451)
    ) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This user is currently in use and cannot be deleted",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete user",
      error.message,
    );
  }
}
