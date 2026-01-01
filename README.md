# SmartNest

A cross-platform mobile application for smart home automation, built with React Native and Expo. SmartNest enables users to monitor and control IoT devices remotely with secure authentication and an intuitive interface.

## Features

- **Device Control**: Remotely manage and monitor connected IoT devices
- **Firebase Integration**: Real-time database synchronization and user authentication
- **Secure Authentication**: Email/password authentication with biometric security options
- **Cross-Platform**: Runs on iOS, Android, and web browsers
- **Modern UI**: Clean, responsive interface with native navigation
- **Settings Management**: Customizable app preferences and security settings

## Tech Stack

- **Framework**: React Native with Expo (~54.0.30)
- **Routing**: Expo Router (~6.0.21)
- **Backend**: Firebase (Auth + Realtime Database/Firestore)
- **Language**: TypeScript
- **Animations**: React Native Reanimated (~4.1.1)
- **Storage**: AsyncStorage for local data persistence
- **Security**: Expo Local Authentication for biometric login

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Expo CLI
- iOS Simulator (for macOS) or Android Emulator
- Firebase account with a configured project

## Installation

1. **Clone the repository**

```bash
git clone https://github.com/darshan-regmi/SmartNest.git
cd SmartNest
```

1. **Install dependencies**

```bash
npm install
```

1. **Configure Firebase**
   - Create a Firebase project at [Firebase Console](https://console.firebase.google.com)
   - Enable Authentication (Email/Password provider)
   - Create a Firestore/Realtime Database
   - Add your Firebase config to the project (in `lib/firebase.ts` or similar)

2. **Start the development server**

```bash
npm start
```

## Available Scripts

- `npm start` - Start the Expo development server
- `npm run android` - Run on Android emulator/device
- `npm run ios` - Run on iOS simulator/device
- `npm run web` - Run in web browser
- `npm run web:build` - Build for web deployment
- `npm run web:serve` - Build and serve web version locally
- `npm run lint` - Run ESLint for code quality
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
SmartNest/
├── app/                    # Main application screens
│   ├── (auth)/            # Authentication screens
│   ├── (tabs)/            # Tab-based navigation screens
│   ├── security/          # Security-related screens
│   ├── settings.tsx       # Settings screen
│   └── _layout.tsx        # Root layout configuration
├── components/            # Reusable UI components
├── constants/            # App constants and configuration
├── lib/                  # Utility functions and Firebase setup
├── assets/               # Images, fonts, and other static assets
└── public/               # Web-specific public assets
```

## Authentication Flow

SmartNest implements secure user authentication with:

- Email/password registration and login
- Firebase Authentication backend
- Optional biometric authentication (fingerprint/Face ID)
- Persistent login sessions with AsyncStorage

## Configuration

### Firebase Setup

Create a `lib/firebase.ts` file with your Firebase configuration:

```typescript
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
```

## Building for Production

### Android

```bash
eas build --platform android
```

### iOS

```bash
eas build --platform ios
```

### Web

```bash
npm run web:build
```

## Hardware Integration

SmartNest is designed to work with ESP8266/ESP32 microcontrollers and Arduino-based IoT devices. Configure your hardware to communicate with Firebase for real-time device control.

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is private and maintained by [Darshan Regmi](https://github.com/darshan-regmi).

## Contact

- GitHub: [@darshan-regmi](https://github.com/darshan-regmi)
- Project Link: [https://github.com/darshan-regmi/SmartNest](https://github.com/darshan-regmi/SmartNest)
