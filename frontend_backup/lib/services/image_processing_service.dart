import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:image_picker/image_picker.dart';
import 'package:path_provider/path_provider.dart';
import 'package:image/image.dart' as img;

class ProcessedProfilePhoto {
  final Uint8List bytes512;
  final Uint8List bytes256;
  final Uint8List bytes128;

  ProcessedProfilePhoto({
    required this.bytes512,
    required this.bytes256,
    required this.bytes128,
  });
}

// Top level function for Isolate/compute (Single-pass multiple thumbnail generations)
Map<String, Uint8List>? _processAllThumbnailsIsolate(Uint8List inputBytes) {
  try {
    final image = img.decodeImage(inputBytes);
    if (image == null) return null;

    final width = image.width;
    final height = image.height;
    final size = width < height ? width : height;

    final x = ((width - size) / 2).round();
    final y = ((height - size) / 2).round();

    final cropped = img.copyCrop(image, x: x, y: y, width: size, height: size);
    
    // Resize to all three versions in a single pass using high-quality cubic interpolation
    final img512 = img.copyResize(cropped, width: 512, height: 512, interpolation: img.Interpolation.cubic);
    final img256 = img.copyResize(cropped, width: 256, height: 256, interpolation: img.Interpolation.cubic);
    final img128 = img.copyResize(cropped, width: 128, height: 128, interpolation: img.Interpolation.cubic);

    // Encode to JPEG with quality 75 to keep size low
    final bytes512 = img.encodeJpg(img512, quality: 75);
    final bytes256 = img.encodeJpg(img256, quality: 75);
    final bytes128 = img.encodeJpg(img128, quality: 75);

    return {
      '512': Uint8List.fromList(bytes512),
      '256': Uint8List.fromList(bytes256),
      '128': Uint8List.fromList(bytes128),
    };
  } catch (e) {
    debugPrint('Error in image processing isolate: $e');
    return null;
  }
}

// Top-level function for custom size processing in Isolate
Uint8List? _processAndCompressImageIsolate(Map<String, dynamic> params) {
  try {
    final Uint8List inputBytes = params['bytes'];
    final int targetSize = params['targetSize'];
    final int quality = params['quality'];

    final image = img.decodeImage(inputBytes);
    if (image == null) return null;

    final width = image.width;
    final height = image.height;
    final size = width < height ? width : height;

    final x = ((width - size) / 2).round();
    final y = ((height - size) / 2).round();

    final cropped = img.copyCrop(image, x: x, y: y, width: size, height: size);
    final resized = img.copyResize(cropped, width: targetSize, height: targetSize, interpolation: img.Interpolation.cubic);

    return Uint8List.fromList(img.encodeJpg(resized, quality: quality));
  } catch (e) {
    debugPrint('Error in single isolate processing: $e');
    return null;
  }
}

class ImageProcessingService {
  static final ImagePicker _picker = ImagePicker();

  // Pick an image from gallery or camera
  static Future<XFile?> pickImage(ImageSource source) async {
    try {
      return await _picker.pickImage(
        source: source,
        maxWidth: 2048,
        maxHeight: 2048,
        imageQuality: 85,
      );
    } catch (e) {
      debugPrint('Error picking image: $e');
      return null;
    }
  }

  // Centered square cropping and resizing to target size using compute Isolate (backward compatibility)
  static Future<Uint8List?> cropAndResizeImage(Uint8List inputBytes, int targetSize) async {
    try {
      final resultMap = await compute(_processAllThumbnailsIsolate, inputBytes);
      if (resultMap != null) {
        if (targetSize == 512) return resultMap['512'];
        if (targetSize == 256) return resultMap['256'];
        if (targetSize == 128) return resultMap['128'];
        
        final params = {'bytes': inputBytes, 'targetSize': targetSize, 'quality': 75};
        return await compute(_processAndCompressImageIsolate, params);
      }
    } catch (e) {
      debugPrint('Error cropping and resizing image: $e');
    }
    return null;
  }

  // Single-pass processing for all three thumbnails in Isolate
  static Future<ProcessedProfilePhoto?> processAllThumbnails(Uint8List inputBytes) async {
    try {
      final resultMap = await compute(_processAllThumbnailsIsolate, inputBytes);
      if (resultMap != null) {
        return ProcessedProfilePhoto(
          bytes512: resultMap['512']!,
          bytes256: resultMap['256']!,
          bytes128: resultMap['128']!,
        );
      }
    } catch (e) {
      debugPrint('Error processing all thumbnails: $e');
    }
    return null;
  }

  // Cache photo locally and clean up older versions
  static Future<File> cachePhotoLocally(String uid, int version, Uint8List bytes, {String suffix = ''}) async {
    final docDir = await getApplicationDocumentsDirectory();
    
    // Clean up older cached files for this user and suffix
    try {
      final dir = Directory(docDir.path);
      final list = dir.listSync();
      for (var entity in list) {
        if (entity is File) {
          final filename = entity.path.split('/').last.split('\\').last;
          if (filename.startsWith('profile_photo_$uid${suffix}_v') && !filename.endsWith('_v$version.jpg')) {
            await entity.delete();
          }
        }
      }
    } catch (e) {
      debugPrint('Error clearing old cache files: $e');
    }

    final cacheFile = File('${docDir.path}/profile_photo_$uid${suffix}_v$version.jpg');
    await cacheFile.writeAsBytes(bytes);
    return cacheFile;
  }

  // Get cached photo file
  static Future<File?> getCachedPhotoFile(String uid, int version, {String suffix = ''}) async {
    final docDir = await getApplicationDocumentsDirectory();
    final cacheFile = File('${docDir.path}/profile_photo_$uid${suffix}_v$version.jpg');
    if (await cacheFile.exists()) {
      return cacheFile;
    }
    return null;
  }

  // Clear cache when profile photo is removed
  static Future<void> clearLocalCache(String uid) async {
    try {
      final docDir = await getApplicationDocumentsDirectory();
      final dir = Directory(docDir.path);
      final list = dir.listSync();
      for (var entity in list) {
        if (entity is File) {
          final filename = entity.path.split('/').last.split('\\').last;
          if (filename.startsWith('profile_photo_${uid}_') || filename.startsWith('profile_photo_${uid}_v')) {
            await entity.delete();
          }
        }
      }
    } catch (e) {
      debugPrint('Error clearing local cache: $e');
    }
  }
}
