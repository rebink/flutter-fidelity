import 'package:flutter/material.dart';
import 'feed/feed_screen.dart';
import 'theme/feed_theme.dart';

void main() => runApp(const FieldnotesApp());

class FieldnotesApp extends StatelessWidget {
  const FieldnotesApp({super.key});
  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Fieldnotes',
        debugShowCheckedModeBanner: false,
        theme: feedTheme,
        home: const FeedScreen(),
      );
}
