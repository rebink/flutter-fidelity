import 'package:flutter/material.dart';
import 'feed_controller.dart';
import 'regions.dart';
import 'widgets/event_card.dart';
import 'widgets/feed_header.dart';
import 'widgets/feed_navigation.dart';
import 'widgets/feed_sheets.dart';
import 'widgets/post_card.dart';
import 'widgets/story_rail.dart';

class FeedScreen extends StatefulWidget {
  const FeedScreen({this.controller, this.region = plainRegion, super.key});
  final FeedController? controller;
  final RegionBuilder region;
  @override
  State<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends State<FeedScreen> {
  late FeedController _controller;
  late bool _ownsController;
  @override
  void initState() {
    super.initState();
    _ownsController = widget.controller == null;
    _controller = widget.controller ?? FeedController();
  }

  @override
  void didUpdateWidget(covariant FeedScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      if (_ownsController) _controller.dispose();
      _ownsController = widget.controller == null;
      _controller = widget.controller ?? FeedController();
    }
  }

  @override
  void dispose() {
    if (_ownsController) _controller.dispose();
    super.dispose();
  }

  void _sheet(Widget content) => showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      showDragHandle: true,
      useSafeArea: true,
      builder: (_) => content);
  void _create() => _sheet(TextEntrySheet(
      title: 'Create a fieldnote',
      hint: 'What inspired you today?',
      onSubmit: _controller.createPost));
  void _comments(FeedPost post) => _sheet(TextEntrySheet(
      title: 'Add a comment',
      hint: 'Your comment',
      buttonLabel: 'Comment',
      onSubmit: (text) => _controller.addComment(post, text)));
  void _profile(String name) => _sheet(InfoSheet(
      title: name,
      message:
          '$name is part of the Fieldnotes community.\n\nThis profile is a local demo preview.'));
  void _story(String name) {
    if (name == 'Your story') {
      _create();
      return;
    }
    _sheet(InfoSheet(
        title: '$name’s fieldnote',
        image: 'assets/images/trail.png',
        message:
            'A little time outdoors. A fresh perspective.\n\nLocal story preview.'));
  }

  void _navigate(FeedDestination destination) {
    _controller.selectDestination(destination);
  }

  @override
  Widget build(BuildContext context) => ListenableBuilder(
        listenable: _controller,
        builder: (context, _) => Scaffold(
          body: SafeArea(
              bottom: false,
              child: CustomScrollView(
                key: const PageStorageKey('feed-scroll'),
                slivers: [
                  SliverToBoxAdapter(
                      child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                        if (_controller.destination == FeedDestination.you)
                          Padding(
                              padding: const EdgeInsets.all(24),
                              child: Column(
                                  crossAxisAlignment: CrossAxisAlignment.start,
                                  children: [
                                    Text('Your fieldnotes',
                                        style: Theme.of(context)
                                            .textTheme
                                            .headlineLarge),
                                    const SizedBox(height: 16),
                                    const Text(
                                        'A local demo profile. Your likes, saves and posts stay in this session.'),
                                    const SizedBox(height: 16),
                                    FilledButton(
                                        onPressed: _create,
                                        child: const Text('Write a fieldnote')),
                                  ]))
                        else ...[
                          FeedHeader(
                              category: _controller.category,
                              onCategory: _controller.selectCategory,
                              region: widget.region,
                              onSearch: () => _sheet(const FeedSearchSheet()),
                              onNotifications: () => _sheet(const InfoSheet(
                                  title: 'You’re all caught up',
                                  message:
                                      'Sunday trail club starts at 8:30 AM on October 18.\n\nLocal demo notification.'))),
                          const SizedBox(height: 14),
                          Padding(
                              padding: const EdgeInsetsDirectional.only(
                                  start: 14.5, end: 8.5),
                              child: widget.region(
                                  'stories', StoryRail(onStory: _story))),
                          const SizedBox(height: 13.45),
                          if (_controller.destination == FeedDestination.saved)
                            Padding(
                                padding: const EdgeInsets.fromLTRB(
                                    18.5, 0, 18.5, 14),
                                child: Text('Saved fieldnotes',
                                    style: Theme.of(context)
                                        .textTheme
                                        .titleLarge)),
                          if (_controller.visiblePosts.isEmpty)
                            Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(children: [
                                  const Icon(Icons.auto_stories_outlined,
                                      size: 40),
                                  const SizedBox(height: 12),
                                  Text(_controller.destination ==
                                          FeedDestination.saved
                                      ? 'Save a fieldnote to find it here.'
                                      : 'No fieldnotes in this category yet.'),
                                ])),
                          for (final post in _controller.visiblePosts)
                            Padding(
                                padding:
                                    const EdgeInsets.fromLTRB(8.1, 0, 8.1, 8.1),
                                child: post.id == referencePost.id
                                    ? widget.region(
                                        'post', _post(post, widget.region))
                                    : _post(post, plainRegion)),
                          if (_controller.destination != FeedDestination.saved)
                            Padding(
                                padding:
                                    const EdgeInsets.symmetric(horizontal: 8.1),
                                child: widget.region(
                                    'event',
                                    EventCard(
                                        joined: _controller.joined,
                                        attendees: _controller.attendees,
                                        onJoin: _controller.toggleJoin,
                                        region: widget.region))),
                          const SizedBox(height: 8),
                        ],
                      ])),
                ],
              )),
          bottomNavigationBar: widget.region(
              'navigation',
              FeedNavigation(
                  destination: _controller.destination,
                  onDestination: _navigate,
                  onCreate: _create)),
        ),
      );

  Widget _post(FeedPost post, RegionBuilder region) => PostCard(
        key: ValueKey(post.id),
        post: post,
        liked: _controller.isLiked(post),
        saved: _controller.isSaved(post),
        likes: _controller.likeCount(post),
        comments: _controller.commentCount(post),
        region: region,
        onLike: () => _controller.toggleLike(post),
        onSave: () => _controller.toggleSave(post),
        onComments: () => _comments(post),
        onAuthor: () => _profile(post.author),
        onShare: () => _sheet(InfoSheet(
            title: 'Share preview',
            message:
                '${post.title}\n${post.caption}\n\nfieldnotes.local/post/${post.id}\n\nNo external share is sent by this demo.')),
        onMenu: () => _sheet(InfoSheet(
            title: 'About this fieldnote',
            message: '${post.author}\n${post.subtitle}\n${post.tag}')),
      );
}
