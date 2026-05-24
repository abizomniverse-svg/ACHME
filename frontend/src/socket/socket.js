import { io } from "socket.io-client";
import { API } from "../config/api";

const socketUrl = API;

const socket = io(socketUrl, {
  transports: ["websocket"],
  reconnection: true
});

// Connect to notifications namespace
const notificationSocket = io(`${socketUrl}/notifications`, {
  transports: ["websocket"],
  reconnection: true
});

// On connection, join appropriate rooms based on user role
notificationSocket.on("connect", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  if (token && user.id) {
    notificationSocket.emit("join", { userId: user.id, role: user.role });
    notificationSocket.emit("join_notifications", user.id);
    
    if (user.role === "admin" || user.role === "subadmin") {
      notificationSocket.emit("join_admin");
    }
  }
});

// Listen for reconnection
notificationSocket.on("reconnect", () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");
  
  if (token && user.id) {
    notificationSocket.emit("join", { userId: user.id, role: user.role });
    notificationSocket.emit("join_notifications", user.id);
    
    if (user.role === "admin" || user.role === "subadmin") {
      notificationSocket.emit("join_admin");
    }
  }
});

export { socket, notificationSocket };
export default socket;
