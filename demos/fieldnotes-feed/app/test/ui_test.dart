import 'dart:convert';
import 'dart:io';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fieldnotes_feed/feed/widgets/event_card.dart';
import 'package:fieldnotes_feed/feed/widgets/post_card.dart';
import 'support.dart';

void main() {
  testWidgets('likes, saves, and saved navigation preserve post state',
      (tester) async {
    await mountFeed(tester);
    await tester.tap(find.byTooltip('Like post'));
    await tester.pump();
    expect(find.text('129'), findsOneWidget);
    await tester.tap(find.byTooltip('Save post'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('nav-saved')));
    await tester.pump();
    expect(find.text('Saved fieldnotes'), findsOneWidget);
    expect(find.text('129'), findsOneWidget);
    await tester.tap(find.byTooltip('Unsave post'));
    await tester.pump();
    expect(find.text('Save a fieldnote to find it here.'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('nav-feed')));
    await tester.pump();
    expect(find.byType(PostCard), findsOneWidget);
  });
  testWidgets('category filtering and event joining have real outcomes',
      (tester) async {
    await mountFeed(tester);
    await tester.tap(find.byKey(const ValueKey('filter-design')));
    await tester.pump();
    expect(find.byType(PostCard), findsNothing);
    await tester.tap(find.byKey(const ValueKey('filter-outdoors')));
    await tester.pump();
    expect(find.byType(PostCard), findsOneWidget);
    await tester.ensureVisible(find.text('Join'));
    await tester.tap(find.text('Join'));
    await tester.pump();
    expect(find.text('13 going'), findsOneWidget);
    await tester.tap(find.text('Joined'));
    await tester.pump();
    expect(find.text('12 going'), findsOneWidget);
  });
  testWidgets('post creation validates input and adds user content',
      (tester) async {
    await mountFeed(tester);
    await tester.tap(find.byTooltip('Create a fieldnote'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Post'));
    await tester.pump();
    expect(find.text('Write a little something first.'), findsOneWidget);
    await tester.enterText(
        find.byKey(const ValueKey('entry-field')), 'Found a quiet trail.');
    await tester.tap(find.text('Post'));
    await tester.pumpAndSettle();
    expect(find.text('Found a quiet trail.'), findsOneWidget);
    expect(find.text('Just now · Local demo'), findsOneWidget);
  });
  testWidgets('comments and search show user-visible updates', (tester) async {
    await mountFeed(tester);
    await tester.tap(find.byTooltip('Open comments'));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(const ValueKey('entry-field')), 'Beautiful trail!');
    await tester.tap(find.text('Comment'));
    await tester.pumpAndSettle();
    expect(find.text('25'), findsOneWidget);
    await tester.tap(find.byTooltip('Search fieldnotes'));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(const ValueKey('search-field')), 'unmatched search');
    await tester.pump();
    expect(find.text('No matching local posts.'), findsOneWidget);
  });
  for (final width in [360.0, 400.0, 430.0]) {
    for (final scale in [1.0, 1.5, 2.0]) {
      testWidgets('fresh responsive fixture $width width / $scale text',
          (tester) async {
        await mountFeed(tester, width: width, scale: scale);
        expect(tester.takeException(), isNull);
        await tester.scrollUntilVisible(find.byType(EventCard), 180,
            scrollable: find.byType(Scrollable).first);
        expect(find.text('Sunday trail club'), findsOneWidget);
        expect(find.text('Join'), findsOneWidget);
        expect(tester.takeException(), isNull);
        final nav = tester.getRect(find.byKey(const ValueKey('nav-feed')));
        expect(nav.bottom, lessThanOrEqualTo(800));
      });
    }
  }
  testWidgets('record guideline results without treating findings as passes',
      (tester) async {
    await mountFeed(tester);
    final semantics = tester.ensureSemantics();
    final results = <String, dynamic>{};
    try {
      for (final entry in {
        'labels': labeledTapTargetGuideline,
        'androidTargets': androidTapTargetGuideline,
        'iosTargets': iOSTapTargetGuideline,
        'contrast': textContrastGuideline
      }.entries) {
        final result = await entry.value.evaluate(tester);
        results[entry.key] = {'passed': result.passed, 'reason': result.reason};
      }
    } finally {
      semantics.dispose();
    }
    await tester.runAsync(() async {
      await Directory('../artifacts').create(recursive: true);
      await File('../artifacts/accessibility.json')
          .writeAsString(const JsonEncoder.withIndent('  ').convert(results));
    });
  });
}
