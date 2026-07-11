# PavtiBook — Digital Traditional Indian Receipt Books

PavtiBook is a multi-tenant SaaS platform that replaces traditional physical receipt books (used by Ganesh Mandals, Navratri Mandals, Temples, Trusts, Societies, and NGOs across India) with a modern digital alternative, while preserving their unique cultural aesthetics, emotional trust, and local language formatting.

---

## 1. SaaS Architecture & Design

PavtiBook separates tenant organizations at the database query level using UUID row isolation.

```
                  +-----------------------------------+
                  |        Flutter Client App         |
                  |     (Mobile Android/iOS & Web)    |
                  +-----------------+-----------------+
                                    |
                                    | HTTPS / JWT
                                    v
                  +-----------------+-----------------+
                  |      Node.js Express Server       |
                  |  (Auth Middleware & Tenant Filters)  |
                  +--------+-----------------+--------+
                           |                 |
         Queries with      |                 | PDF Streams /
         organization_id   |                 | Verification QRs
                           v                 v
                  +--------+--------+  +-----+--------+
                  |    PostgreSQL   |  |  PDF Engine  |
                  |  Multi-Tenant   |  |   (pdfkit)   |
                  +-----------------+  +--------------+
```

---

## 2. Folder Structure

```
PavtiBook/
├── backend/
│   ├── config/
│   │   └── db.js                  # PostgreSQL pool config
│   ├── db/
│   │   ├── schema.sql             # DB Schema migrations
│   │   ├── seed.sql               # Seed presets for Mandals/Temples
│   │   └── init.js                # Auto Database bootstrapper
│   ├── middleware/
│   │   └── auth.js                # JWT validation & Tenant isolation
│   ├── routes/
│   │   ├── auth.js                # Onboarding, Email credentials, OTP login
│   │   ├── collectors.js          # User collector list settings
│   │   ├── dashboard.js           # Collection analytics & stats
│   │   ├── donors.js              # CRM donor listings & timelines
│   │   ├── payments.js            # Reconcile pending transfers
│   │   ├── public.js              # Public QR verification (no auth)
│   │   ├── receipts.js            # Receipt generator & delivery logs
│   │   └── templates.js           # Style customization profiles
│   ├── utils/
│   │   └── pdfEngine.js           # Traditional PDF layout engine (pdfkit)
│   ├── .env.example               # Backend config template
│   ├── Dockerfile                 # Alpine Node packaging
│   └── server.js                  # Main server setup
├── frontend/
│   ├── lib/
│   │   ├── models/
│   │   │   └── models.dart        # Entity definitions
│   │   ├── providers/
│   │   │   ├── auth_provider.dart # Session management
│   │   │   └── data_providers.dart# Receipts, Donors, Templates, Stats
│   │   ├── screens/
│   │   │   ├── create_receipt_screen.dart
│   │   │   ├── dashboard_screen.dart
│   │   │   ├── donor_details_screen.dart
│   │   │   ├── donor_list_screen.dart
│   │   │   ├── login_screen.dart
│   │   │   ├── otp_verification_screen.dart
│   │   │   ├── payment_screen.dart
│   │   │   ├── public_verification_screen.dart
│   │   │   ├── receipt_history_screen.dart
│   │   │   ├── receipt_preview_screen.dart
│   │   │   ├── receipt_templates_screen.dart
│   │   │   ├── register_org_screen.dart
│   │   │   ├── settings_screen.dart
│   │   │   ├── splash_screen.dart
│   │   │   └── verification_upload_screen.dart
│   │   ├── services/
│   │   │   └── api_service.dart   # Network HTTP requests
│   │   ├── widgets/
│   │   │   └── traditional_receipt_widget.dart # Double border, Ganesha watermark card
│   │   └── main.dart              # App router & MultiProvider setup
│   └── pubspec.yaml               # Flutter packages config
├── docker-compose.yml             # Local deployment setup
└── README.md                      # Documentation & Launch guide
```

---

## 3. Workflow Specifications

### A. Authentication Flow (OTP & JWT)
1. Donor/Collector enters mobile number.
2. Server verifies registration, generates a 6-digit OTP code, saves it with a 10-minute expiry time in `users`, and logs the code to the console (simulating SMS gateway delivery).
3. Collector inputs OTP code.
4. Server checks code validation, resets the DB fields, and signs a JWT containing `role`, `id`, and `organization_id`.
5. Frontend caches the token inside SharedPreferences for automatic subsequent sign-ins.

### B. Receipt Generation Flow
1. Collector enters donor mobile. If mobile exists, name, email, and address are auto-filled via `DonorProvider`. If not, a new `donor` record is inserted under the tenant.
2. Suffix sequence query finds the latest receipt matching current year and increments it (e.g. `PB-2026-000001`).
3. Receipt metadata and unique QR verification token are saved to DB.
4. A PDF generator computes layout styles (saffron theme, Ganesha icon, floral accents) and embeds the validation URL in the printed QR code block.

### C. Peer-to-Peer UPI Payment Flow
1. Server builds a P2P deep link: `upi://pay?pa=upi_id&pn=Name&am=Amount&tn=ReceiptNo`.
2. Link is rendered as a QR code using `qr_flutter`.
3. Donors scan the QR using standard consumer applications (GPay, PhonePe, Paytm, BHIM) which triggers bank transfer directly without charging merchant gateway fees.
4. Once completed, collector clicks "Simulate Payment Success" which updates the receipt status to PAID.

---

## 4. Screen Wireframes (ASCII Mocks)

### Wireframe 1: Splash Screen
```
+------------------------------------------+
|                                          |
|                [ Book Icon ]             |
|                                          |
|                 PavtiBook                |
|  Traditional Indian Receipts, Digitized  |
|                                          |
|                 ( Loading )              |
+------------------------------------------+
```

### Wireframe 2: Login Screen
```
+------------------------------------------+
|               PavtiBook Log In           |
|                                          |
|   +----------------------------------+   |
|   |  Email & Password  |  Mobile OTP |   |
|   +----------------------------------+   |
|                                          |
|   Email Address: [__________________]    |
|   Password:      [__________________]    |
|                                          |
|   [               LOG IN             ]   |
|                                          |
|       Register Mandal/Temple Trust       |
+------------------------------------------+
```

### Wireframe 3: Dashboard Screen
```
+------------------------------------------+
|  Lalbaugcha Raja Ganesh Mandal           |
+------------------------------------------+
|  [Vetted Trust Badge - Active]           |
|                                          |
|  Today Collection     Month Collection   |
|  ₹ 1,50,000           ₹ 12,00,000        |
|                                          |
|  Cash Split           UPI Split          |
|  ₹ 4,00,000           ₹ 8,00,000         |
|                                          |
|  Activity Analytics (Last 7 Days Chart)  |
|   |    |    |  |                         |
|   |    |    |  |                         |
|  Mon  Tue  Wed Thu                       |
|                                          |
|                         [+ Add Collection]
+------------------------------------------+
```

### Wireframe 4: Receipt Preview Screen (Traditional Layout)
```
+------------------------------------------+
|  Receipt Preview: PB-2026-000005         |
+------------------------------------------+
|  +====================================+  |
|  | ॥ श्री गणेश प्रसन्न ॥             |  |
|  | LALBAUGCHA RAJA GANESH UTSAV       |  |
|  |                                    |  |
|  | No: PB-2026-000005  Date: 11/06/26 |  |
|  | Received from: Shri. Ramesh Patil  |  |
|  | Sum of Rs.: Five Hundred One Only  |  |
|  | Purpose: Ganpati Vargani           |  |
|  |                                    |  |
|  | [ Rs. 501/- ]   [QR]    Treasurer  |  |
|  +====================================+  |
|                                          |
|  Share: [ WhatsApp ]  [ SMS ]  [ Email ] |
|                                          |
|         [ DOWNLOAD TRADITIONAL PDF ]     |
+------------------------------------------+
```

### Wireframe 5: Template Builder Screen
```
+------------------------------------------+
|  Receipt Customizer                      |
+------------------------------------------+
|  [ Miniature Live Receipt Style Preview ]|
|                                          |
|  Paper Tint Accent:                      |
|  ( ) Cream  ( ) Yellow  ( ) Saffron      |
|                                          |
|  Border Accent Style:                    |
|  [ Floral Marigold Border Preset      v ]|
|                                          |
|  Local Devanagari Title:                 |
|  [ ॥ श्री गणेश प्रसन्न ॥             ]   |
|                                          |
|  [           SAVE STYLE LAYOUT       ]   |
+------------------------------------------+
```

---

## 5. Deployment Guide & MVP Launch Plan

### A. Local Development Run
To bootstrap the database, compile, and run the backend API server:
1. Ensure Docker and Node.js are installed.
2. In the `backend` folder, install packages:
   ```bash
   cd backend
   npm install
   ```
3. Boot up the local Postgres database and backend API:
   ```bash
   docker-compose up -d
   ```
4. Perform database migrations and seeds:
   ```bash
   npm run init-db
   ```
5. Launch the Node API server:
   ```bash
   npm run dev
   ```
6. Serve the Flutter client:
   ```bash
   cd ../frontend
   flutter pub get
   flutter run
   ```

### B. MVP Launch Steps (Play Store & App Store)
1. **Compliance Check**: Collect KYC documents (Trust Deeds/PAN cards) to verify Indian NGOs.
2. **Payment Integrations**: Verify UPI configurations. Ensure merchant VPA (Virtual Payment Address) parameters route bank funds correctly.
3. **Android Build**:
   ```bash
   flutter build apk --split-per-abi
   flutter build appbundle
   ```
4. **iOS Build**:
   ```bash
   flutter build ipa
   ```
5. **PDF Font Embeds**: Pack Unicode fonts (like `Yatra One` or `Noto Sans Devanagari`) inside assets to ensure clean rendering on all target platforms.
