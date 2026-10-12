import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:flutter/services.dart';
import 'package:integration_test/integration_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:open_wellness_demo/training_screen.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('insights reference capture', (tester) async {
    final r = FidelityRequest.fromEnvironment();
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    await tester.runAsync(
        () => loadFidelityFonts(r, families: {'Lato-Bold.ttf': 'LatoBold'}));
    final key = GlobalKey();
    await tester.pumpWidget(FidelitySurface(
        request: r,
        boundaryKey: key,
        child: TrainingScreen(
            regionBuilder: (id, child) =>
                FidelityRegion(id: id, child: child))));
    await tester.pumpAndSettle();
    final result = await captureFidelity(tester, r, key, fontsLoaded: true);
    binding.reportData = result;
  });
}
