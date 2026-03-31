const HeartRate = require('../models/HeartRate');
const BloodPressure = require('../models/BloodPressure');
const Weight = require('../models/Weight');
const BodyTemperature = require('../models/BodyTemperature');
const OxygenSaturation = require('../models/OxygenSaturation');
const Steps = require('../models/Steps');
const SleepSession = require('../models/SleepSession');
const FitbitSkinTemperature = require('../models/SkinTemperature');
const FitbitBreathingRate = require('../models/BreathingRate');
const FitBitHeight = require('../models/Height');
const Height = require('../models/Height');

async function saveHealthMetrics(userId, data, fitbitMetrics) {
  console.log("Fitbit metrics are:");
  console.log(fitbitMetrics);
  const insertIfNew = async (model, condition, doc) => {
    await model.updateOne(condition, { $setOnInsert: doc }, { upsert: true });
  };

  // HeartRate
  if (Array.isArray(data.HeartRate)) {
  for (const entry of data.HeartRate) {
    if (Array.isArray(entry.samples)) {   //only loop if samples is a real array
      for (const sample of entry.samples) {
        console.log(`HeartBeat is: `+sample.beatsPerMinute);
        await insertIfNew(
          HeartRate,
          { userId, timestamp: new Date(sample.time) },
          { userId, value: sample.beatsPerMinute, timestamp: new Date(sample.time) }
        );
      }
    } else {
      console.warn("Skipping HeartRate entry without samples:", entry);
    }
  }
}

  // BloodPressure
  // if (Array.isArray(data.BloodPressure)) {
  //   for (const entry of data.BloodPressure) {
  //     await insertIfNew(
  //       BloodPressure,
  //       { userId, timestamp: new Date(entry.time) },
  //       {
  //         userId,
  //         systolic: entry.systolic.inMillimetersOfMercury,
  //         diastolic: entry.diastolic.inMillimetersOfMercury,
  //         timestamp: new Date(entry.time),
  //       }
  //     );
  //   }
  // }

  // Weight
  if (Array.isArray(data.Weight)) {
    for (const entry of data.Weight) {
      console.log(`Weight is: `+entry.weight.inKilograms);
      await insertIfNew(
        Weight,
        { userId, timestamp: new Date() },
        {
          userId,
          value: entry.weight.inKilograms,
          timestamp: new Date(),
        }
      );
    }
  }

  // BodyTemperature
  if (Array.isArray(data.BodyTemperature)) {
    for (const entry of data.BodyTemperature) {
      console.log(`Body Temperature is: `+entry.temperature.inCelsius);
      await insertIfNew(
        BodyTemperature,
        { userId, timestamp: new Date(entry.time) },
        {
          userId,
          value: entry.temperature.inCelsius,
          timestamp: new Date(entry.time),
        }
      );
    }
  }

  // OxygenSaturation
  // if (Array.isArray(data.OxygenSaturation)) {
  //   for (const entry of data.OxygenSaturation) {
  //     await insertIfNew(
  //       OxygenSaturation,
  //       { userId, timestamp: new Date(entry.time) },
  //       {
  //         userId,
  //         value: entry.percentage,
  //         timestamp: new Date(entry.time),
  //       }
  //     );
  //   }
  // }

      // Save Steps
    // if (Array.isArray(data.Steps)) {
    //   for (const record of data.Steps) {
    //     const startTime = new Date(record.startTime);
    //     const endTime = new Date(record.endTime);
    //     await Steps.updateOne(
    //       { userId, startTime, endTime },
    //       {
    //         $setOnInsert: {
    //           userId,
    //           count: record.count,
    //           startTime,
    //           endTime
    //         }
    //       },
    //       { upsert: true }
    //     );
    //   }
    // }

    // Save SleepSession
    // if (Array.isArray(data.SleepSession)) {
    //   for (const record of data.SleepSession) {
    //     const startTime = new Date(record.startTime);
    //     const endTime = new Date(record.endTime);
    //     const durationInMs = endTime - startTime;
    //     const durationInHours = +(durationInMs / (1000 * 60 * 60)).toFixed(2); // Round to 2 decimal places

    //     await SleepSession.updateOne(
    //       { userId, startTime, endTime },
    //       {
    //         $setOnInsert: {
    //           userId,
    //           startTime,
    //           endTime,
    //           durationInHours,
    //         },
    //       },
    //       { upsert: true }
    //     );
    //   }
    // }

    // --- Fitbit Metrics ---
  if (fitbitMetrics) {
    const timestamp = new Date(); // Save current time as timestamp

    if (fitbitMetrics.skinTemperature !== null) {
      await insertIfNew(
        FitbitSkinTemperature,
        { userId, timestamp },
        { userId, value: fitbitMetrics.skinTemperature, timestamp }
      );
    }

    if (fitbitMetrics.breathingRate !== null) {
      await insertIfNew(
        FitbitBreathingRate,
        { userId, timestamp },
        { userId, value: fitbitMetrics.breathingRate, timestamp }
      );
    }

    if (fitbitMetrics.oxygenSaturation !== null) {
      await insertIfNew(
        OxygenSaturation,
        { userId, timestamp },
        { userId, value: fitbitMetrics.oxygenSaturation, timestamp }
      );
    }

    if (fitbitMetrics.height !== null) {
      await insertIfNew(
        Height,
        { userId, timestamp },
        { userId, value: fitbitMetrics.height, timestamp }
      );
    }
  }
}

module.exports = saveHealthMetrics;
