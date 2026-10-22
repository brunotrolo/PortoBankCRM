import { randomUUID } from "crypto";

export const crypto = {
  randomUUID,
  randomBytes: (size: number) => require("crypto").randomBytes(size),
};
