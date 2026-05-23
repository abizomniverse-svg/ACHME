import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { register } from "../serviceWorkerRegistration";

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
