jest.mock('react-native-zeroconf', () => ({
    addDevice: jest.fn(),
    removeDevice: jest.fn(),
    start: jest.fn(),
    stop: jest.fn(),
    on: jest.fn(),
    off: jest.fn(),
}));

// Mock Expo vector icons
jest.mock('@expo/vector-icons', () => {
    const { View } = require('react-native');
    return {
        AntDesign: View,
        FontAwesome5: View,
        MaterialIcons: View,
        Ionicons: View,
        Feather: View,
        MaterialCommunityIcons: View,
    };
});

// Mock BLEStatusBar globally to avoid ScoringBoxContext issues
jest.mock('./src/networking/components/BLEStatusBar', () => ({
    BLEStatusBar: () => null,
}));

// Mock React Navigation usePreventRemove globally
jest.mock('@react-navigation/native', () => {
    const actualNav = jest.requireActual('@react-navigation/native');
    return {
        ...actualNav,
        usePreventRemove: jest.fn(),
    };
});

// Optional polyfill for test errors like "setImmediate is not defined"
global.setImmediate = global.setImmediate || (fn => setTimeout(fn, 0));
