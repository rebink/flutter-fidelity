import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:integration_test/integration_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:codex_gallery/gallery_screen.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('simple fidelity capture', (tester) async {
    final r = FidelityRequest.fromEnvironment();
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
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
    await tester.tap(find.text('Plan tomorrow'));
    await tester.pump();
    expect(find.text('3 of 3 complete'), findsOneWidget);
    await tester.tap(find.text('Add a task'));
    await tester.pumpAndSettle();
    await tester.tap(find.text('Add water break'));
    await tester.pumpAndSettle();
    expect(find.text('3 of 4 complete'), findsOneWidget);
    (result['metadata'] as Map<String, dynamic>)['checks']['interactions'] =
        'passed';
    binding.reportData = result;
  });
}
