# Getting Started

### Prerequisites

- A code editor of your choice. I've tested this guide with VSCode and JetBrains Webstorm
- [NodeJS 22 (LTS)](https://nodejs.org/en/download)
- [OpenJDK 21.0.6 LTS](https://learn.microsoft.com/en-us/java/openjdk/download#openjdk-21). If you are on MacOS and using Homebrew, you can also run `brew install openjdk@21` in your terminal
- [Android Studio](https://developer.android.com/studio/install). You can also install just the SDK, but this lets us easily manage devices and OS versions

- [Windows Only] Open the Enviroment Variables editor (typing "enviroment") into the search box should bring it up. Under `System Variables` click new, set `Variable Name` to `ANDROID_HOME` and `Variable Value` to the location your Android SDK was installed. It's most likely `C:\Users\YOUR_USER_NAME\AppData\Local\Android\Sdk`

- [MacOS Only] [Xcode and simulators](https://developer.apple.com/documentation/safari-developer-tools/installing-xcode-and-simulators)

- [MacOS Only] run the following command to add the Android SDK to your path

```sh
export ANDROID_HOME=~/Library/Android/sdk
export PATH=$PATH:$ANDROID_HOME/tools:$ANDROID_HOME/tools/bin:$ANDROID_HOME/platform-tools
```

### Setting up the project

1. In Android Studio, [create a new device](https://developer.android.com/studio/run/managing-avds) if one is not already created. I've been using the Pixel 9 so far
2. Clone the repository and open it in your editor of choice
3. `npm i` to install the NodeJS packages
4. run `npm run android` to start the Android emulator, and `npm run ios` to run the ios emulator (only works on Apple devices unfortunatly)
5. To refresh the app in the emulator without restarting it, press R in the terminal. This should be faster than fully restarting it

# Starter Template with React Navigation

This is a minimal starter template for React Native apps using Expo and React Navigation.

It includes the following:

- Example [Native Stack](https://reactnavigation.org/docs/native-stack-navigator) with a nested [Bottom Tab](https://reactnavigation.org/docs/bottom-tab-navigator)
- Web support with [React Native for Web](https://necolas.github.io/react-native-web/)
- TypeScript support and configured for React Navigation
- Automatic deep link and URL handling configuration
- Expo [Development Build](https://docs.expo.dev/develop/development-builds/introduction/) with [Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)
- Edge-to-edge configured on Android with [`react-native-edge-to-edge`](https://www.npmjs.com/package/react-native-edge-to-edge)

## Running the app

- Install the dependencies:

    ```sh
    npm install
    ```

- Start the development server:

    ```sh
    npm start
    ```

- Build and run iOS and Android development builds:

    ```sh
    npm run ios
    # or
    npm run android
    ```

- In the terminal running the development server, press `i` to open the iOS simulator, `a` to open the Android device or emulator, or `w` to open the web browser.

## Notes

This project uses a [development build](https://docs.expo.dev/develop/development-builds/introduction/) and cannot be run with [Expo Go](https://expo.dev/go). To run the app with Expo Go, edit the `package.json` file, remove the `expo-dev-client` package and `--dev-client` flag from the `start` script. However, Edge-to-edge won't work on Expo Go.

We highly recommend using the development builds for normal development and testing.

The `ios` and `android` folder are gitignored in the project by default as they are automatically generated during the build process ([Continuous Native Generation](https://docs.expo.dev/workflow/continuous-native-generation/)). This means that you should not edit these folders directly and use [config plugins](https://docs.expo.dev/config-plugins/) instead. However, if you need to edit these folders, you can remove them from the `.gitignore` file so that they are tracked by git.

## Resources

- [React Navigation documentation](https://reactnavigation.org/)
- [Expo documentation](https://docs.expo.dev/)

---

Demo assets are from [lucide.dev](https://lucide.dev/)
