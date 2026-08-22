// useSafeAreaInsets throws without a provider; screens are rendered bare in tests.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);

// Screens fetch hazards from the API on mount. Tests are not allowed to touch
// the network: fail the call immediately so every suite exercises the bundled
// fixture fallback deterministically, instead of waiting on a socket.
global.fetch = jest.fn(() => Promise.reject(new Error('network disabled in tests')));
