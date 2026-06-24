import bcrypt from 'bcryptjs';
import { getAuth } from '../config/firebase.js';
import { signToken } from '../utils/jwt.js';
import { getById, create, createWithId, queryWhere } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

const DEMO_USERS = {
  'admin@viaduc.com': { password: 'admin123', role: 'admin', name: 'Admin Owner', warehouseId: null },
  'seller@viaduc.com': { password: 'seller123', role: 'seller', name: 'Stock Worker', warehouseId: 'wh_secondary_1' },
};

async function ensureDemoUsers() {
  for (const [email, info] of Object.entries(DEMO_USERS)) {
    const existing = await queryWhere('users', 'email', email);
    if (existing.length === 0) {
      await create('users', {
        email,
        name: info.name,
        role: info.role,
        warehouseId: info.warehouseId,
        disabled: false,
      });
    }
  }
}

export const login = asyncHandler(async (req, res) => {
  const { email, password, idToken } = req.body;

  await ensureDemoUsers();

  let uid;
  let userEmail = email;

  const auth = getAuth();
  if (idToken && auth) {
    const decoded = await auth.verifyIdToken(idToken);
    uid = decoded.uid;
    userEmail = decoded.email;
  } else if (email && password) {
    const lower = email.toLowerCase();
    const demo = DEMO_USERS[lower];
    if (demo) {
      if (demo.password !== password) {
        throw new AppError('Invalid email or password', 401);
      }
      const users = await queryWhere('users', 'email', lower);
      uid = users[0]?.id;
      if (!uid) throw new AppError('User profile not found', 401);
    } else {
      const users = await queryWhere('users', 'email', lower);
      const account = users[0];
      if (!account || !account.password) {
        throw new AppError('Invalid email or password', 401);
      }
      if (account.disabled) {
        throw new AppError('Account is disabled', 403);
      }
      const match = await bcrypt.compare(password, account.password);
      if (!match) {
        throw new AppError('Invalid email or password', 401);
      }
      uid = account.id;
    }
  } else {
    throw new AppError('Credentials required', 400);
  }

  let user = await getById('users', uid);
  if (!user && userEmail) {
    const users = await queryWhere('users', 'email', userEmail.toLowerCase());
    user = users[0];
    uid = user?.id;
  }
  if (!user) throw new AppError('User not found', 404);

  const token = signToken({ uid, role: user.role, email: user.email });
  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      warehouseId: user.warehouseId,
    },
  });
});

export const getMe = asyncHandler(async (req, res) => {
  const user = await getById('users', req.user.uid);
  if (!user) throw new AppError('User not found', 404);
  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    warehouseId: user.warehouseId,
  });
});

export const register = asyncHandler(async (req, res) => {
  const { email, password, name, role, warehouseId } = req.body;
  const existing = await queryWhere('users', 'email', email.toLowerCase());
  if (existing.length > 0) throw new AppError('Email already registered', 409);

  const auth = getAuth();
  let uid;
  if (auth) {
    const record = await auth.createUser({ email, password, displayName: name });
    uid = record.uid;
  } else {
    uid = `user_${Date.now()}`;
  }

  const user = await createWithId('users', uid, {
    email: email.toLowerCase(),
    name,
    role: role || 'seller',
    warehouseId: warehouseId || null,
    disabled: false,
  });

  res.status(201).json({ id: uid, email: user.email, name: user.name, role: user.role });
});

export const logout = asyncHandler(async (_req, res) => {
  res.json({ message: 'Logged out successfully' });
});
