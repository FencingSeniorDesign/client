// __mocks__/react-native-device-info.js
module.exports = {
    getVersion: jest.fn(() => '1.0.0'),
    getSystemName: jest.fn(() => 'TestOS'),
    getUniqueId: jest.fn(() => 'mock-device-id'),
    // …etc
};
