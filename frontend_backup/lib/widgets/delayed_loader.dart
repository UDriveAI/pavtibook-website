import 'dart:async';
import 'package:flutter/material.dart';

class DelayedLoader {
  static Future<T> run<T>({
    required BuildContext context,
    required String message,
    required Future<T> Function() operation,
    int delayMs = 250,
  }) async {
    bool isCompleted = false;
    T? result;
    Object? error;

    // Start the actual operation
    final future = operation().then((val) {
      result = val;
      isCompleted = true;
      return val;
    }).catchError((err) {
      error = err;
      isCompleted = true;
      throw err;
    });

    // Wait for the specified delay threshold
    await Future.delayed(Duration(milliseconds: delayMs));

    if (!isCompleted && context.mounted) {
      // Operation is still running, show loading overlay dialog
      showDialog(
        context: context,
        barrierDismissible: false,
        builder: (cxt) => AlertDialog(
          content: Row(
            children: [
              const SizedBox(
                width: 24,
                height: 24,
                child: CircularProgressIndicator(strokeWidth: 2.5),
              ),
              const SizedBox(width: 20),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                      fontWeight: FontWeight.w500, fontSize: 14),
                ),
              ),
            ],
          ),
        ),
      );

      try {
        // Await the operation completion
        final finalVal = await future;
        if (context.mounted) {
          Navigator.of(context).pop(); // Dismiss loading dialog
        }
        return finalVal;
      } catch (e) {
        if (context.mounted) {
          Navigator.of(context).pop(); // Dismiss loading dialog
        }
        rethrow;
      }
    } else {
      // Operation completed within delayMs threshold, return result directly
      if (error != null) {
        throw error!;
      }
      return result as T;
    }
  }
}
