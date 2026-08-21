import type { Request, Response } from "express";
import * as reviewService from "../services/locationReview.service.ts";
import { ApiError } from "../utils/apiError.ts";
import { asyncHandler } from "../utils/asyncHandler.ts";
import { sendSuccess } from "../utils/response.ts";

const param = (value: string | string[] | undefined) =>
  Array.isArray(value) ? (value[0] ?? "") : (value ?? "");

export const getLocationReviews = asyncHandler(
  async (req: Request, res: Response) => {
    const result = await reviewService.getLocationReviews(
      param(req.params.locationId),
      typeof req.query.page === "string" ? req.query.page : undefined,
      typeof req.query.pageSize === "string" ? req.query.pageSize : undefined,
    );
    return sendSuccess(res, 200, result.data, result.meta);
  },
);

export const getMyLocationReview = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Chưa đăng nhập.");
    return sendSuccess(
      res,
      200,
      await reviewService.getMyLocationReview(param(req.params.locationId), req.user.id),
    );
  },
);

export const saveLocationReview = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Chưa đăng nhập.");
    return sendSuccess(
      res,
      200,
      await reviewService.saveLocationReview(
        param(req.params.locationId),
        req.body,
        req.user.id,
      ),
    );
  },
);

export const deleteMyLocationReview = asyncHandler(
  async (req: Request, res: Response) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Chưa đăng nhập.");
    return sendSuccess(
      res,
      200,
      await reviewService.deleteMyLocationReview(param(req.params.locationId), req.user.id),
    );
  },
);
