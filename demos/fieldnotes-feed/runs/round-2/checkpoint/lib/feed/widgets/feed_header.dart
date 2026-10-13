import 'package:flutter/material.dart';
import '../../theme/feed_theme.dart';
import '../feed_controller.dart';
import '../regions.dart';

class FeedHeader extends StatelessWidget {
  const FeedHeader(
      {required this.category,
      required this.onCategory,
      required this.onSearch,
      required this.onNotifications,
      this.region = plainRegion,
      super.key});
  final FeedCategory category;
  final ValueChanged<FeedCategory> onCategory;
  final VoidCallback onSearch;
  final VoidCallback onNotifications;
  final RegionBuilder region;

  @override
  Widget build(BuildContext context) => Padding(
        padding: const EdgeInsetsDirectional.fromSTEB(18.5, 7, 18.5, 0),
        child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          region(
              'masthead',
              ConstrainedBox(
                  constraints: const BoxConstraints(minHeight: 38),
                  child: Row(children: [
                    Image.asset('assets/images/leaf.png',
                        width: 20, height: 24, excludeFromSemantics: true),
                    const SizedBox(width: 8),
                    Text('Fieldnotes',
                        style: FeedType.text(21, bold: true, height: 1.1)),
                    const Spacer(),
                    IconButton(
                        tooltip: 'Search fieldnotes',
                        style: IconButton.styleFrom(
                            minimumSize: const Size(44, 38),
                            tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                        onPressed: onSearch,
                        icon: const Icon(Icons.search_rounded, size: 24),
                        padding: EdgeInsets.zero,
                        constraints:
                            const BoxConstraints(minWidth: 44, minHeight: 38)),
                    const SizedBox(width: 1),
                    Stack(clipBehavior: Clip.none, children: [
                      IconButton(
                          tooltip: 'Notifications',
                          style: IconButton.styleFrom(
                              minimumSize: const Size(38, 38),
                              tapTargetSize: MaterialTapTargetSize.shrinkWrap),
                          onPressed: onNotifications,
                          icon: const Icon(Icons.notifications_none_rounded,
                              size: 25),
                          padding: EdgeInsets.zero,
                          constraints: const BoxConstraints(
                              minWidth: 38, minHeight: 38)),
                      const Positioned(
                          right: 5,
                          top: 0,
                          child: DecoratedBox(
                              decoration: BoxDecoration(
                                  color: FeedPalette.coral,
                                  shape: BoxShape.circle),
                              child: SizedBox(width: 7.5, height: 7.5))),
                    ]),
                  ]))),
          const SizedBox(height: 10),
          region(
              'heading',
              Text('Your daily inspiration',
                  style: FeedType.text(28, bold: true, height: 1.28))),
          const SizedBox(height: 1),
          region(
              'subtitle',
              Text('A little curiosity goes a long way.',
                  style: FeedType.text(14.5,
                      color: FeedPalette.muted, height: 1.35))),
          const SizedBox(height: 11.7),
          region(
              'filters',
              SingleChildScrollView(
                  scrollDirection: Axis.horizontal,
                  child: Row(children: [
                    for (final item in FeedCategory.values)
                      Padding(
                          padding: EdgeInsetsDirectional.only(
                              end: item == FeedCategory.design ? 0 : 7.5),
                          child: CategoryChip(
                              category: item,
                              selected: category == item,
                              onPressed: () => onCategory(item))),
                  ]))),
        ]),
      );
}

class CategoryChip extends StatelessWidget {
  const CategoryChip(
      {required this.category,
      required this.selected,
      required this.onPressed,
      super.key});
  final FeedCategory category;
  final bool selected;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => Semantics(
        selected: selected,
        child: Material(
          color: selected ? FeedPalette.green : Colors.transparent,
          shape: StadiumBorder(
              side: BorderSide(
                  color: selected ? FeedPalette.green : FeedPalette.outline,
                  width: .8)),
          child: InkWell(
            key: ValueKey('filter-${category.name}'),
            customBorder: const StadiumBorder(),
            onTap: onPressed,
            child: Padding(
                padding:
                    const EdgeInsets.symmetric(horizontal: 18, vertical: 7.8),
                child: Text(category.label,
                    style: FeedType.text(12.4,
                        bold: selected,
                        color: selected ? Colors.white : FeedPalette.ink,
                        height: 1.2))),
          ),
        ),
      );
}
