import useLoomaStore from "../store/useLoomaStore.ts";
/* ------------------------------------------------------------------ */
/* Settings tab                                                        */
/* ------------------------------------------------------------------ */

export default function SettingsTab() {
  const preferences = useLoomaStore((state) => state.preferences);

  // Fallback in case preferences are undefined/null initially
  if (!preferences || Object.keys(preferences).length === 0) {
    return (
      <div className="flex-1 overflow-y-auto bg-white px-4 py-4 text-gray-500 text-sm">
        No preferences found.
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto bg-white px-4 py-4">
      <p className="text-base/7 font-semibold text-black mb-4 border-b border-gray-100 pb-2">
        Little Project Info
      </p>
      <div className="space-y-3">
        <form>
          <textarea />
          <input type="submit" />
        </form>
      </div>
      <p className="text-base/7 font-semibold text-black mb-4 border-b border-gray-100 pb-2">
        User Preferences
      </p>

      <div className="space-y-3">
        {Object.entries(preferences).map(([key, value]) => {
          // Format the key to look nice (e.g., "notificationSettings" -> "Notification Settings")
          const formattedKey = key
            .replace(/([A-Z])/g, " $1") // Add space before capitals
            .replace(/^./, (str) => str.toUpperCase()); // Capitalize first letter

          return (
            <div
              key={key}
              className="flex items-center justify-between p-3 border-b border-gray-100"
            >
              <span className="text-sm font-medium text-gray-600">
                {formattedKey}
              </span>

              <span className="text-sm font-semibold text-gray-900 bg-white px-3 py-1 rounded shadow-sm border border-gray-200">
                {/* Convert booleans or objects to string representations safely */}
                {typeof value === "boolean"
                  ? value
                    ? "Enabled"
                    : "Disabled"
                  : String(value)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
