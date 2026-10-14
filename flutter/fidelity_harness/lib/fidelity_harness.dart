library fidelity_harness;

import 'dart:convert';
import 'dart:io';
import 'dart:ui' as ui;
import 'package:crypto/crypto.dart';
import 'package:flutter/material.dart';
import 'package:flutter/foundation.dart' show kDebugMode;
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

/// Parses language[-Script][-REGION] without treating a script as a country.
Locale fidelityLocale(String value) {
  final parts = value.replaceAll('_', '-').split('-');
  if (parts.isEmpty || !RegExp(r'^[a-zA-Z]{2,3}$').hasMatch(parts.first)) {
    throw ArgumentError('Use language[-Script][-REGION] locale tags.');
  }
  String? script, country;
  for (final part in parts.skip(1)) {
    if (script == null &&
        country == null &&
        RegExp(r'^[a-zA-Z]{4}$').hasMatch(part)) {
      script = part[0].toUpperCase() + part.substring(1).toLowerCase();
    } else if (country == null &&
        RegExp(r'^([a-zA-Z]{2}|[0-9]{3})$').hasMatch(part)) {
      country = part.toUpperCase();
    } else {
      throw ArgumentError('Unsupported locale tag: $value');
    }
  }
  return Locale.fromSubtags(
      languageCode: parts.first.toLowerCase(),
      scriptCode: script,
      countryCode: country);
}

/// Place inside the production app's builder, retaining its navigator,
/// localization delegates, theme, providers and inherited platform settings.
class FidelityCaptureAdapter extends StatelessWidget {
  const FidelityCaptureAdapter(
      {required this.request,
      required this.boundaryKey,
      required this.child,
      this.preservePlatformTextScaler = false,
      super.key});
  final FidelityRequest request;
  final GlobalKey boundaryKey;
  final Widget child;
  final bool preservePlatformTextScaler;
  @override
  Widget build(BuildContext context) {
    final profile = request.profile;
    final inherited = MediaQuery.of(context);
    final insets = profile['safeInsets'] as Map<String, dynamic>;
    final safe = EdgeInsets.fromLTRB(
        (insets['left'] as num).toDouble(),
        (insets['top'] as num).toDouble(),
        (insets['right'] as num).toDouble(),
        (insets['bottom'] as num).toDouble());
    final data = inherited.copyWith(
        size: Size(request.width, request.height),
        devicePixelRatio: request.pixelRatio,
        textScaler: preservePlatformTextScaler
            ? inherited.textScaler
            : TextScaler.linear((profile['textScale'] as num).toDouble()),
        platformBrightness: profile['brightness'] == 'dark'
            ? Brightness.dark
            : Brightness.light,
        viewPadding: safe,
        padding: (safe - inherited.viewInsets)
            .clamp(EdgeInsets.zero, safe)
            .resolve(TextDirection.ltr));
    return MediaQuery(
        data: data, child: RepaintBoundary(key: boundaryKey, child: child));
  }
}

/// Convenience shell for isolated widgets. Integrated features should use
/// FidelityCaptureAdapter inside their production shell instead.
class FidelitySurface extends StatelessWidget {
  const FidelitySurface(
      {required this.request,
      required this.boundaryKey,
      required this.child,
      this.theme,
      this.localizationsDelegates,
      this.supportedLocales = const [Locale('en', 'US')],
      super.key});
  final FidelityRequest request;
  final GlobalKey boundaryKey;
  final Widget child;
  final ThemeData? theme;
  final Iterable<LocalizationsDelegate<dynamic>>? localizationsDelegates;
  final Iterable<Locale> supportedLocales;
  @override
  Widget build(BuildContext context) {
    final locale = fidelityLocale(request.profile['locale'] as String);
    if (!supportedLocales.contains(locale)) {
      throw StateError(
          'Requested locale $locale is not declared in supportedLocales. Supply the app localization configuration.');
    }
    return MaterialApp(
        debugShowCheckedModeBanner: false,
        locale: locale,
        supportedLocales: supportedLocales,
        localizationsDelegates: localizationsDelegates,
        theme: theme ??
            ThemeData(
                brightness: request.profile['brightness'] == 'dark'
                    ? Brightness.dark
                    : Brightness.light),
        builder: (context, app) => FidelityCaptureAdapter(
            request: request, boundaryKey: boundaryKey, child: app!),
        home: child);
  }
}

/// Prepared mode never pumps time: the caller has loaded assets and painted a
/// selected frame. Settle mode is only appropriate for finite animation work.
class CaptureReadiness {
  const CaptureReadiness.settle()
      : strategy = 'settle',
        description = 'Finite work settled before capture';
  const CaptureReadiness.prepared(this.description) : strategy = 'prepared';
  final String strategy;
  final String description;
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
    {bool fontsLoaded = false,
    Map<String, String> checks = const {},
    CaptureReadiness readiness = const CaptureReadiness.settle()}) async {
  if (readiness.description.trim().isEmpty)
    throw ArgumentError('Describe capture readiness.');
  if (readiness.strategy == 'settle')
    await tester.pumpAndSettle(const Duration(milliseconds: 100),
        EnginePhase.sendSemanticsUpdate, const Duration(seconds: 15));
  final boundary =
      boundaryKey.currentContext!.findRenderObject()! as RenderRepaintBoundary;
  if (kDebugMode && boundary.debugNeedsPaint)
    throw StateError(
        'Capture boundary needs paint. Pump the selected frame before prepared capture.');
  final actualLocale = Localizations.maybeLocaleOf(boundaryKey.currentContext!);
  if (actualLocale != null &&
      actualLocale != fidelityLocale(request.profile['locale'] as String)) {
    throw StateError(
        'Resolved app locale differs from the capture profile: $actualLocale');
  }
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
      var overflow = false;
      var obscured = false;
      void collectText(RenderObject child) {
        if (child is RenderParagraph) {
          text.add(child.text.toPlainText());
          overflow = overflow || child.didExceedMaxLines;
        } else if (child is RenderEditable) {
          final rendered = child.text?.toPlainText() ?? '';
          // Even transient last-character reveal must not leak into JSON reports.
          text.add(child.obscureText
              ? List.filled(rendered.length, child.obscuringCharacter).join()
              : rendered);
          obscured = obscured || child.obscureText;
          overflow = overflow || child.maxScrollExtent > 0;
        }
        if (child is RenderParagraph || child is RenderEditable) {
          RenderObject descendant = child;
          RenderObject? parent = descendant.parent;
          while (parent != null) {
            final clip = parent.describeApproximatePaintClip(descendant);
            if (clip != null) {
              final painted = MatrixUtils.transformRect(
                  child.getTransformTo(parent), child.paintBounds);
              overflow = overflow ||
                  !clip.inflate(0.5).contains(painted.topLeft) ||
                  !clip.inflate(0.5).contains(painted.bottomRight);
            }
            if (parent == boundary) break;
            descendant = parent;
            parent = parent.parent;
          }
          final painted = MatrixUtils.transformRect(
              child.getTransformTo(boundary), child.paintBounds);
          final surface = (Offset.zero & boundary.size).inflate(0.5);
          overflow = overflow ||
              !surface.contains(painted.topLeft) ||
              !surface.contains(painted.bottomRight);
        }
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
        if (text.isNotEmpty) ...{
          'text': text.join('\n'),
          'textVisibility':
              overflow ? 'overflow-detected' : 'no-overflow-detected',
          'textObscured': obscured,
        }
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
      'version': 2,
      'readiness': {
        'strategy': readiness.strategy,
        'description': readiness.description
      },
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
