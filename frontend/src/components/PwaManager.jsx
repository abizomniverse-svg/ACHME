import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { register } from "../serviceWorkerRegistration";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PwaManager() {
  const [updateReg, setUpdateReg] = useState(null);
  const [offline, setOffline] = useState(!navigator.onLine);

  useEffect(() => {
    register((registration) => setUpdateReg(registration));

    const goOnline = () => setOffline(false);
    const goOffline = () => setOffline(true);

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);

    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  // Push Notifications Subscription Logic
  useEffect(() => {
    const subscribeUser = async () => {
      const token = localStorage.getItem("token");
      if (!token) return; // Only subscribe if logged in

      // Check if serviceWorker and PushManager are supported
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        console.warn("Push Notifications are not supported by this browser.");
        return;
      }

      try {
        const registration = await navigator.serviceWorker.ready;
        
        // 1. Get VAPID public key from backend
        const getApiBackend = () => {
          if (process.env.REACT_APP_API_URL) return process.env.REACT_APP_API_URL;
          if (window.location.port && window.location.port !== "3000") {
            return window.location.origin;
          }
          const protocol = window.location.protocol;
          const hostname = window.location.hostname;
          return `${protocol}//${hostname}:5000`;
        };
        const API_URL = getApiBackend();

        const config = { headers: { Authorization: `Bearer ${token}` } };
        const keyRes = await fetch(`${API_URL}/api/notifications/vapid-public-key`, config).then(r => r.json());
        
        if (!keyRes || !keyRes.publicKey) {
          console.warn("Could not retrieve VAPID public key.");
          return;
        }

        // 2. Request Notification Permission
        if (Notification.permission === "default") {
          await Notification.requestPermission();
        }

        if (Notification.permission !== "granted") {
          console.log("Notification permission not granted.");
          return;
        }

        // 3. Subscribe to Push Manager
        const subscribeOptions = {
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(keyRes.publicKey)
        };

        const subscription = await registration.pushManager.subscribe(subscribeOptions);
        console.log("Browser successfully subscribed to Web Push:", subscription);

        // 4. Send subscription payload to SQL backend
        await fetch(`${API_URL}/api/notifications/push-subscribe`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify(subscription)
        });
        
        console.log("Push subscription saved to server successfully.");
      } catch (err) {
        console.error("Failed to subscribe user to push notifications:", err);
      }
    };

    subscribeUser();
  }, [updateReg]);

  const applyUpdate = useCallback(() => {
    if (!updateReg) return;
    updateReg.waiting?.postMessage({ type: "SKIP_WAITING" });
    updateReg.waiting?.addEventListener("statechange", () => {
      if (updateReg.waiting?.state === "activated") {
        window.location.reload();
      }
    });
  }, [updateReg]);

  return (
    <>
      <AnimatePresence>
        {offline && (
          <motion.div
            initial={{ y: -40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -40, opacity: 0 }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-amber-500 text-white text-center text-sm py-1.5 font-medium"
          >
            You are offline — showing cached data
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {updateReg?.waiting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-[2px] p-4"
          >
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 text-xl font-bold">
                  i
                </div>
                <div>
                  <h2 className="text-lg font-bold text-gray-900">
                    Update Available
                  </h2>
                  <p className="text-sm text-gray-500">
                    A new version is ready
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-6 leading-relaxed">
                Refresh to get the latest features and improvements.
              </p>
              <div className="flex flex-col gap-2">
                <button
                  onClick={applyUpdate}
                  className="w-full py-2.5 bg-[#1e3a5f] text-white font-semibold rounded-xl hover:bg-[#162d4a] transition"
                >
                  Refresh & Update
                </button>
                <button
                  onClick={() => setUpdateReg(null)}
                  className="w-full py-2 text-sm text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Later
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
