const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Required for Firebase v10+ modular SDK — resolves subpath exports
// like firebase/auth, firebase/firestore etc.
config.resolver.unstable_enablePackageExports = true;

module.exports = config;
