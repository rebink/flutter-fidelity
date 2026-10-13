import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fieldnotes_feed/feed/feed_controller.dart';
import 'package:fieldnotes_feed/feed/feed_screen.dart';
import 'package:fieldnotes_feed/theme/feed_theme.dart';

const feedImages = [
  'trail',
  'leaf',
  'maya',
  'leo',
  'noor',
  'alex',
  'author',
  'attendee_one',
  'attendee_two',
  'attendee_three',
  'mountain'
];

Future<void> loadTestFonts() async {
  for (final entry
      in {'Lato': 'Lato-Regular.ttf', 'LatoBold': 'Lato-Bold.ttf'}.entries) {
    final loader = FontLoader(entry.key);
    loader.addFont(rootBundle.load('assets/fidelity_fonts/${entry.value}'));
    await loader.load();
  }
  await loadIconFont();
}

Future<void> loadIconFont() async {
  final loader = FontLoader('MaterialIcons');
  loader.addFont(rootBundle.load('fonts/MaterialIcons-Regular.otf'));
  await loader.load();
  final cupertino = FontLoader('packages/cupertino_icons/CupertinoIcons');
  cupertino.addFont(
      rootBundle.load('packages/cupertino_icons/assets/CupertinoIcons.ttf'));
  await cupertino.load();
}

Future<void> precacheFeedImages(WidgetTester tester) async {
  final context = tester.element(find.byType(FeedScreen));
  await tester.runAsync(() async {
    for (final name in feedImages) {
      await precacheImage(AssetImage('assets/images/$name.png'), context);
    }
  });
  await tester.pump();
}

Future<void> mountFeed(WidgetTester tester,
    {FeedController? controller, double width = 400, double scale = 1}) async {
  tester.view.physicalSize = Size(width, 800);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.runAsync(loadTestFonts);
  await tester.pumpWidget(MaterialApp(
      theme: feedTheme,
      builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!),
      home: FeedScreen(controller: controller)));
  await precacheFeedImages(tester);
  await tester.pumpAndSettle(const Duration(milliseconds: 100),
      EnginePhase.sendSemanticsUpdate, const Duration(seconds: 5));
}
