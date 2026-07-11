import 'dart:math';
import 'package:flutter/material.dart';

class ConfettiWidget extends StatefulWidget {
  final VoidCallback? onFinished;

  const ConfettiWidget({super.key, this.onFinished});

  @override
  State<ConfettiWidget> createState() => _ConfettiWidgetState();
}

class _ConfettiWidgetState extends State<ConfettiWidget>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  final List<ConfettiParticle> _particles = [];
  final Random _random = Random();

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 4),
    );

    final colors = [
      Colors.redAccent,
      Colors.blueAccent,
      Colors.greenAccent,
      Colors.amberAccent,
      Colors.pinkAccent,
      Colors.orangeAccent,
      Colors.purpleAccent,
      Colors.tealAccent,
    ];

    for (int i = 0; i < 90; i++) {
      _particles.add(ConfettiParticle(
        x: 0.1 + _random.nextDouble() * 0.8, // span across horizontal width
        y: -0.1 - _random.nextDouble() * 0.4, // start above screen
        color: colors[_random.nextInt(colors.length)],
        size: 5.0 + _random.nextDouble() * 9.0,
        speedX: -2.0 + _random.nextDouble() * 4.0,
        speedY: 3.0 + _random.nextDouble() * 5.0,
        rotationSpeed: -5.0 + _random.nextDouble() * 10.0,
        shape: _random.nextBool() ? ParticleShape.rect : ParticleShape.circle,
      ));
    }

    _controller.addListener(() {
      for (var p in _particles) {
        p.update();
      }
      setState(() {});
    });

    _controller.forward().then((_) {
      if (widget.onFinished != null) {
        widget.onFinished!();
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    double opacity = 1.0;
    if (_controller.value > 0.75) {
      opacity = (1.0 - _controller.value) / 0.25;
    }

    return IgnorePointer(
      child: Opacity(
        opacity: opacity.clamp(0.0, 1.0),
        child: CustomPaint(
          size: Size.infinite,
          painter: ConfettiPainter(particles: _particles),
        ),
      ),
    );
  }
}

enum ParticleShape { rect, circle }

class ConfettiParticle {
  double x;
  double y;
  Color color;
  double size;
  double speedX;
  double speedY;
  double rotation = 0.0;
  double rotationSpeed;
  ParticleShape shape;

  ConfettiParticle({
    required this.x,
    required this.y,
    required this.color,
    required this.size,
    required this.speedX,
    required this.speedY,
    required this.rotationSpeed,
    required this.shape,
  });

  void update() {
    x += speedX * 0.004;
    y += speedY * 0.004;
    rotation += rotationSpeed * 0.04;
    speedY += 0.06; // gravity
  }
}

class ConfettiPainter extends CustomPainter {
  final List<ConfettiParticle> particles;

  ConfettiPainter({required this.particles});

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()..style = PaintingStyle.fill;

    for (var p in particles) {
      final px = p.x * size.width;
      final py = p.y * size.height;

      if (px < -20 || px > size.width + 20 || py > size.height + 20) continue;

      paint.color = p.color;

      canvas.save();
      canvas.translate(px, py);
      canvas.rotate(p.rotation);

      if (p.shape == ParticleShape.circle) {
        canvas.drawCircle(Offset.zero, p.size / 2, paint);
      } else {
        canvas.drawRect(
          Rect.fromCenter(
              center: Offset.zero, width: p.size, height: p.size * 0.6),
          paint,
        );
      }
      canvas.restore();
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}
