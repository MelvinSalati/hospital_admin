<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
    <title>Welcome to Altaf Memorial Hospital</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link
        href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,600;1,400&family=DM+Sans:wght@300;400;500;600&family=DM+Mono:wght@400;500&display=swap"
        rel="stylesheet">

    <style>
        :root {
            --navy: #0b1f4a;
            --navy-mid: #163170;
            --azure: #1a56c4;
            --sky: #3b8fe8;
            --teal: #0fc6c6;
            --teal-light: #d0f5f5;
            --ice: #eaf4fd;
            --white: #ffffff;
            --ink: #0e1a2b;
            --muted: #5a6c83;
            --rule: #d6e4f5;
            --gold: #c8a84b;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'DM Sans', sans-serif;
            background: linear-gradient(160deg, #0b1f4a 0%, #102d5e 40%, #0d2346 100%);
            min-height: 100vh;
            padding: 48px 16px 64px;
            -webkit-font-smoothing: antialiased;
        }

        /* ─── Outer wrapper ─── */
        .shell {
            max-width: 600px;
            margin: 0 auto;
        }

        /* ─── Top eyebrow ─── */
        .eyebrow {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 0 4px 20px;
        }

        .eyebrow-logo {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .logo-mark {
            width: 36px;
            height: 36px;
            border-radius: 10px;
            background: linear-gradient(135deg, var(--teal) 0%, var(--azure) 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
            flex-shrink: 0;
        }

        .logo-text {
            font-family: 'Cormorant Garamond', serif;
            font-size: 16px;
            font-weight: 600;
            color: rgba(255, 255, 255, 0.85);
            letter-spacing: 0.5px;
            line-height: 1.1;
        }

        .logo-text small {
            display: block;
            font-family: 'DM Sans', sans-serif;
            font-size: 10px;
            font-weight: 400;
            letter-spacing: 1.5px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.4);
            margin-top: 1px;
        }

        .eyebrow-date {
            font-size: 11px;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: rgba(255, 255, 255, 0.35);
            font-weight: 500;
        }

        /* ─── Main card ─── */
        .card {
            background: var(--white);
            border-radius: 24px;
            overflow: hidden;
            box-shadow:
                0 40px 80px rgba(0, 0, 0, 0.35),
                0 0 0 1px rgba(255, 255, 255, 0.06) inset;
        }

        /* ─── Card header band ─── */
        .card-header {
            position: relative;
            background: var(--navy);
            padding: 44px 40px 0;
            overflow: hidden;
        }

        .card-header::before {
            content: '';
            position: absolute;
            top: -80px;
            right: -80px;
            width: 280px;
            height: 280px;
            border-radius: 50%;
            background: radial-gradient(circle, rgba(15, 198, 198, 0.12) 0%, transparent 70%);
            pointer-events: none;
        }

        .card-header::after {
            content: '';
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent 0%, var(--teal) 40%, var(--azure) 70%, transparent 100%);
        }

        .header-inner {
            position: relative;
            z-index: 1;
        }

        /* Accreditation strip */
        .accred-strip {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(15, 198, 198, 0.1);
            border: 1px solid rgba(15, 198, 198, 0.25);
            border-radius: 40px;
            padding: 5px 12px;
            font-size: 10.5px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            color: var(--teal);
            margin-bottom: 20px;
        }

        .accred-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--teal);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {

            0%,
            100% {
                opacity: 1;
                transform: scale(1);
            }

            50% {
                opacity: 0.5;
                transform: scale(0.7);
            }
        }

        /* Hospital name in header */
        .hname {
            font-family: 'Cormorant Garamond', serif;
            font-size: clamp(30px, 7vw, 42px);
            font-weight: 600;
            color: var(--white);
            line-height: 1.05;
            letter-spacing: -0.5px;
        }

        .hname em {
            font-style: italic;
            color: var(--teal);
        }

        .htagline {
            font-size: 13px;
            color: rgba(255, 255, 255, 0.4);
            letter-spacing: 0.4px;
            margin-top: 10px;
            font-weight: 300;
        }

        /* Decorative divider curve */
        .header-curve {
            display: block;
            margin-top: 32px;
        }

        /* ─── Body ─── */
        .card-body {
            padding: 44px 40px;
        }

        @media (max-width: 520px) {
            .card-header {
                padding: 36px 24px 0;
            }

            .card-body {
                padding: 36px 24px;
            }
        }

        /* Welcome heading */
        .welcome-line {
            font-family: 'Cormorant Garamond', serif;
            font-size: clamp(26px, 6vw, 34px);
            font-weight: 600;
            color: var(--navy);
            letter-spacing: -0.3px;
            line-height: 1.2;
            margin-bottom: 6px;
        }

        .welcome-sub {
            font-size: 14px;
            color: var(--muted);
            font-weight: 400;
            line-height: 1.6;
            max-width: 460px;
        }

        /* Role pill */
        .role-row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin: 24px 0;
            padding: 16px 18px;
            border-radius: 14px;
            background: linear-gradient(135deg, var(--ice) 0%, #dbeeff 100%);
            border: 1px solid var(--rule);
        }

        .role-icon {
            width: 42px;
            height: 42px;
            background: var(--azure);
            border-radius: 12px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 20px;
            flex-shrink: 0;
        }

        .role-meta {
            flex: 1;
        }

        .role-meta small {
            font-size: 10px;
            font-weight: 600;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: var(--azure);
        }

        .role-meta strong {
            display: block;
            font-size: 16px;
            font-weight: 600;
            color: var(--ink);
            margin-top: 2px;
        }

        .role-badge-dept {
            font-size: 11px;
            font-weight: 500;
            background: var(--navy);
            color: var(--white);
            border-radius: 30px;
            padding: 4px 12px;
            white-space: nowrap;
        }

        /* ─── Section divider ─── */
        .section-label {
            display: flex;
            align-items: center;
            gap: 10px;
            margin-bottom: 16px;
        }

        .section-label span {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.6px;
            text-transform: uppercase;
            color: var(--muted);
        }

        .section-label::before,
        .section-label::after {
            content: '';
            flex: 1;
            height: 1px;
            background: var(--rule);
        }

        .section-label::before {
            flex: 0 0 0;
        }

        /* ─── Credentials ─── */
        .creds-grid {
            display: grid;
            gap: 12px;
            margin-bottom: 28px;
        }

        .cred-item {
            border: 1px solid var(--rule);
            border-radius: 14px;
            overflow: hidden;
            transition: box-shadow 0.2s;
        }

        .cred-item:hover {
            box-shadow: 0 4px 16px rgba(26, 86, 196, 0.08);
        }

        .cred-label-bar {
            background: var(--ice);
            padding: 8px 16px;
            border-bottom: 1px solid var(--rule);
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .cred-label-bar span {
            font-size: 10px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
            color: var(--azure);
        }

        .cred-label-bar .cred-icon {
            font-size: 13px;
            opacity: 0.7;
        }

        .cred-value {
            font-family: 'DM Mono', monospace;
            font-size: 15px;
            font-weight: 500;
            color: var(--ink);
            padding: 14px 16px;
            background: var(--white);
            word-break: break-all;
            letter-spacing: 0.3px;
        }

        @media (max-width: 480px) {
            .cred-value {
                font-size: 13px;
                padding: 12px 14px;
            }
        }

        /* Security notice */
        .security-notice {
            display: flex;
            gap: 12px;
            padding: 16px 18px;
            border-radius: 12px;
            background: linear-gradient(135deg, #fffbec 0%, #fff7d6 100%);
            border: 1px solid #e8d898;
            margin-bottom: 32px;
        }

        .security-notice .sec-icon {
            font-size: 18px;
            flex-shrink: 0;
            padding-top: 1px;
        }

        .security-notice p {
            font-size: 12.5px;
            color: #7a6020;
            line-height: 1.55;
            font-weight: 400;
        }

        .security-notice strong {
            color: #5a4010;
            font-weight: 600;
        }

        /* ─── CTA ─── */
        .cta-wrap {
            text-align: center;
            margin-bottom: 8px;
        }

        .cta-btn {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            background: linear-gradient(135deg, var(--navy-mid) 0%, var(--azure) 100%);
            color: var(--white);
            text-decoration: none;
            font-weight: 600;
            font-size: 15px;
            padding: 16px 36px;
            border-radius: 50px;
            letter-spacing: 0.2px;
            box-shadow:
                0 8px 20px rgba(26, 86, 196, 0.3),
                0 2px 4px rgba(26, 86, 196, 0.2);
            transition: transform 0.18s, box-shadow 0.18s;
            border: none;
            cursor: pointer;
        }

        .cta-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 12px 28px rgba(26, 86, 196, 0.35);
        }

        .cta-btn:active {
            transform: translateY(0);
        }

        .cta-arrow {
            width: 22px;
            height: 22px;
            background: rgba(255, 255, 255, 0.18);
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
        }

        @media (max-width: 480px) {
            .cta-btn {
                display: flex;
                justify-content: center;
                width: 100%;
                padding: 17px 24px;
            }
        }

        .cta-note {
            font-size: 11px;
            color: var(--muted);
            margin-top: 12px;
            letter-spacing: 0.2px;
        }

        /* ─── Footer ─── */
        .card-footer {
            background: #f7fafd;
            border-top: 1px solid var(--rule);
            padding: 28px 40px 32px;
        }

        @media (max-width: 520px) {
            .card-footer {
                padding: 24px 24px 28px;
            }
        }

        .footer-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 20px;
            margin-bottom: 20px;
        }

        @media (max-width: 420px) {
            .footer-grid {
                grid-template-columns: 1fr;
                gap: 16px;
            }
        }

        .footer-col-label {
            font-size: 9.5px;
            font-weight: 700;
            letter-spacing: 1.3px;
            text-transform: uppercase;
            color: var(--azure);
            margin-bottom: 6px;
        }

        .footer-col-value {
            font-size: 13px;
            color: var(--ink);
            font-weight: 400;
            line-height: 1.5;
        }

        .footer-col-value a {
            color: var(--azure);
            text-decoration: none;
            font-weight: 500;
        }

        .footer-bottom {
            padding-top: 20px;
            border-top: 1px solid var(--rule);
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .footer-bottom-text {
            font-size: 11px;
            color: var(--muted);
            line-height: 1.5;
        }

        .confidential-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: var(--navy);
            color: rgba(255, 255, 255, 0.75);
            font-size: 9.5px;
            font-weight: 600;
            letter-spacing: 1px;
            text-transform: uppercase;
            padding: 5px 12px;
            border-radius: 30px;
        }

        .conf-dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: var(--teal);
        }

        /* Outlook fallback */
        .outlook-table {
            width: 100%;
            border-collapse: collapse;
        }
    </style>
</head>

<body>
    <!--[if (gte mso 9)|(IE)]>
    <table class="outlook-table" align="center" border="0" cellpadding="0" cellspacing="0" width="600">
        <tr><td align="center">
    <![endif]-->

    <div class="shell">

        <!-- Eyebrow -->
        <div class="eyebrow">
            <div class="eyebrow-logo">
                <div class="logo-mark">🏥</div>
                <div class="logo-text">
                    Altaf Memorial Hospital
                    <small>Chipata · Eastern Province</small>
                </div>
            </div>
            <div class="eyebrow-date">Staff Notice</div>
        </div>

        <!-- Card -->
        <div class="card">

            <!-- Header band -->
            <div class="card-header">
                <div class="header-inner">
                    <div class="accred-strip">
                        <div class="accred-dot"></div>
                        Zambia Medical Council Accredited
                    </div>
                    <div class="hname">
                        Altaf <em>Memorial</em><br>Hospital
                    </div>
                    <div class="htagline">Healing hearts, serving humanity — Since 1998</div>
                </div>
                <!-- SVG wave divider -->
                <svg class="header-curve" viewBox="0 0 600 40" preserveAspectRatio="none"
                    xmlns="http://www.w3.org/2000/svg">
                    <path d="M0,0 C150,40 450,0 600,30 L600,40 L0,40 Z" fill="#ffffff" />
                </svg>
            </div>

            <!-- Body -->
            <div class="card-body">

                <!-- Welcome heading -->
                <div class="welcome-line">Welcome aboard, {{ $first_name }}.</div>
                <p class="welcome-sub">
                    You've been officially added to the Altaf Memorial Hospital medical team in Chipata.
                    Your credentials and access details are outlined below.
                </p>

                <!-- Role row -->
                <div class="role-row">
                    <div class="role-icon">🩺</div>
                    <div class="role-meta">
                        <small>Assigned Role</small>
                        <strong>{{ $role }}</strong>
                    </div>
                    <div class="role-badge-dept">AMH · Chipata</div>
                </div>

                <!-- Section label -->
                <div class="section-label">
                    <span>Access Credentials</span>
                    <div style="flex:1; height:1px; background:var(--rule);"></div>
                </div>

                <!-- Credentials -->
                <div class="creds-grid">
                    <div class="cred-item">
                        <div class="cred-label-bar">
                            <span class="cred-icon">✉</span>
                            <span>Login Email</span>
                        </div>
                        <div class="cred-value">{{ $email }}</div>
                    </div>
                    <div class="cred-item">
                        <div class="cred-label-bar">
                            <span class="cred-icon">🔑</span>
                            <span>Temporary Password</span>
                        </div>
                        <div class="cred-value">{{ $password }}</div>
                    </div>
                </div>

                <!-- Security notice -->
                <div class="security-notice">
                    <div class="sec-icon">⚠️</div>
                    <p>
                        <strong>Action required:</strong> Reset your password immediately upon first login.
                        This temporary password and portal link will expire within <strong>48 hours</strong> of receipt.
                    </p>
                </div>

                <!-- CTA -->
                <div class="cta-wrap">
                    <a href="{{ route('login') }}" class="cta-btn">
                        Access Staff Portal
                        <span class="cta-arrow">→</span>
                    </a>
                    <div class="cta-note">Secure HTTPS connection · Altaf Memorial Hospital intranet</div>
                </div>

            </div><!-- /.card-body -->

            <!-- Footer -->
            <div class="card-footer">
                <div class="footer-grid">
                    <div>
                        <div class="footer-col-label">Location</div>
                        <div class="footer-col-value">
                            Altaf Memorial Hospital<br>
                            Chipata, Eastern Province<br>
                            Zambia
                        </div>
                    </div>
                    <div>
                        <div class="footer-col-label">IT Support</div>
                        <div class="footer-col-value">
                            Email: <a href="mailto:it@amh.zm">it@amh.zm</a><br>
                            Internal extension: <strong>120</strong><br>
                            Available 08:00 – 17:00 CAT
                        </div>
                    </div>
                </div>
                <div class="footer-bottom">
                    <div class="footer-bottom-text">
                        © 2025 Altaf Memorial Hospital. All rights reserved.<br>
                        This message is intended solely for the named recipient.
                    </div>
                    <div class="confidential-badge">
                        <div class="conf-dot"></div>
                        Confidential
                    </div>
                </div>
            </div>

        </div><!-- /.card -->

    </div><!-- /.shell -->

    <!--[if (gte mso 9)|(IE)]>
        </td></tr>
    </table>
    <![endif]-->
</body>

</html>
