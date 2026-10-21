import 'package:flutter/material.dart';

void main() => runApp(const JournalApp());

const _paper = Color(0xfff5f3f1);
const _ink = Color(0xff17181c);
const _entries = [
  ('Alcohol', 'Did you drink today?', 'alcohol'),
  ('Smoking / vaping', 'Did you smoke or vape today?', 'smoking'),
  ('Late or heavy meal', 'Did you eat a late or heavy meal?', 'meal'),
  ('Feeling unwell', 'When did you start feeling unwell?', 'unwell'),
  ('Mood', 'How are you feeling?', 'mood'),
];

class JournalApp extends StatelessWidget {
  const JournalApp({super.key});

  @override
  Widget build(BuildContext context) => MaterialApp(
        title: 'Journal',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          useMaterial3: true,
          fontFamily: 'Lato',
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff5856d5)),
          scaffoldBackgroundColor: _paper,
        ),
        home: const JournalScreen(),
      );
}

class JournalScreen extends StatefulWidget {
  const JournalScreen({super.key});

  @override
  State<JournalScreen> createState() => _JournalScreenState();
}

class _JournalScreenState extends State<JournalScreen> {
  int _day = 28;
  final Map<(int, String), String> _answers = {};
  final _dates = ScrollController();

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_dates.hasClients) _dates.jumpTo(_dates.position.maxScrollExtent);
    });
  }

  @override
  void dispose() {
    _dates.dispose();
    super.dispose();
  }

  Future<void> _record((String, String, String) entry) async {
    final day = _day;
    final answer = await showModalBottomSheet<String>(
      context: context,
      showDragHandle: true,
      isScrollControlled: true,
      builder: (context) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(entry.$1, style: Theme.of(context).textTheme.headlineSmall),
              const SizedBox(height: 8),
              Text('${entry.$2}\n$day September 2026'),
              const SizedBox(height: 20),
              Wrap(
                spacing: 10,
                runSpacing: 10,
                children: [
                  for (final choice in entry.$3 == 'mood'
                      ? ['Terrible', 'Bad', 'Fine', 'Good', 'Awesome']
                      : entry.$3 == 'unwell'
                          ? ['Not feeling unwell', 'Today', 'Earlier']
                          : ['No', 'Yes'])
                    OutlinedButton(
                      onPressed: () => Navigator.pop(context, choice),
                      child: Text(choice),
                    ),
                ],
              ),
              const SizedBox(height: 12),
              const Text('Demo only. Entries are not saved after a reload.'),
            ],
          ),
        ),
      ),
    );
    if (mounted && answer != null) {
      setState(() => _answers[(day, entry.$3)] = answer);
    }
  }

  @override
  Widget build(BuildContext context) => Scaffold(
        backgroundColor: const Color(0xffe9e6e3),
        body: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 402),
            child: LayoutBuilder(builder: (context, constraints) {
              return SingleChildScrollView(
                child: Container(
                  constraints: BoxConstraints(minHeight: constraints.maxHeight),
                  color: const Color(0xff35337e),
                  child: Column(
                    children: [
                      _header(),
                      Container(
                        constraints: BoxConstraints(
                          minHeight: (constraints.maxHeight - 283)
                              .clamp(591, double.infinity),
                        ),
                        decoration: const BoxDecoration(
                          color: _paper,
                          borderRadius:
                              BorderRadius.vertical(top: Radius.circular(36)),
                        ),
                        child: Column(
                          children: [
                            const SizedBox(height: 5),
                            Container(
                              width: 36,
                              height: 5,
                              decoration: BoxDecoration(
                                color: const Color(0xffc3c1bf),
                                borderRadius: BorderRadius.circular(5),
                              ),
                            ),
                            Padding(
                              padding: const EdgeInsets.fromLTRB(16, 6, 16, 0),
                              child: Column(children: [
                                for (final entry in _entries) _card(entry),
                              ]),
                            ),
                            SizedBox(
                                height: (constraints.maxHeight - 812)
                                    .clamp(49, double.infinity)),
                            ExcludeSemantics(
                              child: Container(
                                width: 144,
                                height: 5,
                                decoration: BoxDecoration(
                                  color: _ink,
                                  borderRadius: BorderRadius.circular(5),
                                ),
                              ),
                            ),
                            const SizedBox(height: 8),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              );
            }),
          ),
        ),
      );

  Widget _header() => Container(
        constraints: const BoxConstraints(minHeight: 283),
        padding: const EdgeInsets.only(bottom: 32),
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Color(0xff5856d6), Color(0xff35337e)],
          ),
        ),
        child: Column(children: [
          SizedBox(
            height: 64,
            child: Stack(alignment: Alignment.topCenter, children: [
              const Positioned(
                top: 18,
                left: 33,
                child: Text('12.27',
                    style: TextStyle(
                        color: Color(0xffebeaff),
                        fontSize: 16,
                        fontWeight: FontWeight.w700)),
              ),
              Positioned(
                  top: 8,
                  child: Image.asset('assets/images/island.png',
                      width: 120, height: 40, excludeFromSemantics: true)),
              const Positioned(
                right: 32,
                top: 20,
                child: Row(children: [
                  Icon(Icons.signal_cellular_alt,
                      size: 19, color: Color(0xffebeaff)),
                  SizedBox(width: 5),
                  Icon(Icons.wifi, size: 19, color: Color(0xffebeaff)),
                  SizedBox(width: 5),
                  Icon(Icons.battery_full, size: 22, color: Color(0xffebeaff)),
                ]),
              ),
            ]),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(children: [
              _roundButton(Icons.chevron_left, 'Back', () {
                ScaffoldMessenger.of(context).showSnackBar(const SnackBar(
                    content:
                        Text('This demo contains only the Journal screen.')));
              }),
              const Expanded(
                child: Column(children: [
                  Text('Journal',
                      style: TextStyle(
                          color: Colors.white,
                          fontSize: 24,
                          fontWeight: FontWeight.w700,
                          height: 1.25)),
                  Text('Sep 2026 ↕',
                      style: TextStyle(
                          color: Color(0xffc5c4ed), fontSize: 16, height: 1.5)),
                ]),
              ),
              _roundButton(
                  Icons.info_outline,
                  'About your journal',
                  () => showDialog<void>(
                        context: context,
                        builder: (context) => AlertDialog(
                          title: const Text('Your daily journal'),
                          content: const Text(
                              'Track habits and how you feel. Select a date, then tap a topic to add an entry. This is a local demo, not medical advice. Entries disappear when you reload.'),
                          actions: [
                            TextButton(
                                onPressed: () => Navigator.pop(context),
                                child: const Text('Got it'))
                          ],
                        ),
                      )),
            ]),
          ),
          const SizedBox(height: 34),
          SizedBox(
            height: 99 * MediaQuery.textScalerOf(context).scale(1),
            child: ListView.separated(
              controller: _dates,
              padding: const EdgeInsets.symmetric(horizontal: 16),
              scrollDirection: Axis.horizontal,
              itemCount: 8,
              separatorBuilder: (_, __) => const SizedBox(width: 12),
              itemBuilder: (context, index) {
                final day = 21 + index;
                final selected = day == _day;
                final checked = [21, 22, 25, 26, 28].contains(day);
                return Semantics(
                  button: true,
                  selected: selected,
                  label: 'September $day, 2026',
                  child: InkWell(
                    onTap: () => setState(() => _day = day),
                    borderRadius: BorderRadius.circular(24),
                    child: SizedBox(
                      width: 40 * MediaQuery.textScalerOf(context).scale(1),
                      child: Column(children: [
                        Text(
                            [
                              'Mon',
                              'Tue',
                              'Wed',
                              'Thu',
                              'Fri',
                              'Sat',
                              'Sun',
                              'Mon'
                            ][index],
                            style: TextStyle(
                                fontSize: 12,
                                color: selected
                                    ? Colors.white
                                    : const Color(0xffa6a4d9))),
                        const SizedBox(height: 8),
                        Container(
                          height:
                              66 * MediaQuery.textScalerOf(context).scale(1),
                          width: 40 * MediaQuery.textScalerOf(context).scale(1),
                          decoration: BoxDecoration(
                            color: selected
                                ? Colors.black
                                : Colors.white.withValues(alpha: .04),
                            borderRadius: BorderRadius.circular(24),
                            border: Border.all(
                                color: Colors.white
                                    .withValues(alpha: selected ? .3 : .35)),
                          ),
                          child: Column(children: [
                            const SizedBox(height: 11),
                            Container(
                              width: 20,
                              height: 20,
                              decoration: BoxDecoration(
                                  shape: BoxShape.circle,
                                  color: checked
                                      ? const Color(0xff299449)
                                          .withValues(alpha: .55)
                                      : const Color(0xff8c89c5)),
                              child: Icon(checked ? Icons.check : Icons.remove,
                                  size: 15,
                                  color: checked
                                      ? const Color(0xff32d65e)
                                      : Colors.white),
                            ),
                            const SizedBox(height: 7),
                            Text('$day',
                                style: TextStyle(
                                    fontSize: 14,
                                    fontWeight: FontWeight.w700,
                                    color: selected
                                        ? Colors.white
                                        : const Color(0xffcfceeb))),
                          ]),
                        ),
                      ]),
                    ),
                  ),
                );
              },
            ),
          ),
        ]),
      );

  Widget _roundButton(IconData icon, String label, VoidCallback onPressed) =>
      Container(
        width: 40,
        height: 40,
        decoration: BoxDecoration(
          shape: BoxShape.circle,
          border: Border.all(color: Colors.white.withValues(alpha: .3)),
          gradient: LinearGradient(colors: [
            Colors.white.withValues(alpha: .02),
            Colors.white.withValues(alpha: .07)
          ]),
        ),
        child: IconButton(
            padding: EdgeInsets.zero,
            tooltip: label,
            onPressed: onPressed,
            icon: Icon(icon, color: Colors.white, size: 24)),
      );

  Widget _card((String, String, String) entry) => Padding(
        padding: const EdgeInsets.only(bottom: 12),
        child: Material(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          child: InkWell(
            borderRadius: BorderRadius.circular(18),
            onTap: () => _record(entry),
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 88),
              child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                child: Row(children: [
                  Image.asset('assets/images/${entry.$3}.png',
                      width: 48, height: 48, excludeFromSemantics: true),
                  const SizedBox(width: 16),
                  Expanded(
                    child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          ShaderMask(
                            blendMode: BlendMode.srcIn,
                            shaderCallback: (bounds) => const LinearGradient(
                                    colors: [_ink, Color(0xff666a80)])
                                .createShader(bounds),
                            child: Text(entry.$1,
                                style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w700,
                                    height: 1.25)),
                          ),
                          Container(
                              width: 18,
                              height: 2,
                              margin: const EdgeInsets.only(top: 2, bottom: 4),
                              color: const Color(0xffff4057)),
                          Text(_answers[(_day, entry.$3)] ?? entry.$2,
                              style: const TextStyle(
                                  fontSize: 14,
                                  color: Color(0xff919194),
                                  height: 1.3)),
                        ]),
                  ),
                  const SizedBox(width: 6),
                  const Icon(Icons.chevron_right, color: _ink, size: 22),
                ]),
              ),
            ),
          ),
        ),
      );
}
