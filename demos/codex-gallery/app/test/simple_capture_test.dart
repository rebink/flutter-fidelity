import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:codex_gallery/gallery_screen.dart';

void main() {
  testWidgets('simple fidelity capture', (tester) async {
    final r = FidelityRequest.fromEnvironment();
    tester.view.physicalSize =
        Size(r.width * r.pixelRatio, r.height * r.pixelRatio);
    tester.view.devicePixelRatio = r.pixelRatio;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.runAsync(
        () => loadFidelityFonts(r, families: {'Lato-Bold.ttf': 'LatoBold'}));
    final key = GlobalKey();
    await tester.pumpWidget(FidelitySurface(
        request: r,
        boundaryKey: key,
        child: GalleryScreen(
            initialPage: 0,
            regionBuilder: (id, child) =>
                FidelityRegion(id: id, child: child))));
    await tester.pumpAndSettle();
    final result = await captureFidelity(tester, r, key, fontsLoaded: true);
    await tester.runAsync(() => writeFidelityCapture(r, result));
  });
}
