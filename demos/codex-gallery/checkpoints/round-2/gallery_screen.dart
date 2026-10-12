import 'dart:math' as math;
import 'package:flutter/material.dart';

typedef RegionBuilder = Widget Function(String, Widget);
Widget plainRegion(String id, Widget child) => child;

class GalleryScreen extends StatefulWidget {
  const GalleryScreen(
      {super.key, this.initialPage = 0, this.regionBuilder = plainRegion});
  final int initialPage;
  final RegionBuilder regionBuilder;
  @override
  State<GalleryScreen> createState() => _GalleryScreenState();
}

class _GalleryScreenState extends State<GalleryScreen> {
  late int page = widget.initialPage;
  final done = [true, true, false];
  final tasks = ['Read for 20 minutes', 'Take a short walk', 'Plan tomorrow'];
  double balance = 8425.60;
  int range = 0;
  int? point;
  bool tracking = false;
  Color get ink =>
      page == 0 ? const Color(0xff292735) : const Color(0xffedf3fa);
  Color get muted =>
      page == 0 ? const Color(0xff797681) : const Color(0xff9faabd);
  Color get accent => [
        const Color(0xff7254bb),
        const Color(0xffb5a2ff),
        const Color(0xffc3f27a)
      ][page];
  Color get card =>
      [Colors.white, const Color(0xff1d2134), const Color(0xff1c2a27)][page];
  Widget label(String s, {double size = 16, bool bold = false, Color? color}) =>
      Transform.translate(
          offset: Offset(0, -size * .14),
          child: Text(s,
              style: TextStyle(
                  fontFamily: bold ? 'LatoBold' : 'Lato',
                  fontSize: size,
                  height: 1.1,
                  color: color ?? ink)));
  Widget panel(Widget child, double height,
          {Color? color, double pad = 16, double radius = 20}) =>
      Container(
          width: double.infinity,
          height: height,
          padding: EdgeInsets.all(pad),
          decoration: BoxDecoration(
              color: color ?? card,
              borderRadius: BorderRadius.circular(radius)),
          child: child);
  Widget region(String id, Widget child) => widget.regionBuilder(id, child);
  double get scale => MediaQuery.textScalerOf(context).scale(1);
  @override
  Widget build(BuildContext context) => Theme(
      data: ThemeData(
          fontFamily: 'Lato',
          brightness: page == 0 ? Brightness.light : Brightness.dark,
          useMaterial3: true,
          colorScheme: ColorScheme.fromSeed(
              seedColor: accent,
              brightness: page == 0 ? Brightness.light : Brightness.dark)),
      child: Scaffold(
          backgroundColor: [
            const Color(0xfffaf9f6),
            const Color(0xff111322),
            const Color(0xff111b1a)
          ][page],
          body: SafeArea(
              top: false,
              bottom: false,
              child: SingleChildScrollView(
                  child: Padding(
                      padding: const EdgeInsets.fromLTRB(24, 32, 24, 16),
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
                                      label(
                                          [
                                            'Focus today',
                                            'Wallet overview',
                                            'Operations'
                                          ][page],
                                          size: 28,
                                          bold: true),
                                      const SizedBox(height: 2),
                                      label(
                                          [
                                            'Make space for a better day.',
                                            'Your money, clearly in view.',
                                            'Live fleet telemetry'
                                          ][page],
                                          size: 14,
                                          color: muted)
                                    ])),
                            const SizedBox(height: 24),
                            ...switch (page) {
                              0 => focus(),
                              1 => wallet(),
                              _ => operations()
                            }
                          ])))),
          bottomNavigationBar: Padding(
              padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
              child: region(
                  'navigation',
                  panel(
                      Row(
                          children: List.generate(
                              3,
                              (i) => Expanded(
                                  child: TextButton(
                                      style: TextButton.styleFrom(
                                          padding: EdgeInsets.zero,
                                          backgroundColor: page == i
                                              ? [
                                                  const Color(0xfff0e9ff),
                                                  const Color(0xff34284c),
                                                  const Color(0xff314027)
                                                ][page]
                                              : card,
                                          shape: RoundedRectangleBorder(
                                              borderRadius:
                                                  BorderRadius.circular(12))),
                                      onPressed: () => setState(() {
                                            page = i;
                                            point = null;
                                          }),
                                      child: label(
                                          ['Focus', 'Wallet', 'Control'][i],
                                          size: 14,
                                          bold: true,
                                          color:
                                              page == i ? accent : muted))))),
                      64 * scale,
                      pad: 8)))));
  List<Widget> focus() => [
        region(
            'hero',
            panel(
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  label('YOUR DAILY PLAN', size: 11, bold: true, color: accent),
                  const SizedBox(height: 16),
                  label(
                      '${done.where((v) => v).length} of ${tasks.length} complete',
                      size: 28,
                      bold: true),
                  const Spacer(),
                  ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                          value: done.where((v) => v).length / tasks.length,
                          color: accent,
                          backgroundColor: const Color(0xffd8ceea),
                          minHeight: 6))
                ]),
                120 * scale,
                color: const Color(0xfff0e9ff),
                pad: 20,
                radius: 24)),
        const SizedBox(height: 24),
        SizedBox(
            height: 24 * scale,
            child: label('Today’s priorities', size: 18, bold: true)),
        const SizedBox(height: 16),
        region(
            'content',
            Column(
                children: List.generate(
                    tasks.length,
                    (i) => Padding(
                        padding: EdgeInsets.only(
                            bottom: i == tasks.length - 1 ? 0 : 12),
                        child: Semantics(
                            button: true,
                            label: 'Toggle ${tasks[i]}',
                            child: GestureDetector(
                                onTap: () => setState(() => done[i] = !done[i]),
                                child: panel(
                                    Row(children: [
                                      Container(
                                          width: 26,
                                          height: 26,
                                          decoration: BoxDecoration(
                                              color: done[i]
                                                  ? accent
                                                  : const Color(0xffeeebf4),
                                              borderRadius:
                                                  BorderRadius.circular(8)),
                                          child: done[i]
                                              ? const CustomPaint(
                                                  painter: CheckPainter())
                                              : null),
                                      const SizedBox(width: 16),
                                      Expanded(
                                          child: Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              mainAxisAlignment:
                                                  MainAxisAlignment.center,
                                              children: [
                                            label(tasks[i], bold: true),
                                            const SizedBox(height: 2),
                                            label(
                                                i < 3
                                                    ? [
                                                        'Personal growth',
                                                        'Health & movement',
                                                        'A little preparation'
                                                      ][i]
                                                    : 'New priority',
                                                size: 12,
                                                color: muted)
                                          ]))
                                    ]),
                                    72 * scale + (scale > 1.2 ? 30 : 0)))))))),
        const SizedBox(height: 24),
        SizedBox(
            width: double.infinity,
            height: 52 * scale,
            child: FilledButton(
                style: FilledButton.styleFrom(
                    backgroundColor: accent,
                    shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(16))),
                onPressed: addTask,
                child: label('Add a task', bold: true, color: Colors.white))),
        const SizedBox(height: 24),
        panel(
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              label('One thing at a time', bold: true),
              const SizedBox(height: 7),
              label('Small steps count. Keep going.', size: 12, color: muted)
            ]),
            76 * scale,
            color: const Color(0xfffff1d7))
      ];
  List<Widget> wallet() => [
        region(
            'hero',
            panel(
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  label('Total balance',
                      size: 14, color: const Color(0xffe4dbee)),
                  const SizedBox(height: 12),
                  label(
                      '\$${balance.toStringAsFixed(2).replaceFirst('8425', '8,425')}',
                      size: 38,
                      bold: true),
                  const Spacer(),
                  Row(children: [
                    Expanded(
                        child: label('+7.2% this month',
                            size: 13,
                            bold: true,
                            color: const Color(0xffa9efd0))),
                    SizedBox(
                        height: 32 * scale,
                        width: 94,
                        child: FilledButton(
                            style: FilledButton.styleFrom(
                                backgroundColor: accent,
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10))),
                            onPressed: sendMoney,
                            child: label('Send',
                                size: 13,
                                bold: true,
                                color: const Color(0xff211832))))
                  ])
                ]),
                144 * scale + (scale > 1.2 ? 50 : 0),
                color: const Color(0xff34284c),
                pad: 20,
                radius: 24)),
        const SizedBox(height: 24),
        region(
            'content',
            panel(
                Column(children: [
                  Row(children: [
                    Expanded(child: label('Balance trend', bold: true)),
                    ...List.generate(
                        3,
                        (i) => SizedBox(
                            width: 32,
                            height: 28 * scale,
                            child: TextButton(
                                style: TextButton.styleFrom(
                                    padding: EdgeInsets.zero),
                                onPressed: () => setState(() => range = i),
                                child: label(['1W', '1M', '1Y'][i],
                                    size: 11,
                                    bold: range == i,
                                    color: range == i ? accent : muted))))
                  ]),
                  const SizedBox(height: 10),
                  Expanded(
                      child: Semantics(
                          label: 'Inspect balance trend',
                          child: GestureDetector(
                              onTapDown: (d) => setState(() => point =
                                  (d.localPosition.dx / 310 * 7)
                                      .round()
                                      .clamp(0, 7)),
                              onHorizontalDragUpdate: (d) => setState(() =>
                                  point = (d.localPosition.dx / 310 * 7)
                                      .round()
                                      .clamp(0, 7)),
                              child: CustomPaint(
                                  painter: BalancePainter(range, point),
                                  size: const Size(
                                      double.infinity, double.infinity)))))
                ]),
                156 * scale)),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(child: metric('Income', r'$4,250', 92)),
          const SizedBox(width: 16),
          Expanded(child: metric('Expenses', r'$1,840', 92))
        ]),
        const SizedBox(height: 24),
        SizedBox(
            height: 24 * scale,
            child: label('Recent activity', size: 18, bold: true)),
        const SizedBox(height: 16),
        for (var i = 0; i < 2; i++)
          Padding(
              padding: EdgeInsets.only(bottom: i == 0 ? 8 : 0),
              child: GestureDetector(
                  onTap: () => showDialog<void>(
                      context: context,
                      builder: (context) => AlertDialog(
                              title: Text(i == 0
                                  ? 'Salary payment'
                                  : 'Studio subscription'),
                              content: const Text('Local demo transaction'),
                              actions: [
                                TextButton(
                                    onPressed: () => Navigator.pop(context),
                                    child: const Text('Close'))
                              ])),
                  child: panel(
                      Row(children: [
                        Container(
                            width: 36,
                            height: 36,
                            decoration: BoxDecoration(
                                color: i == 0
                                    ? const Color(0xff24483b)
                                    : const Color(0xff41324c),
                                borderRadius: BorderRadius.circular(12)),
                            child: Center(
                                child: label(i == 0 ? '+' : '−',
                                    size: 17,
                                    bold: true,
                                    color: i == 0
                                        ? const Color(0xffa9efd0)
                                        : const Color(0xffd6b6ff)))),
                        const SizedBox(width: 12),
                        Expanded(
                            child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisAlignment: MainAxisAlignment.center,
                                children: [
                              label(
                                  i == 0
                                      ? 'Salary payment'
                                      : 'Studio subscription',
                                  size: 14,
                                  bold: true),
                              const SizedBox(height: 2),
                              label(i == 0 ? 'Today · 08:00' : 'Today · 09:15',
                                  size: 11, color: muted)
                            ])),
                        label(i == 0 ? r'+$2,850' : r'−$24.00',
                            size: 13,
                            bold: true,
                            color: i == 0 ? const Color(0xffa9efd0) : ink)
                      ]),
                      56 * scale + (scale > 1.2 ? 60 : 0),
                      pad: 12,
                      radius: 16)))
      ];
  List<Widget> operations() => [
        region(
            'hero',
            ClipRRect(
                borderRadius: BorderRadius.circular(24),
                child: SizedBox(
                    height: 256,
                    width: double.infinity,
                    child: Stack(children: [
                      const Positioned.fill(
                          child: CustomPaint(painter: RoutePainter())),
                      Positioned(
                          left: 16,
                          top: 16,
                          child: Container(
                              width: math.min(170 * scale,
                                  MediaQuery.sizeOf(context).width - 80),
                              height: 56 * scale,
                              padding: const EdgeInsets.all(12),
                              decoration: BoxDecoration(
                                  color: const Color(0xff14211b),
                                  borderRadius: BorderRadius.circular(12)),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    label('12 vehicles online',
                                        size: 14, bold: true),
                                    const SizedBox(height: 3),
                                    label('Last sync · just now',
                                        size: 11, color: muted)
                                  ]))),
                      Positioned(
                          left: 16,
                          bottom: 16,
                          child: Container(
                              padding: const EdgeInsets.all(10),
                              decoration: BoxDecoration(
                                  color: const Color(0xff14211b),
                                  borderRadius: BorderRadius.circular(10)),
                              child: label('Route A · 8 stops',
                                  size: 11, bold: true, color: accent)))
                    ])))),
        const SizedBox(height: 24),
        Row(children: [
          Expanded(child: metric('Active', '12', 88)),
          const SizedBox(width: 15),
          Expanded(child: metric('On time', '98%', 88)),
          const SizedBox(width: 15),
          Expanded(child: metric('Distance', '184 km', 88, valueSize: 19))
        ]),
        const SizedBox(height: 24),
        panel(
            Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              label('Traffic advisory', size: 15, bold: true, color: accent),
              const SizedBox(height: 2),
              label('Route B · 6 minute delay',
                  size: 12, color: const Color(0xffbfc6ab))
            ]),
            64 * scale,
            color: const Color(0xff323520)),
        const SizedBox(height: 24),
        SizedBox(
            height: 24 * scale,
            child: label('Priority delivery', size: 18, bold: true)),
        const SizedBox(height: 12),
        region(
            'content',
            panel(
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
                  Row(children: [
                    Expanded(
                        child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                          label('Vehicle 07', size: 17, bold: true),
                          const SizedBox(height: 7),
                          label('North hub → Downtown', size: 12, color: muted)
                        ])),
                    SizedBox(
                        width: 74,
                        height: 30 * scale,
                        child: FilledButton(
                            style: FilledButton.styleFrom(
                                backgroundColor: accent,
                                padding: EdgeInsets.zero,
                                shape: RoundedRectangleBorder(
                                    borderRadius: BorderRadius.circular(10))),
                            onPressed: () => showModalBottomSheet<void>(
                                context: context,
                                builder: (context) => SafeArea(
                                    child: Padding(
                                        padding: const EdgeInsets.all(24),
                                        child: Column(
                                            mainAxisSize: MainAxisSize.min,
                                            children: [
                                              const Text('Vehicle 07 · Route A',
                                                  style:
                                                      TextStyle(fontSize: 24)),
                                              const SizedBox(height: 16),
                                              const Text(
                                                  '8 stops · 67% complete · ETA 14:35'),
                                              const SizedBox(height: 20),
                                              FilledButton(
                                                  onPressed: () {
                                                    setState(
                                                        () => tracking = true);
                                                    Navigator.pop(context);
                                                  },
                                                  child: const Text(
                                                      'Follow vehicle'))
                                            ])))),
                            child: label(tracking ? 'Live' : 'Track',
                                size: 12,
                                bold: true,
                                color: const Color(0xff17231e))))
                  ]),
                  const Spacer(),
                  ClipRRect(
                      borderRadius: BorderRadius.circular(3),
                      child: LinearProgressIndicator(
                          value: .67,
                          color: accent,
                          backgroundColor: const Color(0xff35443c),
                          minHeight: 5))
                ]),
                88 * scale + (scale > 1.2 ? 50 : 0)))
      ];
  Widget metric(String title, String value, double height,
          {double valueSize = 26}) =>
      panel(
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            label(title, size: page == 2 ? 11 : 12, color: muted),
            const SizedBox(height: 12),
            label(value, size: valueSize, bold: true)
          ]),
          height * scale + (scale > 1.2 ? 110 : 0));
  void addTask() {
    showModalBottomSheet<void>(
        context: context,
        builder: (context) => SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('A small next step',
                      style: TextStyle(fontSize: 24)),
                  const SizedBox(height: 16),
                  FilledButton(
                      onPressed: () {
                        setState(() {
                          tasks.add('Drink a glass of water');
                          done.add(false);
                        });
                        Navigator.pop(context);
                      },
                      child: const Text('Add water break'))
                ]))));
  }

  void sendMoney() {
    showModalBottomSheet<void>(
        context: context,
        builder: (context) => SafeArea(
            child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(mainAxisSize: MainAxisSize.min, children: [
                  const Text('Send a demo payment',
                      style: TextStyle(fontSize: 24)),
                  const SizedBox(height: 16),
                  const Text(r'$25.00 · Local sample recipient'),
                  const SizedBox(height: 20),
                  FilledButton(
                      onPressed: () {
                        setState(() => balance -= 25);
                        Navigator.pop(context);
                      },
                      child: const Text('Confirm payment'))
                ]))));
  }
}

class CheckPainter extends CustomPainter {
  const CheckPainter();
  @override
  void paint(Canvas canvas, Size size) {
    canvas.drawPath(
        Path()
          ..moveTo(7, 12)
          ..lineTo(12, 17)
          ..lineTo(20, 7),
        Paint()
          ..color = Colors.white
          ..strokeWidth = 2
          ..style = PaintingStyle.stroke);
  }

  @override
  bool shouldRepaint(CheckPainter oldDelegate) => false;
}

class BalancePainter extends CustomPainter {
  BalancePainter(this.range, this.point);
  final int range;
  final int? point;
  @override
  void paint(Canvas canvas, Size size) {
    const values = [69.0, 54.0, 59.0, 31.0, 42.0, 15.0, 29.0, 0.0];
    final points = List.generate(
        8,
        (i) => Offset(
            i * size.width / 7,
            (values[i] + (range == 0 ? 0 : math.sin(i) * 8))
                .clamp(0, size.height - 5)));
    final line = Path()..moveTo(points.first.dx, points.first.dy);
    for (final p in points.skip(1)) {
      line.lineTo(p.dx, p.dy);
    }
    final area = Path.from(line)
      ..lineTo(size.width, size.height)
      ..lineTo(0, size.height)
      ..close();
    canvas.drawPath(area, Paint()..color = const Color(0xff302b4c));
    canvas.drawPath(
        line,
        Paint()
          ..color = const Color(0xffb5a2ff)
          ..strokeWidth = 3
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke);
    if (point != null) {
      canvas.drawCircle(points[point!], 4, Paint()..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(BalancePainter oldDelegate) =>
      oldDelegate.range != range || oldDelegate.point != point;
}

class RoutePainter extends CustomPainter {
  const RoutePainter();
  @override
  void paint(Canvas canvas, Size size) {
    final sx = size.width / 342;
    canvas.drawRect(
        Offset.zero & size, Paint()..color = const Color(0xff1b2c27));
    final road = Paint()
      ..color = const Color(0xff31453c)
      ..strokeWidth = 8;
    for (var i = 0; i < 5; i++) {
      canvas.drawLine(Offset((26 + i * 63) * sx, 14),
          Offset((26 + i * 63) * sx, 241), road);
      canvas.drawLine(
          Offset(14, 40 + i * 43), Offset(328 * sx, 40 + i * 43), road);
    }
    const points = [
      Offset(54, 190),
      Offset(136, 190),
      Offset(136, 120),
      Offset(214, 120),
      Offset(214, 63),
      Offset(300, 63)
    ];
    final route = Path()..moveTo(points.first.dx * sx, points.first.dy);
    for (final p in points.skip(1)) {
      route.lineTo(p.dx * sx, p.dy);
    }
    canvas.drawPath(
        route,
        Paint()
          ..color = const Color(0xffc3f27a)
          ..strokeWidth = 4
          ..strokeJoin = StrokeJoin.round
          ..style = PaintingStyle.stroke);
    for (final i in [0, 2, 4, 5]) {
      final p = points[i];
      canvas.drawCircle(
          Offset(p.dx * sx, p.dy), 7, Paint()..color = const Color(0xff17231e));
      canvas.drawCircle(Offset(p.dx * sx, p.dy), 5.5,
          Paint()..color = const Color(0xffc3f27a));
    }
  }

  @override
  bool shouldRepaint(RoutePainter oldDelegate) => false;
}
