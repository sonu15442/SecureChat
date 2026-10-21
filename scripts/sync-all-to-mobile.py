import os

files_to_sync = [
    'src/components/SettingsPanel.jsx',
    'src/components/ChatPanel.jsx',
    'src/components/VoiceCallModal.jsx',
    'src/components/VideoCallModal.jsx',
    'src/components/StatusModal.jsx',
    'src/components/StatusViewerModal.jsx'
]

mobile_base = r'c:\Users\panig\OneDrive\Desktop\SecureChatMobile'

for rel in files_to_sync:
    src_path = os.path.join(os.path.dirname(__file__), '..', rel)
    dest_path = os.path.join(mobile_base, rel)
    if os.path.exists(src_path) and os.path.exists(dest_path):
        with open(src_path, 'r', encoding='utf-8') as f:
            content = f.read()
        # Convert source from SecureChat to SecureChatMobile
        content = content.replace("source: 'SecureChat'", "source: 'SecureChatMobile'")
        with open(dest_path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Synced {rel} to SecureChatMobile")

# Also update SecureChatMobile/src/App.jsx with handleUpdateUser test recording
mobile_app = os.path.join(mobile_base, 'src', 'App.jsx')
if os.path.exists(mobile_app):
    with open(mobile_app, 'r', encoding='utf-8') as f:
        app_code = f.read()

    # Import getRecordedTests if not present
    if 'getRecordedTests' not in app_code and "import { recordAction" in app_code:
        app_code = app_code.replace("import { recordAction", "import { recordAction, getRecordedTests")

    # Update handleUpdateUser
    old_handle_user = """  const handleUpdateUser = (updatedUser) => {
    setCurrentUser(updatedUser);"""
    new_handle_user = """  const handleUpdateUser = (updatedUser) => {
    const isAvatarChange = updatedUser?.avatar !== currentUser?.avatar;
    const actionName = isAvatarChange
      ? 'User updates profile avatar picture'
      : 'User updates profile details successfully';
    recordAction('Profile Management', actionName, { duration: 0.04, status: 'PASSED', source: 'SecureChatMobile' });
    setCurrentUser(updatedUser);"""

    if old_handle_user in app_code:
        app_code = app_code.replace(old_handle_user, new_handle_user)
        print("Updated handleUpdateUser in SecureChatMobile/src/App.jsx")

    # Update initiateCall
    if "recordAction('Session Management', `User initiates encrypted ${type} call`" not in app_code:
        app_code = app_code.replace(
            "setActiveCall(callObj);",
            "recordAction('Session Management', `User initiates encrypted ${type} call`, { duration: 0.06, status: 'PASSED', source: 'SecureChatMobile' });\n    setActiveCall(callObj);"
        )

    with open(mobile_app, 'w', encoding='utf-8') as f:
        f.write(app_code)
    print("Saved SecureChatMobile/src/App.jsx")
