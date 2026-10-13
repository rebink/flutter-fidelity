import 'package:flutter/material.dart';
import '../../theme/feed_theme.dart';

class TextEntrySheet extends StatefulWidget {
  const TextEntrySheet(
      {required this.title,
      required this.hint,
      required this.onSubmit,
      this.buttonLabel = 'Post',
      super.key});
  final String title;
  final String hint;
  final String buttonLabel;
  final ValueChanged<String> onSubmit;
  @override
  State<TextEntrySheet> createState() => _TextEntrySheetState();
}

class _TextEntrySheetState extends State<TextEntrySheet> {
  final _formKey = GlobalKey<FormState>();
  final _text = TextEditingController();
  @override
  void dispose() {
    _text.dispose();
    super.dispose();
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    widget.onSubmit(_text.text.trim());
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.viewInsetsOf(context).bottom + 20),
        child: SingleChildScrollView(
            child: Form(
                key: _formKey,
                child: Column(
                    mainAxisSize: MainAxisSize.min,
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(widget.title,
                          style: Theme.of(context).textTheme.titleLarge),
                      const SizedBox(height: 16),
                      TextFormField(
                          key: const ValueKey('entry-field'),
                          controller: _text,
                          maxLines: 3,
                          minLines: 2,
                          textCapitalization: TextCapitalization.sentences,
                          textInputAction: TextInputAction.done,
                          decoration: InputDecoration(labelText: widget.hint),
                          validator: (value) =>
                              value == null || value.trim().isEmpty
                                  ? 'Write a little something first.'
                                  : null,
                          onFieldSubmitted: (_) => _submit()),
                      const SizedBox(height: 16),
                      Align(
                          alignment: AlignmentDirectional.centerEnd,
                          child: FilledButton(
                              onPressed: _submit,
                              child: Text(widget.buttonLabel))),
                    ]))),
      );
}

class FeedSearchSheet extends StatefulWidget {
  const FeedSearchSheet({super.key});
  @override
  State<FeedSearchSheet> createState() => _FeedSearchSheetState();
}

class _FeedSearchSheetState extends State<FeedSearchSheet> {
  final _query = TextEditingController();
  @override
  void dispose() {
    _query.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
        padding: EdgeInsets.fromLTRB(
            20, 20, 20, MediaQuery.viewInsetsOf(context).bottom + 24),
        child: SingleChildScrollView(
            child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
              Text('Search fieldnotes',
                  style: Theme.of(context).textTheme.titleLarge),
              const SizedBox(height: 16),
              TextField(
                  key: const ValueKey('search-field'),
                  controller: _query,
                  textInputAction: TextInputAction.search,
                  decoration: const InputDecoration(
                      labelText: 'Search local posts',
                      prefixIcon: Icon(Icons.search)),
                  onChanged: (_) => setState(() {})),
              const SizedBox(height: 16),
              if (_query.text.isEmpty ||
                  'maya chen take the scenic route outdoors'
                      .contains(_query.text.toLowerCase().trim()))
                ListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Take the scenic route.'),
                    subtitle: const Text('Maya Chen · Outdoors'),
                    onTap: () => Navigator.of(context).pop())
              else
                const Padding(
                    padding: EdgeInsets.symmetric(vertical: 16),
                    child: Text('No matching local posts.')),
            ])),
      );
}

class InfoSheet extends StatelessWidget {
  const InfoSheet(
      {required this.title, required this.message, this.image, super.key});
  final String title;
  final String message;
  final String? image;
  @override
  Widget build(BuildContext context) => SafeArea(
      top: false,
      child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(title, style: Theme.of(context).textTheme.titleLarge),
                const SizedBox(height: 14),
                if (image != null) ...[
                  ClipRRect(
                      borderRadius: BorderRadius.circular(16),
                      child: Image.asset(image!, fit: BoxFit.cover)),
                  const SizedBox(height: 14)
                ],
                SelectableText(message,
                    style: FeedType.text(14,
                        color: FeedPalette.muted, height: 1.5)),
                const SizedBox(height: 18),
                Align(
                    alignment: AlignmentDirectional.centerEnd,
                    child: TextButton(
                        onPressed: () => Navigator.of(context).pop(),
                        child: const Text('Close'))),
              ])));
}
