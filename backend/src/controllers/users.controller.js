import bcrypt from 'bcryptjs';
import { getAuth } from '../config/firebase.js';
import { getAll, getById, create, createWithId, update, remove, queryWhere } from '../services/firestore.service.js';
import { AppError, asyncHandler } from '../utils/errors.js';

export const listUsers = asyncHandler(async (_req, res) => {
  const users = await getAll('users');
  res.json(users.map(({ password, ...u }) => u));
});

export const getUser = asyncHandler(async (req, res) => {
  const user = await getById('users', req.params.id);
  if (!user) throw new AppError('User not found', 404);
  const { password, ...safe } = user;
  res.json(safe);
});

export const updateUser = asyncHandler(async (req, res) => {
  const { name, role, warehouseId, disabled } = req.body;
  const user = await update('users', req.params.id, { name, role, warehouseId, disabled });
  res.json(user);
});

export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (id === req.user.uid) {
    throw new AppError('You cannot remove your own account', 400);
  }

  const user = await getById('users', id);
  if (!user) throw new AppError('User not found', 404);

  // Remove Firebase Auth account when it exists (same uid as Firestore doc).
  const auth = getAuth();
  if (auth) {
    try {
      await auth.deleteUser(id);
    } catch (err) {
      if (err.code !== 'auth/user-not-found') {
        throw new AppError(`Failed to remove auth account: ${err.message}`, 500);
      }
    }
  }

  // Remove Firestore user document.
  await remove('users', id);

  res.json({ message: 'User deleted from database' });
});

export const createUser = asyncHandler(async (req, res) => {
  const { email, name, role, warehouseId, password } = req.body;
  if (!email || !password) throw new AppError('Email and password are required', 400);
  if (String(password).length < 6) throw new AppError('Password must be at least 6 characters', 400);
  const existing = await queryWhere('users', 'email', email.toLowerCase());
  if (existing.length) throw new AppError('Email exists', 409);

  const passwordHash = await bcrypt.hash(String(password), 10);
  const payload = {
    email: email.toLowerCase(),
    name,
    role: role || 'seller',
    warehouseId: warehouseId || null,
    disabled: false,
    password: passwordHash,
  };

  // Create in Firebase Auth + Firestore (same uid). Keep Firestore bcrypt for app login.
  const auth = getAuth();
  if (auth) {
    try {
      const record = await auth.createUser({
        email: payload.email,
        password: String(password),
        displayName: name,
      });
      const user = await createWithId('users', record.uid, payload);
      const { password: _pw, ...safe } = user;
      return res.status(201).json(safe);
    } catch (err) {
      if (err.code === 'auth/email-already-exists') {
        throw new AppError('Email already registered in Firebase Auth', 409);
      }
      console.warn('[Viaduc] Firebase Auth createUser failed, using Firestore only:', err.message);
    }
  }

  const user = await create('users', payload);
  const { password: _pw, ...safe } = user;
  res.status(201).json(safe);
});
