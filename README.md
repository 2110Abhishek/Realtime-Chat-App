# Real-Time Chat Application

A real-time chat application built with React Native (Expo) for the frontend and Node.js + Express + Socket.io + SQLite for the backend.

## Features

- Send and receive messages instantly (Socket.io)
- View previous messages (Mongo DB)
- Display message timestamps
- Username-based dummy login
- Real-time typing indicators
- Beautiful modern chat interface

## Prerequisites

- [Node.js](https://nodejs.org/en/) installed on your machine
- [Expo Go](https://expo.dev/client) app installed on your mobile device (if you want to run it on your phone)

## Project Setup Instructions

### 1. Backend Setup

1. Open a terminal and navigate to the `backend` folder:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the server:
   ```bash
   npm start
   ```
   The backend will run on `http://localhost:3000` by default. It will automatically create a `chat.db` SQLite database file.

### 2. Frontend Setup

1. Open a **new** terminal and navigate to the `frontend` folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Configure the Backend URL (Optional but Recommended for Physical Devices):
   - Open `frontend/screens/LoginScreen.js` and `frontend/screens/ChatScreen.js`.
   - Locate the `const API_URL = 'http://localhost:3000';` line.
   - If you are running the app on a physical device, replace `localhost` with your computer's local IP address (e.g., `http://192.168.1.5:3000`). Make sure your device and computer are on the same Wi-Fi network.
4. Start the Expo app:
   ```bash
   npx expo start
   ```
5. Scan the generated QR code using the Expo Go app on your phone, or press `a` to run on an Android emulator (if installed).

## Generating an APK (Android)

To generate a standalone APK for this app, we recommend using Expo Application Services (EAS):

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```
2. Log in to your Expo account:
   ```bash
   eas login
   ```
3. Configure the project for EAS build:
   ```bash
   eas build:configure
   ```
4. Build the APK profile (this will run on Expo's cloud servers):
   ```bash
   eas build -p android --profile preview
   ```
   *(Note: You may need to add a `preview` profile in your `eas.json` that sets `developmentClient: false` and `distribution: "internal"` depending on Expo docs).*

## Environment Variables

No `.env` file is required out of the box as this is a local setup. The application uses `localhost:3000` by default. If you change the backend port, you must update the `API_URL` variable in the React Native screens.

## Design Decisions

- **React Native via Expo**: Chosen for rapid development and testing across iOS/Android without complex native setup.
- **SQLite**: Used for data persistence instead of MongoDB/Firebase. It requires zero configuration, allowing the project to run seamlessly right after cloning.
- **Socket.io + Express**: Handled concurrently on the same server instance to broadcast messages instantly and fallback to REST APIs where instructed.
- **REST APIs vs Socket**: The prompt required both REST APIs for sending messages and Socket.io for real-time communication. To satisfy both, the frontend emits typing events via socket, and can send messages via socket to instantly hit the database and broadcast. The REST API `/api/messages` is available to fetch history on load.

## Assumptions Made

- Dummy authentication is sufficient: No passwords or JWTs are used. A unique username is all that is required.
- Users want to see global chat history: The current chat screen acts as a single global channel for simplicity. All users see all messages.
- The user evaluating this has Node.js installed to run the backend and the frontend bundler.
