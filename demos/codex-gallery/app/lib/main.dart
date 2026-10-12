import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'gallery_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  runApp(const GalleryApp());
}

class GalleryApp extends StatelessWidget {
  const GalleryApp({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(
      debugShowCheckedModeBanner: false, home: GalleryScreen());
}
