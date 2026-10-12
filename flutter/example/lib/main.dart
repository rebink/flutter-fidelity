import 'package:flutter/material.dart';

void main() => runApp(const MaterialApp(home: ExampleScreen()));

class ExampleScreen extends StatelessWidget {
  const ExampleScreen({this.onStart, this.regionBuilder, super.key});
  final VoidCallback? onStart;
  final Widget Function(String, Widget)? regionBuilder;
  Widget region(String id, Widget child) =>
      regionBuilder?.call(id, child) ?? child;
  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xfff5f7fb),
        body: SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const SizedBox(height: 20),
                      region(
                          'heading',
                          const Text('Design, measured.',
                              style: TextStyle(
                                  fontFamily: 'Lato',
                                  fontSize: 28,
                                  height: 1.2,
                                  fontWeight: FontWeight.w700,
                                  color: Color(0xff17243b)))),
                      const SizedBox(height: 12),
                      region(
                          'subtitle',
                          const Text(
                              'A screenshot is the reference.\nFlutter widgets make it work.',
                              style: TextStyle(
                                  fontFamily: 'Lato',
                                  fontSize: 16,
                                  height: 1.5,
                                  color: Color(0xff52617a)))),
                      const SizedBox(height: 28),
                      region(
                          'subject',
                          Container(
                              height: 180,
                              width: double.infinity,
                              decoration: BoxDecoration(
                                  borderRadius: BorderRadius.circular(20),
                                  gradient: const LinearGradient(colors: [
                                    Color(0xff635bff),
                                    Color(0xff2aa7c9)
                                  ])),
                              child: const Center(
                                  child: Icon(Icons.auto_awesome,
                                      size: 56, color: Colors.white)))),
                      const Spacer(),
                      region(
                          'cta',
                          SizedBox(
                              width: double.infinity,
                              height: 52,
                              child: FilledButton(
                                  onPressed: onStart ?? () {},
                                  child: const Text('Start comparing',
                                      style: TextStyle(
                                          fontFamily: 'Lato', fontSize: 16))))),
                    ]))),
      );
}
