import 'package:flutter/material.dart';
import '../../theme/feed_theme.dart';
import '../regions.dart';

class EventCard extends StatelessWidget {
  const EventCard(
      {required this.joined,
      required this.attendees,
      required this.onJoin,
      this.region = plainRegion,
      super.key});
  final bool joined;
  final int attendees;
  final VoidCallback onJoin;
  final RegionBuilder region;

  @override
  Widget build(BuildContext context) => Container(
        padding: const EdgeInsets.fromLTRB(14.5, 9.9, 14, 9.97),
        decoration: BoxDecoration(
            color: FeedPalette.cream,
            border: Border.all(color: const Color(0xffe4e3d8), width: .55),
            borderRadius: BorderRadius.circular(9)),
        child: Stack(children: [
          PositionedDirectional(
              top: 4.7,
              end: -4.16,
              child: Image.asset('assets/images/mountain.png',
                  width: 120.4,
                  height: 48.25,
                  fit: BoxFit.fill,
                  excludeFromSemantics: true)),
          Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
            Text('NEAR YOU',
                style: FeedType.text(8.5,
                    color: const Color(0xff7a9280), spacing: 1, height: 1.3)),
            const SizedBox(height: 2.5),
            region(
                'event_title',
                SizedBox(
                    width: 222,
                    child: Text('Sunday trail club',
                        style: FeedType.text(15.65, bold: true, height: 1.2)))),
            const SizedBox(height: .3),
            Text('Oct 18 · 8:30 AM · Forest Park',
                style: FeedType.text(10.95,
                    color: FeedPalette.muted, height: 1.35)),
            const SizedBox(height: 4.5),
            Row(children: [
              const AttendeeAvatars(),
              const SizedBox(width: 8),
              Expanded(
                  child: Text('$attendees going',
                      style: FeedType.text(11.2,
                          color: FeedPalette.muted, height: 1.3))),
              const SizedBox(width: 8),
              Semantics(
                  button: true,
                  toggled: joined,
                  label: joined
                      ? 'Leave Sunday trail club'
                      : 'Join Sunday trail club',
                  child: FilledButton(
                      onPressed: onJoin,
                      style: FilledButton.styleFrom(
                          minimumSize: const Size(70, 30),
                          padding: const EdgeInsets.symmetric(
                              horizontal: 18, vertical: 6.5),
                          tapTargetSize: MaterialTapTargetSize.shrinkWrap,
                          textStyle: FeedType.text(12,
                              bold: true, color: Colors.white)),
                      child: Text(joined ? 'Joined' : 'Join'))),
            ]),
          ]),
        ]),
      );
}

class AttendeeAvatars extends StatelessWidget {
  const AttendeeAvatars({super.key});
  @override
  Widget build(BuildContext context) => SizedBox(
      width: 85.2,
      height: 28.4,
      child: Stack(children: [
        for (var i = 0; i < 3; i++)
          PositionedDirectional(
              start: i * 28.4,
              top: 0,
              child: DecoratedBox(
                  decoration: BoxDecoration(
                      shape: BoxShape.circle,
                      border: Border.all(color: FeedPalette.cream, width: 1.1)),
                  child: ClipOval(
                      child: Image.asset(
                          'assets/images/attendee_${[
                            'one',
                            'two',
                            'three'
                          ][i]}.png',
                          width: 28.4,
                          height: 28.4,
                          fit: BoxFit.cover,
                          excludeFromSemantics: true)))),
      ]));
}
