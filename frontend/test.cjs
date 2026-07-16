const io = require("socket.io-client");
const socket = io("http://localhost:1093");
socket.on("connect", () => {
  console.log("Connected");
  socket.emit("REGISTER_DEVICE", { deviceId: "test-123", name: "Test" });
});
socket.on("DEVICE_STATUS", (data) => {
  console.log("DEVICE_STATUS:", data);
  process.exit(0);
});
setTimeout(() => {
  console.log("Timeout");
  process.exit(1);
}, 3000);
