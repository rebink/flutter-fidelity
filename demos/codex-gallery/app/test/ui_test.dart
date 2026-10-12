import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:codex_gallery/gallery_screen.dart';

Future<void> mount(WidgetTester tester,
    {int page = 0, double width = 390, double scale = 1}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.runAsync(() async {
    for (final name in ['Regular', 'Bold']) {
      final f = FontLoader(name == 'Bold' ? 'LatoBold' : 'Lato');
      f.addFont(rootBundle.load('assets/fidelity_fonts/Lato-$name.ttf'));
      await f.load();
    }
  });
  await tester.pumpWidget(MaterialApp(
      home: GalleryScreen(initialPage: page),
      builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('simple task toggles and adding a task', (tester) async {
    await mount(tester);
    await tester.tap(find.text('Plan tomorrow'));
    await tester.pump();
    expect(find.text('3 of 3 complete'), findsOneWidget);
    await tester.tap(find.text('Add a task'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add water break'));
    await tester.pumpAndSettle();
    expect(find.text('Drink a glass of water'), findsOneWidget);
    expect(find.text('3 of 4 complete'), findsOneWidget);
  });
  testWidgets('complex payment, range, chart and detail interactions',
      (tester) async {
    await mount(tester, page: 1);
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm payment'));
    await tester.pumpAndSettle();
    expect(find.text(r'$8400.60'), findsOneWidget);
    await tester.tap(find.text('1M'));
    await tester.pump();
    final chart = find.bySemanticsLabel('Inspect balance trend');
    await tester.tapAt(tester.getTopLeft(chart) + const Offset(1, 15));
    await tester.pump();
    await tester.tapAt(tester.getBottomRight(chart) - const Offset(1, 15));
    await tester.pump();
    await tester.tap(find.text('Salary payment'));
    await tester.pumpAndSettle();
    expect(find.text('Local demo transaction'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
  testWidgets('advanced tracking and gallery navigation', (tester) async {
    await mount(tester, page: 2);
    await tester.tap(find.text('Track'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Follow vehicle'));
    await tester.pumpAndSettle();
    expect(find.text('Live'), findsOneWidget);
    await tester.tap(find.text('Focus'));
    await tester.pumpAndSettle();
    expect(find.text('Focus today'), findsOneWidget);
    await tester.tap(find.text('Wallet'));
    await tester.pumpAndSettle();
    expect(find.text('Wallet overview'), findsOneWidget);
  });
  for (var page = 0; page < 3; page++) {
    for (final width in [360.0, 390.0, 430.0]) {
      for (final scale in [1.0, 1.5, 2.0]) {
        testWidgets('responsive $page $width $scale', (tester) async {
          await mount(tester, page: page, width: width, scale: scale);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
  testWidgets('record accessibility findings per screen', (tester) async {
    final results = <String, dynamic>{};
    for (var page = 0; page < 3; page++) {
      await mount(tester, page: page);
      final semantics = tester.ensureSemantics();
      try {
        final screen = <String, dynamic>{};
        for (final entry in {
          'labels': labeledTapTargetGuideline,
          'androidTargets': androidTapTargetGuideline,
          'contrast': textContrastGuideline
        }.entries) {
          final result = await entry.value.evaluate(tester);
          screen[entry.key] = {
            'passed': result.passed,
            'reason': result.reason
          };
        }
        results[['simple', 'complex', 'advanced'][page]] = screen;
      } finally {
        semantics.dispose();
      }
    }
    await tester.runAsync(() => File('../artifacts/accessibility.json')
        .writeAsString(jsonEncode(results)));
  });
}
