import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fidelity_example/main.dart';

void main() {
  testWidgets('CTA callback and accessible touch targets with real fonts',
      (tester) async {
    await tester.runAsync(() async {
      final font = FontLoader('Lato');
      for (final name in ['Lato-Regular.ttf', 'Lato-Bold.ttf']) {
        font.addFont(Future.value(ByteData.sublistView(
            await File('assets/fidelity_fonts/$name').readAsBytes())));
      }
      await font.load();
    });
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final semantics = tester.ensureSemantics();
    try {
      var started = false;
      await tester.pumpWidget(
          MaterialApp(home: ExampleScreen(onStart: () => started = true)));
      await tester.pumpAndSettle();
      await tester.tap(find.text('Start comparing'));
      await tester.pumpAndSettle();
      expect(started, isTrue);
      await expectLater(tester, meetsGuideline(androidTapTargetGuideline));
      await expectLater(tester, meetsGuideline(iOSTapTargetGuideline));
      await expectLater(tester, meetsGuideline(labeledTapTargetGuideline));
      await expectLater(tester, meetsGuideline(textContrastGuideline));
    } finally {
      semantics.dispose();
    }
  });
  for (final width in [360.0, 390.0, 430.0]) {
    for (final scale in [1.0, 1.5, 2.0]) {
      testWidgets('no overflow at width $width and text scale $scale',
          (tester) async {
        tester.view.physicalSize = Size(width, 844);
        tester.view.devicePixelRatio = 1;
        addTearDown(tester.view.resetPhysicalSize);
        addTearDown(tester.view.resetDevicePixelRatio);
        await tester.pumpWidget(MaterialApp(
            builder: (context, child) => MediaQuery(
                data: MediaQuery.of(context)
                    .copyWith(textScaler: TextScaler.linear(scale)),
                child: child!),
            home: const ExampleScreen()));
        await tester.pumpAndSettle();
        expect(tester.takeException(), isNull);
        expect(find.text('Design, measured.'), findsOneWidget);
        expect(find.text('Start comparing'), findsOneWidget);
      });
    }
  }
}
