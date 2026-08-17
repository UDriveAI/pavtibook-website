import 'dart:io';
import 'dart:ui' as ui;
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  TestWidgetsFlutterBinding.ensureInitialized();

  test('Generate clean square Pavati-Book-LogoIcon-Clean.png asset', () async {
    final file = File('assets/images/Pavati-Book-LogoIcon.png');
    final bytes = await file.readAsBytes();
    final codec = await ui.instantiateImageCodec(bytes);
    final frame = await codec.getNextFrame();
    final srcImage = frame.image;

    // Source is 349x379.
    // Let's create a high-res 512x512 square canvas with pure transparent background,
    // and draw the logo centered with exact aspect ratio preservation.
    final recorder = ui.PictureRecorder();
    final canvas = Canvas(recorder, const Rect.fromLTWH(0, 0, 512, 512));

    // Calculate dest rect so 349x379 is scaled to fit in 500x500 box (leaving 6px padding)
    final scale = 500.0 / 379.0; // 1.319
    final drawW = 349.0 * scale; // 460.4
    final drawH = 379.0 * scale; // 500.0
    final drawX = (512.0 - drawW) / 2; // 25.8
    final drawY = (512.0 - drawH) / 2; // 6.0

    final paint = Paint()
      ..isAntiAlias = true;
      
    canvas.drawImageRect(
      srcImage,
      Rect.fromLTWH(0, 0, srcImage.width.toDouble(), srcImage.height.toDouble()),
      Rect.fromLTWH(drawX, drawY, drawW, drawH),
      paint,
    );

    final picture = recorder.endRecording();
    final cleanImage = await picture.toImage(512, 512);
    final pngData = await cleanImage.toByteData(format: ui.ImageByteFormat.png);

    expect(pngData, isNotNull);
    final outFile = File('assets/images/Pavati-Book-LogoIcon-Clean.png');
    await outFile.writeAsBytes(pngData!.buffer.asUint8List());
    print('Successfully generated assets/images/Pavati-Book-LogoIcon-Clean.png (${outFile.lengthSync()} bytes)');
  });
}
