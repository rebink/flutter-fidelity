import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'training_screen.dart';

typedef RegionBuilder = Widget Function(String, Widget);
Widget plainRegion(String id, Widget child) => child;

class WellnessScreen extends StatefulWidget {
  const WellnessScreen(
      {super.key, this.insights = false, this.regionBuilder = plainRegion});
  final bool insights;
  final RegionBuilder regionBuilder;
  @override
  State<WellnessScreen> createState() => _WellnessScreenState();
}

class _WellnessScreenState extends State<WellnessScreen> {
  late bool dark = widget.insights;
  bool finished = false;
  int steps = 7240;
  int? day;
  Color get ink => dark ? const Color(0xffedf3ff) : const Color(0xff18243a);
  Color get muted => dark ? const Color(0xffa2b0c8) : const Color(0xff65738a);
  Color get cardColor => dark ? const Color(0xff141e33) : Colors.white;
  Widget text(String value,
          {double size = 16, bool bold = false, Color? color}) =>
      Text(value,
          style: TextStyle(
              fontFamily: bold ? 'LatoBold' : 'Lato',
              fontSize: size,
              height: 1.2,
              color: color ?? ink));
  Widget card(Widget child, {double? height, bool hero = false}) => Container(
      height: height,
      width: double.infinity,
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
          color: hero ? null : cardColor,
          borderRadius: BorderRadius.circular(hero ? 24 : 20),
          gradient: hero
              ? LinearGradient(
                  colors: dark
                      ? [const Color(0xff39285d), const Color(0xff222943)]
                      : [const Color(0xff6b51e8), const Color(0xff438bdd)])
              : null),
      child: child);
  Widget region(String id, Widget child) => widget.regionBuilder(id, child);
  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1);
    return Theme(
        data: ThemeData(
            brightness: dark ? Brightness.dark : Brightness.light,
            fontFamily: 'Lato',
            useMaterial3: true,
            colorScheme: ColorScheme.fromSeed(
                seedColor: const Color(0xff5d48d7),
                brightness: dark ? Brightness.dark : Brightness.light)),
        child: Scaffold(
            backgroundColor:
                dark ? const Color(0xff0b1324) : const Color(0xfff7f8fb),
            body: SafeArea(
                top: false,
                bottom: false,
                child: SingleChildScrollView(
                    child: Padding(
                        padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              ConstrainedBox(
                                  constraints:
                                      BoxConstraints(minHeight: 56 * scale),
                                  child: Column(
                                      mainAxisSize: MainAxisSize.min,
                                      crossAxisAlignment:
                                          CrossAxisAlignment.start,
                                      children: [
                                        text(
                                            dark
                                                ? 'Weekly insights'
                                                : 'Daily pulse',
                                            size: 28,
                                            bold: true),
                                        const SizedBox(height: 5),
                                        text(
                                            dark
                                                ? 'Small habits. Meaningful progress.'
                                                : 'Monday, October 12',
                                            size: 14,
                                            color: muted)
                                      ])),
                              const SizedBox(height: 24),
                              region(
                                  'hero',
                                  card(
                                      dark
                                          ? Row(children: [
                                              Expanded(
                                                  child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment
                                                              .start,
                                                      children: [
                                                    text('Recovery score',
                                                        size: 14,
                                                        color: const Color(
                                                            0xffd4ccff)),
                                                    const SizedBox(height: 8),
                                                    text('94',
                                                        size: 40,
                                                        bold: true,
                                                        color: Colors.white)
                                                  ])),
                                              text('+12 this week',
                                                  size: 14,
                                                  bold: true,
                                                  color:
                                                      const Color(0xff9ef0d0))
                                            ])
                                          : Row(children: [
                                              Expanded(
                                                  child: Column(
                                                      crossAxisAlignment:
                                                          CrossAxisAlignment
                                                              .start,
                                                      children: [
                                                    text("Today's energy",
                                                        size: 16,
                                                        bold: true,
                                                        color: Colors.white),
                                                    const SizedBox(height: 11),
                                                    text('82',
                                                        size: 56,
                                                        bold: true,
                                                        color: Colors.white),
                                                    const SizedBox(height: 5),
                                                    text('A great day to move',
                                                        size: 14,
                                                        color: Colors.white),
                                                    const SizedBox(height: 15),
                                                    text('Your daily balance',
                                                        size: 12,
                                                        color: const Color(
                                                            0xffe1ddff))
                                                  ])),
                                              if (scale <= 1.2)
                                                SizedBox(
                                                    width: 96,
                                                    height: 96,
                                                    child: CustomPaint(
                                                        painter: RingPainter(),
                                                        child: Center(
                                                            child: text('82%',
                                                                size: 17,
                                                                bold: true,
                                                                color: Colors
                                                                    .white))))
                                            ]),
                                      height: (dark ? 112 : 196) * scale,
                                      hero: true)),
                              const SizedBox(height: 24),
                              if (!dark) ...[
                                Row(children: [
                                  Expanded(
                                      child: GestureDetector(
                                          onTap: () => showDialog<void>(
                                              context: context,
                                              builder: (context) => AlertDialog(
                                                      title: const Text(
                                                          'Step goal'),
                                                      content: Text(
                                                          '$steps / 10,000 steps'),
                                                      actions: [
                                                        TextButton(
                                                            onPressed: () {
                                                              setState(() =>
                                                                  steps +=
                                                                      1000);
                                                              Navigator.pop(
                                                                  context);
                                                            },
                                                            child: const Text(
                                                                'Add 1,000 steps'))
                                                      ])),
                                          child: Semantics(
                                              button: true,
                                              label: 'Update steps',
                                              child: metric(
                                                  'Steps',
                                                  steps == 7240
                                                      ? '7,240'
                                                      : '8,240',
                                                  height: 92 * scale)))),
                                  const SizedBox(width: 16),
                                  Expanded(
                                      child: metric('Sleep', '7h 42m',
                                          height: 92 * scale))
                                ]),
                                const SizedBox(height: 24),
                                region(
                                    'chart',
                                    card(
                                        Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              text('Weekly activity',
                                                  size: 17, bold: true),
                                              const SizedBox(height: 12),
                                              Expanded(
                                                  child: CustomPaint(
                                                      painter:
                                                          ActivityPainter(),
                                                      size: const Size(
                                                          double.infinity,
                                                          double.infinity)))
                                            ]),
                                        height: 180 * scale)),
                                const SizedBox(height: 24),
                                card(
                                    Row(children: [
                                      Expanded(
                                          child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              children: [
                                            text('Evening wind-down',
                                                size: 16, bold: true),
                                            const SizedBox(height: 5),
                                            text('10 minutes for yourself',
                                                size: 12, color: muted)
                                          ])),
                                      const SizedBox(width: 8),
                                      SizedBox(
                                          width: 90,
                                          height: 48,
                                          child: FilledButton(
                                              style: FilledButton.styleFrom(
                                                  backgroundColor:
                                                      const Color(0xff5d48d7),
                                                  shape: RoundedRectangleBorder(
                                                      borderRadius:
                                                          BorderRadius.circular(
                                                              14)),
                                                  padding: EdgeInsets.zero),
                                              onPressed:
                                                  () =>
                                                      showModalBottomSheet<
                                                              void>(
                                                          context: context,
                                                          builder: (context) =>
                                                              SafeArea(
                                                                  child:
                                                                      Padding(
                                                                          padding: const EdgeInsets
                                                                              .all(
                                                                              24),
                                                                          child: Column(
                                                                              mainAxisSize: MainAxisSize
                                                                                  .min,
                                                                              children: [
                                                                                const Text('Take a quiet moment', style: TextStyle(fontSize: 24)),
                                                                                const SizedBox(height: 16),
                                                                                const Text('Relax your shoulders. Breathe slowly.'),
                                                                                const SizedBox(height: 24),
                                                                                FilledButton(
                                                                                    onPressed: () {
                                                                                      setState(() => finished = true);
                                                                                      Navigator.pop(context);
                                                                                    },
                                                                                    child: const Text('Complete routine'))
                                                                              ])))),
                                              child: text(
                                                  finished ? 'Done' : 'Start',
                                                  size: 14,
                                                  bold: true,
                                                  color: Colors.white)))
                                    ]),
                                    height:
                                        80 * scale + (scale > 1.2 ? 24 : 0)),
                              ] else ...[
                                region(
                                    'chart',
                                    card(
                                        Column(
                                            crossAxisAlignment:
                                                CrossAxisAlignment.start,
                                            children: [
                                              text('Recovery trend',
                                                  size: 17, bold: true),
                                              const SizedBox(height: 12),
                                              Expanded(
                                                  child: Semantics(
                                                      label:
                                                          'Select recovery day',
                                                      child: GestureDetector(
                                                          onTapDown: (d) => setState(() => day =
                                                              (d.localPosition.dx / 300 * 6)
                                                                  .round()
                                                                  .clamp(0, 6)),
                                                          onHorizontalDragUpdate: (d) =>
                                                              setState(() => day =
                                                                  (d.localPosition.dx /
                                                                          300 *
                                                                          6)
                                                                      .round()
                                                                      .clamp(0, 6)),
                                                          child: CustomPaint(painter: TrendPainter(day), size: const Size(double.infinity, double.infinity)))))
                                            ]),
                                        height: 224 * scale)),
                                const SizedBox(height: 24),
                                Row(children: [
                                  Expanded(
                                      child: metric('Active time', '4h 18m',
                                          hint: '+18% this week',
                                          height: 108 * scale)),
                                  const SizedBox(width: 16),
                                  Expanded(
                                      child: metric('Resting heart', '58 bpm',
                                          hint: 'In your usual range',
                                          height: 108 * scale))
                                ]),
                                const SizedBox(height: 24),
                                card(
                                    Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                          Row(children: [
                                            Expanded(
                                                child: text('Mindful minutes',
                                                    bold: true)),
                                            text('68 / 90',
                                                size: 13, color: muted)
                                          ]),
                                          const SizedBox(height: 14),
                                          ClipRRect(
                                              borderRadius:
                                                  BorderRadius.circular(4),
                                              child:
                                                  const LinearProgressIndicator(
                                                      value: 68 / 90,
                                                      minHeight: 8,
                                                      color: Color(0xff9e8cff),
                                                      backgroundColor:
                                                          Color(0xff29344a))),
                                          const SizedBox(height: 10),
                                          text('Keep a little time for you',
                                              size: 11, color: muted)
                                        ]),
                                    height: 100 * scale),
                                const SizedBox(height: 16),
                                TextButton(
                                    onPressed: () => Navigator.push(
                                        context,
                                        MaterialPageRoute<void>(
                                            builder: (_) =>
                                                const TrainingScreen())),
                                    child: text('View training lab', size: 14)),
                              ]
                            ])))),
            bottomNavigationBar: Padding(
                padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
                child: region(
                    'navigation',
                    Container(
                        height: 64,
                        decoration: BoxDecoration(
                            color: cardColor,
                            borderRadius: BorderRadius.circular(20)),
                        padding: const EdgeInsets.symmetric(
                            horizontal: 16, vertical: 8),
                        child: Row(children: [
                          nav('Today', false),
                          const SizedBox(width: 16),
                          nav('Insights', true)
                        ]))))));
  }

  Widget metric(String title, String value,
          {String? hint, required double height}) =>
      card(
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            text(title, size: 13, color: muted),
            const SizedBox(height: 8),
            text(value, size: 26, bold: true),
            if (hint != null) ...[
              const SizedBox(height: 8),
              text(hint,
                  size: 11,
                  color: hint.startsWith('+') ? const Color(0xff9ef0d0) : muted)
            ]
          ]),
          height: height +
              (MediaQuery.textScalerOf(context).scale(1) > 1.2 ? 80 : 0));
  Widget nav(String label, bool target) => Expanded(
      child: TextButton(
          style: TextButton.styleFrom(
              backgroundColor: dark == target
                  ? (dark ? const Color(0xff302747) : const Color(0xffede8ff))
                  : cardColor,
              shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(14))),
          onPressed: () => setState(() {
                dark = target;
                day = null;
              }),
          child: text(label,
              size: 14,
              bold: true,
              color: dark == target
                  ? (dark ? const Color(0xffcfbfff) : const Color(0xff5d48d7))
                  : muted)));
}

class RingPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final rect = Rect.fromCircle(center: size.center(Offset.zero), radius: 44);
    canvas.drawOval(
        rect,
        Paint()
          ..color = const Color(0xffa79bff)
          ..strokeWidth = 9
          ..style = PaintingStyle.stroke);
    canvas.drawArc(
        rect,
        -math.pi / 2,
        math.pi * 2 * .82,
        false,
        Paint()
          ..color = Colors.white
          ..strokeWidth = 9
          ..strokeCap = StrokeCap.round
          ..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(RingPainter oldDelegate) => false;
}

void paintLabel(Canvas canvas, String value, Offset position, Color color) {
  final t = TextPainter(
      text: TextSpan(
          text: value,
          style: TextStyle(fontFamily: 'Lato', fontSize: 11, color: color)),
      textDirection: TextDirection.ltr)
    ..layout();
  t.paint(canvas, position);
}

class ActivityPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    const h = [42.0, 66.0, 54.0, 82.0, 61.0, 94.0, 72.0];
    for (var i = 0; i < 7; i++) {
      final x = 4 + i * (size.width - 20) / 7;
      canvas.drawRRect(
          RRect.fromRectAndRadius(
              Rect.fromLTWH(x, size.height - 29 - h[i], 20, h[i]),
              const Radius.circular(6)),
          Paint()
            ..color =
                i == 5 ? const Color(0xff6d58e8) : const Color(0xffdfd9ff));
      paintLabel(canvas, ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
          Offset(x + 5, size.height - 16), const Color(0xff65738a));
    }
  }

  @override
  bool shouldRepaint(ActivityPainter oldDelegate) => false;
}

class TrendPainter extends CustomPainter {
  TrendPainter(this.day);
  final int? day;
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 302, sy = (size.height - 26) / 126;
    const raw = [
      Offset(0, 107),
      Offset(40, 74),
      Offset(80, 84),
      Offset(122, 38),
      Offset(163, 53),
      Offset(205, 12),
      Offset(250, 26),
      Offset(302, 0)
    ];
    for (var i = 0; i < 3; i++) {
      canvas.drawLine(
          Offset(0, (15 + i * 42) * sy),
          Offset(size.width, (15 + i * 42) * sy),
          Paint()..color = const Color(0xff29344a));
    }
    final points = raw.map((p) => Offset(p.dx * sx, p.dy * sy)).toList();
    final line = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      line.lineTo(p.dx, p.dy);
    }
    final area = Path.from(line)
      ..lineTo(size.width, size.height - 26)
      ..lineTo(0, size.height - 26)
      ..close();
    canvas.drawPath(
        area,
        Paint()
          ..shader = const LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [Color(0x409e8cff), Color(0x009e8cff)])
              .createShader(Offset.zero & size));
    canvas.drawPath(
        line,
        Paint()
          ..color = const Color(0xff9e8cff)
          ..strokeWidth = 3
          ..style = PaintingStyle.stroke
          ..strokeJoin = StrokeJoin.round);
    for (var i = 0; i < 7; i++) {
      paintLabel(
          canvas,
          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][i],
          Offset(i * (size.width - 26) / 6, size.height - 14),
          const Color(0xffa2b0c8));
    }
    if (day != null) {
      final p = points[day!];
      canvas.drawCircle(p, 5, Paint()..color = Colors.white);
      paintLabel(
          canvas,
          'Day ${day! + 1}',
          Offset(p.dx.clamp(0, size.width - 50), math.max(0, p.dy - 18)),
          Colors.white);
    }
  }

  @override
  bool shouldRepaint(TrendPainter oldDelegate) => oldDelegate.day != day;
}
