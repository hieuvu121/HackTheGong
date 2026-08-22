// useSafeAreaInsets throws without a provider; screens are rendered bare in tests.
jest.mock('react-native-safe-area-context', () =>
  require('react-native-safe-area-context/jest/mock').default,
);
