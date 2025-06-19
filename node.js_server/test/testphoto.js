const axios = require("axios");

async function triggerPhoto() {
  try {
    const response = await axios.post("http://localhost:5000/trigger_photo");
    console.log("📤 Trigger sent! Server responded:", response.data);
  } catch (error) {
    console.error("❌ Failed to send trigger:", error.message);
  }
}

module.exports = { triggerPhoto };
