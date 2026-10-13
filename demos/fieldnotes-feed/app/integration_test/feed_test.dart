import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:integration_test/integration_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:fieldnotes_feed/feed/feed_controller.dart';
import 'package:fieldnotes_feed/feed/feed_screen.dart';
import 'package:fieldnotes_feed/theme/feed_theme.dart';
import '../test/support.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('native feed interactions and fresh reference capture',
      (tester) async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.immersiveSticky);
    await tester
        .runAsync(() => Future<void>.delayed(const Duration(seconds: 1)));
    await tester.pump();
    final request = FidelityRequest.fromEnvironment();
    debugPrint(
        'Native view: ${tester.view.physicalSize} / ${tester.view.devicePixelRatio}');
    expect(tester.view.physicalSize / tester.view.devicePixelRatio,
        Size(request.width, request.height),
        reason:
            'Actual native app-content viewport must match reference before capture.');
    await loadFidelityFonts(request, families: {'Lato-Bold.ttf': 'LatoBold'});
    var controller = FeedController();
    final boundary = GlobalKey();
    Future<void> mount() async {
      await tester.pumpWidget(FidelitySurface(
          request: request,
          theme: feedTheme,
          boundaryKey: boundary,
          child: FeedScreen(
              controller: controller,
              region: (id, child) => FidelityRegion(id: id, child: child))));
      await precacheFeedImages(tester);
      await tester.pumpAndSettle();
    }

    await mount();
    await tester.tap(find.byTooltip('Like post'));
    await tester.pump();
    expect(find.text('129'), findsOneWidget);
    await tester.tap(find.byTooltip('Save post'));
    await tester.pump();
    await tester.tap(find.byKey(const ValueKey('nav-saved')));
    await tester.pump();
    expect(find.text('Saved fieldnotes'), findsOneWidget);
    expect(find.text('Take the scenic route.'), findsOneWidget);
    await tester.tap(find.byKey(const ValueKey('nav-feed')));
    await tester.pump();
    await tester.ensureVisible(find.text('Join'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Join'));
    await tester.pump();
    expect(find.text('13 going'), findsOneWidget);
    await tester.tap(find.byTooltip('Create a fieldnote'));
    await tester.pumpAndSettle();
    await tester.enterText(
        find.byKey(const ValueKey('entry-field')), 'A native fieldnote.');
    await tester.tap(find.text('Post'));
    await tester.pumpAndSettle();
    expect(find.text('A native fieldnote.'), findsOneWidget);
    final previous = controller;
    await tester.pumpWidget(const SizedBox.shrink());
    previous.dispose();
    controller = FeedController();
    await mount();
    expect(find.text('128'), findsOneWidget);
    expect(find.text('12 going'), findsOneWidget);
    binding.reportData = await captureFidelity(tester, request, boundary,
        fontsLoaded: true, checks: {'interactions': 'passed'});
    await tester.pumpWidget(const SizedBox.shrink());
    controller.dispose();
  });
}
