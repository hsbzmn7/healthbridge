const express = require('express');
const router = express.Router();
const UserProfile = require('../models/UserProfile');

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
    res.json(profile);
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
    gender,
    height,
    weight,
    baseline_heart_rate,
    baseline_bp_systolic,
    baseline_bp_diastolic,
    baseline_spo2,
    medical_history,
    medications,
  } = req.body;

  try {
    let profile = await UserProfile.findOne({ userId: user.uid });

    const updateData = {
      updatedAt: new Date(),
      ...(displayName !== undefined && { displayName }),
      ...(age !== undefined && { age: age === '' ? null : Number(age) }),
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

    res.json(profile);
  } catch (err) {
    console.error('Profile update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

module.exports = router;
