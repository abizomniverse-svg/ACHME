import { io } from "socket.io-client";
import { API } from "../config/api";

const socketUrl = API || window.location.origin;
const socketOptions = {
  path: "/socket.io",
  transports: ["websocket", "polling"],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
};

const socket = io(socketUrl, socketOptions);

// Connect to notifications namespace
const notificationSocket = io(`${socketUrl}/notifications`, socketOptions);

const joinNotificationRooms = () => {
  const token = localStorage.getItem("token");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  if (token && user.id) {
    notificationSocket.emit("join", { userId: user.id, role: user.role });
    notificationSocket.emit("join_notifications", user.id);

    if (user.role === "admin" || user.role === "subadmin") {
      notificationSocket.emit("join_admin");
    }
  }
};

// On connection, join appropriate rooms based on user role
notificationSocket.on("connect", () => {
  joinNotificationRooms();
});

// Listen for reconnection
notificationSocket.on("reconnect", () => {
  joinNotificationRooms();
});

export { socket, notificationSocket };
export default socket;
