import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Inspect logo asset pixels and bounds', () async {
    for (final filename in [
      'Pavati-Book-LogoIcon.png',
      'Pavati-Book-LogoIcon-Solid.png',
      'Pavati-Book-LogoIcon-Padded.png'
    ]) {
      final file = File('assets/images/$filename');
      final bytes = await file.readAsBytes();
      final codec = await ui.instantiateImageCodec(bytes);
      final frame = await codec.getNextFrame();
      final image = frame.image;
      
      final byteData = await image.toByteData(format: ui.ImageByteFormat.rawRgba);
      if (byteData != null) {
        final buffer = byteData.buffer.asUint8List();
        int minX = image.width, minY = image.height, maxX = 0, maxY = 0;
        int nonAlphaPixels = 0;
        for (int y = 0; y < image.height; y++) {
          for (int x = 0; x < image.width; x++) {
            final offset = (y * image.width + x) * 4;
            final a = buffer[offset + 3];
            if (a > 10) {
              nonAlphaPixels++;
              if (x < minX) minX = x;
              if (x > maxX) maxX = x;
              if (y < minY) minY = y;
              if (y > maxY) maxY = y;
            }
          }
        }
        final contentW = maxX >= minX ? maxX - minX + 1 : 0;
        final contentH = maxY >= minY ? maxY - minY + 1 : 0;
        print('FILE: $filename -> ImageSize: ${image.width}x${image.height}, NonAlphaPixels: $nonAlphaPixels, BoundingBox: [Left: $minX, Top: $minY, W: $contentW, H: $contentH], ContentAspect: ${(contentW/contentH).toStringAsFixed(3)}');
      }
    }
  });
}
