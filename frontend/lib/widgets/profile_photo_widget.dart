import 'dart:io';
import 'dart:convert';
import 'package:flutter/material.dart';
import '../services/image_processing_service.dart';

class ProfilePhotoWidget extends StatefulWidget {
  final String uid;
  final String? url;
  final int? version;
  final String name;
  final double radius;
  final String suffix;

  const ProfilePhotoWidget({
    super.key,
    required this.uid,
    required this.url,
    required this.version,
    required this.name,
    this.radius = 24.0,
    this.suffix = '',
  });

  @override
  State<ProfilePhotoWidget> createState() => _ProfilePhotoWidgetState();
}

class _ProfilePhotoWidgetState extends State<ProfilePhotoWidget> {
  File? _cachedFile;

  @override
  void initState() {
    super.initState();
    _loadLocalCache();
  }

  @override
  void didUpdateWidget(ProfilePhotoWidget oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.version != widget.version || oldWidget.url != widget.url || oldWidget.suffix != widget.suffix) {
      _loadLocalCache();
    }
  }

  Future<void> _loadLocalCache() async {
    if (widget.url == null || widget.url!.isEmpty) {
      if (mounted) {
        setState(() {
          _cachedFile = null;
        });
      }
      return;
    }

    try {
      final ver = widget.version ?? 0;
      final file = await ImageProcessingService.getCachedPhotoFile(widget.uid, ver, suffix: widget.suffix);
      if (file != null) {
        if (mounted) {
          setState(() {
            _cachedFile = file;
          });
        }
      } else {
        if (mounted) {
          setState(() {
            _cachedFile = null;
          });
        }
      }
    } catch (_) {
      if (mounted) {
        setState(() {
          _cachedFile = null;
        });
      }
    }
  }



  @override
  Widget build(BuildContext context) {
    ImageProvider? bgImage;
    if (_cachedFile != null && _cachedFile!.existsSync()) {
      bgImage = FileImage(_cachedFile!);
    } else if (widget.url != null && widget.url!.isNotEmpty) {
      if (widget.url!.startsWith('data:image')) {
        try {
          final base64Str = widget.url!.split(',').last;
          bgImage = MemoryImage(base64Decode(base64Str));
        } catch (_) {}
      } else {
        final version = widget.version ?? 0;
        final separator = widget.url!.contains('?') ? '&' : '?';
        bgImage = NetworkImage('${widget.url}${separator}v=$version');
      }
    }

    final bool hasBorder = (bgImage == null && widget.radius <= 20);

    if (hasBorder) {
      return CircleAvatar(
        radius: widget.radius,
        backgroundColor: Colors.white,
        child: CircleAvatar(
          radius: widget.radius - 1.0,
          backgroundColor: const Color(0xFF8B1E2D),
          child: Icon(
            Icons.person,
            color: Colors.white,
            size: (widget.radius - 1.0) * 1.2,
          ),
        ),
      );
    }

    return CircleAvatar(
      radius: widget.radius,
      backgroundColor: bgImage != null ? Colors.grey[200] : const Color(0xFF8B1E2D),
      backgroundImage: bgImage,
      child: bgImage == null
          ? Icon(
              Icons.person,
              color: Colors.white,
              size: widget.radius * 1.2,
            )
          : null,
    );
  }
}
