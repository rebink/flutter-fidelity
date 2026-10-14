import 'dart:developer' as developer;
import 'dart:io';
import 'dart:ui';
import 'package:flutter/foundation.dart';
import 'package:flutter/scheduler.dart';

/// Rows are build, raster and total-span milliseconds. This pure summarizer
/// does not establish that supplied data came from a native profile run.
Map<String, dynamic> summarizeFidelityFrames(
    List<List<double>> samples, double refreshHz) {
  if (!refreshHz.isFinite ||
      refreshHz <= 0 ||
      samples.any(
          (row) => row.length != 3 || row.any((v) => !v.isFinite || v < 0))) {
    throw ArgumentError(
        'Use a positive refresh rate and finite nonnegative build/raster/span samples.');
  }
  final budget = 1000 / refreshHz;
  Map<String, double>? distribution(int index) {
    if (samples.isEmpty) return null;
    final values = samples.map((row) => row[index]).toList()..sort();
    double percentile(double p) =>
        values[(p * values.length).ceil().clamp(1, values.length) - 1];
    return {
      'p50': percentile(.5),
      'p90': percentile(.9),
      'p99': percentile(.99),
      'max': values.last,
      'mean': values.reduce((a, b) => a + b) / values.length
    };
  }

  return {
    'frameCount': samples.length,
    'refreshHz': refreshHz,
    'frameBudgetMs': budget,
    'buildMs': distribution(0),
    'rasterMs': distribution(1),
    'totalSpanMs': distribution(2),
    'missedBuildBudgetCount': samples.where((row) => row[0] > budget).length,
    'missedRasterBudgetCount': samples.where((row) => row[1] > budget).length,
    'overBudgetFrameCount':
        samples.where((row) => row[0] > budget || row[1] > budget).length,
    'samplesMs': samples
  };
}

/// Execute on a named device in profile mode after explicit warmup (if any).
/// action must include its intended interaction and completion condition.
Future<Map<String, dynamic>> collectFidelityPerformance({
  required Future<void> Function() action,
  required String scenario,
  required String device,
  required String revision,
  required String flutterVersion,
  required String renderer,
  required String dataset,
  required String thermalAndPowerState,
  required double refreshHz,
  required bool cold,
  bool includeProcessRss = false,
}) async {
  if (!kProfileMode)
    throw StateError(
        'Runtime performance evidence requires --profile on a supported native device.');
  for (final value in [
    scenario,
    device,
    revision,
    flutterVersion,
    renderer,
    dataset,
    thermalAndPowerState
  ]) {
    if (value.trim().isEmpty)
      throw ArgumentError('Performance environment fields must be nonempty.');
  }
  summarizeFidelityFrames([], refreshHz);
  final samples = <FrameTiming>[];
  void receive(List<FrameTiming> frames) => samples.addAll(frames);
  final binding = SchedulerBinding.instance;
  binding.addTimingsCallback(receive);
  final start = developer.Timeline.now;
  final rssBefore = includeProcessRss ? ProcessInfo.currentRss : null;
  try {
    await action();
    await binding.endOfFrame;
    final end = developer.Timeline.now;
    final rssAfter = includeProcessRss ? ProcessInfo.currentRss : null;
    // Engine timing notifications are batched; filter by frame start afterwards.
    await Future<void>.delayed(const Duration(milliseconds: 600));
    final measured = samples.where((frame) =>
        frame.timestampInMicroseconds(FramePhase.buildStart) >= start &&
        frame.timestampInMicroseconds(FramePhase.buildStart) <= end);
    final summary = summarizeFidelityFrames(
        measured
            .map((frame) => [
                  frame.buildDuration.inMicroseconds / 1000,
                  frame.rasterDuration.inMicroseconds / 1000,
                  frame.totalSpan.inMicroseconds / 1000,
                ])
            .toList(),
        refreshHz);
    return {
      'version': 1,
      'status': summary['frameCount'] == 0 ? 'incomplete' : 'measured',
      'mode': 'profile',
      'platform': Platform.operatingSystem,
      'osVersion': Platform.operatingSystemVersion,
      'scenario': scenario,
      'device': device,
      'revision': revision,
      'flutterVersion': flutterVersion,
      'renderer': renderer,
      'dataset': dataset,
      'thermalAndPowerState': thermalAndPowerState,
      'cold': cold,
      'summary': summary,
      'processRssBytes':
          includeProcessRss ? {'before': rssBefore, 'after': rssAfter} : null,
      'limitations': [
        'FrameTiming samples are not a full CPU/GPU trace.',
        'RSS is process resident memory, not Dart heap or peak allocation.',
        'Device, refresh rate and environment labels must be verified by the caller.'
      ]
    };
  } finally {
    binding.removeTimingsCallback(receive);
  }
}
