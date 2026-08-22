module.exports = {
  preset: 'jest-expo',
  setupFiles: ['<rootDir>/test/setup.js'],
  moduleNameMapper: {
    '\\.css$': '<rootDir>/test/styleMock.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|maplibre-gl|react-native-safe-area-context)',
  ],
};
