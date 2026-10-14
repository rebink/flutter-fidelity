import 'package:fidelity_harness/fidelity_performance.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  test('frame distributions use the supplied device refresh budget', () {
    final report = summarizeFidelityFrames([
      [2, 3, 6],
      [5, 9, 15],
      [10, 4, 17]
    ], 120);
    expect(report['frameCount'], 3);
    expect(report['frameBudgetMs'], closeTo(8.3333, .001));
    expect(report['overBudgetFrameCount'], 2);
    expect(report['buildMs']['p50'], 5);
    expect(report['rasterMs']['p99'], 9);
    expect(summarizeFidelityFrames([], 60)['buildMs'], isNull);
    expect(
        () => summarizeFidelityFrames([
              [double.nan, 0, 0]
            ], 60),
        throwsArgumentError);
  });
  test('debug runs cannot produce runtime performance evidence', () async {
    await expectLater(
        collectFidelityPerformance(
            action: () async {},
            scenario: 'scroll',
            device: 'test',
            revision: 'test',
            flutterVersion: 'test',
            renderer: 'test',
            dataset: '100 rows',
            thermalAndPowerState: 'test',
            refreshHz: 60,
            cold: false),
        throwsStateError);
  });
}
