import { Request } from "express";

export interface AuthRequest<P = {}, ResBody = any, ReqBody = any>
  extends Request<P, ResBody, ReqBody> {
  userId?: string;
}
