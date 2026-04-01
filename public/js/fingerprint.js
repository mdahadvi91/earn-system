// ================= FINGERPRINT.JS =================
// এই ফাইলের কাজ: ইউজারের ডিভাইসের Unique ID তৈরি করা
// Device ID দিয়ে anti-fraud করা হয় — একই ডিভাইসে একাধিক অ্যাকাউন্ট ব্লক করার জন্য
// এটা public/js ফোল্ডারে রাখতে হবে

// FingerprintJS CDN লোড করা
async function getDeviceFingerprint() {
    try {
        // FingerprintJS লাইব্রেরি লোড করা (CDN থেকে)
        const fpPromise = import('https://openfpcdn.io/fingerprintjs/v4')
            .then(FingerprintJS => FingerprintJS.load());

        const fp = await fpPromise;
        const result = await fp.get();

        // Unique Device ID
        const deviceId = result.visitorId;

        console.log("✅ Device Fingerprint Generated:", deviceId);
        return deviceId;

    } catch (error) {
        console.error("❌ Fingerprint Error:", error);
        // যদি FingerprintJS না কাজ করে তাহলে fallback
        return "fallback_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    }
}

// এই ফাংশন অন্য ফাইল থেকে কল করা যাবে
window.getDeviceFingerprint = getDeviceFingerprint;
