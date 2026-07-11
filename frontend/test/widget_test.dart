// This is a basic Flutter widget test for PavtiBook.
//
// Since PavtiBook uses a multi-provider app entry point (PavtiBookApp),
// this test simply verifies that the app can pump without crashing.

import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

import 'package:pavtibook_app/main.dart';

void main() {
  testWidgets('PavtiBook app smoke test', (WidgetTester tester) async {
    // Build our app and trigger a frame.
    await tester.pumpWidget(const PavtiBookApp());

    // Verify that the app renders without crashing.
    expect(find.byType(MaterialApp), findsOneWidget);
  });
}
