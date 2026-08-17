import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:firebase_core/firebase_core.dart';
import 'package:cloud_firestore/cloud_firestore.dart';

import 'package:shared_preferences/shared_preferences.dart';

import 'providers/auth_provider.dart';
import 'providers/data_providers.dart';
import 'providers/locale_provider.dart';
import 'config/app_localizations.dart';

import 'screens/splash_screen.dart';
import 'screens/login_screen.dart';
import 'screens/otp_verification_screen.dart';
import 'screens/register_org_screen.dart';
import 'screens/dashboard_screen.dart';
import 'screens/create_receipt_screen.dart';
import 'screens/payment_screen.dart';
import 'screens/receipt_preview_screen.dart';
import 'screens/receipt_history_screen.dart';
import 'screens/donor_list_screen.dart';
import 'screens/donor_details_screen.dart';
import 'screens/settings_screen.dart';
import 'screens/public_verification_screen.dart';
import 'screens/settings_subpages.dart';
import 'screens/collection_details_screen.dart';
import 'screens/whatsapp_settings_screen.dart';
import 'screens/whatsapp_logs_screen.dart';
import 'screens/about_screen.dart';
import 'screens/team_management_screen.dart';
import 'screens/activity_log_screen.dart';
import 'screens/join_organization_screen.dart';
import 'screens/organization_selector_screen.dart';
import 'widgets/offline_banner.dart';
import 'screens/receipt_success_screen.dart';
import 'screens/profile_screen.dart';
import 'screens/ownership_transfer_screen.dart';
import 'screens/payment_history_screen.dart';
import 'package:google_sign_in/google_sign_in.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Firebase.initializeApp();

  // Non-blocking Google Sign-In initialization
  GoogleSignIn.instance.initialize(
    serverClientId: '780452591351-ligh78331iu5s341ehm75o2ucnnbf6iu.apps.googleusercontent.com',
  ).catchError((e) {
    debugPrint('[GOOGLE_SIGN_IN_INIT] Error initializing GoogleSignIn: $e');
  });

  // Enable Firestore offline persistence for seamless offline receipt creation.
  FirebaseFirestore.instance.settings = const Settings(
    persistenceEnabled: true,
    cacheSizeBytes: Settings.CACHE_SIZE_UNLIMITED,
  );

  // Print Firebase app options to debug
  try {
    final app = Firebase.app();
    debugPrint('==================================================');
    debugPrint('[FIREBASE_STARTUP] ProjectId: ${app.options.projectId}');
    debugPrint('[FIREBASE_STARTUP] AppId: ${app.options.appId}');
    debugPrint('[FIREBASE_STARTUP] ApiKey: ${app.options.apiKey}');
    debugPrint('==================================================');
  } catch (e) {
    debugPrint('[FIREBASE_STARTUP] Error getting app options: $e');
  }

  runApp(const PavtiBookApp());
}

final GlobalKey<ScaffoldMessengerState> scaffoldMessengerKey =
    GlobalKey<ScaffoldMessengerState>();

class AppRouteObserver extends NavigatorObserver {
  static String? currentRoute;

  void _updateRoute(Route<dynamic>? route) {
    scaffoldMessengerKey.currentState?.clearSnackBars();
    if (route is PageRoute && route.settings.name != null) {
      final name = route.settings.name!;
      if (name != '/' && name != '/login' && name != '/otp-verify' && name != '/register') {
        currentRoute = name;
        SharedPreferences.getInstance().then((prefs) {
          prefs.setString('last_active_route', name);
        });
      }
    }
  }

  @override
  void didPush(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _updateRoute(route);
  }

  @override
  void didPop(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _updateRoute(previousRoute);
  }

  @override
  void didReplace({Route<dynamic>? newRoute, Route<dynamic>? oldRoute}) {
    _updateRoute(newRoute);
  }

  @override
  void didRemove(Route<dynamic> route, Route<dynamic>? previousRoute) {
    _updateRoute(previousRoute);
  }
}

class PavtiBookApp extends StatelessWidget {
  const PavtiBookApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => LocaleProvider()),
        ChangeNotifierProvider(create: (_) => DashboardProvider()),
        ChangeNotifierProvider(create: (_) => ReceiptProvider()),
        ChangeNotifierProvider(create: (_) => DonorProvider()),
        ChangeNotifierProvider(create: (_) => TemplateProvider()),
      ],
      child: Consumer<LocaleProvider>(
        builder: (context, localeProvider, child) {
          return MaterialApp(
            restorationScopeId: 'pavtibook_app',
            scaffoldMessengerKey: scaffoldMessengerKey,
            navigatorObservers: [AppRouteObserver()],
            title: 'PavtiBook',
            debugShowCheckedModeBanner: false,
            locale: localeProvider.locale,
            supportedLocales: const [
              Locale('en', ''),
              Locale('mr', ''),
              Locale('hi', ''),
            ],
            localizationsDelegates: const [
              AppLocalizations.delegate,
              GlobalMaterialLocalizations.delegate,
              GlobalWidgetsLocalizations.delegate,
              GlobalCupertinoLocalizations.delegate,
            ],
            theme: ThemeData(
              useMaterial3: true,
              colorScheme: const ColorScheme(
                brightness: Brightness.light,
                primary: Color(0xFF8B1E2D), // Primary Maroon
                secondary: Color(0xFFF47C20), // Orange
                surface: Color(0xFFFFF6E8), // Cream Background
                error: Colors.red,
                onPrimary: Colors.white,
                onSecondary: Colors.white,
                onSurface: Color(0xFF2E1C0C), // Dark charcoal brown
                onError: Colors.white,
              ),
              scaffoldBackgroundColor:
                  const Color(0xFFFFF6E8), // Cream Background
              textTheme: GoogleFonts.outfitTextTheme(
                Theme.of(context).textTheme,
              ),
              appBarTheme: const AppBarTheme(
                backgroundColor: Color(0xFF8B1E2D), // Primary Maroon
                foregroundColor: Colors.white,
                elevation: 0,
                centerTitle: true,
              ),
              elevatedButtonTheme: ElevatedButtonThemeData(
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF8B1E2D), // Primary Maroon
                  foregroundColor: Colors.white,
                  padding:
                      const EdgeInsets.symmetric(vertical: 14, horizontal: 24),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(8),
                  ),
                ),
              ),
            ),
            builder: (context, child) {
              return OfflineAwarenessWrapper(child: child!);
            },
            initialRoute: '/',
            routes: {
              '/': (context) => const SplashScreen(),
              '/login': (context) => const LoginScreen(),
              '/otp-verify': (context) => const OtpVerificationScreen(),
              '/register': (context) => const RegisterOrgScreen(),
              '/dashboard': (context) => const DashboardScreen(),
              '/create-receipt': (context) => const CreateReceiptScreen(),
              '/payment': (context) => const PaymentScreen(),
              '/receipt-preview': (context) => const ReceiptPreviewScreen(),
              '/receipt-history': (context) => const ReceiptHistoryScreen(),
              '/donor-list': (context) => const DonorListScreen(),
              '/donor-details': (context) => const DonorDetailsScreen(),
              '/settings': (context) => const SettingsScreen(),
              '/public-verify': (context) => const PublicVerificationScreen(),
              '/settings/customization': (context) =>
                  const ReceiptCustomizationScreen(),
              '/settings/signatures': (context) =>
                  const AuthorizedSignaturesScreen(),
              '/settings/payment': (context) =>
                  const UpiPaymentSettingsScreen(),
              '/settings/audit': (context) => const FirebaseAuditScreen(),
              '/settings/whatsapp-settings': (context) =>
                  const WhatsAppSettingsScreen(),
              '/settings/whatsapp-logs': (context) =>
                  const WhatsAppLogsScreen(),
              '/settings/subscription-usage': (context) =>
                  const SubscriptionUsageScreen(),
              '/settings/team': (context) => const TeamManagementScreen(),
              '/settings/activity-log': (context) => const ActivityLogScreen(),
              '/join-organization': (context) => const JoinOrganizationScreen(),
              '/org-selector': (context) => const OrganizationSelectorScreen(),
              '/collection-details': (context) =>
                  const CollectionDetailsScreen(),
              '/about': (context) => const AboutScreen(),
              '/receipt-success': (context) => const ReceiptSuccessScreen(),
              '/settings/profile': (context) => const ProfileScreen(),
              '/settings/ownership-transfer': (context) => const OwnershipTransferScreen(),
              '/settings/payment-history': (context) => PaymentHistoryScreen(),
              // MVP V2: '/verification-upload': (context) => const VerificationUploadScreen(),
            },
          );
        },
      ),
    );
  }
}
