import 'dart:convert';
import 'dart:io';
import 'package:integration_test/integration_test_driver.dart';

Future<void> main() async {
  final output = Platform.environment['FIDELITY_CAPTURE_OUTPUT'];
  if (output == null) {
    throw StateError('Native capture requires CLI output path');
  }
  await integrationDriver(responseDataCallback: (data) async {
    if (data == null || data['png'] == null || data['metadata'] == null) {
      throw StateError('Native capture missing');
    }
    await File('$output/actual.png')
        .writeAsBytes(base64Decode(data['png'] as String));
    await File('$output/capture.json').writeAsString(
        '${const JsonEncoder.withIndent('  ').convert(data['metadata'])}\n');
  });
}
