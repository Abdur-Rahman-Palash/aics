# React Native SDK Guide

This is a simple example of how to integrate the AI Customer Support chat widget into your React Native app using a WebView.

## Step 1: Install react-native-webview

```bash
npm install react-native-webview
# or
yarn add react-native-webview
```

## Step 2: Create a ChatScreen Component

```jsx
import React, { useRef } from 'react';
import { View, StyleSheet, SafeAreaView } from 'react-native';
import { WebView } from 'react-native-webview';

const ChatScreen = ({ businessId, widgetUrl = 'https://your-domain.com' }) => {
  const webViewRef = useRef(null);

  // The HTML to embed the chat widget
  const widgetHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body, html { margin: 0; padding: 0; height: 100%; width: 100%; }
      </style>
    </head>
    <body>
      <script>
        window.BUSINESS_ID = '${businessId}';
      </script>
      <script src="${widgetUrl}/js/chat-widget.js"></script>
    </body>
    </html>
  `;

  return (
    <SafeAreaView style={styles.container}>
      <WebView
        ref={webViewRef}
        source={{ html: widgetHtml }}
        style={styles.webview}
        javaScriptEnabled={true}
        domStorageEnabled={true}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  webview: {
    flex: 1,
  },
});

export default ChatScreen;
```

## Step 3: Use the ChatScreen in your app

```jsx
import React from 'react';
import ChatScreen from './ChatScreen';

const App = () => {
  return (
    <ChatScreen 
      businessId="your-business-id-here"
      widgetUrl="https://your-aics-server.com"
    />
  );
};

export default App;
```

## Notes

- Replace `your-business-id-here` with your actual business ID
- Replace `https://your-aics-server.com` with the URL of your AICS server
- Make sure your server is configured to allow embedding in WebViews
