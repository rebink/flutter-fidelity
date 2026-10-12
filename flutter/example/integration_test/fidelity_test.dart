import 'package:integration_test/integration_test.dart';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:fidelity_example/main.dart';

void main() {
  final binding = IntegrationTestWidgetsFlutterBinding.ensureInitialized();
  testWidgets('native app content capture', (tester) async {
    await SystemChrome.setEnabledSystemUIMode(SystemUiMode.edgeToEdge);
    final request = FidelityRequest.fromEnvironment();
    await loadFidelityFonts(request);
    final boundary = GlobalKey();
    // The host must use an emulator/simulator with the confirmed logical viewport.
    await tester.pumpWidget(FidelitySurface(
        request: request,
        boundaryKey: boundary,
        child: ExampleScreen(
            regionBuilder: (id, child) =>
                FidelityRegion(id: id, child: child))));
    await tester.pumpAndSettle();
    binding.reportData =
        await captureFidelity(tester, request, boundary, fontsLoaded: true);
  });
}
