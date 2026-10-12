import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:open_wellness_demo/wellness_screen.dart';
import 'package:open_wellness_demo/training_screen.dart';

Future<void> mount(WidgetTester tester,
    {double width = 390,
    double scale = 1,
    bool insights = false,
    bool training = false}) async {
  tester.view.physicalSize = Size(width, 844);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
  await tester.runAsync(() async {
    for (final name in ['Regular', 'Bold']) {
      final loader = FontLoader(name == 'Bold' ? 'LatoBold' : 'Lato');
      loader.addFont(rootBundle.load('assets/fidelity_fonts/Lato-$name.ttf'));
      await loader.load();
    }
  });
  await tester.pumpWidget(MaterialApp(
      builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context)
              .copyWith(textScaler: TextScaler.linear(scale)),
          child: child!),
      home: training
          ? const TrainingScreen()
          : WellnessScreen(insights: insights)));
  await tester.pumpAndSettle();
}

void main() {
  testWidgets('routine, step update, navigation and chart interactions',
      (tester) async {
    await mount(tester);
    await tester.tap(find.text('Start'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Complete routine'));
    await tester.pumpAndSettle();
    expect(find.text('Done'), findsOneWidget);
    await tester.tap(find.text('7,240'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add 1,000 steps'));
    await tester.pumpAndSettle();
    expect(find.text('8,240'), findsOneWidget);
    await tester.tap(find.text('Insights'));
    await tester.pumpAndSettle();
    expect(find.text('Weekly insights'), findsOneWidget);
    final chart = find.bySemanticsLabel('Select recovery day');
    await tester.tapAt(tester.getBottomRight(chart) - const Offset(1, 40));
    await tester.pump();
    await tester.tapAt(tester.getTopLeft(chart) + const Offset(1, 40));
    await tester.pump();
    expect(tester.takeException(), isNull);
    await tester.tap(find.text('Today'));
    await tester.pumpAndSettle();
    expect(find.text('Daily pulse'), findsOneWidget);
  });
  for (final insights in [false, true]) {
    for (final width in [360.0, 390.0, 430.0]) {
      for (final scale in [1.0, 1.5, 2.0]) {
        testWidgets('responsive $insights $width $scale', (tester) async {
          await mount(tester, width: width, scale: scale, insights: insights);
          expect(tester.takeException(), isNull);
        });
      }
    }
  }
  testWidgets('training filters and chart boundary selections', (tester) async {
    await mount(tester, training: true);
    await tester.tap(find.text('Load').last);
    await tester.pump();
    await tester.tap(find.text('Recovery').last);
    await tester.pump();
    final chart = find.bySemanticsLabel('Inspect training chart');
    await tester.tapAt(tester.getTopLeft(chart) + const Offset(1, 20));
    await tester.pump();
    await tester.tapAt(tester.getBottomRight(chart) - const Offset(1, 20));
    await tester.pump();
    expect(tester.takeException(), isNull);
  });
  for (final width in [360.0, 390.0, 430.0]) {
    for (final scale in [1.0, 1.5, 2.0]) {
      testWidgets('training responsive $width $scale', (tester) async {
        await mount(tester, width: width, scale: scale, training: true);
        expect(tester.takeException(), isNull);
      });
    }
  }
  testWidgets('record accessibility findings', (tester) async {
    final results = <String, dynamic>{};
    for (final insights in [false, true]) {
      await mount(tester, insights: insights);
      final semantics = tester.ensureSemantics();
      try {
        final page = <String, dynamic>{};
        for (final entry in {
          'labels': labeledTapTargetGuideline,
          'androidTargets': androidTapTargetGuideline,
          'contrast': textContrastGuideline
        }.entries) {
          final result = await entry.value.evaluate(tester);
          page[entry.key] = {'passed': result.passed, 'reason': result.reason};
        }
        results[insights ? 'insights' : 'today'] = page;
      } finally {
        semantics.dispose();
      }
    }
    await tester.runAsync(() => File('../artifacts/accessibility.json')
        .writeAsString(jsonEncode(results)));
  });
}
