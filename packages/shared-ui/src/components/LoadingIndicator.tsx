import React from "react";
import { View, ActivityIndicator, StyleSheet } from "react-native";

const LoadingIndicator = React.memo(() => {
  const styles = loadingIndicatorStyles;
  return (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color="#F5F6F8" />
    </View>
  );
});

const loadingIndicatorStyles = StyleSheet.create({
    loadingContainer: {
      ...StyleSheet.absoluteFillObject,
      justifyContent: "center",
      alignItems: "center",
    },
  });

export default LoadingIndicator;
