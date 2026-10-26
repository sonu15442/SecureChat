import os
import sys
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 8)
        self.setFillColor(colors.HexColor("#64748B"))
        
        # Header (pages after first page)
        if self._pageNumber > 1:
            self.drawString(36, letter[1] - 25, "SECURECHAT - PRESENTATION & VIVA DEFENSE GUIDE")
            self.drawRightString(letter[0] - 36, letter[1] - 25, "UNIFIED DB * CROSS-PLATFORM * SECURITY")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(36, letter[1] - 29, letter[0] - 36, letter[1] - 29)
        
        # Footer
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(36, 28, letter[0] - 36, 28)
        
        self.setFont("Helvetica", 7.8)
        self.drawString(36, 17, "SecureChat Technical Viva Guide - Prepared for Project Presentation & Defense")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 36, 17, page_str)
        self.restoreState()

def build_pdf(filename="SecureChat_Presentation_Viva_Guide.pdf"):
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36
    )

    styles = getSampleStyleSheet()

    # Custom styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=18,
        leading=22,
        textColor=colors.HexColor("#0F172A")
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=13,
        textColor=colors.HexColor("#0284C7")
    )

    h1_style = ParagraphStyle(
        'Heading1_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=15,
        textColor=colors.HexColor("#0F172A"),
        spaceBefore=6,
        spaceAfter=3
    )

    h2_style = ParagraphStyle(
        'Heading2_Custom',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#0369A1"),
        spaceBefore=4,
        spaceAfter=2
    )

    body_style = ParagraphStyle(
        'Body_Custom',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.2,
        leading=11.2,
        textColor=colors.HexColor("#334155")
    )

    code_style = ParagraphStyle(
        'Code_Style',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.8,
        leading=10.5,
        textColor=colors.HexColor("#0F172A")
    )

    q_style = ParagraphStyle(
        'Question_Style',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.6,
        leading=11.5,
        textColor=colors.HexColor("#0F172A")
    )

    a_style = ParagraphStyle(
        'Answer_Style',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=10.8,
        textColor=colors.HexColor("#1E293B")
    )

    key_takeaway_style = ParagraphStyle(
        'KeyTakeaway_Style',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.2,
        textColor=colors.HexColor("#047857")
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8,
        leading=10.5,
        textColor=colors.white
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.2,
        textColor=colors.HexColor("#1E293B")
    )

    table_cell_bold = ParagraphStyle(
        'TableCellBold',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.8,
        leading=10.2,
        textColor=colors.HexColor("#0F172A")
    )

    story = []

    # =========================================================================
    # PAGE 1: EXECUTIVE OVERVIEW & EXACT TECHNOLOGY STACK SPECIFICATION
    # =========================================================================
    header_table_data = [
        [
            Paragraph("<b>SECURECHAT - PRESENTATION & VIVA GUIDE</b>", title_style),
            Paragraph("<b>STATUS:</b> PRODUCTION READY<br/><b>DATE:</b> OCTOBER 2026<br/><b>PLATFORMS:</b> WEB & ANDROID", subtitle_style)
        ],
        [
            Paragraph("<b>Executive Summary:</b> High-performance, cross-platform communication platform featuring unified relational database storage, sub-100ms real-time event streaming via SSE, WebRTC peer-to-peer calling, and proactive heuristic phishing protection.", body_style),
            Paragraph("<b>Viva Tip:</b> Keep this guide open during presentation. Jump directly to Section 4 for examiner questions and answers.", key_takeaway_style)
        ]
    ]

    header_table = Table(header_table_data, colWidths=[380, 160])
    header_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 6))

    # SECTION 1
    story.append(Paragraph("1. PROJECT SNAPSHOT & CORE CAPABILITIES", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=1, spaceAfter=4))

    snapshot_text = (
        "<b>SecureChat</b> is an enterprise-grade, cross-platform communication system engineered for ultra-fast, "
        "secure messaging, 24-hour ephemeral status moments, and WebRTC peer-to-peer audio/video calls between "
        "<b>Web browsers</b> and <b>Android mobile devices</b>. It features an integrated heuristic security engine "
        "(<b>SecureChat Guard</b>) that proactively blocks phishing URLs and credential-harvesting threats before they hit users."
    )
    story.append(Paragraph(snapshot_text, body_style))
    story.append(Spacer(1, 4))

    features_data = [
        [
            Paragraph("<b>Real-Time Chat & Sync</b><br/>Sub-100ms multi-device event distribution powered by Server-Sent Events (SSE). No manual refresh required.", table_cell_style),
            Paragraph("<b>Unified Database</b><br/>One single MySQL database (with automatic JSON caching fallback) concurrently serving Web and Android clients.", table_cell_style),
            Paragraph("<b>P2P Voice & Video Calls</b><br/>WebRTC signaling pipeline with cross-device ringing, DTMF ringtones, and instant camera/mic streaming.", table_cell_style)
        ],
        [
            Paragraph("<b>SecureChat Guard Security</b><br/>Live heuristics engine scanning messages for 45+ malicious TLDs, typosquatting, and credential phishing keywords.", table_cell_style),
            Paragraph("<b>24h Ephemeral Moments</b><br/>WhatsApp-style stories with automated 60-second background daemon pruning expired media after 24 hours.", table_cell_style),
            Paragraph("<b>Automated QA Suite</b><br/>300+ automated test cases executed across Selenium (Web) and Appium (Android) with instant Excel audit sheets.", table_cell_style)
        ]
    ]
    feat_table = Table(features_data, colWidths=[180, 180, 180])
    feat_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#E2E8F0")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(feat_table)
    story.append(Spacer(1, 6))

    # SECTION 2
    story.append(Paragraph("2. EXACT TECHNOLOGY STACK & ARCHITECTURE SPECIFICATION", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=1, spaceAfter=4))

    tech_table_data = [
        [Paragraph("LAYER", table_header_style), Paragraph("TECHNOLOGY / LIBRARY", table_header_style), Paragraph("EXACT ROLE & IMPLEMENTATION IN SECURECHAT", table_header_style)],
        [
            Paragraph("<b>Database</b>", table_cell_bold),
            Paragraph("<b>MySQL 8.0</b><br/>(<code>mysql2/promise</code>)<br/>+ Dual JSON Fallback", table_cell_style),
            Paragraph("Relational DB <code>securechat_db</code> with connection pooling (<code>createPool</code>).<br/>Tables: <code>users</code> (SHA-256 hashes, avatars, status) & <code>messages</code> (JSON payload, threat levels).<br/>Resilient Fallback: Syncs to atomic <code>users.json</code> and <code>messages.json</code> on local disk if DB is offline.", table_cell_style)
        ],
        [
            Paragraph("<b>Backend Server</b>", table_cell_bold),
            Paragraph("<b>Node.js (v20+)</b><br/><b>Express 5.2.1</b><br/>(ES Modules)", table_cell_style),
            Paragraph("Central REST API listening on port <code>3001</code>.<br/>Server-Sent Events (SSE) via <code>/api/realtime/stream</code> for instant device broadcast.<br/>WebRTC signaling relay via <code>/api/call/signal</code> for peer video/audio calls.", table_cell_style)
        ],
        [
            Paragraph("<b>Web Frontend</b>", table_cell_bold),
            Paragraph("<b>React 19.2</b><br/><b>Vite 8.1</b><br/><b>Tailwind CSS v4</b>", table_cell_style),
            Paragraph("High-performance SPA with modern glassmorphism UI.<br/>Real-time SSE listener automatically updating React state without reloads.<br/>Lucide React icons, Web Audio API synthesis for ringtones, HTML5 Media.", table_cell_style)
        ],
        [
            Paragraph("<b>Mobile App</b>", table_cell_bold),
            Paragraph("<b>Android Native APK</b><br/>(<code>app-debug.apk</code>)<br/>React Native / Expo", table_cell_style),
            Paragraph("Native Android APK running on physical phone/emulator.<br/>Connects via local Wi-Fi / LAN IP (<code>http://10.223.64.151:3001</code>) to backend.<br/>Full feature parity: chats, moments, calls, profile search, and instant sync.", table_cell_style)
        ],
        [
            Paragraph("<b>Authentication & Email</b>", table_cell_bold),
            Paragraph("<b>Nodemailer 10.2</b><br/><b>Resend API</b><br/>Crypto SHA-256", table_cell_style),
            Paragraph("Passwords securely hashed with SHA-256 (no plaintext stored).<br/>Password reset sends a secure 6-digit expiring OTP directly to Gmail inbox.<br/>Strict duplicate prevention on both email address and display name.", table_cell_style)
        ],
        [
            Paragraph("<b>Testing & QA Suite</b>", table_cell_bold),
            Paragraph("<b>Selenium</b> (Web)<br/><b>Appium</b> (Android)<br/><b>Python openpyxl</b>", table_cell_style),
            Paragraph("300+ Automated test cases covering registration, login, chat, calls, and moments.<br/>Python script dynamically generates 6 detailed audit Excel sheets in <code>Test Cases/</code>.", table_cell_style)
        ]
    ]

    tech_table = Table(tech_table_data, colWidths=[85, 135, 320])
    tech_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(tech_table)
    
    # END PAGE 1
    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: DEEP DIVE: UNIFIED DATABASE ARCHITECTURE (WEB & MOBILE ON 1 DB)
    # =========================================================================
    story.append(Paragraph("3. UNIFIED DATABASE ARCHITECTURE - HOW WEB & MOBILE CONNECT", h1_style))
    story.append(Paragraph("<b>The Core Engineering Achievement:</b> Both Web and Android clients operate against a single unified backend and database instance.", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=2, spaceAfter=5))

    # Architecture Diagram Table Box
    diagram_data = [
        [
            Paragraph("<b>SYSTEM NETWORK TOPOLOGY & DATA FLOW PIPELINE</b>", ParagraphStyle('DiagHeader', parent=styles['Normal'], fontName='Helvetica-Bold', fontSize=8.5, textColor=colors.HexColor("#0F172A"))),
        ],
        [
            Paragraph(
                "<b>[ Android Mobile Device ]</b> (IP: 10.223.64.X)  --- HTTP / REST Requests & SSE Stream ---&gt;<br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>[ UNIFIED BACKEND SERVER ]</b><br/>"
                "<b>[ Web Browser Client ]</b>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; (localhost:5173)&nbsp; --- HTTP / REST Requests & SSE Stream ---&gt;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>Node.js + Express (Port 3001)</b><br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;|<br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;v (Connection Pool)&nbsp;&nbsp;&nbsp;v (Atomic Cache)<br/>"
                "&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<b>[ MySQL 8.0: securechat_db ]</b>&nbsp;&nbsp;&nbsp;&nbsp;<b>[ Disk JSON Fallback ]</b>",
                code_style
            )
        ]
    ]
    diag_table = Table(diagram_data, colWidths=[540])
    diag_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F1F5F9")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(diag_table)
    story.append(Spacer(1, 5))

    # The 5 Architectural Pillars Table
    arch_steps = [
        [
            Paragraph("<b>1. Network Topology</b>", table_cell_bold),
            Paragraph("The Node.js server binds to <code>0.0.0.0:3001</code> on the local network. The Web browser connects via <code>http://localhost:3001</code> (or Vite proxy), while the Android phone connects over Wi-Fi using the host machine's LAN IP: <code>http://10.223.64.151:3001</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>2. Single Source of Truth</b>", table_cell_bold),
            Paragraph("Neither Web nor Mobile accesses the database directly. All mutations (registration, message post, status update, friend follow) go through identical REST endpoints. Express executes SQL statements against the shared MySQL database <code>securechat_db</code>.", table_cell_style)
        ],
        [
            Paragraph("<b>3. Sub-100ms Push via SSE</b>", table_cell_bold),
            Paragraph("Both clients maintain a persistent Server-Sent Events stream (<code>GET /api/realtime/stream</code>). When Mobile posts a message, Express saves it to MySQL and invokes <code>broadcastEvent('message', msg)</code>. The Web client catches this event in &lt;100ms and updates React state instantly.", table_cell_style)
        ],
        [
            Paragraph("<b>4. WebRTC Signaling Relay</b>", table_cell_bold),
            Paragraph("When Laptop calls Android, it sends a WebRTC signal payload to <code>/api/call/signal</code>. The server immediately forwards it via SSE to the Android phone, triggering the incoming call modal and ringing audio without any external third-party servers.", table_cell_style)
        ],
        [
            Paragraph("<b>5. Dual-Layer Resilient Caching</b>", table_cell_bold),
            Paragraph("If MySQL encounters latency or downtime, the server's atomic disk cache engine (<code>data/users.json</code> and <code>data/messages.json</code>) seamlessly fulfills reads and writes, ensuring zero loss of user data or chat history.", table_cell_style)
        ]
    ]

    arch_table = Table(arch_steps, colWidths=[130, 410])
    arch_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(arch_table)
    story.append(Spacer(1, 5))

    # Database Schema Breakdown
    story.append(Paragraph("<b>MYSQL RELATIONAL DATABASE SCHEMA SPECIFICATION (securechat_db)</b>", h2_style))
    
    schema_data = [
        [Paragraph("TABLE", table_header_style), Paragraph("COLUMN", table_header_style), Paragraph("TYPE", table_header_style), Paragraph("CONSTRAINTS & INDEXES", table_header_style), Paragraph("FUNCTIONAL PURPOSE", table_header_style)],
        [
            Paragraph("<b>users</b>", table_cell_bold),
            Paragraph("<code>id</code><br/><code>name</code><br/><code>username</code><br/><code>email</code><br/><code>password_hash</code><br/><code>status</code>", table_cell_style),
            Paragraph("VARCHAR(64)<br/>VARCHAR(255)<br/>VARCHAR(255)<br/>VARCHAR(255)<br/>VARCHAR(255)<br/>VARCHAR(50)", table_cell_style),
            Paragraph("PRIMARY KEY<br/>NOT NULL<br/>NOT NULL, INDEX idx_username<br/>UNIQUE NOT NULL, INDEX idx_email<br/>SHA-256 HASH NOT NULL<br/>DEFAULT 'offline'", table_cell_style),
            Paragraph("Stores registered accounts across Web and Android.<br/>Guarantees zero duplicate emails or display names.<br/>Stores avatars, bios, and timestamps.", table_cell_style)
        ],
        [
            Paragraph("<b>messages</b>", table_cell_bold),
            Paragraph("<code>id</code><br/><code>chat_id</code><br/><code>sender_id</code><br/><code>receiver_id</code><br/><code>text</code><br/><code>risk_level</code><br/><code>threats</code>", table_cell_style),
            Paragraph("VARCHAR(64)<br/>VARCHAR(64)<br/>VARCHAR(64)<br/>VARCHAR(64)<br/>TEXT<br/>VARCHAR(50)<br/>JSON", table_cell_style),
            Paragraph("PRIMARY KEY<br/>INDEX idx_chat_id<br/>NOT NULL, INDEX idx_sender_id<br/>INDEX idx_receiver_id<br/>NULLABLE<br/>DEFAULT 'SAFE'<br/>JSON structured", table_cell_style),
            Paragraph("Stores encrypted messages, media attachments (data URIs), risk analysis scores, and threat detection flags calculated by SecureChat Guard.", table_cell_style)
        ]
    ]

    schema_table = Table(schema_data, colWidths=[65, 80, 85, 150, 160])
    schema_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(schema_table)
    story.append(Spacer(1, 4))

    # Cross-Platform Flow Box
    flow_callout = [
        [
            Paragraph("<b>LIFECYCLE WALKTHROUGH (Mobile to Web Real-Time Chat):</b><br/>"
                      "1. User enters text on Android APK -&gt; Android dispatches HTTP <code>POST /api/messages</code> to <code>10.223.64.151:3001</code>.<br/>"
                      "2. Express runs input validation, runs <code>linkDetector.js</code> (checks phishing risk), and executes SQL <code>INSERT INTO messages</code>.<br/>"
                      "3. In the same tick, Express invokes <code>broadcastEvent('message', savedMessage)</code> across active SSE streams.<br/>"
                      "4. Laptop browser receives SSE payload in &lt;100ms and updates React state. The message appears on Web instantly!",
                      ParagraphStyle('FlowText', parent=styles['Normal'], fontName='Helvetica', fontSize=7.8, leading=10.5, textColor=colors.HexColor("#0369A1")))
        ]
    ]
    flow_table = Table(flow_callout, colWidths=[540])
    flow_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#3B82F6")),
        ('PADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(flow_table)

    # END PAGE 2
    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: TOP 15 VIVA QUESTIONS - PART 1 (Q1 to Q7)
    # =========================================================================
    story.append(Paragraph("4. TOP 15 VIVA & PRESENTATION QUESTIONS - PART 1", h1_style))
    story.append(Paragraph("<b>Core Architecture, Database, SSE, WebRTC Calling & Security</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=1, spaceAfter=4))

    qa_page3 = [
        (
            "Q1. What database is used in SecureChat, and what is its schema structure?",
            "<b>Answer:</b> We use <b>MySQL 8.0</b> (database name: <code>securechat_db</code>) accessed via the asynchronous <code>mysql2/promise</code> driver with connection pooling. The schema contains two primary relational tables: <code>users</code> (stores unique <code>id</code>, <code>email</code>, <code>username</code>, <code>name</code>, <code>password_hash</code>, <code>avatar</code>, <code>status</code>) and <code>messages</code> (stores <code>chat_id</code>, <code>sender_id</code>, <code>receiver_id</code>, <code>text</code>, <code>media_url</code>, <code>risk_level</code>, and threat JSON). Both tables utilize InnoDB engine, UTF8MB4 charset, and indexes on email and chat IDs for microsecond query speeds.",
            "<b>Key Takeaway for Examiner:</b> Relational MySQL database with connection pooling, prepared statements, and indexed foreign keys."
        ),
        (
            "Q2. How do the Mobile App and Web App connect to the exact same database?",
            "<b>Answer:</b> Neither Web nor Mobile connects to MySQL directly (which would be insecure). Instead, both clients interface through a <b>Unified Node.js Express REST API</b>. The server runs on port <code>3001</code>. The Web frontend accesses <code>http://localhost:3001/api</code> while the Android APK connects over the local Wi-Fi network via <code>http://&lt;HOST_IP&gt;:3001/api</code>. Any action taken on Mobile (like registering a user or sending a text) updates MySQL, and the server broadcasts the change to the Web client in real-time.",
            "<b>Key Takeaway for Examiner:</b> Centralized REST API acting as the single gateway to MySQL for both platforms."
        ),
        (
            "Q3. Why did you use Server-Sent Events (SSE) instead of WebSockets for real-time sync?",
            "<b>Answer:</b> 1) <b>Lightweight & HTTP/2 Native:</b> SSE runs over standard HTTP, eliminating WebSocket handshake overhead and proxy/firewall blockages. 2) <b>Built-in Automatic Reconnection:</b> Browsers and mobile fetch polyfills natively handle automatic reconnection if connection drops. 3) <b>Asymmetric Efficiency:</b> In a chat app, clients send small discrete REST requests (<code>POST /api/messages</code>) but require continuous, low-latency push notifications from the server. SSE provides this sub-100ms push with minimal server memory overhead.",
            "<b>Key Takeaway for Examiner:</b> SSE is lighter, firewall-friendly, has automatic reconnection, and perfectly fits REST-driven messaging."
        ),
        (
            "Q4. How does the Voice and Video Calling feature work between Web and Mobile?",
            "<b>Answer:</b> Calling is powered by <b>WebRTC (Web Real-Time Communication)</b> for peer-to-peer audio and video transmission. We use our Express server as the <b>Signaling Channel</b> via <code>/api/call/signal</code>. When User A calls User B, the offer, answer, and ICE candidates (network routing paths) are exchanged over our SSE stream. Once negotiated, media streams travel directly between peers using SRTP encryption with zero server bandwidth load.",
            "<b>Key Takeaway for Examiner:</b> WebRTC peer-to-peer media streams with Node.js SSE serving as the signaling server."
        ),
        (
            "Q5. How is user authentication and password security handled?",
            "<b>Answer:</b> We enforce strict cryptographic standards. Passwords are never stored in plaintext. They are hashed using <b>SHA-256</b> with <code>crypto.createHash('sha256')</code> on the server. Registration automatically generates a cryptographically secure 8-character password. When logging in, the incoming password is hashed and compared against the stored hash. The API also strips <code>passwordHash</code> from all responses so credentials never reach client storage.",
            "<b>Key Takeaway for Examiner:</b> One-way SHA-256 cryptographic hashing with password sanitization on all endpoints."
        ),
        (
            "Q6. How does the Gmail OTP password reset flow operate?",
            "<b>Answer:</b> When a user requests a password reset, the server validates their email, generates a random 6-digit cryptographic OTP, and sets a 10-minute expiry in memory. The OTP is dispatched directly to the user's registered Gmail inbox using <b>Nodemailer</b> with Gmail SMTP (or Resend API fallback). To prevent brute-force attacks, the server limits attempts to 5 before permanently invalidating the token.",
            "<b>Key Takeaway for Examiner:</b> 6-digit time-sensitive OTP dispatched to Gmail with rate-limiting and 5-attempt brute-force protection."
        ),
        (
            "Q7. What makes this 'SecureChat'? Explain your Link Risk & Fraud Detection Engine.",
            "<b>Answer:</b> We built a proprietary heuristic engine (<code>linkDetector.js</code> / <b>SecureChat Guard</b>). When a message contains a URL, the system inspects: 1) <b>Suspicious TLDs:</b> Flags 45+ high-risk extensions (<code>.xyz</code>, <code>.top</code>, <code>.click</code>, <code>.zip</code>). 2) <b>Phishing Keywords:</b> Detects credential-harvesting triggers (<code>login</code>, <code>verify-bank</code>, <code>otp</code>, <code>password-reset</code>). 3) <b>Typosquatting:</b> Detects lookalike domains (e.g. <code>paypaI.com</code> with capital 'I'). If flagged, the recipient sees a prominent warning dialog before clicking.",
            "<b>Key Takeaway for Examiner:</b> Active heuristic inspection for phishing, malicious TLDs, and typosquatting with user safety warnings."
        )
    ]

    for q_text, a_text, takeaway_text in qa_page3:
        card_content = [
            [Paragraph(q_text, q_style)],
            [Paragraph(a_text, a_style)],
            [Paragraph(takeaway_text, key_takeaway_style)]
        ]
        q_table = Table(card_content, colWidths=[540])
        q_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
            ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor("#E2E8F0")),
            ('LINEBELOW', (0,1), (-1,1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(KeepTogether(q_table))
        story.append(Spacer(1, 3.5))

    # END PAGE 3
    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: TOP 15 VIVA QUESTIONS - PART 2 (Q8 to Q15)
    # =========================================================================
    story.append(Paragraph("4. TOP 15 VIVA & PRESENTATION QUESTIONS - PART 2", h1_style))
    story.append(Paragraph("<b>Moments, Duplication Prevention, Resilience, QA Suite & Scaling</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=1, spaceAfter=4))

    qa_page4 = [
        (
            "Q8. How do 24-Hour Ephemeral Status / Moments work?",
            "<b>Answer:</b> Users can post text, images, or short videos with custom captions as 'Moments' (similar to WhatsApp Status). Moments are stored with precise epoch timestamps. Our backend runs an <b>automatic 60-second periodic garbage collection daemon</b> that filters out and purges any moment older than 24 hours. Additionally, views are tracked to ensure unique viewer counts.",
            "<b>Key Takeaway for Examiner:</b> 24-hour time-to-live (TTL) managed by a server-side cleanup daemon and live viewer tracking."
        ),
        (
            "Q9. How do you prevent duplicate registrations (email & display name)?",
            "<b>Answer:</b> We enforce strict duplication prevention at both the API and database levels. During registration (<code>POST /api/auth/register</code>), the server queries <code>getUserByEmail()</code> and <code>getUserByDisplayName()</code>. If either the email or full display name already exists (case-insensitive), it returns HTTP 409 Conflict with a clear error. In MySQL, the <code>email</code> column also has a UNIQUE constraint.",
            "<b>Key Takeaway for Examiner:</b> Dual-layer validation (application code + MySQL UNIQUE index) guaranteeing zero duplicate accounts."
        ),
        (
            "Q10. How does live cross-device Presence (Online/Offline) tracking work?",
            "<b>Answer:</b> The server maintains an in-memory <code>activePresenceMap</code> mapping <code>userId -&gt; { lastSeen, user }</code>. Active clients send a lightweight heartbeat every 30-45 seconds via <code>POST /api/presence/heartbeat</code>. The server executes <code>cleanStalePresence()</code> with a 60-second timeout. If no heartbeat arrives, the user status automatically transitions to offline and broadcasts to all clients.",
            "<b>Key Takeaway for Examiner:</b> In-memory heartbeat map with 60s stale eviction and SSE presence broadcast."
        ),
        (
            "Q11. What happens if MySQL crashes? How does your Fallback mechanism function?",
            "<b>Answer:</b> SecureChat is built with a resilient <b>Dual-Layer Persistence Architecture</b>. If the MySQL connection fails or pool creation errors out, the system automatically falls back to local atomic JSON files (<code>data/users.json</code> and <code>data/messages.json</code>). When MySQL returns online, data operations resume seamlessly without throwing unhandled exceptions to users.",
            "<b>Key Takeaway for Examiner:</b> High availability graceful degradation from MySQL to local atomic JSON persistence."
        ),
        (
            "Q12. How did you test the project? What role do Selenium and Appium play?",
            "<b>Answer:</b> We implemented full-spectrum automated end-to-end (E2E) testing: <b>Selenium WebDriver</b> automates the browser for website testing, and <b>Appium</b> automates the native Android APK. Both suites test registration, authentication, chat messaging, media transmission, and moments. Tests record execution durations (sub-40ms execution benchmarks) and pass/fail statuses.",
            "<b>Key Takeaway for Examiner:</b> Industry-standard E2E automated testing with Selenium for Web and Appium for Android."
        ),
        (
            "Q13. What is the purpose of the 6 Excel test case reports?",
            "<b>Answer:</b> Our automated test engine dynamically generates 6 comprehensive Excel workbooks in the <code>Test Cases/</code> folder using Python <code>openpyxl</code>: 1) Functional Tests, 2) Non-Functional Tests, 3) Performance Tests, 4) Appium Android Tests, 5) Selenium Web Tests, and 6) Master Test Suite. Each sheet contains 300+ documented test cases with step-by-step preconditions, expected vs actual results, and status badges.",
            "<b>Key Takeaway for Examiner:</b> Automated test reporting generating 6 audit-ready Excel workbooks with 300+ test scenarios."
        ),
        (
            "Q14. How are large media files (images/voice notes) handled?",
            "<b>Answer:</b> Express is configured with extended payload limits (<code>limit: '50mb'</code>) for JSON and urlencoded bodies. Image and voice clips are compressed and transmitted as base64 data URIs or multipart streams, validated for mime-type, and rendered via optimized React component memory buffers to ensure zero frame-rate stuttering.",
            "<b>Key Takeaway for Examiner:</b> 50MB payload handling, base64/binary streaming, and client-side memory caching."
        ),
        (
            "Q15. What are your future plans or scalability improvements for SecureChat?",
            "<b>Answer:</b> 1) <b>Signal Protocol / Double Ratchet:</b> Upgrading from server-assisted encryption to full end-to-end zero-knowledge client encryption. 2) <b>Redis Pub/Sub:</b> Adding Redis to scale SSE broadcasting across a clustered multi-node backend. 3) <b>TURN/STUN Relay:</b> Incorporating Coturn servers for guaranteed WebRTC call connectivity across restrictive symmetric NATs.",
            "<b>Key Takeaway for Examiner:</b> Clear architectural vision: Signal Protocol encryption, Redis clustering, and TURN media relays."
        )
    ]

    for q_text, a_text, takeaway_text in qa_page4:
        card_content = [
            [Paragraph(q_text, q_style)],
            [Paragraph(a_text, a_style)],
            [Paragraph(takeaway_text, key_takeaway_style)]
        ]
        q_table = Table(card_content, colWidths=[540])
        q_table.setStyle(TableStyle([
            ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
            ('BOX', (0,0), (-1,-1), 0.75, colors.HexColor("#CBD5E1")),
            ('LINEBELOW', (0,0), (-1,0), 0.5, colors.HexColor("#E2E8F0")),
            ('LINEBELOW', (0,1), (-1,1), 0.5, colors.HexColor("#E2E8F0")),
            ('TOPPADDING', (0,0), (-1,-1), 2.5),
            ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
            ('LEFTPADDING', (0,0), (-1,-1), 5),
            ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ]))
        story.append(KeepTogether(q_table))
        story.append(Spacer(1, 3.5))

    # END PAGE 4
    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: 5-STEP LIVE DEMO WALKTHROUGH & EXAMINER "GOTCHAS" DEFENSE
    # =========================================================================
    story.append(Paragraph("5. 5-STEP WINNING LIVE DEMONSTRATION SCRIPT", h1_style))
    story.append(Paragraph("<b>Follow this exact walkthrough during your presentation to captivate the examiner:</b>", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=1, spaceAfter=4))

    demo_steps = [
        [
            Paragraph("<b>STEP 1</b>", table_cell_bold),
            Paragraph("<b>Show Multi-Client UI</b>", table_cell_bold),
            Paragraph("Open Web in laptop browser (<code>localhost:5173</code>) and launch Android APK on your phone (or emulator). Highlight that both display the active users from the MySQL database.", table_cell_style)
        ],
        [
            Paragraph("<b>STEP 2</b>", table_cell_bold),
            Paragraph("<b>Instant Real-Time Chat</b>", table_cell_bold),
            Paragraph("Type a message on the Android phone and click Send. Point to your laptop screen: the message appears instantly (in under 100ms) over the Server-Sent Events stream without refreshing.", table_cell_style)
        ],
        [
            Paragraph("<b>STEP 3</b>", table_cell_bold),
            Paragraph("<b>WebRTC Cross-Device Call</b>", table_cell_bold),
            Paragraph("Click the Phone / Video icon on your laptop. Show the Android phone ringing immediately with the incoming call modal. Explain that WebRTC signaling is routed through the Node.js SSE backend.", table_cell_style)
        ],
        [
            Paragraph("<b>STEP 4</b>", table_cell_bold),
            Paragraph("<b>Test Phishing Blocker</b>", table_cell_bold),
            Paragraph("Send a suspicious URL like <code>http://secure-paypal-verify.xyz/login</code>. Show the recipient clicking it: SecureChat Guard catches the phishing TLD & keywords, popping up the safety warning dialog.", table_cell_style)
        ],
        [
            Paragraph("<b>STEP 5</b>", table_cell_bold),
            Paragraph("<b>Show 300+ Test Cases</b>", table_cell_bold),
            Paragraph("Open the <code>Test Cases/</code> folder and show the generated Excel spreadsheets (Selenium & Appium tests). Show the Live Test Reporter inside the app with 100% passed test cases.", table_cell_style)
        ]
    ]

    demo_table = Table(demo_steps, colWidths=[55, 155, 330])
    demo_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#F8FAFC")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 4),
        ('BOTTOMPADDING', (0,0), (-1,-1), 4),
        ('LEFTPADDING', (0,0), (-1,-1), 6),
        ('RIGHTPADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(demo_table)
    story.append(Spacer(1, 8))

    # SECTION 6: DEFENSE STRATEGY
    story.append(Paragraph("6. EXAMINER 'GOTCHAS' & CONFIDENCE DEFENSE STRATEGY", h1_style))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#0284C7"), spaceBefore=1, spaceAfter=4))

    defense_data = [
        [
            Paragraph("POTENTIAL TRAP QUESTION", table_header_style),
            Paragraph("WHAT EXAMINER IS TESTING", table_header_style),
            Paragraph("HOW YOU SHOULD ANSWER WITH CONFIDENCE", table_header_style)
        ],
        [
            Paragraph("<i>'Is your mobile app just a web wrapper (WebView)?'</i>", table_cell_bold),
            Paragraph("Doubting whether it is a real mobile app or just an iframe.", table_cell_style),
            Paragraph("<b>No!</b> It is a compiled Android application (<code>app-debug.apk</code>) with native views, camera/mic permissions, and mobile network adapters tested via Appium.", table_cell_style)
        ],
        [
            Paragraph("<i>'Why not use Firebase or Supabase?'</i>", table_cell_bold),
            Paragraph("Testing if you understand custom architectural control.", table_cell_style),
            Paragraph("Using our own <b>Node.js + MySQL</b> server gives 100% data sovereignty, custom SHA-256 security, zero per-seat cloud costs, and full freedom to implement custom heuristic threat filters.", table_cell_style)
        ],
        [
            Paragraph("<i>'What if two users register with the same name?'</i>", table_cell_bold),
            Paragraph("Testing data integrity and collision handling.", table_cell_style),
            Paragraph("Our backend performs <b>atomic unique name & email verification</b> on registration and profile updates, returning a 409 Conflict if duplicate names are attempted.", table_cell_style)
        ],
        [
            Paragraph("<i>'How do you handle mobile packet loss or network switches?'</i>", table_cell_bold),
            Paragraph("Testing real-world mobile network resilience.", table_cell_style),
            Paragraph("The SSE connection automatically reconnects on network transitions, while the client maintains an offline message queue that flushes immediately upon reconnection.", table_cell_style)
        ]
    ]

    defense_table = Table(defense_data, colWidths=[140, 140, 260])
    defense_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), colors.HexColor("#0F172A")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#CBD5E1")),
        ('INNERGRID', (0,0), (-1,-1), 0.5, colors.HexColor("#E2E8F0")),
        ('TOPPADDING', (0,0), (-1,-1), 3.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3.5),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, colors.HexColor("#F8FAFC")]),
    ]))
    story.append(defense_table)
    story.append(Spacer(1, 8))

    # Summary Callout Box
    summary_box = [
        [
            Paragraph("<b>FINAL PRESENTATION ADVICE:</b> Speak with confidence and technical poise. Start by showing the unified database concept, send a live message between laptop and Android phone, demonstrate the WebRTC call and the fraud link protection. You have built a complete, robust, full-stack system with 300 automated tests. Best of luck with your presentation!", key_takeaway_style)
        ]
    ]
    summary_table = Table(summary_box, colWidths=[540])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#ECFDF5")),
        ('BOX', (0,0), (-1,-1), 1, colors.HexColor("#10B981")),
        ('PADDING', (0,0), (-1,-1), 6),
    ]))
    story.append(summary_table)

    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"[SUCCESS] Successfully generated presentation PDF: {filename}")

if __name__ == '__main__':
    out_file = sys.argv[1] if len(sys.argv) > 1 else "SecureChat_Presentation_Viva_Guide.pdf"
    build_pdf(out_file)
