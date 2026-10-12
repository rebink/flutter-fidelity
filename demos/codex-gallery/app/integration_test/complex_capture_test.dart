import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:integration_test/integration_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:codex_gallery/gallery_screen.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('complex fidelity capture', (tester) async {
    final r = FidelityRequest.fromEnvironment();
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    await tester.runAsync(
        () => loadFidelityFonts(r, families: {'Lato-Bold.ttf': 'LatoBold'}));
    final key = GlobalKey();
    await tester.pumpWidget(FidelitySurface(
        request: r,
        boundaryKey: key,
        child: GalleryScreen(
            initialPage: 1,
            regionBuilder: (id, child) =>
                FidelityRegion(id: id, child: child))));
    await tester.pumpAndSettle();
    final result = await captureFidelity(tester, r, key, fontsLoaded: true);
    await tester.tap(find.text('Send'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Confirm payment'));
    await tester.pumpAndSettle();
    expect(find.text(r'$8400.60'), findsOneWidget);
    await tester.tap(find.text('1M'));
    await tester.pump();
    await tester.tap(find.bySemanticsLabel('Inspect balance trend'));
    await tester.pump();
    expect(tester.takeException(), isNull);
    (result['metadata'] as Map<String, dynamic>)['checks']['interactions'] =
        'passed';
    binding.reportData = result;
  });
}
