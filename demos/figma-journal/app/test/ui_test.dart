import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:figma_journal/main.dart';

void main() {
  testWidgets('Journal renders all topics and keeps answers scoped to each day',
      (tester) async {
    tester.view.physicalSize = const Size(402, 874);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const JournalApp());
    await tester.pumpAndSettle();
    for (final title in [
      'Journal',
      'Alcohol',
      'Smoking / vaping',
      'Late or heavy meal',
      'Feeling unwell',
      'Mood'
    ]) {
      expect(find.text(title), findsOneWidget);
    }
    await tester.tap(find.text('Alcohol'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Yes'));
    await tester.pumpAndSettle();
    expect(find.text('Yes'), findsOneWidget);
    await tester.tap(find.text('27'));
    await tester.pumpAndSettle();
    expect(find.text('Did you drink today?'), findsOneWidget);
    expect(find.text('Yes'), findsNothing);
    await tester.tap(find.text('28'));
    await tester.pumpAndSettle();
    expect(find.text('Yes'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });

  testWidgets('Narrow viewport and enlarged text scroll without overflow',
      (tester) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(const MaterialApp(
      home: MediaQuery(
        data: MediaQueryData(textScaler: TextScaler.linear(1.5)),
        child: JournalScreen(),
      ),
    ));
    await tester.pumpAndSettle();
    await tester.ensureVisible(find.text('Mood'));
    await tester.tap(find.text('Mood'));
    await tester.pumpAndSettle();
    expect(find.text('Awesome'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
