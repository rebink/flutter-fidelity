import 'package:flutter/material.dart';
import '../../theme/feed_theme.dart';
import '../feed_controller.dart';

class FeedNavigation extends StatelessWidget {
  const FeedNavigation(
      {required this.destination,
      required this.onDestination,
      required this.onCreate,
      super.key});
  final FeedDestination destination;
  final ValueChanged<FeedDestination> onDestination;
  final VoidCallback onCreate;
  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: const BoxDecoration(
            color: Colors.white,
            border:
                Border(top: BorderSide(color: FeedPalette.border, width: .6))),
        child: SafeArea(
            top: false,
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 5),
              child: Row(children: [
                Expanded(
                    child: NavigationItem(
                        label: 'Feed',
                        icon: Icons.home_outlined,
                        selectedIcon: Icons.home_rounded,
                        selected: destination == FeedDestination.feed,
                        onPressed: () => onDestination(FeedDestination.feed))),
                Expanded(
                    child: NavigationItem(
                        label: 'Explore',
                        icon: Icons.explore_outlined,
                        selected: destination == FeedDestination.explore,
                        onPressed: () =>
                            onDestination(FeedDestination.explore))),
                Expanded(
                    child: Center(
                        child: IconButton.filled(
                            tooltip: 'Create a fieldnote',
                            onPressed: onCreate,
                            style: IconButton.styleFrom(
                                backgroundColor: FeedPalette.green,
                                foregroundColor: Colors.white,
                                minimumSize: const Size(35, 35),
                                padding: const EdgeInsets.all(5)),
                            icon: const Icon(Icons.add_rounded, size: 25)))),
                Expanded(
                    child: NavigationItem(
                        label: 'Saved',
                        icon: Icons.bookmark_border_rounded,
                        selected: destination == FeedDestination.saved,
                        onPressed: () => onDestination(FeedDestination.saved))),
                Expanded(
                    child: NavigationItem(
                        label: 'You',
                        icon: Icons.person_outline_rounded,
                        selected: destination == FeedDestination.you,
                        onPressed: () => onDestination(FeedDestination.you))),
              ]),
            )),
      );
}

class NavigationItem extends StatelessWidget {
  const NavigationItem(
      {required this.label,
      required this.icon,
      required this.selected,
      required this.onPressed,
      this.selectedIcon,
      super.key});
  final String label;
  final IconData icon;
  final IconData? selectedIcon;
  final bool selected;
  final VoidCallback onPressed;
  @override
  Widget build(BuildContext context) => Semantics(
      selected: selected,
      child: InkWell(
        key: ValueKey('nav-${label.toLowerCase()}'),
        onTap: onPressed,
        borderRadius: BorderRadius.circular(10),
        child: Padding(
            padding: const EdgeInsets.symmetric(vertical: 2),
            child: Column(mainAxisSize: MainAxisSize.min, children: [
              Icon(selected ? (selectedIcon ?? icon) : icon,
                  size: 22,
                  color: selected ? FeedPalette.green : FeedPalette.ink),
              const SizedBox(height: 2),
              Text(label,
                  style: FeedType.text(10.5,
                      bold: selected,
                      color: selected ? FeedPalette.green : FeedPalette.muted,
                      height: 1.2)),
            ])),
      ));
}
