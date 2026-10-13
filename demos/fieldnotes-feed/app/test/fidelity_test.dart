import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:fieldnotes_feed/feed/feed_screen.dart';
import 'package:fieldnotes_feed/theme/feed_theme.dart';
import 'support.dart';

void main() {
  testWidgets('capture immutable feed fixture with measured regions',
      (tester) async {
    final request = FidelityRequest.fromEnvironment();
    tester.view.physicalSize = Size(request.width * request.pixelRatio,
        request.height * request.pixelRatio);
    tester.view.devicePixelRatio = request.pixelRatio;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    final previousShadows = debugDisableShadows;
    debugDisableShadows = false;
    try {
      await tester.runAsync(() =>
          loadFidelityFonts(request, families: {'Lato-Bold.ttf': 'LatoBold'}));
      await tester.runAsync(loadIconFont);
      final boundary = GlobalKey();
      await tester.pumpWidget(FidelitySurface(
          request: request,
          boundaryKey: boundary,
          theme: feedTheme,
          child: FeedScreen(
              region: (id, child) => FidelityRegion(id: id, child: child))));
      await precacheFeedImages(tester);
      final result =
          await captureFidelity(tester, request, boundary, fontsLoaded: true);
      await tester.runAsync(() => writeFidelityCapture(request, result));
    } finally {
      debugDisableShadows = previousShadows;
    }
  });
}
