import docx
from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
import sys, os

def update_patent_document():
    doc = docx.Document('Model_Patent_Document.docx')

    student_name = "Mr. Sonu Panigrahi"
    guide_name = "Dr. R. Kesavan"
    project_title_short = "SecureChat"
    project_title_full = "SecureChat: An End-to-End Encrypted Real-Time Messaging and AI-Driven Phishing Threat Defense System"

    # ─────────────────────────────────────────────────────────────
    # 1. Update Tables (FORM 1, FORM 5, FORM 2, FORM 18)
    # ─────────────────────────────────────────────────────────────

    # Table 0: FORM 1
    t0 = doc.tables[0]
    for r_idx, row in enumerate(t0.rows):
        for c in row.cells:
            # Replace Student Name
            if "Mr. B.Vijay Kumar" in c.text:
                c.text = c.text.replace("Mr. B.Vijay Kumar", student_name)
            elif "B.Vijay Kumar" in c.text:
                c.text = c.text.replace("B.Vijay Kumar", "Sonu Panigrahi")

            # Replace Guide Name
            if "Dr.A.Jaya Mebal Rani" in c.text:
                c.text = c.text.replace("Dr.A.Jaya Mebal Rani", guide_name)
            elif "A.Jaya Mebal Rani" in c.text:
                c.text = c.text.replace("A.Jaya Mebal Rani", "R. Kesavan")

            # Update Gender for Guide (rows 35-42)
            if 35 <= r_idx <= 42:
                if "Female" in c.text:
                    c.text = c.text.replace("Female", "Male")

            # Replace Project Title in Row 52
            if r_idx == 52 and "AgriGuardAI" in c.text:
                c.text = c.text.replace("AgriGuardAI", project_title_short)

    # Table 2: FORM 5 (Declaration as to Inventorship)
    t2 = doc.tables[2]
    for row in t2.rows:
        for c in row.cells:
            if "Mr. B. Vijay Kumar" in c.text:
                c.text = c.text.replace("Mr. B. Vijay Kumar", student_name)
            if "Dr. A.Jaya Mebal Rani" in c.text:
                c.text = c.text.replace("Dr. A.Jaya Mebal Rani", guide_name)

    # Table 3: FORM 2 (Complete Specification Cover)
    t3 = doc.tables[3]
    for row in t3.rows:
        for c in row.cells:
            if "AgriGuardAI" in c.text:
                c.text = c.text.replace("AgriGuardAI", project_title_short)

    # Table 6: FORM 18 (Request for Examination)
    t6 = doc.tables[6]
    for row in t6.rows:
        for c in row.cells:
            if "VR OBJECT SORTING CHALLENGE" in c.text:
                c.text = c.text.replace("VR OBJECT SORTING CHALLENGE", project_title_short)
            elif "AgriGuardAI" in c.text:
                c.text = c.text.replace("AgriGuardAI", project_title_short)

    # ─────────────────────────────────────────────────────────────
    # Helper for updating paragraph text while preserving formatting
    # ─────────────────────────────────────────────────────────────
    def set_p_text(p, text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_name="Times New Roman", font_size=11, bold=False):
        p.clear()
        p.alignment = align
        run = p.add_run(text)
        run.font.name = font_name
        if font_size:
            run.font.size = Pt(font_size)
        run.bold = bold
        return p

    # ─────────────────────────────────────────────────────────────
    # 2. Patent Content Section (from P[75] onwards)
    # ─────────────────────────────────────────────────────────────

    # P[75]: Title above Abstract
    set_p_text(doc.paragraphs[75], project_title_full, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True)

    # P[78]: Abstract Text
    abstract_text = (
        "SecureChat is a cross-platform end-to-end encrypted messaging and real-time cybersecurity defense "
        "system comprising a React 19 progressive web application and an Expo Go / React Native mobile application "
        "connected to a unified Node.js / Express micro-gateway and dual-resilient persistence tier (MySQL with "
        "transparent offline IndexedDB and JSON fallback). The platform integrates six core functional modules: "
        "(1) an end-to-end cryptographic security module executing in-browser Web Crypto API AES-256-GCM message "
        "encryption, RSA-OAEP / ECDH key exchange, and client-side password hashing, ensuring zero plaintext exposure "
        "to intermediate network servers; (2) an AI-powered phishing and fraud link threat defense engine combining "
        "Levenshtein distance brand-homograph analysis, Shannon entropy randomness scoring for algorithmic domain detection, "
        "and an NLP phishing keyword heuristic classifier with multi-tier threat score evaluation; (3) a real-time peer-to-peer "
        "calling module establishing high-definition encrypted audio and video streams via WebRTC with an adaptive HTTP/Server-Sent "
        "Events (SSE) signaling broker; (4) a cross-device real-time presence synchronization engine operating via bidirectional "
        "low-overhead heartbeats and SSE event streams on a centralized in-memory presence map; (5) an ephemeral moments module "
        "supporting 24-hour self-expiring media stories with synced background audio and interactive status viewers; and (6) a "
        "cloud-synchronized cross-platform persistence and gateway layer unifying mobile and web client interactions over shared "
        "state maps without third-party proprietary dependencies. The invention eliminates reliance on centralized unencrypted "
        "metadata architectures and third-party commercial threat APIs, delivering real-time private communications with active "
        "client-side threat interception across desktop and mobile devices."
    )
    set_p_text(doc.paragraphs[78], abstract_text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # P[90]: Title above Description
    set_p_text(doc.paragraphs[90], project_title_full, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True)

    # P[95]: Field of Invention Text
    field_text = (
        "The present invention relates generally to the fields of computer networks, applied cryptography, real-time multimedia "
        "telecommunications, mobile computing, and machine-learning cybersecurity. More specifically, it pertains to an integrated "
        "cross-platform messaging and threat interception system combining: (i) client-side end-to-end encrypted communication using "
        "Web Crypto AES-256-GCM and RSA-OAEP / ECDH key exchange; (ii) an on-device AI-powered fraud and phishing link threat defense "
        "engine using Levenshtein distance, Shannon entropy analysis, and heuristic NLP classification; (iii) peer-to-peer encrypted "
        "high-definition audio and video calling over WebRTC with low-latency HTTP/SSE signaling; (iv) low-latency cross-device presence "
        "and read-receipt synchronization; (v) an ephemeral multimedia story module with 24-hour automatic lifecycle expiration; and (vi) "
        "a resilient dual-tier persistence architecture guaranteeing data consistency between web and mobile environments via MySQL and "
        "offline-first client storage."
    )
    set_p_text(doc.paragraphs[95], field_text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # P[98] & P[100]: Background of Invention Text
    bg_p1 = (
        "Contemporary instant messaging applications are plagued by significant security and privacy vulnerabilities. Centralized "
        "platforms routinely store message metadata, user contact graphs, and link interaction histories on remote servers, leaving "
        "users susceptible to surveillance, man-in-the-middle interception, and data breaches. Furthermore, traditional chat clients "
        "do not evaluate the safety of uniform resource locators (URLs) transmitted within conversation streams prior to user interaction. "
        "Malicious actors frequently exploit messaging channels to distribute phishing URLs, homograph brand impersonations (e.g. replacing "
        "Latin characters with visually similar Cyrillic or numeric substitutes, such as paypa1.com instead of paypal.com), and "
        "algorithmically generated malware distribution endpoints. Conventional URL scanners rely on cloud-based commercial reputation "
        "APIs that introduce substantial request latency, impose costly monthly subscription fees, and compromise user confidentiality "
        "by leaking browsed link histories to third-party security vendors."
    )
    set_p_text(doc.paragraphs[98], bg_p1, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    bg_p2 = (
        "Additionally, existing communication systems suffer from fragmented architectures between web browsers and mobile application "
        "instances, leading to inconsistent state management, delayed presence indicators (\"Online\" vs \"Offline\"), and dropped call "
        "signaling. Mobile frameworks often introduce heavyweight proprietary dependencies (such as Apache Cordova or Capacitor plugins) "
        "that increase native binary overhead, impede cross-device compatibility, and limit responsive web parity. There exists no unified "
        "communication system that: achieves client-side zero-knowledge end-to-end encryption without server decryption access; embeds "
        "autonomous on-device AI link fraud and phishing classification; enables WebRTC peer-to-peer audio and video calling with lightweight "
        "SSE signaling; maintains zero-lag cross-device presence synchronization; and provides resilient dual-tier persistence operable "
        "across desktop browsers and mobile devices."
    )
    set_p_text(doc.paragraphs[100], bg_p2, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # P[103]: Summary of Invention Text
    summary_text = (
        "The invention is an integrated cross-platform messaging and threat defense system consisting of two synchronized application "
        "surfaces — a React 19 web application and an Expo Go / React Native mobile application — both communicating with a unified "
        "Node.js / Express backend gateway and dual-tier database infrastructure. The system consolidates six core modules: (1) an end-to-end "
        "cryptographic module performing client-side AES-256-GCM payload encryption and asymmetric key derivation; (2) an AI phishing and "
        "fraud defense module executing real-time multi-factor link risk assessment via Levenshtein brand distance, Shannon entropy randomness "
        "calculation, and NLP phishing keyword heuristic scoring; (3) a WebRTC peer-to-peer calling module establishing encrypted media "
        "streams with candidate negotiation via SSE and HTTP signaling; (4) a cross-device presence synchronization engine utilizing lightweight "
        "heartbeat intervals and a centralized memory-mapped presence registry; (5) an ephemeral moments module providing 24-hour automated "
        "lifecycle expiration and audio-synchronized media display; and (6) a cloud-synchronized persistence layer operating with primary "
        "MySQL relational storage and resilient offline JSON / IndexedDB fallback mechanisms."
    )
    set_p_text(doc.paragraphs[103], summary_text, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # P[128]: Title above Specifications
    set_p_text(doc.paragraphs[128], project_title_full, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True)

    # Specifications Modules P[132] to P[148]
    set_p_text(doc.paragraphs[132], "1. End-to-End Cryptographic Security Module", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)
    m1_desc = (
        "Executes client-side encryption using the standard Web Crypto API with AES-256-GCM symmetric block ciphers and RSA-OAEP / ECDH "
        "key pair exchange. Plaintext messages, file attachments, and media payloads are encrypted into base64 ciphertext buffers directly "
        "on the transmitting client before transmission over HTTPS/WSS. Secret encryption keys remain strictly within client-side memory and "
        "hardware-secured keystores, ensuring zero-knowledge privacy where neither the transport server nor the backend database possesses "
        "access to plaintext communication contents."
    )
    set_p_text(doc.paragraphs[133], m1_desc, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[135], "2. AI Phishing & Link Fraud Threat Defense Module", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)
    m2_desc = (
        "Inspects all URLs embedded within incoming or outgoing chat messages in real time. The module computes: (a) Levenshtein edit distance "
        "against a predefined corpus of monitored global brand identifiers to intercept typosquatting and visual homograph attacks; (b) Shannon "
        "entropy calculation quantifying character-level randomness to identify algorithmically generated domains (DGA) and randomized malware "
        "hosting paths; and (c) an NLP keyword and heuristic classifier scanning lexical parameters, suspicious top-level domains (.xyz, .top, "
        ".click, .link), unencrypted protocols, and urgency-driven social engineering tokens (login, verify, account, banking, bonus, urgent). "
        "The module yields an explainable risk percentage score, categorical risk verdict (Safe, Suspicious, Dangerous), and detailed risk factor "
        "diagnostics, blocking unsafe navigation and rendering an interactive risk prevention modal prior to browser execution."
    )
    set_p_text(doc.paragraphs[136], m2_desc, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[138], "3. Real-Time Peer-to-Peer Calling & WebRTC Signaling Engine", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)
    m3_desc = (
        "Coordinates high-definition, low-latency audio and video call sessions directly between peer endpoints using the WebRTC "
        "RTCPeerConnection standard, STUN server ICE candidate gathering, and VP8/Opus codec negotiation. Signaling session initiation "
        "(SDP offers, SDP answers, and ICE candidates) is mediated through a dedicated micro-service gateway over lightweight HTTP POST endpoints "
        "and real-time Server-Sent Events (SSE), eliminating the operational overhead and complex state management of monolithic socket daemons."
    )
    set_p_text(doc.paragraphs[139], m3_desc, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[141], "4. Cross-Device Real-Time Presence & Heartbeat Engine", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)
    m4_desc = (
        "Maintains live presence (\"Online\" / \"Offline\") and delivery state across heterogenous client platforms. Clients emit periodic "
        "keep-alive heartbeats every 3.5 seconds to a centralized in-memory active presence registry on the backend gateway. A periodic sweeper "
        "checks timestamp deltas against a 25-second expiration threshold, instantly dispatching state change broadcasts over SSE channels to "
        "synchronize contact badges, last-seen timestamps, and message receipt transitions (sent, delivered, read) without full-page reloads."
    )
    set_p_text(doc.paragraphs[142], m4_desc, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[144], "5. Ephemeral Moments & Media Story Module", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)
    m5_desc = (
        "Provides temporary status broadcast capability permitting users to share photos, video clips, and textual thoughts that automatically "
        "purge exactly 24 hours post-creation. The module features integrated background audio playback synchronized to the story viewer, visual "
        "contact status rings indicating unviewed moments, and granular privacy controls limiting visibility strictly to mutual contacts."
    )
    set_p_text(doc.paragraphs[145], m5_desc, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[147], "6. Resilient Dual-Layer Persistence & Micro-Service Gateway", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)
    m6_desc = (
        "Implements an enterprise-grade database persistence architecture featuring primary MySQL relational storage with parameterized SQL "
        "queries for users, messages, call histories, and moments. In the event of network partition or database downtime, the gateway "
        "seamlessly fails over to an offline-first JSON file store and client-side IndexedDB cache, guaranteeing 100% operational continuity. "
        "Ten modular backend service routers (BackendApiClientBackend, CryptoSecurityModuleBackend, FraudDetectionModuleBackend, "
        "MainActivityBackend, MainApplicationBackend, SecureChatPackageBackend, SecureStorageModuleBackend, VideoCallModuleBackend, "
        "VoiceCallModuleBackend, WebRTCManagerBackend) are unified under a single gateway, delivering identical API endpoints to both web "
        "and mobile clients."
    )
    set_p_text(doc.paragraphs[148], m6_desc, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # ─────────────────────────────────────────────────────────────
    # Screenshots Section P[163] to P[170]
    # ─────────────────────────────────────────────────────────────
    set_p_text(doc.paragraphs[163], project_title_full, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True)

    # Insert Picture at P[164]
    p164 = doc.paragraphs[164]
    p164.clear()
    p164.alignment = WD_ALIGN_PARAGRAPH.CENTER
    run_img = p164.add_run()
    if os.path.exists('patent_figure_1.png'):
        run_img.add_picture('patent_figure_1.png', width=Inches(5.6))

    sc_intro = (
        "SecureChat is an integrated cross-platform secure messaging and real-time cybersecurity defense system comprising a React 19 "
        "progressive web application and an Expo Go / React Native mobile application, both operating against a unified Node.js / Express "
        "backend gateway and dual-layer database architecture. Figure 1 illustrates the core operational surfaces of the invention."
    )
    set_p_text(doc.paragraphs[165], sc_intro, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    sc_f1a = (
        "Figure 1(a) depicts the Authentication & Security Interface. The module provides multi-factor credential authentication, "
        "automated biometric unlock, and real-time connectivity status indicators connecting seamlessly to the local network backend "
        "gateway without proprietary third-party dependencies."
    )
    set_p_text(doc.paragraphs[166], sc_f1a, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    sc_f1b = (
        "Figure 1(b) depicts the End-to-End Encrypted Messaging & Presence Interface. The interface displays active contact directories, "
        "real-time presence status badges (\"Online\" with active pulsing indicators and last-seen timestamps), and message delivery "
        "receipts (single tick for sent, double gray ticks for delivered, and double colored ticks for read)."
    )
    set_p_text(doc.paragraphs[167], sc_f1b, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    sc_f1c = (
        "Figure 1(c) depicts the AI Phishing & Link Fraud Threat Defense Modal. When a hyperlink is tapped within a conversation, the "
        "client-side detection engine executes instantaneous multi-factor security evaluation, displaying a normalized risk score "
        "percentage gauge, categorical risk verdict (Safe, Suspicious, or Dangerous), and explainable risk factor diagnostics detailing "
        "detected homographs, suspicious TLDs, and keyword anomalies."
    )
    set_p_text(doc.paragraphs[168], sc_f1c, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    sc_f1d = (
        "Figure 1(d) depicts the WebRTC Peer-to-Peer Video Call Session. High-definition video and audio streams are transmitted directly "
        "between authenticated peer devices over encrypted RTP streams, managed via lightweight HTTP and Server-Sent Events (SSE) "
        "signaling without third-party socket reliance."
    )
    set_p_text(doc.paragraphs[169], sc_f1d, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    sc_summary = (
        "The dual-platform architecture guarantees that all security updates, contact states, presence heartbeats, and call signals "
        "remain 100% synchronized across mobile and web interfaces simultaneously, delivering seamless parity across desktop browsers "
        "and mobile devices."
    )
    set_p_text(doc.paragraphs[170], sc_summary, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # ─────────────────────────────────────────────────────────────
    # Claims Section P[178] to P[198]
    # ─────────────────────────────────────────────────────────────
    set_p_text(doc.paragraphs[178], project_title_full, align=WD_ALIGN_PARAGRAPH.CENTER, font_size=14, bold=True)
    set_p_text(doc.paragraphs[180], "We Claim", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=12, bold=True)

    set_p_text(doc.paragraphs[182], "1. Claim 1:", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True)
    c1 = (
        "An end-to-end encrypted communication and cybersecurity defense system, comprising: a client application executing on a plurality "
        "of user computing devices, configured to generate cryptographic key pairs and perform client-side symmetric payload encryption "
        "prior to network dispatch; a centralized micro-service gateway configured to receive encrypted payloads and route them between "
        "authenticated recipients without decrypting the payload content; a threat analysis engine executing on the client device, configured "
        "to parse incoming and outgoing text payloads for embedded uniform resource locators (URLs), evaluate the parsed URLs against "
        "multi-factor heuristic threat criteria, and intercept unauthorized navigation attempts to suspicious destinations; and a dual-tier "
        "persistence layer configured to store encrypted communication records within a primary relational database and automatically "
        "transition to a local persistent cache during network disconnects."
    )
    set_p_text(doc.paragraphs[183], c1, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[185], "2. Claim 2:", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True)
    c2 = (
        "The system of Claim 1, wherein the threat analysis engine comprises an AI-driven link evaluation module configured to: compute a "
        "Levenshtein edit distance between a parsed domain string and a corpus of predefined brand identifiers to detect typosquatting and "
        "homograph impersonation attacks; calculate a Shannon entropy metric quantifying character randomness across the domain and path "
        "segments of the URL to detect algorithmically generated domains; and evaluate URL tokens against a heuristic dictionary of phishing, "
        "urgency, and credential-harvesting keywords; wherein the module aggregates the Levenshtein distance, Shannon entropy metric, and "
        "heuristic evaluation into a normalized risk percentage score and prevents automatic link execution when the score exceeds a "
        "predefined security threshold."
    )
    set_p_text(doc.paragraphs[186], c2, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[188], "3. Claim 3:", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True)
    c3 = (
        "The system of Claim 1, wherein the system further comprises a peer-to-peer multimedia calling subsystem configured to: establish an "
        "audio or video communication channel directly between two authenticated client devices using a WebRTC peer connection; and exchange "
        "session description protocol (SDP) offers, SDP answers, and interactive connectivity establishment (ICE) candidates through the "
        "centralized micro-service gateway via lightweight HTTP signaling and Server-Sent Events (SSE) streams, without requiring persistent "
        "third-party socket infrastructure."
    )
    set_p_text(doc.paragraphs[189], c3, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[191], "4. Claim 4:", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True)
    c4 = (
        "The system of Claim 1, wherein the system further comprises a cross-device real-time presence engine configured to: receive periodic "
        "cryptographic keep-alive heartbeat signals from authenticated client devices at predetermined intervals; maintain an active presence "
        "memory registry mapping user identifiers to timestamped connectivity records; and broadcast presence status updates to active client "
        "contacts via Server-Sent Events when a heartbeat interval exceeds an inactivity threshold, thereby updating user interface status "
        "badges across both web and mobile application surfaces simultaneously."
    )
    set_p_text(doc.paragraphs[192], c4, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[194], "5. Claim 5:", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True)
    c5 = (
        "The system of Claim 1, wherein the client application further comprises an ephemeral moments module configured to: receive user media "
        "uploads comprising image or video data and associated background audio selection; persist the uploaded media to the persistence layer "
        "with a creation timestamp; render an interactive story viewer displaying the media with synchronized audio playback to authorized "
        "contact peers; and automatically purge the uploaded media and associated records from active client display upon the expiration of "
        "exactly twenty-four hours from the creation timestamp."
    )
    set_p_text(doc.paragraphs[195], c5, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    set_p_text(doc.paragraphs[197], "6. Claim 6:", align=WD_ALIGN_PARAGRAPH.LEFT, font_size=11, bold=True)
    c6 = (
        "The system of Claim 1, wherein the dual-tier persistence layer comprises: a primary SQL relational database schema maintaining "
        "normalized user profiles, encrypted message payloads, call logs, and contact relationships; and an autonomous resilient fallback "
        "mechanism configured to detect database connectivity failures, divert read and write operations transparently to a client-side "
        "IndexedDB instance and local JSON file registry, and automatically synchronize accumulated offline transactions to the primary "
        "database upon reconnection without loss of message sequencing."
    )
    set_p_text(doc.paragraphs[198], c6, align=WD_ALIGN_PARAGRAPH.JUSTIFY, font_size=11, bold=False)

    # ─────────────────────────────────────────────────────────────
    # 3. Save Document
    # ─────────────────────────────────────────────────────────────
    output_workspace_path = "SecureChat_Model_Patent_Document.docx"
    output_desktop_path = r"C:\Users\panig\OneDrive\Desktop\SecureChat_Patent_Document_Sonu_Panigrahi_192365057.docx"

    doc.save(output_workspace_path)
    doc.save(output_desktop_path)
    print(f"Successfully created patent document at:\n1. {output_workspace_path}\n2. {output_desktop_path}")

if __name__ == "__main__":
    update_patent_document()
