import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'wellness_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
  runApp(const WellnessApp());
}

class WellnessApp extends StatelessWidget {
  const WellnessApp({super.key});
  @override
  Widget build(BuildContext context) => const MaterialApp(
      debugShowCheckedModeBanner: false, home: WellnessScreen());
}
