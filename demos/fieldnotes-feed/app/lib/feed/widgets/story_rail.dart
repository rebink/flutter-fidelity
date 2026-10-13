import 'dart:math' as math;
import 'package:flutter/cupertino.dart';
import 'package:flutter/material.dart';
import '../../theme/feed_theme.dart';

class StoryRail extends StatelessWidget {
  const StoryRail({required this.onStory, super.key});
  final ValueChanged<String> onStory;
  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsetsDirectional.only(end: 1.5),
        child: LayoutBuilder(builder: (context, constraints) {
          // Measured rail spacing; actual available width controls the gaps.
          final tileWidth = math.min(63.0, constraints.maxWidth / 5);
          final gap = (constraints.maxWidth - tileWidth * 5) / 4;
          const opticalGapAdjustments = [-1.925, .775, -.125, 1.275];
          const names = ['Your story', 'Maya', 'Leo', 'Noor', 'Alex'];
          return Row(children: [
            for (var i = 0; i < names.length; i++) ...[
              SizedBox(
                  width: tileWidth,
                  child: StoryTile(
                      name: names[i], onPressed: () => onStory(names[i]))),
              if (i < 4)
                SizedBox(width: math.max(0.0, gap + opticalGapAdjustments[i])),
            ]
          ]);
        }),
      );
}

class StoryTile extends StatelessWidget {
  const StoryTile({required this.name, required this.onPressed, super.key});
  final String name;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: name == 'Your story' ? 'Create your story' : 'View $name story',
        child: InkWell(
          onTap: onPressed,
          borderRadius: BorderRadius.circular(34),
          child: Column(mainAxisSize: MainAxisSize.min, children: [
            Container(
              width: 63,
              height: 63,
              padding: const EdgeInsets.all(2.04),
              decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: FeedPalette.green, width: 1.5)),
              child: ClipOval(
                  child: name == 'Your story'
                      ? const ColoredBox(
                          color: FeedPalette.cream,
                          child: Icon(CupertinoIcons.add, size: 25))
                      : Image.asset('assets/images/${name.toLowerCase()}.png',
                          fit: BoxFit.cover, excludeFromSemantics: true)),
            ),
            const SizedBox(height: 2.5),
            Text(name,
                textAlign: TextAlign.center,
                style: FeedType.text(10.5, height: 1.3)),
          ]),
        ),
      );
}
