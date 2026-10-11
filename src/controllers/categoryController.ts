import { Request, Response } from "express";
import {
  getCategoriesList,
  getCategoryById,
  checkDuplicateCategoryName,
  checkCategoryInUse,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../models/categoryModel";
import { sendError } from "../utils/apiResponse";
import { HTTP_STATUS } from "../config/constants";

export async function getCategoriesListHandler(req: Request, res: Response) {
  try {
    const categories = await getCategoriesList();
    return res.status(HTTP_STATUS.OK).json({ categories });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch categories",
      error.message,
    );
  }
}

export async function getCategoryDetailHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Category ID");
    }
    const category = await getCategoryById(id);
    if (!category) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Category not found");
    }
    return res.status(HTTP_STATUS.OK).json({ category });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to fetch category detail",
      error.message,
    );
  }
}

export async function createNewCategoryHandler(req: Request, res: Response) {
  try {
    const { name } = req.body;

    if (!name || !name.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Category Name is required",
      );
    }

    const trimmedName = name.trim();

    const isDuplicateName = await checkDuplicateCategoryName(trimmedName);
    if (isDuplicateName) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Category "${trimmedName}" already exists`,
      );
    }

    const categoryId = await createCategory({
      name: trimmedName,
    });

    return res.status(HTTP_STATUS.CREATED).json({
      message: "Category Added",
      id: categoryId,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to create category",
      error.message,
    );
  }
}

export async function editCategoryHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Category ID");
    }

    const { name } = req.body;

    if (!name || !name.trim()) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "Category Name is required",
      );
    }

    const trimmedName = name.trim();

    const isDuplicateName = await checkDuplicateCategoryName(trimmedName, id);
    if (isDuplicateName) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        `Category "${trimmedName}" already exists`,
      );
    }

    const success = await updateCategory(id, {
      name: trimmedName,
    });

    if (!success) {
      return sendError(
        res,
        HTTP_STATUS.NOT_FOUND,
        "Category not found or unchanged",
      );
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Category Updated",
      id,
    });
  } catch (error: any) {
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to update category",
      error.message,
    );
  }
}

export async function removeCategoryHandler(req: Request, res: Response) {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id)) {
      return sendError(res, HTTP_STATUS.BAD_REQUEST, "Invalid Category ID");
    }

    const usageCheck = await checkCategoryInUse(id);
    if (usageCheck.inUse) {
      return sendError(
        res,
        HTTP_STATUS.BAD_REQUEST,
        "This category is in use. Cannot be deleted.",
      );
    }

    const success = await deleteCategory(id);
    if (!success) {
      return sendError(res, HTTP_STATUS.NOT_FOUND, "Category not found");
    }

    return res.status(HTTP_STATUS.OK).json({
      message: "Category Deleted",
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
        "This category is in use. Cannot be deleted.",
      );
    }
    return sendError(
      res,
      HTTP_STATUS.INTERNAL_SERVER_ERROR,
      "Failed to delete category",
      error.message,
    );
  }
}
