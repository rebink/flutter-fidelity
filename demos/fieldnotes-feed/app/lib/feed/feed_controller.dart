import 'package:flutter/foundation.dart';

enum FeedCategory { forYou, following, outdoors, design }

extension FeedCategoryLabel on FeedCategory {
  String get label => switch (this) {
        FeedCategory.forYou => 'For you',
        FeedCategory.following => 'Following',
        FeedCategory.outdoors => 'Outdoors',
        FeedCategory.design => 'Design',
      };
}

enum FeedDestination { feed, explore, saved, you }

@immutable
class FeedPost {
  const FeedPost(
      {required this.id,
      required this.author,
      required this.subtitle,
      required this.title,
      required this.caption,
      required this.tag,
      this.likes = 128,
      this.comments = 24,
      this.category = FeedCategory.outdoors,
      this.following = true,
      this.photo,
      this.avatar = 'assets/images/author.png'});
  final String id;
  final String author;
  final String subtitle;
  final String title;
  final String caption;
  final String tag;
  final int likes;
  final int comments;
  final FeedCategory category;
  final bool following;
  final String? photo;
  final String avatar;
}

const referencePost = FeedPost(
    id: 'scenic-route',
    author: 'Maya Chen',
    subtitle: 'Portland, OR · 24 min',
    title: 'Take the scenic route.',
    caption: 'No signal. No rush. Just the trail ahead.',
    tag: '#weekendwander',
    photo: 'assets/images/trail.png');

class FeedController extends ChangeNotifier {
  final _posts = <FeedPost>[referencePost];
  final _liked = <String>{};
  final _saved = <String>{};
  final _commentAdditions = <String, List<String>>{};
  FeedCategory _category = FeedCategory.forYou;
  FeedDestination _destination = FeedDestination.feed;
  bool _joined = false;
  FeedCategory get category => _category;
  FeedDestination get destination => _destination;
  bool get joined => _joined;
  int get attendees => 12 + (_joined ? 1 : 0);
  List<FeedPost> get visiblePosts => List.unmodifiable(_posts.where((post) {
        if (_destination == FeedDestination.saved &&
            !_saved.contains(post.id)) {
          return false;
        }
        return switch (_category) {
          FeedCategory.forYou => true,
          FeedCategory.following => post.following,
          _ => post.category == _category,
        };
      }));
  bool isLiked(FeedPost post) => _liked.contains(post.id);
  bool isSaved(FeedPost post) => _saved.contains(post.id);
  int likeCount(FeedPost post) => post.likes + (isLiked(post) ? 1 : 0);
  int commentCount(FeedPost post) =>
      post.comments + (_commentAdditions[post.id]?.length ?? 0);
  List<String> commentsFor(FeedPost post) =>
      List.unmodifiable(_commentAdditions[post.id] ?? const <String>[]);
  void selectCategory(FeedCategory value) {
    if (_category == value) return;
    _category = value;
    notifyListeners();
  }

  void selectDestination(FeedDestination value) {
    _destination = value;
    if (value == FeedDestination.saved) _category = FeedCategory.forYou;
    notifyListeners();
  }

  void toggleLike(FeedPost post) {
    if (!_liked.add(post.id)) _liked.remove(post.id);
    notifyListeners();
  }

  void toggleSave(FeedPost post) {
    if (!_saved.add(post.id)) _saved.remove(post.id);
    notifyListeners();
  }

  void toggleJoin() {
    _joined = !_joined;
    notifyListeners();
  }

  void addComment(FeedPost post, String content) {
    final value = content.trim();
    if (value.isEmpty) return;
    _commentAdditions.putIfAbsent(post.id, () => []).add(value);
    notifyListeners();
  }

  void createPost(String content) {
    final value = content.trim();
    if (value.isEmpty) return;
    _posts.insert(
        0,
        FeedPost(
            id: 'local-${_posts.length}',
            author: 'You',
            subtitle: 'Just now · Local demo',
            title: 'A new fieldnote',
            caption: value,
            tag: '#fieldnotes',
            likes: 0,
            comments: 0,
            category: FeedCategory.design,
            avatar: 'assets/images/alex.png'));
    _category = FeedCategory.forYou;
    _destination = FeedDestination.feed;
    notifyListeners();
  }
}
