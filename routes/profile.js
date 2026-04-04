const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');
const { validateDobString, enrichProfileResponse } = require('../utils/ageFromDob');

const ALLOWED_AVATAR_IDS = new Set(['0', '1', '2', '3', '4', '5', '6', '7']);

// Get or create user profile
router.get('/', async (req, res) => {
  const { user } = req;
  if (!user?.uid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    let profile = await UserProfile.findOne({ userId: user.uid });
    if (!profile) {
      profile = await UserProfile.create({
        userId: user.uid,
        email: user.email || req.query.email,
        displayName: user.name || req.query.displayName,
      });
    }
    res.json(enrichProfileResponse(profile));
  } catch (err) {
    console.error('Profile fetch error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// Create or update user profile (used during signup/onboarding)
router.put('/', async (req, res) => {
  const { user } = req;
  if (!user?.uid) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const {
    displayName,
    age,
    dateOfBirth,
    gender,
    height,
    weight,
    baseline_heart_rate,
    baseline_bp_systolic,
    baseline_bp_diastolic,
    baseline_spo2,
    medical_history,
    medications,
    avatarId,
  } = req.body;

  try {
    let profile = await UserProfile.findOne({ userId: user.uid });

    const updateData = {
      updatedAt: new Date(),
      ...(displayName !== undefined && { displayName }),
      ...(gender !== undefined && { gender: gender === '' ? null : gender }),
      ...(height !== undefined && { height: height === '' ? null : Number(height) }),
      ...(weight !== undefined && { weight: weight === '' ? null : Number(weight) }),
      ...(baseline_heart_rate !== undefined && { baseline_heart_rate: baseline_heart_rate === '' ? null : Number(baseline_heart_rate) }),
      ...(baseline_bp_systolic !== undefined && { baseline_bp_systolic: baseline_bp_systolic === '' ? null : Number(baseline_bp_systolic) }),
      ...(baseline_bp_diastolic !== undefined && { baseline_bp_diastolic: baseline_bp_diastolic === '' ? null : Number(baseline_bp_diastolic) }),
      ...(baseline_spo2 !== undefined && { baseline_spo2: baseline_spo2 === '' ? null : Number(baseline_spo2) }),
      ...(medical_history !== undefined && { medical_history: medical_history === '' ? null : medical_history }),
      ...(medications !== undefined && { medications: medications === '' ? null : medications }),
    };

    if (avatarId !== undefined) {
      if (avatarId === '' || avatarId === null) {
        updateData.avatarId = null;
      } else {
        const id = String(avatarId);
        if (!ALLOWED_AVATAR_IDS.has(id)) {
          return res.status(400).json({ error: 'Invalid avatarId' });
        }
        updateData.avatarId = id;
      }
    }

    if (dateOfBirth !== undefined) {
      const v = validateDobString(dateOfBirth);
      if (!v.ok) {
        return res.status(400).json({ error: v.error });
      }
      updateData.dateOfBirth = v.normalized;
      updateData.age = null;
    } else if (age !== undefined) {
      updateData.age = age === '' || age === null ? null : Number(age);
    }

    // Auto-calculate BMI when height and weight are provided
    if (updateData.height && updateData.weight) {
      const heightM = updateData.height / 100;
      updateData.bmi = Math.round((updateData.weight / (heightM * heightM)) * 10) / 10;
    } else if (profile) {
      const h = updateData.height ?? profile.height;
      const w = updateData.weight ?? profile.weight;
      if (h && w) {
        const heightM = h / 100;
        updateData.bmi = Math.round((w / (heightM * heightM)) * 10) / 10;
      }
    }

    if (!profile) {
      profile = await UserProfile.create({
        userId: user.uid,
        email: user.email,
        ...updateData,
      });
    } else {
      await UserProfile.updateOne({ userId: user.uid }, { $set: updateData });
      profile = await UserProfile.findOne({ userId: user.uid });
    }

    res.json(enrichProfileResponse(profile));
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
