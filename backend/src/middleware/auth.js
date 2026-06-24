import { verifyToken } from '../utils/jwt.js';
import { getById } from '../services/firestore.service.js';
import { AppError } from '../utils/errors.js';

export async function authenticate(req, res, next) {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new AppError('Authentication required', 401);
    }
    const token = header.split(' ')[1];
    const decoded = verifyToken(token);
    const user = await getById('users', decoded.uid);
    if (!user || user.disabled) {
      throw new AppError('User not found or disabled', 401);
    }
    req.user = { uid: decoded.uid, role: user.role, ...user };
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new AppError('Invalid or expired token', 401));
    }
    next(err);
  }
}

export function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) return next(new AppError('Authentication required', 401));
    if (!roles.includes(req.user.role)) {
      return next(new AppError('Insufficient permissions', 403));
    }
    next();
  };
}
