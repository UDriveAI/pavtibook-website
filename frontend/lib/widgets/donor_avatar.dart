import 'package:flutter/material.dart';

class DonorAvatar extends StatelessWidget {
  final String? name;
  final String? photoUrl;
  final double radius;

  const DonorAvatar({
    super.key,
    required this.name,
    this.photoUrl,
    this.radius = 20,
  });

  @override
  Widget build(BuildContext context) {
    if (photoUrl != null && photoUrl!.isNotEmpty) {
      return CircleAvatar(
        radius: radius,
        backgroundImage: NetworkImage(photoUrl!),
        backgroundColor: Colors.transparent,
      );
    }

    final trimmedName = name?.trim() ?? '';
    final firstLetter = trimmedName.isNotEmpty
        ? trimmedName.substring(0, 1).toUpperCase()
        : '?';

    return CircleAvatar(
      radius: radius,
      backgroundColor: const Color(0xFF8B1E2D), // PavtiBook brand Maroon
      child: Text(
        firstLetter,
        style: TextStyle(
          color: const Color(0xFFFFF6E8), // PavtiBook brand Cream
          fontWeight: FontWeight.bold,
          fontSize: radius * 0.9,
        ),
      ),
    );
  }
}
