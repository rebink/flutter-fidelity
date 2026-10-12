library fidelity_harness;

import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:flutter/services.dart';
import 'package:flutter_test/flutter_test.dart';

/// The CLI transmits a confirmed profile and reference identity to a test entrypoint.
class FidelityRequest {
  FidelityRequest(this.data);
  factory FidelityRequest.fromEnvironment() {
    const encoded = String.fromEnvironment('FIDELITY_REQUEST');
    if (encoded.isEmpty)
      throw StateError(
          'Run through flutter-fidelity capture, or set FIDELITY_REQUEST.');
    return FidelityRequest(
        jsonDecode(utf8.decode(base64Decode(encoded))) as Map<String, dynamic>);
  }
  final Map<String, dynamic> data;
  Map<String, dynamic> get profile => data['profile'] as Map<String, dynamic>;
  double get width => (profile['width'] as num).toDouble();
  double get height => (profile['height'] as num).toDouble();
  double get pixelRatio => (profile['pixelRatio'] as num).toDouble();
  String get mode => data['mode'] as String;
  String get output => data['output'] as String;
  String get flutterVersion => data['flutterVersion'] as String;
  String get referenceSha256 => data['referenceSha256'] as String;
  List<Map<String, dynamic>> get fonts =>
      (data['fonts'] as List).cast<Map<String, dynamic>>();
}

/// Wrap real widgets with stable inferred screenshot region IDs. Remove these
/// wrappers from production entrypoints; they do not paint anything.
class FidelityRegion extends SingleChildRenderObjectWidget {
  const FidelityRegion({required this.id, required super.child, super.key});
  final String id;
  @override
  RenderObject createRenderObject(BuildContext context) => _RegionBox(id);
  @override
  void updateRenderObject(
      BuildContext context, covariant _RegionBox renderObject) {
    renderObject.id = id;
  }
}

class _RegionBox extends RenderProxyBox {
  _RegionBox(this.id);
  String id;
}

class FidelitySurface extends StatelessWidget {
  const FidelitySurface(
      {required this.request,
      required this.boundaryKey,
      required this.child,
      this.theme,
      super.key});
  final FidelityRequest request;
  final GlobalKey boundaryKey;
  final Widget child;
  final ThemeData? theme;
  @override
  Widget build(BuildContext context) {
    final profile = request.profile;
    final insets = profile['safeInsets'] as Map<String, dynamic>;
    final localeParts = (profile['locale'] as String).split(RegExp('[-_]'));
    final data = MediaQueryData(
      size: Size(request.width, request.height),
      devicePixelRatio: request.pixelRatio,
      textScaler: TextScaler.linear((profile['textScale'] as num).toDouble()),
      platformBrightness:
          profile['brightness'] == 'dark' ? Brightness.dark : Brightness.light,
      padding: EdgeInsets.fromLTRB(
          (insets['left'] as num).toDouble(),
          (insets['top'] as num).toDouble(),
          (insets['right'] as num).toDouble(),
          (insets['bottom'] as num).toDouble()),
    );
    return RepaintBoundary(
      key: boundaryKey,
      child: MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: Locale(
            localeParts.first, localeParts.length > 1 ? localeParts[1] : null),
        theme: theme ?? ThemeData(brightness: data.platformBrightness),
        builder: (context, app) => MediaQuery(data: data, child: app!),
        home: child,
      ),
    );
  }
}

/// The font family defaults to the prefix before '-': Lato-Regular.ttf -> Lato.
/// Pass explicit family names for fonts whose filenames do not follow this convention.
final _loadedFontHashes = <String>{};

Future<void> loadFidelityFonts(FidelityRequest request,
    {Map<String, String> families = const {}}) async {
  _loadedFontHashes.clear();
  final groups = <String, FontLoader>{};
  for (final font in request.fonts) {
    final name = font['name'] as String;
    final family = families[name] ??
        name
            .replaceAll(RegExp(r'\.(ttf|otf)$', caseSensitive: false), '')
            .split('-')
            .first;
    final bytes = request.mode == 'widget'
        ? Uint8List.fromList(await File(font['path'] as String).readAsBytes())
        : (await rootBundle.load('assets/fidelity_fonts/$name'))
            .buffer
            .asUint8List();
    final digest = sha256.convert(bytes).toString();
    if (digest != font['sha256'])
      throw StateError('Font differs from reference bundle: $name');
    _loadedFontHashes.add(digest);
    final loader = groups.putIfAbsent(family, () => FontLoader(family));
    loader.addFont(Future.value(ByteData.sublistView(bytes)));
  }
  for (final loader in groups.values) {
    await loader.load();
  }
}

/// Write this return value to disk in widget tests, or into reportData in a native
/// integration test for transport back to the host driver.
Future<Map<String, dynamic>> captureFidelity(
    WidgetTester tester, FidelityRequest request, GlobalKey boundaryKey,
    {bool fontsLoaded = false, Map<String, String> checks = const {}}) async {
  await tester.pumpAndSettle(const Duration(milliseconds: 100),
      EnginePhase.sendSemanticsUpdate, const Duration(seconds: 15));
  final boundary =
      boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  final origin = boundary.localToGlobal(Offset.zero);
  final regions = <Map<String, dynamic>>[];
  final ids = <String>{};
  void visit(RenderObject object) {
    if (object is _RegionBox &&
        object.hasSize &&
        object.attached &&
        object.size.width > 0 &&
        object.size.height > 0) {
      if (!ids.add(object.id))
        throw StateError('Duplicate region ID: ${object.id}');
      final point = object.localToGlobal(Offset.zero) - origin;
      final text = <String>[];
      void collectText(RenderObject child) {
        if (child is RenderParagraph) text.add(child.text.toPlainText());
        child.visitChildren(collectText);
      }

      object.visitChildren(collectText);
      // Read actual RenderParagraph content, rather than accepting a declared
      // reference transcription as proof of rendered text.
      regions.add({
        'id': object.id,
        'bounds': {
          'x': point.dx,
          'y': point.dy,
          'width': object.size.width,
          'height': object.size.height
        },
        if (text.isNotEmpty) 'text': text.join('\n')
      });
    }
    object.visitChildren(visit);
  }

  visit(boundary);
  final errors = <String>[];
  Object? error;
  while ((error = tester.takeException()) != null) {
    errors.add(error.toString());
  }
  final png = (await tester.runAsync(() async {
    final image = await boundary.toImage(pixelRatio: request.pixelRatio);
    final bytes = (await image.toByteData(format: ui.ImageByteFormat.png))!;
    final result = Uint8List.fromList(
        bytes.buffer.asUint8List(bytes.offsetInBytes, bytes.lengthInBytes));
    image.dispose();
    return result;
  }))!;
  return {
    'png': base64Encode(png),
    'metadata': {
      'version': 1,
      'profile': request.profile,
      'mode': request.mode,
      'platform': request.mode == 'widget'
          ? 'widget-${Platform.operatingSystem}'
          : Platform.operatingSystem,
      'flutterVersion': request.flutterVersion,
      'createdAt': DateTime.now().toUtc().toIso8601String(),
      'referenceSha256': request.referenceSha256,
      'regions': regions,
      'imageSha256': sha256.convert(png).toString(),
      'fontSha256': _loadedFontHashes.toList(),
      'fontsLoaded': fontsLoaded && request.fonts.isNotEmpty,
      'settled': true,
      'runtimeErrors': errors,
      'checks': {
        'analysis': 'not-run',
        'interactions': checks['interactions'] ?? 'not-run',
        'accessibility': checks['accessibility'] ?? 'not-run',
        'responsive': checks['responsive'] ?? 'not-run'
      },
    },
  };
}

Future<void> writeFidelityCapture(
    FidelityRequest request, Map<String, dynamic> capture) async {
  await Directory(request.output).create(recursive: true);
  await File('${request.output}/actual.png')
      .writeAsBytes(base64Decode(capture['png'] as String));
  await File('${request.output}/capture.json').writeAsString(
      '${const JsonEncoder.withIndent('  ').convert(capture['metadata'])}\n');
}
