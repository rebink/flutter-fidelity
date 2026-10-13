import 'package:flutter/material.dart';

abstract final class FeedPalette {
  static const canvas = Color(0xfff7f9f6);
  static const ink = Color(0xff102a22);
  static const muted = Color(0xff4d645c);
  static const green = Color(0xff214e38);
  static const border = Color(0xffe1e7e1);
  static const outline = Color(0xffb6c9c0);
  static const cream = Color(0xfff7f5eb);
  static const coral = Color(0xffff644d);
}

abstract final class FeedType {
  static TextStyle text(double size,
          {bool bold = false,
          Color color = FeedPalette.ink,
          double height = 1.2,
          double? spacing}) =>
      TextStyle(
          fontFamily: bold ? 'LatoBold' : 'Lato',
          fontSize: size,
          height: height,
          color: color,
          letterSpacing: spacing);
}

final feedTheme = ThemeData(
  useMaterial3: true,
  fontFamily: 'Lato',
  scaffoldBackgroundColor: FeedPalette.canvas,
  colorScheme: const ColorScheme.light(
      primary: FeedPalette.green,
      onPrimary: Colors.white,
      surface: Colors.white,
      onSurface: FeedPalette.ink,
      error: Color(0xffb73535)),
  textTheme: TextTheme(
      headlineLarge: FeedType.text(28, bold: true),
      titleLarge: FeedType.text(16, bold: true),
      bodyMedium: FeedType.text(12, color: FeedPalette.muted),
      labelLarge: FeedType.text(12, bold: true)),
  iconTheme: const IconThemeData(color: FeedPalette.ink, size: 20),
  textSelectionTheme: const TextSelectionThemeData(
      cursorColor: FeedPalette.green, selectionColor: Color(0xffc1d5c6)),
  inputDecorationTheme: const InputDecorationTheme(
      filled: true,
      fillColor: FeedPalette.canvas,
      border: OutlineInputBorder()),
  filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
          backgroundColor: FeedPalette.green,
          foregroundColor: Colors.white,
          textStyle: FeedType.text(12, bold: true, color: Colors.white),
          minimumSize: const Size(64, 44))),
);
