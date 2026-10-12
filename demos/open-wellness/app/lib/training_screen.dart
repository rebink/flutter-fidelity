import 'dart:math' as math;
import 'package:flutter/material.dart';
import 'wellness_screen.dart' show RegionBuilder, plainRegion;

class TrainingScreen extends StatefulWidget {
  const TrainingScreen({super.key, this.regionBuilder = plainRegion});
  final RegionBuilder regionBuilder;
  @override
  State<TrainingScreen> createState() => _TrainingScreenState();
}

class _TrainingScreenState extends State<TrainingScreen> {
  int filter = 0;
  int? selected;
  Widget label(String value,
          {double size = 16,
          bool bold = false,
          Color color = const Color(0xffedf3ff)}) =>
      Text(value,
          style: TextStyle(
              fontFamily: bold ? 'LatoBold' : 'Lato',
              fontSize: size,
              height: 1.2,
              color: color));
  Widget panel(Widget child, double height,
          {Color color = const Color(0xff141e33)}) =>
      Container(
          height: height,
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
              color: color, borderRadius: BorderRadius.circular(20)),
          child: child);
  @override
  Widget build(BuildContext context) {
    final scale = MediaQuery.textScalerOf(context).scale(1);
    return Scaffold(
        backgroundColor: const Color(0xff0b1324),
        body: SingleChildScrollView(
            child: Padding(
                padding: const EdgeInsets.fromLTRB(24, 32, 24, 24),
                child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      ConstrainedBox(
                          constraints: BoxConstraints(minHeight: 56 * scale),
                          child: Column(
                              mainAxisSize: MainAxisSize.min,
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                label('Training lab', size: 28, bold: true),
                                const SizedBox(height: 5),
                                label('Your performance, connected.',
                                    size: 14, color: const Color(0xffa2b0c8))
                              ])),
                      const SizedBox(height: 24),
                      widget.regionBuilder(
                          'hero',
                          panel(
                              Row(children: [
                                Expanded(
                                    child: Column(
                                        crossAxisAlignment:
                                            CrossAxisAlignment.start,
                                        children: [
                                      label('Readiness',
                                          size: 14,
                                          color: const Color(0xffa2b0c8)),
                                      const SizedBox(height: 8),
                                      label('96', size: 42, bold: true),
                                      const SizedBox(height: 4),
                                      label('Ready for a steady session',
                                          size: 12,
                                          color: const Color(0xff9ef0d0))
                                    ])),
                                if (scale <= 1.2)
                                  SizedBox(
                                      width: 96,
                                      height: 96,
                                      child: CustomPaint(
                                          painter: ReadinessPainter(),
                                          child: Center(
                                              child: label('96%',
                                                  size: 14, bold: true))))
                              ]),
                              136 * scale,
                              color: const Color(0xff1c2941))),
                      const SizedBox(height: 24),
                      widget.regionBuilder(
                          'chart',
                          panel(
                              Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    label('Load & recovery',
                                        size: 17, bold: true),
                                    const SizedBox(height: 10),
                                    Row(children: [
                                      label('Load',
                                          size: 11,
                                          color: const Color(0xff9e8cff)),
                                      const SizedBox(width: 18),
                                      label('Recovery',
                                          size: 11,
                                          color: const Color(0xff9ef0d0))
                                    ]),
                                    const SizedBox(height: 8),
                                    Expanded(
                                        child: Semantics(
                                            label: 'Inspect training chart',
                                            child: GestureDetector(
                                                onTapDown: (d) => setState(() => selected =
                                                    (d.localPosition.dx / 310 * 6)
                                                        .round()
                                                        .clamp(0, 6)),
                                                onHorizontalDragUpdate: (d) =>
                                                    setState(() => selected =
                                                        (d.localPosition.dx / 310 * 6)
                                                            .round()
                                                            .clamp(0, 6)),
                                                child: CustomPaint(
                                                    painter: TrainingChartPainter(filter, selected),
                                                    size: const Size(double.infinity, double.infinity)))))
                                  ]),
                              218 * scale)),
                      const SizedBox(height: 24),
                      Row(
                          children: List.generate(
                              3,
                              (i) => Expanded(
                                  child: Padding(
                                      padding: EdgeInsets.only(
                                          right: i == 2 ? 0 : 15),
                                      child: panel(
                                          Column(
                                              crossAxisAlignment:
                                                  CrossAxisAlignment.start,
                                              children: [
                                                label(
                                                    [
                                                      'Load',
                                                      'Strain',
                                                      'Recovery'
                                                    ][i],
                                                    size: 12,
                                                    color: const Color(
                                                        0xffa2b0c8)),
                                                const SizedBox(height: 8),
                                                label(['428', '14.2', '92%'][i],
                                                    size: 26, bold: true)
                                              ]),
                                          92 * scale +
                                              (scale > 1.2 ? 120 : 0)))))),
                      const SizedBox(height: 24),
                      panel(
                          Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(children: [
                                  Expanded(
                                      child:
                                          label('Training zones', bold: true)),
                                  label('42 min',
                                      size: 12, color: const Color(0xffa2b0c8))
                                ]),
                                const SizedBox(height: 14),
                                Row(
                                    children: List.generate(
                                        4,
                                        (i) => Expanded(
                                            child: Padding(
                                                padding: const EdgeInsets.only(
                                                    right: 6),
                                                child: Column(
                                                    crossAxisAlignment:
                                                        CrossAxisAlignment
                                                            .start,
                                                    children: [
                                                      Container(
                                                          height: 12,
                                                          decoration:
                                                              BoxDecoration(
                                                                  color: [
                                                                    const Color(
                                                                        0xff9ef0d0),
                                                                    const Color(
                                                                        0xff69beea),
                                                                    const Color(
                                                                        0xff9e8cff),
                                                                    const Color(
                                                                        0xffecac69)
                                                                  ][i],
                                                                  borderRadius:
                                                                      BorderRadius
                                                                          .circular(
                                                                              4))),
                                                      const SizedBox(
                                                          height: 10),
                                                      label(
                                                          [
                                                            'Easy',
                                                            'Aerobic',
                                                            'Tempo',
                                                            'Peak'
                                                          ][i],
                                                          size: 11,
                                                          color: const Color(
                                                              0xffa2b0c8))
                                                    ])))))
                              ]),
                          100 * scale),
                      const SizedBox(height: 16),
                      TextButton(
                          onPressed: () => Navigator.maybePop(context),
                          child: label('Back to wellness', size: 14))
                    ]))),
        bottomNavigationBar: Padding(
            padding: const EdgeInsets.fromLTRB(24, 0, 24, 28),
            child: widget.regionBuilder(
                'navigation',
                panel(
                    Row(
                        children: List.generate(
                            3,
                            (i) => Expanded(
                                child: TextButton(
                                    onPressed: () => setState(() => filter = i),
                                    child: label(
                                        ['Overview', 'Load', 'Recovery'][i],
                                        size: 14,
                                        bold: true,
                                        color: filter == i
                                            ? const Color(0xffcfbfff)
                                            : const Color(0xffa2b0c8)))))),
                    64 * scale))));
  }
}

class ReadinessPainter extends CustomPainter {
  @override
  void paint(Canvas canvas, Size size) {
    final r = Rect.fromCircle(center: size.center(Offset.zero), radius: 39);
    canvas.drawOval(
        r,
        Paint()
          ..color = const Color(0xff2d3d58)
          ..strokeWidth = 10
          ..style = PaintingStyle.stroke);
    canvas.drawArc(
        r,
        -math.pi / 2,
        math.pi * 2 * .94,
        false,
        Paint()
          ..color = const Color(0xff9ef0d0)
          ..strokeWidth = 10
          ..style = PaintingStyle.stroke
          ..strokeCap = StrokeCap.round);
  }

  @override
  bool shouldRepaint(ReadinessPainter oldDelegate) => false;
}

class TrainingChartPainter extends CustomPainter {
  TrainingChartPainter(this.filter, this.selected);
  final int filter;
  final int? selected;
  @override
  void paint(Canvas canvas, Size size) {
    const load = [86.0, 60.0, 67.0, 30.0, 40.0, 4.0, 22.0, 0.0],
        recovery = [57.0, 45.0, 55.0, 15.0, 25.0, 5.0, 13.0, 0.0];
    for (var i = 0; i < 3; i++) {
      canvas.drawLine(Offset(0, 15 + i * 30), Offset(size.width, 15 + i * 30),
          Paint()..color = const Color(0xff29344a));
    }
    for (var series = 0; series < 2; series++) {
      if (filter == 1 && series == 1 || filter == 2 && series == 0) continue;
      final values = series == 0 ? load : recovery;
      final path = Path();
      for (var i = 0; i < values.length; i++) {
        final p = Offset(i * size.width / 7, values[i]);
        if (i == 0) {
          path.moveTo(p.dx, p.dy);
        } else {
          path.lineTo(p.dx, p.dy);
        }
      }
      canvas.drawPath(
          path,
          Paint()
            ..color =
                series == 0 ? const Color(0xff9e8cff) : const Color(0xff9ef0d0)
            ..style = PaintingStyle.stroke
            ..strokeWidth = series == 0 ? 3 : 2);
    }
    for (var i = 0; i < 7; i++) {
      final t = TextPainter(
          text: TextSpan(
              text: ['M', 'T', 'W', 'T', 'F', 'S', 'S'][i],
              style: const TextStyle(
                  fontFamily: 'Lato', fontSize: 11, color: Color(0xffa2b0c8))),
          textDirection: TextDirection.ltr)
        ..layout();
      t.paint(canvas, Offset(i * (size.width - 12) / 6, size.height - 14));
    }
    if (selected != null) {
      canvas.drawCircle(Offset(selected! * size.width / 7, load[selected!]), 5,
          Paint()..color = Colors.white);
    }
  }

  @override
  bool shouldRepaint(TrainingChartPainter oldDelegate) =>
      oldDelegate.filter != filter || oldDelegate.selected != selected;
}
