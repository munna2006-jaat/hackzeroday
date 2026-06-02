import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

const SALT_ROUNDS = 12;

export function signToken(user) {
  return jwt.sign(
    {
      email: user.email,
      role: user.role,
      sub: user.id
    },
    env.jwtSecret,
    { expiresIn: "7d" }
  );
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret);
}

export function hashSecret(value) {
  return bcrypt.hash(value, SALT_ROUNDS);
}

export function compareSecret(value, hash) {
  return bcrypt.compare(value, hash);
}
