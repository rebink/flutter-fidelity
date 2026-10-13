import 'package:flutter/material.dart';
import '../../theme/feed_theme.dart';
import '../feed_controller.dart';
import '../regions.dart';

class PostCard extends StatelessWidget {
  const PostCard(
      {required this.post,
      required this.liked,
      required this.saved,
      required this.likes,
      required this.comments,
      required this.onLike,
      required this.onSave,
      required this.onComments,
      required this.onShare,
      required this.onAuthor,
      required this.onMenu,
      this.region = plainRegion,
      super.key});
  final FeedPost post;
  final bool liked;
  final bool saved;
  final int likes;
  final int comments;
  final VoidCallback onLike;
  final VoidCallback onSave;
  final VoidCallback onComments;
  final VoidCallback onShare;
  final VoidCallback onAuthor;
  final VoidCallback onMenu;
  final RegionBuilder region;

  @override
  Widget build(BuildContext context) => DecoratedBox(
        decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(9),
            border: Border.all(color: FeedPalette.border, width: .55)),
        child:
            Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: [
          Padding(
              padding: const EdgeInsets.fromLTRB(13.5, 8.5, 9, 6.3),
              child:
                  PostAuthor(post: post, onAuthor: onAuthor, onMenu: onMenu)),
          if (post.photo != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 4.9),
              child: region(
                  'trail',
                  ClipRRect(
                      borderRadius: BorderRadius.circular(7),
                      child: AspectRatio(
                          aspectRatio: 831 / 454,
                          child: Image.asset(post.photo!,
                              fit: BoxFit.cover,
                              semanticLabel:
                                  'Hiker on a sunlit forest trail with mountains beyond')))),
            ),
          Padding(
            padding: const EdgeInsets.fromLTRB(13.5, 10, 13.5, 0),
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
              region(
                  'post_title',
                  Text(post.title,
                      style: FeedType.text(16, bold: true, height: 1.25))),
              const SizedBox(height: 2.5),
              region(
                  'post_caption',
                  Text(post.caption,
                      style: FeedType.text(11.5,
                          color: FeedPalette.muted, height: 1.4))),
              const SizedBox(height: 3.5),
              Text(post.tag,
                  style: FeedType.text(10.2,
                      color: const Color(0xff4f7765), height: 1.35)),
              region(
                  'post_actions',
                  PostActions(
                      liked: liked,
                      saved: saved,
                      likes: likes,
                      comments: comments,
                      onLike: onLike,
                      onSave: onSave,
                      onComments: onComments,
                      onShare: onShare)),
            ]),
          ),
          const SizedBox(height: 1),
        ]),
      );
}

class PostAuthor extends StatelessWidget {
  const PostAuthor(
      {required this.post,
      required this.onAuthor,
      required this.onMenu,
      super.key});
  final FeedPost post;
  final VoidCallback onAuthor;
  final VoidCallback onMenu;
  @override
  Widget build(BuildContext context) => Row(children: [
        InkWell(
            onTap: onAuthor,
            customBorder: const CircleBorder(),
            child: Semantics(
                button: true,
                label: 'View ${post.author} profile',
                child: ClipOval(
                    child: Image.asset(post.avatar,
                        width: 43.3,
                        height: 43.3,
                        fit: BoxFit.cover,
                        excludeFromSemantics: true)))),
        const SizedBox(width: 8.5),
        Expanded(
            child:
                Column(crossAxisAlignment: CrossAxisAlignment.start, children: [
          Text(post.author, style: FeedType.text(14, bold: true, height: 1.2)),
          const SizedBox(height: 2),
          Text(post.subtitle,
              style: FeedType.text(10.7, color: FeedPalette.muted, height: 1.3))
        ])),
        const SizedBox(width: 5),
        if (post.following)
          Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 7),
              decoration: const ShapeDecoration(
                  color: FeedPalette.green, shape: StadiumBorder()),
              child: Text('Following',
                  style: FeedType.text(11.5,
                      bold: true, color: Colors.white, height: 1.1))),
        IconButton(
            onPressed: onMenu,
            tooltip: 'Post options',
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 43.3),
            icon: const Icon(Icons.more_horiz_rounded, size: 20)),
      ]);
}

class PostActions extends StatelessWidget {
  const PostActions(
      {required this.liked,
      required this.saved,
      required this.likes,
      required this.comments,
      required this.onLike,
      required this.onSave,
      required this.onComments,
      required this.onShare,
      super.key});
  final bool liked;
  final bool saved;
  final int likes;
  final int comments;
  final VoidCallback onLike;
  final VoidCallback onSave;
  final VoidCallback onComments;
  final VoidCallback onShare;
  @override
  Widget build(BuildContext context) => Row(children: [
        PostAction(
            label: liked ? 'Unlike post' : 'Like post',
            selected: liked,
            icon:
                liked ? Icons.favorite_rounded : Icons.favorite_border_rounded,
            count: likes,
            onPressed: onLike),
        const SizedBox(width: 13),
        PostAction(
            label: 'Open comments',
            icon: Icons.chat_bubble_outline_rounded,
            count: comments,
            onPressed: onComments),
        const SizedBox(width: 9),
        PostAction(
            label: 'Share post locally',
            icon: Icons.send_outlined,
            onPressed: onShare),
        const Spacer(),
        PostAction(
            label: saved ? 'Unsave post' : 'Save post',
            selected: saved,
            icon:
                saved ? Icons.bookmark_rounded : Icons.bookmark_border_rounded,
            onPressed: onSave),
      ]);
}

class PostAction extends StatelessWidget {
  const PostAction(
      {required this.label,
      required this.icon,
      required this.onPressed,
      this.count,
      this.selected = false,
      super.key});
  final String label;
  final IconData icon;
  final VoidCallback onPressed;
  final int? count;
  final bool selected;
  @override
  Widget build(BuildContext context) => Semantics(
        button: true,
        label: count == null ? label : '$label, $count',
        selected: selected,
        child: Tooltip(
            message: label,
            child: InkWell(
              onTap: onPressed,
              borderRadius: BorderRadius.circular(8),
              child: ConstrainedBox(
                  constraints:
                      const BoxConstraints(minHeight: 39, minWidth: 28),
                  child: Row(mainAxisSize: MainAxisSize.min, children: [
                    Icon(icon,
                        size: 20,
                        color: selected ? FeedPalette.green : FeedPalette.ink),
                    if (count != null) ...[
                      const SizedBox(width: 6),
                      Text('$count', style: FeedType.text(11.5, height: 1.2))
                    ],
                  ])),
            )),
      );
}
