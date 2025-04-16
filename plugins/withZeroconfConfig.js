// plugins/withZeroconfConfig.js
const withZeroconfConfig = config => {
    // Make sure modResults exists
    if (!config.modResults) {
        config.modResults = {};
    }

    // iOS Info.plist modifications
    if (!config.modResults.ios) {
        config.modResults.ios = {};
    }

    // Ensure infoPlist object exists
    if (!config.modResults.ios.infoPlist) {
        config.modResults.ios.infoPlist = {};
    }

    // Add local network usage description - critical for real devices
    config.modResults.ios.infoPlist.NSLocalNetworkUsageDescription =
        'TournaFence needs to discover and connect to tournament servers on your local network';

    // Add both TCP and UDP service types
    config.modResults.ios.infoPlist.NSBonjourServices = ['_tournafence._tcp', '_tournafence._udp'];

    // Add background mode for network operations
    if (!config.modResults.ios.infoPlist.UIBackgroundModes) {
        config.modResults.ios.infoPlist.UIBackgroundModes = [];
    }
    if (!config.modResults.ios.infoPlist.UIBackgroundModes.includes('audio')) {
        config.modResults.ios.infoPlist.UIBackgroundModes.push('audio');
    }

    console.log('withZeroconfConfig: Added NSLocalNetworkUsageDescription and other Bonjour settings to Info.plist');

    // Android permissions
    if (config.modResults?.['android']?.['permissions']) {
        const permissions = [
            'android.permission.INTERNET',
            'android.permission.ACCESS_NETWORK_STATE',
            'android.permission.CHANGE_WIFI_MULTICAST_STATE',
            'android.permission.ACCESS_WIFI_STATE',
            'android.permission.CHANGE_NETWORK_STATE',
        ];

        // Add permissions without duplicates
        permissions.forEach(permission => {
            if (!config.modResults.android.permissions.includes(permission)) {
                config.modResults.android.permissions.push(permission);
            }
        });
    }

    // iOS Podfile modifications
    if (config.modResults?.['ios']?.['Podfile']) {
        const podfile = config.modResults.ios.Podfile;

        if (!podfile.includes('react-native-zeroconf')) {
            config.modResults.ios.Podfile = podfile.replace(
                "target 'TournaFence' do",
                `target 'TournaFence' do
  # Required for react-native-zeroconf
  pod 'react-native-zeroconf', :path => '../node_modules/react-native-zeroconf'`
            );
        }
    }

    return config;
};

module.exports = withZeroconfConfig;
