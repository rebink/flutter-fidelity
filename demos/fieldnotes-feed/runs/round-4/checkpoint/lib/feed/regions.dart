import 'package:flutter/widgets.dart';

typedef RegionBuilder = Widget Function(String id, Widget child);
Widget plainRegion(String id, Widget child) => child;
