import 'dart:convert';
import 'package:fidelity_harness/fidelity_harness.dart';
import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_test/flutter_test.dart';

FidelityRequest request({String locale = 'en-US'}) => FidelityRequest({
      'profile': {
        'width': 400,
        'height': 600,
        'pixelRatio': 1,
        'textScale': 1,
        'locale': locale,
        'brightness': 'light',
        'safeInsets': {'left': 0, 'right': 0, 'top': 24, 'bottom': 16}
      },
      'fonts': [],
      'mode': 'widget',
      'output': '/unused',
      'flutterVersion': 'test',
      'referenceSha256': '0' * 64,
    });

void viewport(WidgetTester tester) {
  tester.view.physicalSize = const Size(400, 600);
  tester.view.devicePixelRatio = 1;
  addTearDown(tester.view.resetPhysicalSize);
  addTearDown(tester.view.resetDevicePixelRatio);
}

void main() {
  test('locale parser retains script and region', () {
    expect(
        fidelityLocale('zh-Hant-TW'),
        const Locale.fromSubtags(
            languageCode: 'zh', scriptCode: 'Hant', countryCode: 'TW'));
    expect(fidelityLocale('ar_EG'), const Locale('ar', 'EG'));
    expect(() => fidelityLocale('en-US-unhandled'), throwsArgumentError);
  });

  testWidgets(
      'production adapter preserves localization, theme, keyboard and navigator',
      (tester) async {
    viewport(tester);
    final key = GlobalKey();
    final profile = request(locale: 'ar');
    late BuildContext pageContext;
    await tester.pumpWidget(MaterialApp(
      locale: const Locale('ar'),
      supportedLocales: const [Locale('ar')],
      localizationsDelegates: GlobalMaterialLocalizations.delegates,
      theme: ThemeData(colorSchemeSeed: Colors.purple),
      builder: (context, child) => MediaQuery(
          data: MediaQuery.of(context).copyWith(
              viewInsets: const EdgeInsets.only(bottom: 200),
              disableAnimations: true),
          child: FidelityCaptureAdapter(
              request: profile, boundaryKey: key, child: child!)),
      home: Builder(builder: (context) {
        pageContext = context;
        return Scaffold(
            body: TextButton(
                onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                        builder: (_) => const Scaffold(body: Text('Next')))),
                child: const Text('Open')));
      }),
    ));
    await tester.pumpAndSettle();
    expect(Localizations.localeOf(pageContext), const Locale('ar'));
    expect(Directionality.of(pageContext), TextDirection.rtl);
    expect(MediaQuery.of(pageContext).viewInsets.bottom, 200);
    expect(MediaQuery.of(pageContext).viewPadding.top, 24);
    expect(MediaQuery.of(pageContext).padding.bottom, 0);
    expect(MediaQuery.of(pageContext).disableAnimations, isTrue);
    expect(Theme.of(pageContext).colorScheme.primary,
        ThemeData(colorSchemeSeed: Colors.purple).colorScheme.primary);
    await tester.tap(find.text('Open'));
    await tester.pumpAndSettle();
    expect(find.text('Next'), findsOneWidget);
    final capture = await captureFidelity(tester, profile, key,
        readiness: const CaptureReadiness.prepared(
            'Navigation and localization painted'));
    expect((capture['metadata'] as Map)['version'], 2);
  });

  testWidgets('isolated shell supports supplied script locale configuration',
      (tester) async {
    viewport(tester);
    final profile = request(locale: 'zh-Hant-TW');
    final key = GlobalKey();
    late Locale resolved;
    await tester.pumpWidget(FidelitySurface(
        request: profile,
        boundaryKey: key,
        supportedLocales: [fidelityLocale('zh-Hant-TW')],
        localizationsDelegates: GlobalMaterialLocalizations.delegates,
        child: Builder(builder: (context) {
          resolved = Localizations.localeOf(context);
          return const Text('Hello');
        })));
    await tester.pumpAndSettle();
    expect(resolved, fidelityLocale('zh-Hant-TW'));
    await captureFidelity(tester, profile, key);
  });

  testWidgets('editable values, masked text and overflow are separate evidence',
      (tester) async {
    viewport(tester);
    final key = GlobalKey();
    final profile = request();
    final input = TextEditingController(text: 'Ada');
    final password = TextEditingController(text: 'secret-value');
    addTearDown(input.dispose);
    addTearDown(password.dispose);
    await tester.pumpWidget(FidelitySurface(
        request: profile,
        boundaryKey: key,
        child: Scaffold(
            body: Column(children: [
          FidelityRegion(id: 'name', child: TextField(controller: input)),
          FidelityRegion(
              id: 'password',
              child: TextField(controller: password, obscureText: true)),
          const FidelityRegion(
              id: 'ellipsis',
              child: SizedBox(
                  width: 50,
                  child: Text('A label longer than its available width',
                      maxLines: 1, overflow: TextOverflow.ellipsis))),
          const ClipRect(
              child: SizedBox(
                  height: 8,
                  child: OverflowBox(
                      maxHeight: 60,
                      child: FidelityRegion(
                          id: 'clipped', child: Text('Clipped'))))),
        ]))));
    await tester.pumpAndSettle();
    final capture = await captureFidelity(tester, profile, key);
    final metadata = capture['metadata'] as Map;
    final regions = {for (final r in metadata['regions'] as List) r['id']: r};
    expect(regions['name']['text'], 'Ada');
    expect(regions['name']['textVisibility'], 'no-overflow-detected');
    expect(regions['password']['textObscured'], isTrue);
    expect(jsonEncode(metadata), isNot(contains('secret-value')));
    expect(regions['ellipsis']['textVisibility'], 'overflow-detected');
    expect(regions['clipped']['textVisibility'], 'overflow-detected');
  });

  testWidgets('prepared capture does not advance a running animation',
      (tester) async {
    viewport(tester);
    final profile = request(), key = GlobalKey();
    await tester.pumpWidget(FidelitySurface(
        request: profile,
        boundaryKey: key,
        child: const Center(child: CircularProgressIndicator())));
    await tester.pump(const Duration(milliseconds: 250));
    final before = tester.binding.clock.now();
    final result = await captureFidelity(tester, profile, key,
        readiness: const CaptureReadiness.prepared(
            'Assets ready; selected spinner frame at 250ms'));
    expect(tester.binding.clock.now(), before);
    expect((result['metadata'] as Map)['readiness']['strategy'], 'prepared');
    await tester.pumpWidget(const SizedBox());
  });
}
