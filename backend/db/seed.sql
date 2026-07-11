-- PavtiBook PostgreSQL Database Seeds
-- Seed standard templates, organizations, users, and audit metadata

DO $$
DECLARE
    org_mandal_id UUID := '11111111-1111-4111-a111-111111111111';
    org_temple_id UUID := '22222222-2222-4222-a222-222222222222';
    org_ngo_id    UUID := '33333333-3333-4333-a333-333333333333';
    
    admin_mandal_id UUID := '11111111-1111-4111-b111-111111111111';
    admin_temple_id UUID := '22222222-2222-4222-b222-222222222222';
    admin_ngo_id    UUID := '33333333-3333-4333-b333-333333333333';
    
    collector_mandal_id UUID := '11111111-1111-4111-c111-111111111111';

    template_mandal_id UUID := '11111111-1111-4111-f111-111111111111';
    template_temple_id UUID := '22222222-2222-4222-f222-222222222222';
    template_ngo_id    UUID := '33333333-3333-4333-f333-333333333333';
    event_ganesh_id UUID := '11111111-1111-4111-aa11-111111111111';
    
    -- Password hash for 'password123'
    pass_hash VARCHAR(255) := '$2a$10$6R6Vd/C0816m0mE5zU2GFeA5Yv7zU70C/Qc.iO/3wQ4V7v.E.hIWy';
BEGIN

    -- 1. SEED ORGANIZATIONS
    INSERT INTO organizations (id, name, type, contact_person, mobile, email, address, city, state, country, pincode, upi_id, registration_number, logo_url, is_verified, subscription_plan, slug)
    VALUES 
    (org_mandal_id, 'Lalbaugcha Raja Ganesh Mandal', 'Ganesh Mandal', 'Satish Kadam', '9876543210', 'info@lalbaugcharaja.org', 'Lalbaug, Parel', 'Mumbai', 'Maharashtra', 'India', '400012', 'lalbaugraja@upi', 'REG-12345-MUM', 'https://images.unsplash.com/photo-1608976451631-c744f497793d?q=80&w=200&auto=format&fit=crop', TRUE, 'premium', 'lalbaugcha-raja'),
    
    (org_temple_id, 'Shree Siddhivinayak Temple Trust', 'Temple', 'Aditya Bhandari', '9822334455', 'trustee@siddhivinayak.org', 'Prabhadevi', 'Mumbai', 'Maharashtra', 'India', '400025', 'siddhivinayak@upi', 'TRUST-99887-MAH', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=200&auto=format&fit=crop', TRUE, 'standard', 'siddhivinayak'),
    
    (org_ngo_id, 'Helping Hands Charity Foundation', 'NGO', 'Dr. Alok Sen', '9811223344', 'contact@helpinghands.org', 'Connaught Place', 'New Delhi', 'Delhi', 'India', '110001', 'helpinghands@upi', 'NGO-55442-DEL', NULL, FALSE, 'free', 'helping-hands')
    ON CONFLICT (id) DO NOTHING;

    -- 2. SEED USERS (ADMINS & COLLECTORS)
    INSERT INTO users (id, organization_id, name, email, mobile, password_hash, role, is_active)
    VALUES 
    (admin_mandal_id, org_mandal_id, 'Satish Kadam', 'satish@lalbaug.org', '9876543210', pass_hash, 'org_admin', TRUE),
    (admin_temple_id, org_temple_id, 'Aditya Bhandari', 'aditya@siddhivinayak.org', '9822334455', pass_hash, 'org_admin', TRUE),
    (admin_ngo_id, org_ngo_id, 'Alok Sen', 'alok@helpinghands.org', '9811223344', pass_hash, 'org_admin', TRUE)
    ON CONFLICT (id) DO NOTHING;

    -- Add back audit mappings
    UPDATE users SET created_by = admin_mandal_id, updated_by = admin_mandal_id WHERE id = admin_mandal_id;
    UPDATE users SET created_by = admin_temple_id, updated_by = admin_temple_id WHERE id = admin_temple_id;
    UPDATE users SET created_by = admin_ngo_id, updated_by = admin_ngo_id WHERE id = admin_ngo_id;

    -- Role: collector (For Mandal)
    INSERT INTO users (id, organization_id, name, email, mobile, password_hash, role, is_active, created_by, updated_by)
    VALUES 
    (collector_mandal_id, org_mandal_id, 'Rahul Shinde', 'rahul@lalbaug.org', '9999888877', pass_hash, 'collector', TRUE, admin_mandal_id, admin_mandal_id)
    ON CONFLICT (id) DO NOTHING;

    -- Link Collector
    INSERT INTO collectors (id, user_id, organization_id, status, prefix_code, target_amount, assigned_by)
    VALUES ('11111111-1111-4111-c111-111111111112', collector_mandal_id, org_mandal_id, 'active', 'A', 50000.00, admin_mandal_id)
    ON CONFLICT (id) DO NOTHING;

    -- 3. SEED TEMPLATES
    INSERT INTO templates (id, organization_id, name, type, bg_color, border_style, border_color, font_family, font_color, logo_visible, god_image_url, god_image_position, watermark_url, watermark_opacity, header_text_en, header_text_local, footer_text_en, footer_text_local, signature_label, is_default, created_by)
    VALUES 
    (template_mandal_id, org_mandal_id, 'Saffron Ganesh Utsav Classic', 'ganesh_mandal', '#FFF3E0', 'double', '#E65100', 'Rozha One', '#4E342E', TRUE, 'https://images.unsplash.com/photo-1608976451631-c744f497793d?q=80&w=150&auto=format&fit=crop', 'left', 'https://images.unsplash.com/photo-1608976451631-c744f497793d?q=80&w=200&auto=format&fit=crop', 0.12, 'LALBAUGCHA RAJA GANESH UTSAV MANDAL', '॥ श्री गणेश प्रसन्न ॥ लालबागचा राजा गणेशोत्सव मंडळ', 'Thank you for your generous contribution to the mandal.', 'गणेशोत्सवाच्या हार्दिक शुभेच्छा! आपली देणगी स्वीकृत झाली.', 'Mandal Treasurer', TRUE, admin_mandal_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO templates (id, organization_id, name, type, bg_color, border_style, border_color, font_family, font_color, logo_visible, god_image_url, god_image_position, watermark_url, watermark_opacity, header_text_en, header_text_local, footer_text_en, footer_text_local, signature_label, is_default, created_by)
    VALUES 
    (template_temple_id, org_temple_id, 'Golden Temple Devotional', 'temple', '#FFFDE7', 'floral', '#D84315', 'Rozha One', '#3E2723', TRUE, 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=150&auto=format&fit=crop', 'center', 'https://images.unsplash.com/photo-1544735716-392fe2489ffa?q=80&w=200&auto=format&fit=crop', 0.08, 'SHREE SIDDHIVINAYAK TEMPLE TRUST', '॥ श्री सिद्धिविनायक प्रसन्न ॥ श्री सिद्धिविनायक मंदिर ट्रस्ट', 'May Siddhivinayak Ganesha bless you with wealth and health.', 'सिद्धिविनायक मंदिर ट्रस्ट देणगी पावती. देवाच्या चरणी प्रार्थना.', 'Trustee Administrator', TRUE, admin_temple_id)
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO templates (id, organization_id, name, type, bg_color, border_style, border_color, font_family, font_color, logo_visible, god_image_url, god_image_position, watermark_url, watermark_opacity, header_text_en, header_text_local, footer_text_en, footer_text_local, signature_label, is_default, created_by)
    VALUES 
    (template_ngo_id, org_ngo_id, 'Simple Corporate Trust', 'trust', '#F5F5F5', 'thin', '#0D47A1', 'Poppins', '#1A237E', FALSE, NULL, 'left', NULL, 0.05, 'HELPING HANDS CHARITY FOUNDATION', 'मदत हात सेवा संस्था', 'Thank you for supporting community upliftment.', 'गरजूंच्या मदतीसाठी आपल्या योगदानाबद्दल धन्यवाद.', 'Authorized Signatory', TRUE, admin_ngo_id)
    ON CONFLICT (id) DO NOTHING;

    -- 4. SEED DONORS
    INSERT INTO donors (id, organization_id, name, mobile, email, address, created_by)
    VALUES 
    ('d1111111-1111-4111-d111-111111111111', org_mandal_id, 'Ramesh Kumar', '9892098920', 'ramesh@gmail.com', 'Dadar West, Mumbai', collector_mandal_id),
    ('d2222222-2222-4222-d222-222222222222', org_mandal_id, 'Sneha Patil', '9702970297', 'sneha.patil@yahoo.com', 'Thane West', collector_mandal_id),
    ('d3333333-3333-4333-d333-333333333333', org_mandal_id, 'Vijay Sawant', '9619961996', NULL, 'Chinchpokli, Mumbai', collector_mandal_id)
    ON CONFLICT (id) DO NOTHING;

    -- 4.5. SEED EVENTS
    INSERT INTO events (id, organization_id, name, description, start_date, end_date, target_amount, is_active, created_by)
    VALUES 
    (event_ganesh_id, org_mandal_id, 'Ganesh Utsav 2026', 'Fundraiser for the annual 2026 Ganesh Utsav celebration', '2026-09-01', '2026-09-15', 500000.00, TRUE, admin_mandal_id)
    ON CONFLICT (id) DO NOTHING;

    -- 5. SEED RECEIPTS & PAYMENTS
    INSERT INTO receipts (id, organization_id, template_id, donor_id, collector_id, event_id, receipt_number, amount, purpose, payment_mode, payment_status, qr_code_value, created_at)
    VALUES 
    ('e1111111-1111-4111-e111-111111111111', org_mandal_id, template_mandal_id, 'd1111111-1111-4111-d111-111111111111', collector_mandal_id, event_ganesh_id, 'PB-2026-000001', 501.00, 'Ganpati Donation', 'upi', 'paid', 'verify_hash_token_001', NOW() - INTERVAL '2 hours'),
    ('e2222222-2222-4222-e222-222222222222', org_mandal_id, template_mandal_id, 'd2222222-2222-4222-d222-222222222222', collector_mandal_id, NULL, 'PB-2026-000002', 2100.00, 'Vargani (Contribution)', 'cash', 'paid', 'verify_hash_token_002', NOW() - INTERVAL '1 day'),
    ('e3333333-3333-4333-e333-333333333333', org_mandal_id, template_mandal_id, 'd3333333-3333-4333-d333-333333333333', collector_mandal_id, NULL, 'PB-2026-000003', 10000.00, 'Aarti Pooja Sponsor', 'pending', 'pending', 'verify_hash_token_003', NOW())
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO payments (id, organization_id, receipt_id, amount, payment_mode, transaction_ref, status, qr_code_payload, created_at)
    VALUES 
    ('11111111-1111-4111-e111-111111111112', org_mandal_id, 'e1111111-1111-4111-e111-111111111111', 501.00, 'upi', 'TXN-998877665544', 'completed', 'upi://pay?pa=lalbaugraja@upi&pn=Lalbaugcha%20Raja%20Ganesh%20Mandal&am=501.00&tn=PB-2026-000001', NOW() - INTERVAL '2 hours'),
    ('22222222-2222-4222-e222-222222222223', org_mandal_id, 'e2222222-2222-4222-e222-222222222222', 2100.00, 'cash', NULL, 'completed', NULL, NOW() - INTERVAL '1 day'),
    ('33333333-3333-4333-e333-333333333334', org_mandal_id, 'e3333333-3333-4333-e333-333333333333', 10000.00, 'upi', NULL, 'pending', 'upi://pay?pa=lalbaugraja@upi&pn=Lalbaugcha%20Raja%20Ganesh%20Mandal&am=10000.00&tn=PB-2026-000003', NOW())
    ON CONFLICT (id) DO NOTHING;

    -- 6. SEED PUBLIC PAGE SETTINGS
    INSERT INTO public_page_settings (id, organization_id, is_enabled, welcome_message, custom_theme_color, show_verification_badge, show_donor_wall, payment_gateway_provider, payment_gateway_keys)
    VALUES 
    ('11111111-1111-4111-d111-111111111122', org_mandal_id, TRUE, 'Welcome to the Lalbaugcha Raja Ganesh Mandal donation portal. Donate online and receive instant dynamic receipts and blessings!', '#E65100', TRUE, TRUE, 'upi', '{"merchant_vpa": "lalbaugraja@upi", "merchant_name": "Lalbaugcha Raja"}'),
    ('22222222-2222-4222-d222-222222222233', org_temple_id, TRUE, 'Welcome to the Shree Siddhivinayak Temple Trust online donation portal. Devotees can offer their donations here.', '#D84315', TRUE, TRUE, 'upi', '{"merchant_vpa": "siddhivinayak@upi", "merchant_name": "Siddhivinayak Trust"}')
    ON CONFLICT (id) DO NOTHING;

    -- 7. SEED SAMPLE ONLINE DONATIONS
    INSERT INTO online_donations (id, organization_id, donor_name, donor_mobile, donor_email, donor_address, amount, purpose, event_id, payment_gateway_order_id, payment_gateway_payment_id, status, receipt_id, error_message)
    VALUES 
    ('11111111-1111-4111-e111-111111111133', org_mandal_id, 'Kiran Deshmukh', '9892112233', 'kiran@gmail.com', 'Andheri, Mumbai', 1001.00, 'Online Festival Contribution', event_ganesh_id, 'order_pub_001', 'pay_pub_001', 'completed', 'e1111111-1111-4111-e111-111111111111', NULL),
    ('22222222-2222-4222-e222-222222222244', org_mandal_id, 'Amit Shah', '9892223344', 'amit@gmail.com', 'Pune', 5001.00, 'Online Aarti Sponsor', event_ganesh_id, 'order_pub_002', NULL, 'pending', NULL, NULL)
    ON CONFLICT (id) DO NOTHING;

    -- 8. FUTURE PHASE RESERVED — ACCOUNTING MODULE SEEDS
    -- (Removed for MVP Scope Lock)

END $$;
