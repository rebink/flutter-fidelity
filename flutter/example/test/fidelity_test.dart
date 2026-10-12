import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fidelity_example/main.dart';

void main() {
  testWidgets(
      'capture reference viewport with actual fonts and region metadata',
      (tester) async {
    final request = FidelityRequest.fromEnvironment();
    tester.view.physicalSize = Size(request.width * request.pixelRatio,
        request.height * request.pixelRatio);
    tester.view.devicePixelRatio = request.pixelRatio;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.runAsync(() => loadFidelityFonts(request));
    final boundary = GlobalKey();
    await tester.pumpWidget(FidelitySurface(
        request: request,
        boundaryKey: boundary,
        child: ExampleScreen(
            regionBuilder: (id, child) =>
                FidelityRegion(id: id, child: child))));
    await tester.pumpAndSettle();
    expect(find.text('Start comparing'), findsOneWidget);
    await tester.tap(find.text('Start comparing'));
    await tester.pumpAndSettle();
    final capture = await captureFidelity(tester, request, boundary,
        fontsLoaded: true, checks: {'interactions': 'passed'});
    await tester.runAsync(() => writeFidelityCapture(request, capture));
  });
}
