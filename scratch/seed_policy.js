const axios = require('axios');

async function seedPolicy() {
  const projectId = 'booking-service-1c217';
  const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/config/booking_policy`;

  const payload = {
    fields: {
      active_policy_version: { stringValue: "1.0-ec" },
      weight_adult: { doubleValue: 1.0 },
      weight_child_infant_age_max: { integerValue: "2" },
      weight_child_infant_factor: { doubleValue: 0 },
      weight_child_minor_age_max: { integerValue: "11" },
      weight_child_minor_factor: { doubleValue: 0.5 },
      weight_single_occupancy: { doubleValue: 1.0 },
      levy_cons_pppn_zar: { integerValue: "210" },
      hero_guarantee_multiplier: { doubleValue: 0.95 }
    }
  };

  try {
    const res = await axios.patch(updateUrl, payload);
    console.log("✅ Successfully seeded booking_policy:", res.data.name);
  } catch (err) {
    console.error("❌ Error seeding:", err.response ? err.response.data : err.message);
  }
}

seedPolicy();
