jest.mock('react-native-zeroconf', () => ({
    addDevice: jest.fn(),
    removeDevice: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
}));

// Optional polyfill for test errors like "setImmediate is not defined"
global.setImmediate = global.setImmediate || (fn => setTimeout(fn, 0));
