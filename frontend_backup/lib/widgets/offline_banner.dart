import 'dart:async';
import 'dart:io';
import 'package:flutter/material.dart';

class OfflineAwarenessWrapper extends StatefulWidget {
  final Widget child;

  const OfflineAwarenessWrapper({super.key, required this.child});

  @override
  State<OfflineAwarenessWrapper> createState() =>
      _OfflineAwarenessWrapperState();
}

class _OfflineAwarenessWrapperState extends State<OfflineAwarenessWrapper> {
  bool _isOnline = true;
  bool _showBanner = false;
  Timer? _timer;
  bool _previouslyOffline = false;
  Timer? _dismissTimer;

  @override
  void initState() {
    super.initState();
    _checkConnectivity();
    // Run checks periodically every 6 seconds to optimize performance without draining battery
    _timer = Timer.periodic(const Duration(seconds: 6), (timer) {
      _checkConnectivity();
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    _dismissTimer?.cancel();
    super.dispose();
  }

  Future<void> _checkConnectivity() async {
    try {
      final result = await InternetAddress.lookup('google.com')
          .timeout(const Duration(seconds: 3));
      final isNowOnline = result.isNotEmpty && result[0].rawAddress.isNotEmpty;
      _updateStatus(isNowOnline);
    } catch (_) {
      _updateStatus(false);
    }
  }

  void _updateStatus(bool isNowOnline) {
    if (!mounted) return;
    if (_isOnline == isNowOnline) return;

    setState(() {
      _isOnline = isNowOnline;
      if (!_isOnline) {
        _previouslyOffline = true;
        _showBanner = true;
        _dismissTimer?.cancel();
      } else {
        if (_previouslyOffline) {
          _showBanner = true; // Show back online banner
          _dismissTimer?.cancel();
          _dismissTimer = Timer(const Duration(seconds: 3), () {
            if (mounted && _isOnline) {
              setState(() {
                _showBanner = false;
                _previouslyOffline = false;
              });
            }
          });
        } else {
          _showBanner = false;
        }
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        widget.child,
        if (_showBanner)
          Positioned(
            top: 0,
            left: 0,
            right: 0,
            child: SafeArea(
              child: Material(
                color: Colors.transparent,
                child: TweenAnimationBuilder<double>(
                  tween: Tween<double>(begin: -50.0, end: 0.0),
                  duration: const Duration(milliseconds: 300),
                  curve: Curves.easeOut,
                  builder: (context, val, child) {
                    return Transform.translate(
                      offset: Offset(0, val),
                      child: Container(
                        padding: const EdgeInsets.symmetric(
                            vertical: 8, horizontal: 16),
                        color: _isOnline
                            ? const Color(0xFF2E7D32)
                            : const Color(0xFFE65100), // Green vs Orange
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              _isOnline ? Icons.wifi : Icons.wifi_off,
                              color: Colors.white,
                              size: 16,
                            ),
                            const SizedBox(width: 8),
                            Text(
                              _isOnline
                                  ? "Back Online. Sync Complete."
                                  : "You're Offline. Receipts will sync automatically.",
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 12,
                                fontWeight: FontWeight.w600,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),
            ),
          ),
      ],
    );
  }
}
