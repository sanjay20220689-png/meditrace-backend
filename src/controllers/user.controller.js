const { admin, db } = require('../config/firebase');
const { logAudit } = require('../utils/auditLogger');

// ── Register a new user (Owner only) ─────────────────────────────────────────
const createUser = async (req, res) => {
  const { email, password, username, role } = req.body;
  const validRoles = ['owner', 'pharmacist', 'assistant'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role. Must be owner, pharmacist, or assistant' });
  }

  try {
    const userRecord = await admin.auth().createUser({ email, password });

    await db.collection('users').doc(userRecord.uid).set({
      userId: userRecord.uid,
      username,
      email,
      role,
      active: true,
      createdAt: new Date().toISOString(),
    });

    await logAudit(req.user.uid, 'CREATE', 'user', userRecord.uid, `Created user ${username} with role ${role}`);

    return res.status(201).json({ message: 'User created', userId: userRecord.uid });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── Get all users (Owner only) ────────────────────────────────────────────────
const getUsers = async (req, res) => {
  try {
    const snapshot = await db.collection('users').get();
    const users = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        uid:       data.userId,
        userId:    data.userId,
        email:     data.email,
        username:  data.username,
        role:      data.role,
        active:    data.active,
        disabled:  !data.active,
        createdAt: data.createdAt,
      };
    });
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── Change a user's role (Owner only) ─────────────────────────────────────────
const changeRole = async (req, res) => {
  const { userId } = req.params;
  const { role } = req.body;
  const validRoles = ['owner', 'pharmacist', 'assistant'];

  if (!validRoles.includes(role)) {
    return res.status(400).json({ error: 'Invalid role' });
  }

  try {
    await db.collection('users').doc(userId).update({ role });
    await logAudit(req.user.uid, 'UPDATE', 'user', userId, `Changed role to ${role}`);
    return res.json({ message: 'Role updated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── Deactivate user (Owner only) ──────────────────────────────────────────────
const deactivateUser = async (req, res) => {
  const { userId } = req.params;
  try {
    await db.collection('users').doc(userId).update({ active: false });
    await admin.auth().updateUser(userId, { disabled: true });
    await logAudit(req.user.uid, 'DEACTIVATE', 'user', userId, 'User deactivated');
    return res.json({ message: 'User deactivated' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── Update user — role, password, and/or username (Owner only) ────────────────
const updateUser = async (req, res) => {
  const { uid } = req.params;
  const { role, password, username } = req.body;
  const validRoles = ['owner', 'pharmacist', 'assistant'];

  try {
    // Update Firebase Auth password if provided
    if (password) {
      if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
      }
      await admin.auth().updateUser(uid, { password });
    }

    // Build Firestore update object — only include fields that were sent
    const firestoreUpdate = {};
    if (role) {
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role.' });
      }
      firestoreUpdate.role = role;
    }
    if (username && username.trim()) {
      firestoreUpdate.username = username.trim();
    }

    if (Object.keys(firestoreUpdate).length > 0) {
      await db.collection('users').doc(uid).update(firestoreUpdate);
    }

    const auditDetails = [
      role     ? `role: ${role}`            : null,
      username ? `username: ${username}`    : null,
      password ? `password reset`           : null,
    ].filter(Boolean).join(', ');

    await logAudit(req.user.uid, 'UPDATE', 'user', uid, `Updated user — ${auditDetails}`);

    return res.json({ message: 'User updated.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── Delete user permanently (Owner only) ──────────────────────────────────────
const deleteUser = async (req, res) => {
  const { uid } = req.params;

  if (uid === req.user.uid) {
    return res.status(400).json({ error: 'You cannot delete your own account.' });
  }

  try {
    await admin.auth().deleteUser(uid);
    await db.collection('users').doc(uid).delete();
    await logAudit(req.user.uid, 'DELETE', 'user', uid, 'User permanently deleted');
    return res.json({ message: 'User deleted.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

// ── Change own password (Any authenticated user) ──────────────────────────────
const changeOwnPassword = async (req, res) => {
  const { password } = req.body;

  if (!password || password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters.' });
  }

  try {
    await admin.auth().updateUser(req.user.uid, { password });
    await logAudit(req.user.uid, 'UPDATE', 'user', req.user.uid, 'Changed own password');
    return res.json({ message: 'Password updated.' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};

module.exports = {
  createUser,
  getUsers,
  changeRole,
  deactivateUser,
  updateUser,
  deleteUser,
  changeOwnPassword,
};