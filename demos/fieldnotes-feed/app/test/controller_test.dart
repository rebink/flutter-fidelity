import 'package:flutter_test/flutter_test.dart';
import 'package:fieldnotes_feed/feed/feed_controller.dart';

void main() {
  late FeedController controller;
  setUp(() => controller = FeedController());
  tearDown(() => controller.dispose());
  test('like and join toggles update counts exactly once', () {
    controller.toggleLike(referencePost);
    expect(controller.likeCount(referencePost), 129);
    controller.toggleLike(referencePost);
    expect(controller.likeCount(referencePost), 128);
    controller.toggleJoin();
    expect(controller.attendees, 13);
    controller.toggleJoin();
    expect(controller.attendees, 12);
  });
  test('saved destination displays only saved post identities', () {
    controller.selectDestination(FeedDestination.saved);
    expect(controller.visiblePosts, isEmpty);
    controller.toggleSave(referencePost);
    expect(controller.visiblePosts.single.id, referencePost.id);
    controller.toggleSave(referencePost);
    expect(controller.visiblePosts, isEmpty);
  });
  test('category filters follow the fixture category', () {
    controller.selectCategory(FeedCategory.design);
    expect(controller.visiblePosts, isEmpty);
    controller.selectCategory(FeedCategory.outdoors);
    expect(controller.visiblePosts.single, referencePost);
    controller.selectCategory(FeedCategory.following);
    expect(controller.visiblePosts.single, referencePost);
  });
  test('blank comments cannot alter counts and new comments are trimmed', () {
    controller.addComment(referencePost, '  ');
    expect(controller.commentCount(referencePost), 24);
    controller.addComment(referencePost, ' Beautiful trail! ');
    expect(controller.commentCount(referencePost), 25);
    expect(controller.commentsFor(referencePost), ['Beautiful trail!']);
  });
  test('create adds a unique local post and resets category/destination', () {
    controller.selectDestination(FeedDestination.saved);
    controller.createPost(' A quiet morning ');
    expect(controller.visiblePosts.first.caption, 'A quiet morning');
    expect(controller.visiblePosts.first.likes, 0);
    expect(controller.category, FeedCategory.forYou);
    expect(controller.destination, FeedDestination.feed);
    controller.createPost('Another note');
    expect(controller.visiblePosts.map((p) => p.id).toSet().length, 3);
  });
}
