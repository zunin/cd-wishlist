import { useState, useEffect, type FC } from "react";

declare const __APP_VERSION__: string;

const VERSION_KEY = "app_version";

export const UpdateNotification: FC = () => {
  const [updateAvailable, setUpdateAvailable] = useState(false);

  useEffect(() => {
    const storedVersion = localStorage.getItem(VERSION_KEY);
    const currentVersion = __APP_VERSION__;

    if (!storedVersion) {
      localStorage.setItem(VERSION_KEY, currentVersion);
      return;
    }

    if (storedVersion !== currentVersion) {
      setUpdateAvailable(true);
    }

    const interval = setInterval(() => {
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: "CHECK_VERSION",
          version: currentVersion,
        });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const handleReload = () => {
    localStorage.setItem(VERSION_KEY, __APP_VERSION__);
    window.location.reload();
  };

  if (!updateAvailable) return null;

  return (
    <div className="update-notification">
      <span>New version available!</span>
      <button type="button" onClick={handleReload}>
        Reload
      </button>
    </div>
  );
};