import 'dart:async';
import 'dart:ui' as ui;
import 'package:flutter/foundation.dart';
import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'package:image/image.dart' as img;
import '../models/models.dart';

class ImageCompressInput {
  final int width;
  final int height;
  final Uint8List bytes;
  ImageCompressInput(this.width, this.height, this.bytes);
}

// Top-level Isolate function to compress raw RGBA bytes to high-quality JPEG directly
Uint8List _compressRawToJpgIsolate(ImageCompressInput input) {
  final image = img.Image.fromBytes(
    width: input.width,
    height: input.height,
    bytes: input.bytes.buffer,
    numChannels: 4,
    order: img.ChannelOrder.rgba,
  );
  final jpgBytes = img.encodeJpg(image, quality: 95);
  return Uint8List.fromList(jpgBytes);
}

class ReceiptImageService {
  // Pre-cache all network images (logos, signatures, collector photos, watermarks, stamps)
  // concurrently so that they are synchronously available in the Flutter image cache during capture.
  static Future<void> precacheReceiptImages({
    required BuildContext context,
    required ReceiptModel receipt,
    required OrganizationModel organization,
    required TemplateModel template,
  }) async {
    final imageUrls = <String>[];

    if (organization.logoUrl != null && organization.logoUrl!.trim().isNotEmpty) {
      imageUrls.add(organization.logoUrl!.trim());
    }

    final sigUrl = receipt.signatureUrl ?? template.signatureUrl;
    if (sigUrl != null && sigUrl.trim().isNotEmpty) {
      imageUrls.add(sigUrl.trim());
    }

    if (receipt.collectorPhotoSnapshot != null && receipt.collectorPhotoSnapshot!.trim().isNotEmpty) {
      imageUrls.add(receipt.collectorPhotoSnapshot!.trim());
    }

    final watermarkUrl = template.watermarkUrl;
    if (watermarkUrl != null && watermarkUrl.trim().isNotEmpty) {
      imageUrls.add(watermarkUrl.trim());
    }

    final leftLogoUrl = receipt.leftSideImageUrl ?? organization.leftSideImageUrl ?? template.godImageUrl;
    if (leftLogoUrl != null && leftLogoUrl.trim().isNotEmpty) {
      imageUrls.add(leftLogoUrl.trim());
    }

    final rightLogoUrl = receipt.rightSideImageUrl ?? organization.rightSideImageUrl ?? receipt.customStampUrl ?? organization.customStampUrl;
    if (rightLogoUrl != null && rightLogoUrl.trim().isNotEmpty) {
      imageUrls.add(rightLogoUrl.trim());
    }

    final stampUrl = receipt.customStampUrl ?? organization.customStampUrl;
    if (stampUrl != null && stampUrl.trim().isNotEmpty) {
      imageUrls.add(stampUrl.trim());
    }

    final uniqueUrls = imageUrls.toSet();
    debugPrint('ReceiptImageService: Pre-caching ${uniqueUrls.length} network images...');

    await Future.wait(uniqueUrls.map((url) async {
      try {
        final provider = NetworkImage(url);
        await precacheImage(provider, context);
        debugPrint('ReceiptImageService: Pre-cached successfully: $url');
      } catch (e) {
        debugPrint('ReceiptImageService: Pre-caching failed for $url: $e');
      }
    }));
  }

  // Captures the widget wrapped in a RepaintBoundary by its GlobalKey.
  // Performs safety checks (attached, hasSize, debugNeedsPaint, endOfFrame)
  // and retries automatically up to 5 times.
  static Future<Uint8List> captureReceiptWidget(GlobalKey key) async {
    final stopwatch = Stopwatch()..start();
    RenderRepaintBoundary? boundary;
    int retries = 5;

    while (retries > 0) {
      try {
        // Wait for end of current frame to ensure widgets are updated and painted
        await WidgetsBinding.instance.endOfFrame;

        final context = key.currentContext;
        if (context == null) {
          throw Exception("GlobalKey context is null");
        }

        final renderObj = context.findRenderObject();
        if (renderObj == null) {
          throw Exception("Render object is null");
        }

        if (renderObj is! RenderRepaintBoundary) {
          throw Exception("RenderObject is not a RenderRepaintBoundary");
        }

        boundary = renderObj;

        if (!boundary.attached) {
          throw Exception("Boundary is not attached to the render tree");
        }

        if (!boundary.hasSize) {
          throw Exception("Boundary size has not been laid out yet");
        }

        if (boundary.debugNeedsPaint) {
          throw Exception("Boundary needs paint/repaint");
        }

        // All checks passed
        break;
      } catch (e) {
        retries--;
        debugPrint('ReceiptImageService: Capture safety check failed ($e). Retries left: $retries');
        if (retries == 0) {
          rethrow;
        }
        await Future.delayed(const Duration(milliseconds: 50));
      }
    }

    if (boundary == null) {
      throw Exception("Failed to locate or validate RepaintBoundary after retries");
    }

    // Capture boundary image representation.
    // logicalSize (typically ~360px wide) * pixelRatio 3.0 = 1080px wide output.
    final ui.Image image = await boundary.toImage(pixelRatio: 3.0);
    final ByteData? byteData = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
    if (byteData == null) {
      throw Exception("Failed to convert captured image boundary to raw RGBA bytes");
    }

    final rawBytes = byteData.buffer.asUint8List();
    
    // Compress raw RGBA to 95% JPEG quality in background Isolate
    final jpgBytes = await compute(
      _compressRawToJpgIsolate,
      ImageCompressInput(image.width, image.height, rawBytes),
    );

    final elapsed = stopwatch.elapsedMilliseconds;
    debugPrint('ReceiptImageService: Capture and compression completed successfully in ${elapsed}ms');

    return jpgBytes;
  }
}
